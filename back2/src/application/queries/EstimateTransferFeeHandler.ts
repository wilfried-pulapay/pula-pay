import { Currency } from '@prisma/client';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { ExchangeRateProvider } from '../../domain/ports/ExchangeRateProvider';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { Money } from '../../domain/value-objects/Money';
import { config } from '../../shared/config';

export interface EstimateTransferFeeQuery {
  userId: string;
  recipientAddress: string;
  amount: number;
  currency: Currency;
}

export interface EstimateTransferFeeResult {
  networkFee: string;
  amountUsdc: string;
}

export class EstimateTransferFeeHandler {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly walletProvider: WalletProvider,
    private readonly exchangeRateProvider: ExchangeRateProvider,
  ) {}

  async execute(query: EstimateTransferFeeQuery): Promise<EstimateTransferFeeResult> {
    const wallet = await this.walletRepo.findByUserId(query.userId);
    if (!wallet) {
      throw new WalletNotFoundError(query.userId, 'userId');
    }

    const rate = await this.exchangeRateProvider.getRate(query.currency);
    const money = Money.fromFiat(query.amount, query.currency, rate.rate);

    const tokenId = config.usdc.tokenIds[wallet.blockchain] ?? config.usdc.tokenIds['BASE_SEPOLIA'];

    const { userToken } = await this.walletProvider.getUserToken(query.userId);

    const networkFee = await this.walletProvider.estimateFee({
      userToken,
      fromWalletId: wallet.circleWalletId,
      toAddress: query.recipientAddress,
      amount: money.amountUsdc.toString(),
      tokenId,
    });

    return {
      networkFee,
      amountUsdc: money.amountUsdc.toString(),
    };
  }
}
