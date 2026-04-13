import Decimal from 'decimal.js';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { logger } from '../../shared/utils/logger';

export interface ReconcileBalanceCommand {
  userId: string;
}

export interface ReconcileBalanceResult {
  walletId: string;
  dbBalance: string;
  circleBalance: string;
  diff: string;
  corrected: boolean;
  /** true if DB > Circle — requires manual investigation, no auto-correct */
  alertOnly: boolean;
}

const DRIFT_THRESHOLD = new Decimal('0.000001');

/**
 * Compares the authenticated user's wallet balance in DB against Circle's live value.
 * Auto-corrects if Circle > DB (missed credit). Alerts only if DB > Circle (potential bug).
 */
export class ReconcileBalanceHandler {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly walletProvider: WalletProvider,
  ) {}

  async execute(command: ReconcileBalanceCommand): Promise<ReconcileBalanceResult> {
    const wallet = await this.walletRepo.findByUserId(command.userId);
    if (!wallet) {
      throw new WalletNotFoundError(command.userId, 'userId');
    }

    const dbBalance = wallet.balance;

    const { userToken } = await this.walletProvider.getUserToken(command.userId);
    const circleBalanceData = await this.walletProvider.getBalance(wallet.circleWalletId, userToken);
    const circleBalance = new Decimal(circleBalanceData.amount);

    const diff = circleBalance.sub(dbBalance);

    if (diff.abs().lt(DRIFT_THRESHOLD)) {
      logger.info({ walletId: wallet.id, balance: dbBalance.toString() }, 'Balance in sync with Circle');
      return {
        walletId: wallet.id,
        dbBalance: dbBalance.toString(),
        circleBalance: circleBalance.toString(),
        diff: diff.toString(),
        corrected: false,
        alertOnly: false,
      };
    }

    if (diff.gt(0)) {
      // Circle > DB: missed credit — auto-correct
      logger.error(
        { walletId: wallet.id, dbBalance: dbBalance.toString(), circleBalance: circleBalance.toString(), diff: diff.toString() },
        'Balance drift: Circle > DB — auto-correcting'
      );
      await this.walletRepo.updateBalance(wallet.id, circleBalance);
      return {
        walletId: wallet.id,
        dbBalance: dbBalance.toString(),
        circleBalance: circleBalance.toString(),
        diff: diff.toString(),
        corrected: true,
        alertOnly: false,
      };
    }

    // DB > Circle: potential overcredit bug — alert only, no auto-correct
    logger.error(
      { walletId: wallet.id, dbBalance: dbBalance.toString(), circleBalance: circleBalance.toString(), diff: diff.toString() },
      'Balance drift: DB > Circle — manual investigation required, NOT auto-correcting'
    );
    return {
      walletId: wallet.id,
      dbBalance: dbBalance.toString(),
      circleBalance: circleBalance.toString(),
      diff: diff.toString(),
      corrected: false,
      alertOnly: true,
    };
  }
}
