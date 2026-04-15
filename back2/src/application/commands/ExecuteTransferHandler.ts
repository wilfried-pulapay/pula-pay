import Decimal from 'decimal.js';
import { Queue } from 'bullmq';
import { Currency, Blockchain } from '@prisma/client';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { UserRepository } from '../../domain/ports/repositories/UserRepository';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { WalletProvider } from '../../domain/ports/WalletProvider';
import { ExchangeRateProvider } from '../../domain/ports/ExchangeRateProvider';
import { Money } from '../../domain/value-objects/Money';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { generateIdempotencyKey } from '../../shared/utils/idempotency';
import { config } from '../../shared/config';
import { logger } from '../../shared/utils/logger';

export interface TransferCommand {
  senderUserId: string;
  recipientPhone?: string;
  recipientWalletAddress?: string;
  amount: number;
  currency: Currency;
  description?: string;
  idempotencyKey?: string;
}

/**
 * Result for user-controlled transfer initiation.
 * The mobile must resolve the challenge (PIN confirmation) via Circle SDK,
 * then the transfer will be executed by Circle automatically.
 */
export interface TransferResult {
  transactionId: string;
  challengeId: string;
  userToken: string;
  encryptionKey: string;
  appId: string;
  amountUsdc: string;
  displayAmount: string;
  displayCurrency: Currency;
  recipientAddress: string;
  status: string;
}

export class ExecuteTransferHandler {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly userRepo: UserRepository,
    private readonly txRepo: TransactionRepository,
    private readonly walletProvider: WalletProvider,
    private readonly exchangeRateProvider: ExchangeRateProvider,
    private readonly circleTransferPollingQueue: Queue,
    private readonly txExpiryQueue: Queue,
  ) {}

  async execute(command: TransferCommand): Promise<TransferResult> {
    const idempotencyKey = command.idempotencyKey ?? generateIdempotencyKey();

    // 1. Idempotency check
    const existing = await this.txRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const recipient = await this.walletRepo.findById(existing.counterpartyId ?? '');
      // Return existing with placeholder challenge data (challenge already issued)
      return {
        transactionId: existing.id,
        challengeId: existing.challengeId ?? '',
        userToken: '',
        encryptionKey: '',
        appId: config.circle.appId,
        amountUsdc: existing.amountUsdc.toString(),
        displayAmount: existing.displayAmount?.toString() ?? '0',
        displayCurrency: existing.displayCurrency ?? command.currency,
        recipientAddress: recipient?.address ?? '',
        status: existing.status,
      };
    }

    // 2. Resolve wallets
    const senderWallet = await this.walletRepo.findByUserId(command.senderUserId);
    if (!senderWallet) {
      throw new WalletNotFoundError(command.senderUserId, 'userId');
    }

    const recipientWallet = command.recipientPhone
      ? await this.walletRepo.findByUserPhone(command.recipientPhone)
      : await this.walletRepo.findByAddress(command.recipientWalletAddress!);

    if (!recipientWallet) {
      throw new WalletNotFoundError(
        command.recipientPhone ?? command.recipientWalletAddress ?? '',
        command.recipientPhone ? 'phone' : 'address'
      );
    }

    // 3. Fetch user names for metadata
    const [senderUser, recipientUser] = await Promise.all([
      this.userRepo.findById(senderWallet.userId),
      this.userRepo.findById(recipientWallet.userId),
    ]);

    // 4. Convert amount to USDC
    const rate = await this.exchangeRateProvider.getRate(command.currency);
    const money = Money.fromFiat(command.amount, command.currency, rate.rate);

    // 5. Validate sender can withdraw
    senderWallet.assertCanWithdraw(money.amountUsdc);
    recipientWallet.assertCanTransact();

    // 6. Get user token for Circle user-controlled signing
    const tokenResult = await this.walletProvider.getUserToken(command.senderUserId);

    // 7. Initiate the transfer challenge on Circle
    const tokenId = this.getUsdcTokenId(senderWallet.blockchain);
    const challenge = await this.walletProvider.initiateTransfer({
      userToken: tokenResult.userToken,
      fromWalletId: senderWallet.circleWalletId,
      toAddress: recipientWallet.address,
      amount: money.amountUsdc.toString(),
      tokenId,
      idempotencyKey,
    });

    // 8. Create transaction record with challengeId (PENDING_CHALLENGE status)
    const transaction = await this.txRepo.create({
      idempotencyKey,
      type: 'TRANSFER_P2P',
      status: 'PENDING',
      amountUsdc: money.amountUsdc,
      feeUsdc: new Decimal(0),
      exchangeRate: rate.rate,
      displayCurrency: command.currency,
      displayAmount: money.displayAmount,
      walletId: senderWallet.id,
      counterpartyId: recipientWallet.id,
      description: command.description,
      challengeId: challenge.challengeId,
      metadata: {
        senderName: senderUser?.name ?? null,
        recipientName: recipientUser?.name ?? null,
      },
    });

    // 10. Enqueue polling fallback + expiry jobs
    await this.circleTransferPollingQueue.add(
      `poll-transfer-${transaction.id}`,
      { transactionId: transaction.id },
      { delay: 30_000, jobId: idempotencyKey }
    );
    await this.txExpiryQueue.add(
      `expire-${transaction.id}`,
      { transactionId: transaction.id },
      { delay: 1_200_000, jobId: `expire-${idempotencyKey}` }
    );

    logger.info(
      {
        transactionId: transaction.id,
        challengeId: challenge.challengeId,
        amountUsdc: money.amountUsdc.toString(),
        from: senderWallet.address,
        to: recipientWallet.address,
      },
      'Transfer challenge initiated — awaiting mobile PIN confirmation'
    );

    return {
      transactionId: transaction.id,
      challengeId: challenge.challengeId,
      userToken: tokenResult.userToken,
      encryptionKey: tokenResult.encryptionKey,
      appId: config.circle.appId,
      amountUsdc: money.amountUsdc.toString(),
      displayAmount: money.displayAmount.toString(),
      displayCurrency: command.currency,
      recipientAddress: recipientWallet.address,
      status: transaction.status,
    };
  }

  private getUsdcTokenId(blockchain: Blockchain): string {
    const tokenId =
      config.usdc.tokenIds[blockchain] ??
      config.usdc.tokenIds['BASE_SEPOLIA'];
    if (!tokenId) {
      throw new Error(`No USDC token ID configured for blockchain: ${blockchain}`);
    }
    return tokenId;
  }
}
