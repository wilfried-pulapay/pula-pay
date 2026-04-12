import { WalletProvider, WalletDetails } from '../../domain/ports/WalletProvider';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';

export interface GetCircleWalletQuery {
  userId: string;
}

export class GetCircleWalletsHandler {
  constructor(private readonly walletProvider: WalletProvider) {}

  async execute(query: GetCircleWalletQuery): Promise<WalletDetails> {
    const { userToken } = await this.walletProvider.getUserToken(query.userId);
    const wallets = await this.walletProvider.getWalletsForUser(userToken);
    const wallet = wallets.find((w) => w.state === 'LIVE') ?? wallets[0];
    if (!wallet) {
      throw new WalletNotFoundError(query.userId, 'userId');
    }
    return wallet;
  }
}
