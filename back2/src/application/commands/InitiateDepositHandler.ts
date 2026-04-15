import Decimal from 'decimal.js';
import { Queue } from 'bullmq';
import { Currency } from '@prisma/client';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { TransactionRepository } from '../../domain/ports/repositories/TransactionRepository';
import { OnRampProvider } from '../../domain/ports/OnRampProvider';
import { ExchangeRateProvider } from '../../domain/ports/ExchangeRateProvider';
import { Transaction } from '../../domain/entities/Transaction';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { generateIdempotencyKey } from '../../shared/utils/idempotency';
import { config } from '../../shared/config';
import { logger } from '../../shared/utils/logger';
import type { CoinbasePollingJobData } from '../../infrastructure/jobs/workers/coinbase-poll.worker';

export interface InitiateDepositCommand {
  userId: string;
  fiatAmount: number;
  fiatCurrency: Currency;
  idempotencyKey?: string;
  country?: string;
  paymentMethod?: string;
}

export interface InitiateDepositResult {
  transactionId: string;
  providerRef: string;
  status: string;
  amountUsdc: string;
  displayAmount: string;
  displayCurrency: Currency;
  paymentUrl?: string;
  fees?: {
    coinbaseFee?: string;
    networkFee?: string;
    paymentTotal?: string;
  };
}

export class InitiateDepositHandler {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly txRepo: TransactionRepository,
    private readonly onRampProvider: OnRampProvider,
    private readonly exchangeRateProvider: ExchangeRateProvider,
    private readonly coinbasePollingQueue: Queue<CoinbasePollingJobData>,
    private readonly txExpiryQueue: Queue,
  ) {}

  async execute(command: InitiateDepositCommand): Promise<InitiateDepositResult> {
    const idempotencyKey = command.idempotencyKey ?? generateIdempotencyKey();

    // 1. Check idempotency
    const existing = await this.txRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return this.toResult(existing);
    }

    // 2. Get wallet
    const wallet = await this.walletRepo.findByUserId(command.userId);
    if (!wallet) {
      throw new WalletNotFoundError(command.userId, 'userId');
    }
    wallet.assertCanTransact();

    // 3. Get exchange rate
    const rate = await this.exchangeRateProvider.getRate(command.fiatCurrency);
    const amountUsdc = new Decimal(command.fiatAmount).div(rate.rate).toDecimalPlaces(6);

    // 4. Create PENDING transaction
    const transaction = await this.txRepo.create({
      idempotencyKey,
      type: 'DEPOSIT_ONRAMP',
      status: 'PENDING',
      amountUsdc,
      feeUsdc: new Decimal(0),
      exchangeRate: rate.rate,
      displayCurrency: command.fiatCurrency,
      displayAmount: new Decimal(command.fiatAmount),
      walletId: wallet.id,
      description: 'Top-up via Coinbase',
    });

    // 5. Initiate deposit via provider (Coinbase CDP)
    const depositResult = await this.onRampProvider.initiateDeposit({
      userId: command.userId,
      amount: command.fiatAmount,
      currency: command.fiatCurrency,
      idempotencyKey,
      callbackUrl: `${config.apiUrl}/api/v2/webhooks/coinbase-cdp`,
      walletAddress: wallet.address,
      blockchain: wallet.blockchain,
      country: command.country ?? config.coinbase.defaultCountry,
      paymentMethod: command.paymentMethod ?? 'CARD',
    });

    // 6. Create OnRampTransaction
    await this.txRepo.createOnRampDetails({
      transactionId: transaction.id,
      provider: this.onRampProvider.providerCode,
      providerRef: depositResult.providerRef,
      fiatCurrency: command.fiatCurrency,
      fiatAmount: new Decimal(command.fiatAmount),
      providerStatus: depositResult.status,
    });

    // 7. Update status → PROCESSING
    const compositeRef = `${command.userId}:${depositResult.providerRef}`;
    transaction.markProcessing(depositResult.providerRef);
    await this.txRepo.update(transaction);

    logger.info(
      {
        transactionId: transaction.id,
        providerRef: depositResult.providerRef,
        amountUsdc: amountUsdc.toString(),
        paymentUrl: depositResult.paymentUrl,
      },
      'Deposit initiated'
    );

    // 8. Enqueue BullMQ polling job (durable, survives restarts)
    await this.coinbasePollingQueue.add(
      `poll-deposit-${transaction.id}`,
      {
        transactionId: transaction.id,
        partnerUserRef: compositeRef,
        type: 'ONRAMP' as const,
        idempotencyKey,
      },
      {
        delay: 15_000,
        jobId: idempotencyKey,
      },
    );

    // 9. Schedule expiry (10 min timeout)
    await this.txExpiryQueue.add(
      `expire-${transaction.id}`,
      { transactionId: transaction.id },
      {
        delay: 600_000,
        jobId: `expire-${idempotencyKey}`,
      },
    );

    return this.toResult(transaction, depositResult.providerRef, depositResult.paymentUrl, depositResult.fees);
  }

  private toResult(
    tx: Transaction,
    providerRef?: string,
    paymentUrl?: string,
    fees?: { coinbaseFee?: string; networkFee?: string; paymentTotal?: string }
  ): InitiateDepositResult {
    return {
      transactionId: tx.id,
      providerRef: providerRef ?? tx.externalRef ?? '',
      status: tx.status,
      amountUsdc: tx.amountUsdc.toString(),
      displayAmount: tx.displayAmount?.toString() ?? '0',
      displayCurrency: tx.displayCurrency ?? 'USD',
      paymentUrl,
      fees,
    };
  }
}
