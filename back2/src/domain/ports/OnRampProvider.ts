import { Currency, OnRampProvider as Provider } from '@prisma/client';

export interface InitiateDepositParams {
  userId: string;
  amount: number;
  currency: Currency;
  idempotencyKey: string;
  callbackUrl: string;
  walletAddress: string;
  blockchain?: string;
  country?: string;
  paymentMethod?: string;
}

export interface DepositResult {
  providerRef: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentUrl?: string;
  quoteId?: string;
  purchaseAmount?: string;
  failureReason?: string;
  fees?: {
    coinbaseFee?: string;
    networkFee?: string;
    paymentTotal?: string;
  };
}

export interface InitiatePayoutParams {
  userId: string;
  amount: number;
  currency: Currency;
  idempotencyKey: string;
  walletAddress: string;
  blockchain?: string;
  country?: string;
  paymentMethod?: string;
  cashoutCurrency?: Currency;
  redirectUrl?: string;
}

export interface PayoutResult {
  providerRef: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentUrl?: string;
  quoteId?: string;
  failureReason?: string;
  fees?: {
    coinbaseFee?: string;
    cashoutTotal?: string;
  };
}

/**
 * Port for fiat on/off-ramp provider (Coinbase CDP)
 */
export interface OnRampProvider {
  readonly providerCode: Provider;

  initiateDeposit(params: InitiateDepositParams): Promise<DepositResult>;
  getDepositStatus(providerRef: string): Promise<DepositResult>;
  initiatePayout(params: InitiatePayoutParams): Promise<PayoutResult>;
  getPayoutStatus(providerRef: string): Promise<PayoutResult>;
  validateWebhook(headers: Record<string, string>, body: unknown): boolean;
}
