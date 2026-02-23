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

export interface InitiateWithdrawalCommand {
  userId: string;
  fiatAmount: number;
  fiatCurrency: Currency;
  idempotencyKey?: string;
  country?: string;
  paymentMethod?: string;
}

export interface InitiateWithdrawalResult {
  transactionId: string;
  providerRef: string;
  status: string;
  amountUsdc: string;
  feeUsdc: string;
  displayAmount: string;
  displayCurrency: Currency;
  paymentUrl?: string;
  fees?: {
    coinbaseFee?: string;
    cashoutTotal?: string;
  };
}

export class InitiateWithdrawalHandler {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly txRepo: TransactionRepository,
    private readonly onRampProvider: OnRampProvider,
    private readonly exchangeRateProvider: ExchangeRateProvider,
    private readonly coinbasePollingQueue: Queue<CoinbasePollingJobData>,
    private readonly txExpiryQueue: Queue,
  ) {}

  async execute(command: InitiateWithdrawalCommand): Promise<InitiateWithdrawalResult> {
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

    // 3. Get exchange rate and convert fiat to USDC
    const rate = await this.exchangeRateProvider.getRate(command.fiatCurrency);
    const fiatAmount = new Decimal(command.fiatAmount);
    const amountUsdc = fiatAmount.div(rate.rate).toDecimalPlaces(6);

    // 4. Calculate fee (1.5% for withdrawals)
    const fee = amountUsdc.mul(0.015).toDecimalPlaces(6);
    const totalRequired = amountUsdc.add(fee);

    // 5. Validate balance
    wallet.assertCanWithdraw(totalRequired);

    // 6. Create PENDING transaction
    const transaction = await this.txRepo.create({
      idempotencyKey,
      type: 'WITHDRAWAL_OFFRAMP',
      status: 'PENDING',
      amountUsdc,
      feeUsdc: fee,
      exchangeRate: rate.rate,
      displayCurrency: command.fiatCurrency,
      displayAmount: fiatAmount,
      walletId: wallet.id,
    });

    // 7. Initiate payout via provider (Coinbase CDP)
    const payoutResult = await this.onRampProvider.initiatePayout({
      userId: command.userId,
      amount: amountUsdc.toNumber(),
      currency: command.fiatCurrency,
      idempotencyKey,
      walletAddress: wallet.address,
      blockchain: wallet.blockchain,
      country: command.country ?? config.coinbase.defaultCountry,
      paymentMethod: command.paymentMethod ?? 'ACH_BANK_ACCOUNT',
      cashoutCurrency: command.fiatCurrency,
    });

    // 8. Create OnRampTransaction
    await this.txRepo.createOnRampDetails({
      transactionId: transaction.id,
      provider: this.onRampProvider.providerCode,
      providerRef: payoutResult.providerRef,
      fiatCurrency: command.fiatCurrency,
      fiatAmount: fiatAmount,
      providerStatus: payoutResult.status,
    });

    // 9. Update status → PROCESSING
    const compositeRef = `${command.userId}:${payoutResult.providerRef}`;
    transaction.markProcessing(payoutResult.providerRef);
    await this.txRepo.update(transaction);

    logger.info(
      {
        transactionId: transaction.id,
        providerRef: payoutResult.providerRef,
        amountUsdc: amountUsdc.toString(),
        fee: fee.toString(),
        paymentUrl: payoutResult.paymentUrl,
      },
      'Withdrawal initiated'
    );

    // 10. Enqueue BullMQ polling job
    await this.coinbasePollingQueue.add(
      `poll-withdrawal-${transaction.id}`,
      {
        transactionId: transaction.id,
        partnerUserRef: compositeRef,
        type: 'OFFRAMP' as const,
        idempotencyKey,
      },
      {
        delay: 15_000,
        jobId: `withdraw-${idempotencyKey}`,
      },
    );

    // 11. Schedule expiry (10 min timeout)
    await this.txExpiryQueue.add(
      `expire-${transaction.id}`,
      { transactionId: transaction.id },
      {
        delay: 600_000,
        jobId: `expire-${idempotencyKey}`,
      },
    );

    return this.toResult(transaction, payoutResult.providerRef, payoutResult.paymentUrl, payoutResult.fees);
  }

  private toResult(
    tx: Transaction,
    providerRef?: string,
    paymentUrl?: string,
    fees?: { coinbaseFee?: string; cashoutTotal?: string }
  ): InitiateWithdrawalResult {
    return {
      transactionId: tx.id,
      providerRef: providerRef ?? tx.externalRef ?? '',
      status: tx.status,
      amountUsdc: tx.amountUsdc.toString(),
      feeUsdc: tx.feeUsdc.toString(),
      displayAmount: tx.displayAmount?.toString() ?? '0',
      displayCurrency: tx.displayCurrency ?? 'USD',
      paymentUrl,
      fees,
    };
  }
}
