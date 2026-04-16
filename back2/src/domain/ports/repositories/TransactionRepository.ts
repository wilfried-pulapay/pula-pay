import Decimal from 'decimal.js';
import { TxType, TxStatus, Currency, OnRampProvider } from '@prisma/client';
import { Transaction } from '../../entities/Transaction';
import { PaginationParams, PaginatedResult } from '../../../shared/types';

export interface CreateTransactionParams {
  idempotencyKey: string;
  type: TxType;
  status?: TxStatus;
  amountUsdc: Decimal;
  feeUsdc?: Decimal;
  exchangeRate?: Decimal;
  displayCurrency?: Currency;
  displayAmount?: Decimal;
  walletId: string;
  counterpartyId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  challengeId?: string;
}

export interface CreateOnRampDetailsParams {
  transactionId: string;
  provider: OnRampProvider;
  providerRef: string;
  fiatCurrency: Currency;
  fiatAmount: Decimal;
  providerStatus: string;
  providerData?: Record<string, unknown>;
}

export interface TransactionFilters {
  walletId?: string;
  type?: TxType;
  status?: TxStatus;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Repository port for Transaction persistence
 */
export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByIdempotencyKey(key: string): Promise<Transaction | null>;
  findByExternalRef(ref: string): Promise<Transaction | null>;
  findByWalletId(
    walletId: string,
    filters?: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>>;
  create(params: CreateTransactionParams): Promise<Transaction>;
  update(transaction: Transaction): Promise<Transaction>;
  setChallengeId(id: string, challengeId: string): Promise<void>;
  findStalePendingTransfers(olderThan: Date): Promise<Transaction[]>;
  createOnRampDetails(params: CreateOnRampDetailsParams): Promise<void>;
  updateOnRampStatus(transactionId: string, status: string, data?: Record<string, unknown>): Promise<void>;
}
