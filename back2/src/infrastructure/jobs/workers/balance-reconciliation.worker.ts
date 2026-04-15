import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../connection';
import { WalletProvider } from '../../../domain/ports/WalletProvider';
import { WalletRepository } from '../../../domain/ports/repositories/WalletRepository';
import { TransactionRepository } from '../../../domain/ports/repositories/TransactionRepository';
import { ReconcileBalanceHandler } from '../../../application/commands/ReconcileBalanceHandler';
import { logger } from '../../../shared/utils/logger';

export function createBalanceReconciliationWorker(deps: {
  prisma: PrismaClient;
  walletProvider: WalletProvider;
  walletRepo: WalletRepository;
  transactionRepo: TransactionRepository;
}) {
  const reconcileHandler = new ReconcileBalanceHandler(
    deps.prisma,
    deps.walletRepo,
    deps.transactionRepo,
    deps.walletProvider,
  );

  return new Worker(
    'balance-reconciliation',
    async () => {
      const wallets = await deps.walletRepo.findAllActive();

      logger.info({ count: wallets.length }, 'Starting balance reconciliation');

      let driftCount = 0;
      let depositsCreated = 0;

      for (const wallet of wallets) {
        try {
          const result = await reconcileHandler.execute({ userId: wallet.userId });

          if (result.corrected || result.alertOnly) {
            driftCount++;
            depositsCreated += result.depositsCreated;
          }
        } catch (err) {
          logger.error({ walletId: wallet.id, err }, 'Failed to reconcile wallet balance, skipping');
        }
      }

      logger.info({ total: wallets.length, driftCount, depositsCreated }, 'Balance reconciliation complete');
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );
}
