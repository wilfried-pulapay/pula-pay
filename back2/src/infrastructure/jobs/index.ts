import { createCoinbasePollingWorker } from './workers/coinbase-poll.worker';
import { createTxExpiryWorker } from './workers/tx-expiry.worker';
import { createFaucetWorker } from './workers/faucet.worker';
import { createCircleTransferPollingWorker } from './workers/circle-transfer-poll.worker';
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

export function bootstrapWorkers(deps: WorkerDependencies) {
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

  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await Promise.all([
      coinbaseWorker.close(),
      expiryWorker.close(),
      faucetWorker.close(),
      circleTransferWorker.close(),
    ]);
    logger.info('All workers stopped');
  };

  logger.info('BullMQ workers started: coinbase-polling, tx-expiry, faucet, circle-transfer-polling');
  return { coinbaseWorker, expiryWorker, faucetWorker, circleTransferWorker, shutdown };
}
