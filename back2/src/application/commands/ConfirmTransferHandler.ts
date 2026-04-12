import { PrismaClient } from '@prisma/client';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { LedgerService } from '../../domain/services/LedgerService';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { logger } from '../../shared/utils/logger';

export interface ConfirmTransferCommand {
  circleWalletId: string;
  circleStatus: 'complete' | 'failed';
  circleTransferId?: string;
  txHash?: string;
}

export class ConfirmTransferHandler {
  private ledgerService = new LedgerService();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly txRepo: TransactionRepository,
    private readonly walletRepo: WalletRepository,
  ) {}

  async execute(command: ConfirmTransferCommand): Promise<void> {
    // 1. Find sender wallet by Circle wallet ID
    const senderWallet = await this.walletRepo.findByCircleWalletId(command.circleWalletId);
    if (!senderWallet) {
      throw new WalletNotFoundError(command.circleWalletId, 'id');
    }

    // 2. Find the pending P2P transaction for this wallet
    const { items } = await this.txRepo.findByWalletId(
      senderWallet.id,
      { type: 'TRANSFER_P2P', status: 'PENDING' },
      { page: 1, limit: 1 }
    );
    const transaction = items[0];
    if (!transaction) {
      logger.info(
        { circleWalletId: command.circleWalletId },
        'No pending P2P transaction found — already resolved or not yet created'
      );
      return;
    }

    // 3. Idempotency: skip if already terminal
    if (transaction.isTerminal()) {
      logger.info(
        { transactionId: transaction.id, status: transaction.status },
        'Transfer already resolved, skipping'
      );
      return;
    }

    // 4. Handle failure
    if (command.circleStatus === 'failed') {
      transaction.fail('Circle transfer failed');
      await this.txRepo.update(transaction);
      logger.info({ transactionId: transaction.id }, 'Transfer marked as failed');
      return;
    }

    // 5. Success: resolve recipient wallet
    if (!transaction.counterpartyId) {
      throw new Error(`Transfer ${transaction.id} has no counterpartyId`);
    }
    const recipientWallet = await this.walletRepo.findById(transaction.counterpartyId);
    if (!recipientWallet) {
      throw new WalletNotFoundError(transaction.counterpartyId, 'id');
    }

    // 6. Build ledger entries before mutating balances
    const entries = this.ledgerService.createTransferEntries(
      transaction.id,
      senderWallet.id,
      recipientWallet.id,
      transaction.amountUsdc,
      senderWallet.balance,
      recipientWallet.balance,
    );

    // 7. Atomic: debit sender, credit recipient, persist ledger, complete transaction
    transaction.markProcessing(command.circleTransferId);
    senderWallet.debit(transaction.amountUsdc);
    recipientWallet.credit(transaction.amountUsdc);
    transaction.complete();

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balanceUsdc: senderWallet.balance.toNumber() },
      });
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balanceUsdc: recipientWallet.balance.toNumber() },
      });

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

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: transaction.status,
          externalRef: command.circleTransferId ?? null,
          completedAt: transaction.completedAt,
        },
      });
    });

    logger.info(
      {
        transactionId: transaction.id,
        circleTransferId: command.circleTransferId,
        amountUsdc: transaction.amountUsdc.toString(),
        txHash: command.txHash,
      },
      'Transfer confirmed'
    );
  }
}
