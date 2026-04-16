import { createCoinbasePollingWorker } from './workers/coinbase-poll.worker';
import { createBalanceReconciliationWorker } from './workers/balance-reconciliation.worker';
import { createCircleTransferSweepWorker } from './workers/circle-transfer-sweep.worker';
import { balanceReconciliationQueue, circleTransferSweepQueue } from './queues';
import { PrismaClient } from '@prisma/client';
import { CoinbaseCdpOnRampAdapter } from '../adapters/coinbase-cdp/CoinbaseCdpOnRampAdapter';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { ConfirmDepositHandler } from '../../application/commands/ConfirmDepositHandler';
import { ConfirmTransferHandler } from '../../application/commands/ConfirmTransferHandler';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { logger } from '../../shared/utils/logger';

export interface WorkerDependencies {
  prisma: PrismaClient;
  coinbaseCdpAdapter: CoinbaseCdpOnRampAdapter;
  confirmDepositHandler: ConfirmDepositHandler;
  confirmTransferHandler: ConfirmTransferHandler;
  walletProvider: WalletProvider;
  walletRepo: WalletRepository;
  transactionRepo: TransactionRepository;
}

export async function bootstrapWorkers(deps: WorkerDependencies) {
  const coinbaseWorker = createCoinbasePollingWorker({
    coinbaseCdpAdapter: deps.coinbaseCdpAdapter,
    confirmDepositHandler: deps.confirmDepositHandler,
    transactionRepo: deps.transactionRepo,
  });

  const reconciliationWorker = createBalanceReconciliationWorker({
    prisma: deps.prisma,
    walletProvider: deps.walletProvider,
    walletRepo: deps.walletRepo,
    transactionRepo: deps.transactionRepo,
  });

  const circleTransferSweepWorker = createCircleTransferSweepWorker({
    walletProvider: deps.walletProvider,
    walletRepo: deps.walletRepo,
    transactionRepo: deps.transactionRepo,
    confirmTransferHandler: deps.confirmTransferHandler,
  });

  // Schedule repeatable jobs
  await balanceReconciliationQueue.add(
    'reconcile-balances',
    {},
    {
      repeat: { every: 3_600_000 },
      jobId: 'balance-reconciliation-repeatable',
    }
  );

  await circleTransferSweepQueue.add(
    'sweep-transfers',
    {},
    {
      repeat: { every: 120_000 },
      jobId: 'circle-transfer-sweep-repeatable',
    }
  );

  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await Promise.all([
      coinbaseWorker.close(),
      reconciliationWorker.close(),
      circleTransferSweepWorker.close(),
    ]);
    logger.info('All workers stopped');
  };

  logger.info('BullMQ workers started: coinbase-polling, balance-reconciliation, circle-transfer-sweep');
  return { coinbaseWorker, reconciliationWorker, circleTransferSweepWorker, shutdown };
}
