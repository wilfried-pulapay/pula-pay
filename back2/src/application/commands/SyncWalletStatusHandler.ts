import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { logger } from '../../shared/utils/logger';

export interface SyncWalletStatusCommand {
  userId: string;
}

export interface SyncWalletStatusResult {
  walletId: string;
  previousStatus: string;
  currentStatus: string;
  wasUpdated: boolean;
}

/**
 * Syncs wallet status with Circle.
 * Useful for manually fixing wallets stuck in PENDING state.
 */
export class SyncWalletStatusHandler {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly walletProvider: WalletProvider
  ) {}

  async execute(command: SyncWalletStatusCommand): Promise<SyncWalletStatusResult> {
    const wallet = await this.walletRepo.findByUserId(command.userId);
    if (!wallet) {
      throw new WalletNotFoundError(command.userId, 'userId');
    }

    const previousStatus = wallet.status;

    try {
      const { userToken } = await this.walletProvider.getUserToken(command.userId);
      const circleWallet = await this.walletProvider.getWallet(wallet.circleWalletId, userToken);

      logger.info(
        { walletId: wallet.id, circleWalletId: wallet.circleWalletId, circleState: circleWallet.state },
        'Retrieved wallet status from Circle'
      );

      if (circleWallet.state === 'LIVE' && wallet.isPending()) {
        wallet.activate();
        await this.walletRepo.update(wallet);

        logger.info(
          { walletId: wallet.id, circleWalletId: wallet.circleWalletId },
          'Wallet status synced: PENDING -> ACTIVE'
        );

        return {
          walletId: wallet.id,
          previousStatus,
          currentStatus: wallet.status,
          wasUpdated: true,
        };
      }

      logger.info(
        { walletId: wallet.id, status: wallet.status, circleState: circleWallet.state },
        'Wallet status already in sync'
      );

      return {
        walletId: wallet.id,
        previousStatus,
        currentStatus: wallet.status,
        wasUpdated: false,
      };
    } catch (error) {
      logger.error(
        { error, walletId: wallet.id, circleWalletId: wallet.circleWalletId },
        'Failed to sync wallet status with Circle'
      );
      throw error;
    }
  }
}
