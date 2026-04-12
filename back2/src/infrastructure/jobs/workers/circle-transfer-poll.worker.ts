import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { WalletProvider } from '../../../domain/ports/WalletProvider';
import { WalletRepository } from '../../../domain/ports/repositories/WalletRepository';
import { TransactionRepository } from '../../../domain/ports/repositories/TransactionRepository';
import { ConfirmTransferHandler } from '../../../application/commands/ConfirmTransferHandler';
import { logger } from '../../../shared/utils/logger';

export interface CircleTransferPollingJobData {
  transactionId: string;
}

export function createCircleTransferPollingWorker(deps: {
  walletProvider: WalletProvider;
  walletRepo: WalletRepository;
  transactionRepo: TransactionRepository;
  confirmTransferHandler: ConfirmTransferHandler;
}) {
  return new Worker<CircleTransferPollingJobData>(
    'circle-transfer-polling',
    async (job: Job<CircleTransferPollingJobData>) => {
      const { transactionId } = job.data;

      logger.info({
        msg: 'Polling Circle transfer status',
        transactionId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      });

      // Idempotency: skip if already terminal
      const transaction = await deps.transactionRepo.findById(transactionId);
      if (!transaction) {
        logger.warn({ transactionId }, 'Transaction not found in polling worker');
        return { status: 'NOT_FOUND' };
      }
      if (transaction.isTerminal()) {
        logger.info({ transactionId, status: transaction.status }, 'Transfer already terminal, skipping');
        return { status: 'ALREADY_TERMINAL' };
      }

      // Resolve sender wallet
      const senderWallet = await deps.walletRepo.findById(transaction.walletId);
      if (!senderWallet || !senderWallet.circleWalletId) {
        throw new Error(`Sender wallet not found or has no circleWalletId for transaction ${transactionId}`);
      }

      let circleStatus: 'pending' | 'complete' | 'failed';
      let circleTransferId: string | undefined;
      let txHash: string | undefined;

      if (transaction.externalRef) {
        // Webhook already provided the Circle transfer ID — use app-scoped lookup
        const result = await deps.walletProvider.getTransferStatus(transaction.externalRef);
        circleStatus = result.status;
        circleTransferId = result.id;
        txHash = result.txHash;
      } else {
        // No Circle transfer ID yet — list user's wallet transactions to find it
        const { userToken } = await deps.walletProvider.getUserToken(senderWallet.userId);
        const transfers = await deps.walletProvider.listWalletTransactions(
          senderWallet.circleWalletId,
          userToken
        );

        // Take the first terminal transfer (at most one in-flight per wallet)
        const terminal = transfers.find((t) => t.status === 'complete' || t.status === 'failed');
        if (!terminal) {
          throw new Error(`Circle transfer still pending for transaction ${transactionId}`);
        }

        circleStatus = terminal.status;
        circleTransferId = terminal.id;
        txHash = terminal.txHash;
      }

      if (circleStatus === 'pending') {
        throw new Error(`Circle transfer still pending for transaction ${transactionId}`);
      }

      await deps.confirmTransferHandler.execute({
        circleWalletId: senderWallet.circleWalletId,
        circleStatus,
        circleTransferId,
        txHash,
      });

      return { status: circleStatus === 'complete' ? 'CONFIRMED' : 'FAILED' };
    },
    {
      connection: redisConnection,
      concurrency: 10,
    },
  );
}
