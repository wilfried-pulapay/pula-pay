import { Blockchain } from '@prisma/client';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { UserRepository } from '../../domain/ports/repositories/UserRepository';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { UserNotFoundError } from '../../domain/errors/UserNotFoundError';
import { logger } from '../../shared/utils/logger';
import { config } from '../../shared/config';

export interface ConfirmWalletSetupCommand {
  userId: string;
  userToken: string;
  blockchain?: Blockchain;
}

export interface ConfirmWalletSetupResult {
  walletId: string;
  address: string;
  blockchain: Blockchain;
  status: 'active' | 'pending';
}

/**
 * Called after the mobile app resolves the Circle wallet setup challenge (PIN setup).
 * Fetches the created wallet from Circle and persists it locally.
 */
export class ConfirmWalletSetupHandler {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly walletRepo: WalletRepository,
    private readonly walletProvider: WalletProvider
  ) {}

  async execute(command: ConfirmWalletSetupCommand): Promise<ConfirmWalletSetupResult> {
    const blockchain = (command.blockchain ?? config.blockchain.default) as Blockchain;

    const user = await this.userRepo.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // If wallet already exists and is active, return it
    const existingWallet = await this.walletRepo.findByUserId(command.userId);
    if (existingWallet?.isActive()) {
      return {
        walletId: existingWallet.id,
        address: existingWallet.address,
        blockchain: existingWallet.blockchain,
        status: 'active',
      };
    }

    // Fetch wallets from Circle (created after challenge resolution)
    const circleWallets = await this.walletProvider.getWalletsForUser(command.userToken);

    if (!circleWallets.length) {
      throw new Error('No wallets found in Circle after setup confirmation. Challenge may not be resolved yet.');
    }

    // Pick the first LIVE wallet on the target blockchain (or just the first one)
    const circleWallet =
      circleWallets.find((w) => w.state === 'LIVE') ?? circleWallets[0];

    // If wallet record exists but not yet confirmed, update it
    if (existingWallet) {
      existingWallet.activate();
      await this.walletRepo.update(existingWallet);
      logger.info({ userId: command.userId, walletId: existingWallet.id }, 'Wallet confirmed and activated');
      return {
        walletId: existingWallet.id,
        address: existingWallet.address,
        blockchain: existingWallet.blockchain,
        status: 'active',
      };
    }

    // Create the local wallet record
    const wallet = await this.walletRepo.create({
      userId: command.userId,
      circleWalletId: circleWallet.id,
      walletSetId: null,
      address: circleWallet.address,
      blockchain,
    });

    if (circleWallet.state === 'LIVE') {
      wallet.activate();
      await this.walletRepo.update(wallet);
    }

    logger.info(
      { userId: command.userId, walletId: wallet.id, address: wallet.address },
      'Wallet confirmed and created locally'
    );

    return {
      walletId: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      status: circleWallet.state === 'LIVE' ? 'active' : 'pending',
    };
  }
}
