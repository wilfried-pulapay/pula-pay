import { Blockchain } from '@prisma/client';

// ─── User token ──────────────────────────────────────────────────────────────

export interface UserTokenResult {
  userToken: string;
  encryptionKey: string;
}

// ─── Wallet setup (user-controlled) ─────────────────────────────────────────

export interface InitiateWalletSetupParams {
  userId: string;
  userToken: string;
  blockchain: Blockchain;
  idempotencyKey: string;
}

export interface WalletSetupResult {
  challengeId: string;
}

// ─── Balance ──────────────────────────────────────────────────────────────────

export interface WalletBalance {
  tokenId: string;
  amount: string;
  blockchain: string;
}

// ─── Transfer (user-controlled) ──────────────────────────────────────────────

export interface InitiateTransferParams {
  userToken: string;
  fromWalletId: string;
  toAddress: string;
  amount: string;
  tokenId: string;
  idempotencyKey: string;
}

export interface TransferChallengeResult {
  challengeId: string;
}

// ─── Fee estimation ───────────────────────────────────────────────────────────

export interface EstimateFeeParams {
  userToken: string;
  fromWalletId: string;
  toAddress: string;
  amount: string;
  tokenId: string;
}

// ─── Transfer info (for polling) ─────────────────────────────────────────────

export interface CircleTransferInfo {
  id: string;
  status: 'pending' | 'complete' | 'failed';
  txHash?: string;
}

// ─── Wallet details ───────────────────────────────────────────────────────────

export interface WalletDetails {
  id: string;
  address: string;
  blockchain: string;
  state: 'LIVE' | 'PENDING' | 'FROZEN';
  custodyType: string;
  accountType: string;
  userId?: string;
  refId?: string;
  walletSetId?: string;
}

// ─── Challenge status ─────────────────────────────────────────────────────────

export interface ChallengeStatusResult {
  status: string;
  resultType?: string;
}

// ─── Port ─────────────────────────────────────────────────────────────────────

/**
 * Port for Circle User-Controlled Wallet integration.
 */
export interface WalletProvider {
  // User management
  registerUser(userId: string): Promise<void>;
  getUserToken(userId: string): Promise<UserTokenResult>;

  // Wallet setup (two-step: initiate → mobile resolves challenge → confirm)
  initiateWalletSetup(params: InitiateWalletSetupParams): Promise<WalletSetupResult>;
  getWalletsForUser(userToken: string): Promise<WalletDetails[]>;
  updateWalletRefIdForUser(circleWalletId: string, refId: string, userToken: string): Promise<void>;

  // Wallet info
  getWallet(circleWalletId: string, userToken: string): Promise<WalletDetails>;
  getBalance(circleWalletId: string, userToken: string): Promise<WalletBalance>;

  // Challenge status
  getChallengeStatus(challengeId: string, userToken: string): Promise<ChallengeStatusResult>;

  // Transfers (user-controlled: initiate → mobile resolves challenge)
  initiateTransfer(params: InitiateTransferParams): Promise<TransferChallengeResult>;
  getTransferStatus(transferId: string): Promise<CircleTransferInfo>;
  listWalletTransactions(circleWalletId: string, userToken: string): Promise<CircleTransferInfo[]>;

  // Fee estimation
  estimateFee(params: EstimateFeeParams): Promise<string>;

  // Webhook signature verification
  verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>;
}
