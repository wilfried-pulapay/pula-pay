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

export interface ConfirmWalletSetupParams {
  userToken: string;
}

// ─── Legacy wallet creation (kept for interface) ─────────────────────────────

export interface CreateWalletParams {
  userId: string;
  idempotencyKey: string;
  blockchain: Blockchain;
}

export interface WalletCreationResult {
  circleWalletId: string;
  walletSetId?: string;
  address: string;
  status: 'pending' | 'active';
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

// ─── Legacy transfer params ───────────────────────────────────────────────────

export interface TransferParams {
  fromWalletId: string;
  toAddress: string;
  amount: string;
  tokenId: string;
  idempotencyKey: string;
}

export interface TransferResult {
  id: string;
  status: 'pending' | 'complete' | 'failed';
  txHash?: string;
}

// ─── Fee estimation ───────────────────────────────────────────────────────────

export interface EstimateFeeParams {
  fromWalletId: string;
  toAddress: string;
  amount: string;
  tokenId: string;
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

  // Wallet info
  getWallet(circleWalletId: string): Promise<WalletDetails>;
  getBalance(circleWalletId: string): Promise<WalletBalance>;

  // Transfers (user-controlled: initiate → mobile resolves challenge)
  initiateTransfer(params: InitiateTransferParams): Promise<TransferChallengeResult>;
  getTransferStatus(transferId: string): Promise<TransferResult>;

  // Fee estimation
  estimateFee(params: EstimateFeeParams): Promise<string>;
}
