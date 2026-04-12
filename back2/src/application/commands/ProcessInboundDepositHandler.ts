import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { LedgerService } from '../../domain/services/LedgerService';
import { logger } from '../../shared/utils/logger';

export interface ProcessInboundDepositCommand {
  circleWalletId: string;
  circleTransactionId: string;
  amount: string;
  txHash?: string;
}

/**
 * Handles USDC deposits sent directly on-chain to a user's Circle wallet address,
 * outside of the normal app flow.
 *
 * Triggered by the Circle `transactions.inbound` webhook. Creates a DEPOSIT_CRYPTO
 * transaction and credits the wallet atomically.
 */
export class ProcessInboundDepositHandler {
  private ledgerService = new LedgerService();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly txRepo: TransactionRepository,
    private readonly walletRepo: WalletRepository,
  ) {}

  async execute(command: ProcessInboundDepositCommand): Promise<void> {
    // 1. Idempotency: skip if already processed
    const existing = await this.txRepo.findByExternalRef(command.circleTransactionId);
    if (existing) {
      logger.info(
        { circleTransactionId: command.circleTransactionId },
        'Inbound deposit already processed, skipping'
      );
      return;
    }

    // 2. Find wallet
    const wallet = await this.walletRepo.findByCircleWalletId(command.circleWalletId);
    if (!wallet) {
      logger.warn(
        { circleWalletId: command.circleWalletId },
        'Wallet not found for inbound deposit, ignoring'
      );
      return;
    }

    const amount = new Decimal(command.amount);
    if (amount.lte(0)) {
      logger.warn({ amount: command.amount }, 'Invalid inbound deposit amount, ignoring');
      return;
    }

    // 3. Atomic: create transaction + ledger entries + credit wallet
    await this.prisma.$transaction(async (tx) => {
      // Create the transaction record directly as COMPLETED (already settled on-chain)
      const txRecord = await tx.transaction.create({
        data: {
          idempotencyKey: `inbound-${command.circleTransactionId}`,
          type: 'DEPOSIT_CRYPTO',
          status: 'COMPLETED',
          amountUsdc: amount.toNumber(),
          feeUsdc: 0,
          walletId: wallet.id,
          externalRef: command.circleTransactionId,
          description: 'Direct on-chain deposit',
          metadata: command.txHash ? { txHash: command.txHash } : undefined,
          completedAt: new Date(),
        },
      });

      // Create double-entry ledger (LIQUIDITY credit/debit + USER credit)
      // wallet.balance is the balance BEFORE this credit — correct for balanceAfter calculation
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

      // Credit wallet
      wallet.credit(amount);
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceUsdc: wallet.balance.toNumber() },
      });
    });

    logger.info(
      {
        circleTransactionId: command.circleTransactionId,
        circleWalletId: command.circleWalletId,
        amountUsdc: amount.toString(),
        txHash: command.txHash,
      },
      'Inbound deposit processed'
    );
  }
}
