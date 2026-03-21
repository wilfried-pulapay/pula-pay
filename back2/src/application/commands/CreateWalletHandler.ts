import { Blockchain } from '@prisma/client';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { UserRepository } from '../../domain/ports/repositories/UserRepository';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { UserNotFoundError } from '../../domain/errors/UserNotFoundError';
import { generateIdempotencyKey } from '../../shared/utils/idempotency';
import { logger } from '../../shared/utils/logger';
import { config } from '../../shared/config';

export interface CreateWalletCommand {
  userId: string;
  blockchain?: Blockchain;
  idempotencyKey?: string;
}

/**
 * Result returned to the mobile after wallet setup initiation.
 * The mobile must resolve the challenge using Circle SDK (PIN setup),
 * then call POST /wallet/confirm-setup to finalize.
 */
export interface CreateWalletResult {
  challengeId: string;
  userToken: string;
  encryptionKey: string;
  appId: string;
}

export class CreateWalletHandler {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly walletRepo: WalletRepository,
    private readonly walletProvider: WalletProvider
  ) {}

  async execute(command: CreateWalletCommand): Promise<CreateWalletResult> {
    const idempotencyKey = command.idempotencyKey ?? generateIdempotencyKey();
    const blockchain = (command.blockchain ?? config.blockchain.default) as Blockchain;

    // Check user exists
    const user = await this.userRepo.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // If wallet already exists, get a fresh user token so mobile can re-confirm
    const existingWallet = await this.walletRepo.findByUserId(command.userId);
    if (existingWallet) {
      logger.info({ userId: command.userId }, 'Wallet already exists — returning fresh user token');
      const tokenResult = await this.walletProvider.getUserToken(command.userId);
      return {
        challengeId: '',
        userToken: tokenResult.userToken,
        encryptionKey: tokenResult.encryptionKey,
        appId: config.circle.appId,
      };
    }

    // 1. Ensure user is registered in Circle
    await this.walletProvider.registerUser(command.userId);

    // 2. Get a user token for this session
    const tokenResult = await this.walletProvider.getUserToken(command.userId);

    // 3. Initiate wallet setup — returns challengeId for PIN setup on mobile
    const setupResult = await this.walletProvider.initiateWalletSetup({
      userId: command.userId,
      userToken: tokenResult.userToken,
      blockchain,
      idempotencyKey,
    });

    logger.info(
      { userId: command.userId, challengeId: setupResult.challengeId },
      'Wallet setup initiated — awaiting mobile PIN challenge resolution'
    );

    return {
      challengeId: setupResult.challengeId,
      userToken: tokenResult.userToken,
      encryptionKey: tokenResult.encryptionKey,
      appId: config.circle.appId,
    };
  }
}
