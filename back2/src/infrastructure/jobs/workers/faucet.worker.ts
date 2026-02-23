import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { logger } from '../../../shared/utils/logger';
import { config } from '../../../shared/config';

export interface FaucetJobData {
  walletAddress: string;
  blockchain: string;
}

export function createFaucetWorker(_deps: Record<string, unknown> = {}) {
  return new Worker<FaucetJobData>(
    'faucet',
    async (job: Job<FaucetJobData>) => {
      const { walletAddress, blockchain } = job.data;

      logger.info({ walletAddress, blockchain }, 'Requesting testnet tokens from faucet');

      // Call Circle faucet API directly
      const response = await fetch('https://api.circle.com/v1/faucet/drips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.circle.apiKey}`,
        },
        body: JSON.stringify({
          address: walletAddress,
          blockchain,
          usdc: true,
          native: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Faucet request failed: ${response.status} - ${error}`);
      }

      logger.info({ walletAddress, blockchain }, 'Faucet request completed');
      return { status: 'COMPLETED' };
    },
    {
      connection: redisConnection,
      concurrency: 2,
    },
  );
}
