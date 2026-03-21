/**
 * Circle User-Controlled Wallets API types
 */

export interface CircleWallet {
  id: string;
  state: 'LIVE' | 'PENDING' | 'FROZEN';
  custodyType: 'USER' | 'DEVELOPER';
  userId?: string;
  address: string;
  blockchain: string;
  accountType: string;
  updateDate: string;
  createDate: string;
  refId?: string;
  name?: string;
  // Only for developer-controlled
  walletSetId?: string;
  initialPublicKey?: string;
}

export interface CircleTokenBalance {
  token: {
    id: string;
    name: string;
    standard: string;
    blockchain: string;
    decimals: number;
    isNative: boolean;
    symbol: string;
    updateDate: string;
  };
  amount: string;
  updateDate: string;
}

export interface CircleTransaction {
  id: string;
  state:
    | 'INITIATED'
    | 'PENDING_RISK_SCREENING'
    | 'DENIED'
    | 'QUEUED'
    | 'SENT'
    | 'CONFIRMED'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCELLED';
  txHash?: string;
  walletId: string;
  sourceAddress?: string;
  destinationAddress: string;
  transactionType: string;
  custodyType: string;
  userId?: string;
  amounts: string[];
  tokenId: string;
  blockchain: string;
  networkFee?: string;
  firstConfirmDate?: string;
  operation: 'TRANSFER' | 'CONTRACT_EXECUTION' | 'CONTRACT_DEPLOYMENT';
  feeLevel?: string;
  estimatedFee?: {
    gasLimit: string;
    baseFee: string;
    priorityFee: string;
    maxFee: string;
    networkFee: string;
  };
  errorReason?: string;
  errorDetails?: string;
  createDate: string;
  updateDate: string;
}

export interface CircleChallenge {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'EXPIRED';
  type: string;
  correlationIds?: string[];
  errorCode?: number;
  errorMessage?: string;
  createDate: string;
  updateDate: string;
}

export interface CircleUserToken {
  userToken: string;
  encryptionKey: string;
}

export interface CircleWebhookPayload {
  subscriptionId: string;
  notificationId: string;
  notificationType: string;
  notification: {
    id: string;
    blockchain: string;
    walletId: string;
    tokenId?: string;
    userId?: string;
    destinationAddress?: string;
    amounts?: string[];
    txHash?: string;
    transactionType: string;
    state: string;
    createDate: string;
    updateDate: string;
    errorReason?: string;
  };
  timestamp: string;
  version: number;
}
