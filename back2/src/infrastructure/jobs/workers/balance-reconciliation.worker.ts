import { Worker } from 'bullmq';
import Decimal from 'decimal.js';
import { redisConnection } from '../connection';
import { WalletProvider } from '../../../domain/ports/WalletProvider';
import { WalletRepository } from '../../../domain/ports/repositories/WalletRepository';
import { logger } from '../../../shared/utils/logger';

// Minimum drift to act on (1 micro-USDC — avoids float noise)
const DRIFT_THRESHOLD = new Decimal('0.000001');

export function createBalanceReconciliationWorker(deps: {
  walletProvider: WalletProvider;
  walletRepo: WalletRepository;
}) {
  return new Worker(
    'balance-reconciliation',
    async () => {
      const wallets = await deps.walletRepo.findAllActive();

      logger.info({ count: wallets.length }, 'Starting balance reconciliation');

      let driftCount = 0;

      for (const wallet of wallets) {
        try {
          const { userToken } = await deps.walletProvider.getUserToken(wallet.userId);
          const circleBalance = await deps.walletProvider.getBalance(wallet.circleWalletId, userToken);

          const circleAmount = new Decimal(circleBalance.amount);
          const dbAmount = wallet.balance;
          const diff = circleAmount.sub(dbAmount);

          if (diff.abs().lt(DRIFT_THRESHOLD)) continue;

          driftCount++;

          if (diff.gt(0)) {
            // Circle has more than DB → we missed crediting something (e.g. inbound tx without webhook)
            logger.error(
              {
                walletId: wallet.id,
                userId: wallet.userId,
                dbBalance: dbAmount.toString(),
                circleBalance: circleAmount.toString(),
                diff: diff.toString(),
              },
              'Balance drift: Circle > DB — auto-correcting (missed credit)'
            );
            await deps.walletRepo.updateBalance(wallet.id, circleAmount);
          } else {
            // DB has more than Circle → potential overcredit bug — do NOT auto-correct
            logger.error(
              {
                walletId: wallet.id,
                userId: wallet.userId,
                dbBalance: dbAmount.toString(),
                circleBalance: circleAmount.toString(),
                diff: diff.toString(),
              },
              'Balance drift: DB > Circle — manual investigation required, NOT auto-correcting'
            );
          }
        } catch (err) {
          logger.error({ walletId: wallet.id, err }, 'Failed to reconcile wallet balance, skipping');
        }
      }

      logger.info({ total: wallets.length, driftCount }, 'Balance reconciliation complete');
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );
}
