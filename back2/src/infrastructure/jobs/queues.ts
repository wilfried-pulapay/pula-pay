import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export const coinbasePollingQueue = new Queue('coinbase-polling', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 60,
    backoff: { type: 'fixed', delay: 10_000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

export const txExpiryQueue = new Queue('tx-expiry', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export const faucetQueue = new Queue('faucet', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
  },
});

export const circleTransferPollingQueue = new Queue('circle-transfer-polling', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 40,
    backoff: { type: 'fixed', delay: 15_000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});
