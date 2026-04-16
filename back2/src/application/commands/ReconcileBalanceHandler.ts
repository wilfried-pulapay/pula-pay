import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { LedgerService } from '../../domain/services/LedgerService';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { generateIdempotencyKey } from '../../shared/utils/idempotency';
import { logger } from '../../shared/utils/logger';

export interface ReconcileBalanceCommand {
  userId: string;
}

export interface ReconcileBalanceResult {
  walletId: string;
  dbBalance: string;
  circleBalance: string;
  diff: string;
  corrected: boolean;
  depositsCreated: number;
  /** true if DB > Circle — requires manual investigation, no auto-correct */
  alertOnly: boolean;
}

const DRIFT_THRESHOLD = new Decimal('0.000001');

/**
 * Compares the authenticated user's wallet balance in DB against Circle's live value.
 *
 * When Circle > DB (missed credit):
 * 1. Fetch inbound Circle transactions and create individual DEPOSIT_CRYPTO records
 *    for any not already in the DB (idempotent via externalRef).
 * 2. If a residual gap remains (direct on-chain send not visible via Circle transactions),
 *    create one aggregate DEPOSIT_CRYPTO record for the remainder.
 *
 * When DB > Circle: logs an alert only — no auto-correction (potential overcredit bug).
 */
