import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { CoinbaseCdpOnRampAdapter } from '../../adapters/coinbase-cdp/CoinbaseCdpOnRampAdapter';
import { ConfirmDepositHandler } from '../../../application/commands/ConfirmDepositHandler';
import { TransactionRepository } from '../../../domain/ports/repositories/TransactionRepository';
import { DepositResult } from '../../../domain/ports/OnRampProvider';
import { logger } from '../../../shared/utils/logger';

export interface CoinbasePollingJobData {
  transactionId: string;
  partnerUserRef: string;
  type: 'ONRAMP' | 'OFFRAMP';
  idempotencyKey: string;
}

export function createCoinbasePollingWorker(deps: {
  coinbaseCdpAdapter: CoinbaseCdpOnRampAdapter;
  confirmDepositHandler: ConfirmDepositHandler;
  transactionRepo: TransactionRepository;
}) {
  return new Worker<CoinbasePollingJobData>(
    'coinbase-polling',
    async (job: Job<CoinbasePollingJobData>) => {
      const { transactionId, partnerUserRef, type } = job.data;

      logger.info({
        msg: 'Polling Coinbase CDP status',
        transactionId,
        partnerUserRef,
        type,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      });

      // Idempotency: skip if already terminal
      const tx = await deps.transactionRepo.findById(transactionId);
      if (tx && ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(tx.status)) {
        logger.info({ msg: 'Transaction already terminal, skipping', transactionId });
        return { status: 'ALREADY_TERMINAL' };
      }

      // Poll Coinbase
      const result = type === 'ONRAMP'
        ? await deps.coinbaseCdpAdapter.getDepositStatus(partnerUserRef)
        : await deps.coinbaseCdpAdapter.getPayoutStatus(partnerUserRef);

      if (!result || result.status === 'pending' || result.status === 'processing') {
        throw new Error(`Coinbase still processing: ${partnerUserRef}`);
      }

      if (result.status === 'completed') {
        const metadata: Record<string, unknown> = {};
        if (type === 'ONRAMP') {
          metadata.purchaseAmount = (result as DepositResult).purchaseAmount;
        }
        await deps.confirmDepositHandler.execute({
          providerRef: partnerUserRef,
          providerStatus: 'success',
          metadata,
        });
        return { status: 'CONFIRMED' };
      }

      if (result.status === 'failed') {
        await deps.confirmDepositHandler.execute({
          providerRef: partnerUserRef,
          providerStatus: 'failed',
          metadata: { failureReason: result.failureReason },
        });
        return { status: 'FAILED' };
      }

      throw new Error(`Unknown Coinbase status: ${result.status}`);
    },
    {
      connection: redisConnection,
      concurrency: 10,
    },
  );
}
