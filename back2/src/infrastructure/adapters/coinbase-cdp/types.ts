// ============================================
// Session Token
// ============================================

export interface CoinbaseSessionTokenRequest {
  addresses: Array<{
    address: string;
    blockchains: string[];
  }>;
  assets?: string[];
}

export interface CoinbaseSessionTokenResponse {
  token: string;
  channel_id: string;
}

// ============================================
// Buy Quote (Onramp)
// ============================================

export interface CoinbaseBuyQuoteRequest {
  purchaseCurrency: string;
  paymentAmount: string;
  paymentCurrency: string;
  paymentMethod: string;
  country: string;
  purchaseNetwork?: string;
  destinationAddress?: string;
}

export interface CoinbaseAmountValue {
  value: string;
  currency: string;
}

export interface CoinbaseBuyQuoteResponse {
  quote_id: string;
  purchase_amount: CoinbaseAmountValue;
  payment_subtotal: CoinbaseAmountValue;
  coinbase_fee: CoinbaseAmountValue;
  network_fee: CoinbaseAmountValue;
  payment_total: CoinbaseAmountValue;
  onramp_url?: string;
}

// ============================================
// Sell Quote (Offramp)
// ============================================

export interface CoinbaseSellQuoteRequest {
  sellCurrency: string;
  sellAmount: string;
  cashoutCurrency: string;
  paymentMethod: string;
  country: string;
  sellNetwork?: string;
  sourceAddress?: string;
  redirectUrl?: string;
  partnerUserId?: string;
}

export interface CoinbaseSellQuoteResponse {
  quote_id: string;
  sell_amount: CoinbaseAmountValue;
  cashout_subtotal: CoinbaseAmountValue;
  cashout_total: CoinbaseAmountValue;
  coinbase_fee: CoinbaseAmountValue;
  offramp_url?: string;
}

// ============================================
// Transaction Status
// ============================================

export type CoinbaseTransactionStatus =
  // Onramp statuses (ONRAMP_TRANSACTION_STATUS_*)
  | 'ONRAMP_TRANSACTION_STATUS_IN_PROGRESS'
  | 'ONRAMP_TRANSACTION_STATUS_SUCCESS'
  | 'ONRAMP_TRANSACTION_STATUS_FAILED'
  // Offramp statuses (TRANSACTION_STATUS_* — no OFFRAMP_ prefix per API)
  | 'TRANSACTION_STATUS_STARTED'
  | 'TRANSACTION_STATUS_SUCCESS'
  | 'TRANSACTION_STATUS_FAILED';

export interface CoinbaseTransaction {
  transaction_id: string;
  status: CoinbaseTransactionStatus;
  purchase_amount?: CoinbaseAmountValue;
  payment_amount?: CoinbaseAmountValue;
  sell_amount?: CoinbaseAmountValue;
  cashout_amount?: CoinbaseAmountValue;
  wallet_address?: string;
  tx_hash?: string;
  created_at: string;
  completed_at?: string;
}

export interface CoinbaseTransactionsResponse {
  transactions: CoinbaseTransaction[];
  next_page_key?: string;
  total_count?: number;
}

// ============================================
// Webhook
// ============================================

// Coinbase sends camelCase webhook payloads (not snake_case)
export interface CoinbaseCdpWebhookPayload {
  eventType:
    | 'onramp.transaction.created'
    | 'onramp.transaction.updated'
    | 'onramp.transaction.success'
    | 'onramp.transaction.failed'
    | 'offramp.transaction.created'
    | 'offramp.transaction.updated'
    | 'offramp.transaction.success'
    | 'offramp.transaction.failed';
  transactionId: string;
  partnerUserRef: string;
  status: string;
  metadata?: Record<string, unknown>;
}