export class ReconcileBalanceHandler {
  private ledgerService = new LedgerService();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly walletRepo: WalletRepository,
    private readonly txRepo: TransactionRepository,
    private readonly walletProvider: WalletProvider,
  ) {}

  async execute(command: ReconcileBalanceCommand): Promise<ReconcileBalanceResult> {
    const wallet = await this.walletRepo.findByUserId(command.userId);
    if (!wallet) {
      throw new WalletNotFoundError(command.userId, 'userId');
    }

    const dbBalance = wallet.balance;

    const { userToken } = await this.walletProvider.getUserToken(command.userId);
    const circleBalanceData = await this.walletProvider.getBalance(wallet.circleWalletId, userToken);
    const circleBalance = new Decimal(circleBalanceData.amount);

    const diff = circleBalance.sub(dbBalance);

    if (diff.abs().lt(DRIFT_THRESHOLD)) {
      logger.info({ walletId: wallet.id, balance: dbBalance.toString() }, 'Balance in sync with Circle');
      return {
        walletId: wallet.id,
        dbBalance: dbBalance.toString(),
        circleBalance: circleBalance.toString(),
        diff: diff.toString(),
        corrected: false,
        depositsCreated: 0,
        alertOnly: false,
      };
    }

    if (diff.lte(0)) {
      // DB > Circle: potential overcredit bug — alert only, no auto-correct
      logger.error(
        { walletId: wallet.id, dbBalance: dbBalance.toString(), circleBalance: circleBalance.toString(), diff: diff.toString() },
        'Balance drift: DB > Circle — manual investigation required, NOT auto-correcting'
      );
      return {
        walletId: wallet.id,
        dbBalance: dbBalance.toString(),
        circleBalance: circleBalance.toString(),
        diff: diff.toString(),
        corrected: false,
        depositsCreated: 0,
        alertOnly: true,
      };
    }

    // Circle > DB: missed credit — reconcile with transaction records
    logger.error(
      { walletId: wallet.id, dbBalance: dbBalance.toString(), circleBalance: circleBalance.toString(), diff: diff.toString() },
      'Balance drift: Circle > DB — reconciling missed deposits'
    );

    let depositsCreated = 0;

    // Pass 1: process individual inbound Circle transactions not yet in DB
    const inboundTxs = await this.walletProvider.listInboundTransactions(wallet.circleWalletId, userToken);
    const completedInbound = inboundTxs.filter((tx) => tx.status === 'complete');

    for (const inboundTx of completedInbound) {
      // Guard: stop if we've already reached Circle's balance — further credits would overcredit
      if (wallet.balance.gte(circleBalance)) {
        logger.warn({ walletId: wallet.id, dbBalance: wallet.balance.toString(), circleBalance: circleBalance.toString() }, 'Reconciliation guard: DB balance reached Circle balance, stopping Pass 1');
        break;
      }

      const existing = await this.txRepo.findByExternalRef(inboundTx.id);
      if (existing) continue;

      const amount = new Decimal(inboundTx.amount);
      if (amount.lte(0)) continue;

      // Guard: skip if this single tx would push DB balance above Circle balance
      if (wallet.balance.add(amount).gt(circleBalance)) {
        logger.warn(
          { walletId: wallet.id, circleTransactionId: inboundTx.id, amount: amount.toString(), wouldReach: wallet.balance.add(amount).toString(), circleBalance: circleBalance.toString() },
          'Reconciliation guard: skipping inbound tx — would overcredit wallet, manual review required'
        );
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        const txRecord = await tx.transaction.create({
          data: {
            idempotencyKey: `inbound-${inboundTx.id}`,
            type: 'DEPOSIT_CRYPTO',
            status: 'COMPLETED',
            amountUsdc: amount.toNumber(),
            feeUsdc: 0,
            walletId: wallet.id,
            externalRef: inboundTx.id,
            description: 'Direct on-chain deposit',
            metadata: inboundTx.txHash ? { txHash: inboundTx.txHash } : undefined,
            completedAt: new Date(),
          },
        });

        const entries = this.ledgerService.createCryptoDepositEntries(
          txRecord.id,
          wallet.id,
          amount,
          wallet.balance
        );

        for (const entry of entries) {
          await tx.ledgerEntry.create({
            data: {
              transactionId: entry.transactionId,
              walletId: entry.walletId,
              accountType: entry.accountType,
              amountUsdc: entry.amountUsdc.toNumber(),
              entryType: entry.entryType,
              balanceAfter: entry.balanceAfter.toNumber(),
            },
          });
        }

        wallet.credit(amount);
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceUsdc: wallet.balance.toNumber() },
        });
      });

      depositsCreated++;
      logger.info({ circleTransactionId: inboundTx.id, amount: amount.toString(), walletId: wallet.id }, 'Reconciled missed inbound deposit');
    }

    // Pass 2: if residual gap remains (on-chain send not visible via Circle), create aggregate record
    const residual = circleBalance.sub(wallet.balance);

    if (residual.gt(DRIFT_THRESHOLD)) {
      const isoDate = new Date().toISOString().slice(0, 10);
      const externalRef = `reconcile-${wallet.id}-${isoDate}`;

      const existing = await this.txRepo.findByExternalRef(externalRef);
      if (!existing) {
        await this.prisma.$transaction(async (tx) => {
          const txRecord = await tx.transaction.create({
            data: {
              idempotencyKey: generateIdempotencyKey(),
              type: 'DEPOSIT_CRYPTO',
              status: 'COMPLETED',
              amountUsdc: residual.toNumber(),
              feeUsdc: 0,
              walletId: wallet.id,
              externalRef,
              description: 'Reconciliation: untracked external deposit',
              completedAt: new Date(),
            },
          });

          const entries = this.ledgerService.createCryptoDepositEntries(
            txRecord.id,
            wallet.id,
            residual,
            wallet.balance
          );

          for (const entry of entries) {
            await tx.ledgerEntry.create({
              data: {
                transactionId: entry.transactionId,
                walletId: entry.walletId,
                accountType: entry.accountType,
                amountUsdc: entry.amountUsdc.toNumber(),
                entryType: entry.entryType,
                balanceAfter: entry.balanceAfter.toNumber(),
              },
            });
          }

          wallet.credit(residual);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balanceUsdc: wallet.balance.toNumber() },
          });
        });

        depositsCreated++;
        logger.info({ residual: residual.toString(), walletId: wallet.id }, 'Created aggregate reconciliation deposit for untracked on-chain send');
      }
    }

    return {
      walletId: wallet.id,
      dbBalance: dbBalance.toString(),
      circleBalance: circleBalance.toString(),
      diff: diff.toString(),
      corrected: true,
      depositsCreated,
      alertOnly: false,
    };
  }
}
