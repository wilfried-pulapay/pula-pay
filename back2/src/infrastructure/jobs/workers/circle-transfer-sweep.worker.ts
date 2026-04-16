import { Worker } from 'bullmq';
import { redisConnection } from '../connection';
import { WalletProvider } from '../../../domain/ports/WalletProvider';
import { WalletRepository } from '../../../domain/ports/repositories/WalletRepository';
import { TransactionRepository } from '../../../domain/ports/repositories/TransactionRepository';
import { ConfirmTransferHandler } from '../../../application/commands/ConfirmTransferHandler';
import { logger } from '../../../shared/utils/logger';

const STALE_AFTER_MS = 2 * 60 * 1000;   // Start checking after 2 min
const EXPIRE_AFTER_MS = 20 * 60 * 1000; // Expire after 20 min

export function createCircleTransferSweepWorker(deps: {
  walletProvider: WalletProvider;
  walletRepo: WalletRepository;
  transactionRepo: TransactionRepository;
  confirmTransferHandler: ConfirmTransferHandler;
}) {
  return new Worker(
    'circle-transfer-sweep',
    async () => {
      const staleThreshold = new Date(Date.now() - STALE_AFTER_MS);
      const pendingTransfers = await deps.transactionRepo.findStalePendingTransfers(staleThreshold);

      if (pendingTransfers.length === 0) return;

      logger.info({ count: pendingTransfers.length }, 'Circle transfer sweep: checking stale pending transfers');

      for (const transaction of pendingTransfers) {
        try {
          // Expire transactions that have been pending too long
          if (Date.now() - transaction.createdAt.getTime() > EXPIRE_AFTER_MS) {
            transaction.expire();
            await deps.transactionRepo.update(transaction);
            logger.info({ transactionId: transaction.id }, 'Circle transfer sweep: expired stale transfer');
            continue;
          }

          const senderWallet = await deps.walletRepo.findById(transaction.walletId);
          if (!senderWallet?.circleWalletId) {
            logger.warn({ transactionId: transaction.id }, 'Circle transfer sweep: sender wallet not found, skipping');
            continue;
          }

          let circleStatus: 'pending' | 'complete' | 'failed';
          let circleTransferId: string | undefined;
          let txHash: string | undefined;

          if (transaction.externalRef) {
            // Webhook already provided the Circle transfer ID — use it directly
            const result = await deps.walletProvider.getTransferStatus(transaction.externalRef);
            circleStatus = result.status;
            circleTransferId = result.id;
            txHash = result.txHash;
          } else {
            // No Circle ID yet — list outbound transfers for this wallet
            // Assumption: at most one in-flight transfer per wallet (mobile UX enforces this)
            const { userToken } = await deps.walletProvider.getUserToken(senderWallet.userId);
            const transfers = await deps.walletProvider.listWalletTransactions(
              senderWallet.circleWalletId,
              userToken
            );
            const terminal = transfers.find((t) => t.status === 'complete' || t.status === 'failed');
            if (!terminal) {
              logger.debug({ transactionId: transaction.id }, 'Circle transfer sweep: transfer still pending on Circle, will retry next sweep');
              continue;
            }
            circleStatus = terminal.status;
            circleTransferId = terminal.id;
            txHash = terminal.txHash;
          }

          if (circleStatus === 'pending') continue;

          await deps.confirmTransferHandler.execute({
            circleWalletId: senderWallet.circleWalletId,
            circleStatus,
            circleTransferId,
            txHash,
          });

          logger.info({ transactionId: transaction.id, circleStatus }, 'Circle transfer sweep: resolved transfer');
        } catch (err) {
          logger.error({ transactionId: transaction.id, err }, 'Circle transfer sweep: error processing transfer, skipping');
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );
}
