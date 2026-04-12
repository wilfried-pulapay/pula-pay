import { createCoinbasePollingWorker } from './workers/coinbase-poll.worker';
import { createTxExpiryWorker } from './workers/tx-expiry.worker';
import { createFaucetWorker } from './workers/faucet.worker';
import { createCircleTransferPollingWorker } from './workers/circle-transfer-poll.worker';
import { createBalanceReconciliationWorker } from './workers/balance-reconciliation.worker';
import { balanceReconciliationQueue } from './queues';
import { CoinbaseCdpOnRampAdapter } from '../adapters/coinbase-cdp/CoinbaseCdpOnRampAdapter';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { ConfirmDepositHandler } from '../../application/commands/ConfirmDepositHandler';
import { ConfirmTransferHandler } from '../../application/commands/ConfirmTransferHandler';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { logger } from '../../shared/utils/logger';

export interface WorkerDependencies {
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

  const expiryWorker = createTxExpiryWorker({
    transactionRepo: deps.transactionRepo,
  });

  const faucetWorker = createFaucetWorker();

  const circleTransferWorker = createCircleTransferPollingWorker({
    walletProvider: deps.walletProvider,
    walletRepo: deps.walletRepo,
    transactionRepo: deps.transactionRepo,
    confirmTransferHandler: deps.confirmTransferHandler,
  });

  const reconciliationWorker = createBalanceReconciliationWorker({
    walletProvider: deps.walletProvider,
    walletRepo: deps.walletRepo,
  });

  // Schedule repeatable reconciliation job (every hour)
  await balanceReconciliationQueue.add(
    'reconcile-balances',
    {},
    {
      repeat: { every: 3_600_000 },
      jobId: 'balance-reconciliation-repeatable',
    }
  );

  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await Promise.all([
      coinbaseWorker.close(),
      expiryWorker.close(),
      faucetWorker.close(),
      circleTransferWorker.close(),
      reconciliationWorker.close(),
    ]);
    logger.info('All workers stopped');
  };

  logger.info('BullMQ workers started: coinbase-polling, tx-expiry, faucet, circle-transfer-polling, balance-reconciliation');
  return { coinbaseWorker, expiryWorker, faucetWorker, circleTransferWorker, reconciliationWorker, shutdown };
}
