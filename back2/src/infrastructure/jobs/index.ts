import { createCoinbasePollingWorker } from './workers/coinbase-poll.worker';
import { createTxExpiryWorker } from './workers/tx-expiry.worker';
import { createFaucetWorker } from './workers/faucet.worker';
import { CoinbaseCdpOnRampAdapter } from '../adapters/coinbase-cdp/CoinbaseCdpOnRampAdapter';
import { ConfirmDepositHandler } from '../../application/commands/ConfirmDepositHandler';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { logger } from '../../shared/utils/logger';

export interface WorkerDependencies {
  coinbaseCdpAdapter: CoinbaseCdpOnRampAdapter;
  confirmDepositHandler: ConfirmDepositHandler;
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

  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await Promise.all([
      coinbaseWorker.close(),
      expiryWorker.close(),
      faucetWorker.close(),
    ]);
    logger.info('All workers stopped');
  };

  logger.info('BullMQ workers started: coinbase-polling, tx-expiry, faucet');
  return { coinbaseWorker, expiryWorker, faucetWorker, shutdown };
}
