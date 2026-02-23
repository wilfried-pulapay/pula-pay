import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { TransactionRepository } from '../../../domain/ports/repositories/TransactionRepository';
import { logger } from '../../../shared/utils/logger';

export interface TxExpiryJobData {
  transactionId: string;
}

export function createTxExpiryWorker(deps: {
  transactionRepo: TransactionRepository;
}) {
  return new Worker<TxExpiryJobData>(
    'tx-expiry',
    async (job: Job<TxExpiryJobData>) => {
      const { transactionId } = job.data;

      const tx = await deps.transactionRepo.findById(transactionId);
      if (!tx) {
        logger.warn({ transactionId }, 'Transaction not found for expiry');
        return { status: 'NOT_FOUND' };
      }

      // Skip if already terminal
      if (tx.isTerminal()) {
        logger.info({ transactionId, status: tx.status }, 'Transaction already terminal, skipping expiry');
        return { status: 'ALREADY_TERMINAL' };
      }

      // Expire the transaction
      tx.expire();
      await deps.transactionRepo.update(tx);

      logger.info({ transactionId }, 'Transaction expired');
      return { status: 'EXPIRED' };
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );
}
