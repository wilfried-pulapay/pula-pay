import { Blockchain } from '@prisma/client';
import {
  WalletProvider,
  CreateWalletParams,
  WalletCreationResult,
  WalletBalance,
  WalletDetails,
  TransferParams,
  TransferResult,
  EstimateFeeParams,
  UserTokenResult,
  InitiateWalletSetupParams,
  WalletSetupResult,
  ConfirmWalletSetupParams,
  InitiateTransferParams,
  TransferChallengeResult,
} from '../../../domain/ports/WalletProvider';
import { config } from '../../../shared/config';
import { logger } from '../../../shared/utils/logger';
import {
  CircleWallet,
  CircleTokenBalance,
  CircleTransaction,
  CircleChallenge,
  CircleUserToken,
} from './types';

// Mapping Prisma blockchain → Circle blockchain name
const BLOCKCHAIN_MAP: Record<string, string> = {
  BASE_SEPOLIA: 'BASE-SEPOLIA',
  BASE: 'BASE',
  // Legacy
  POLYGON_AMOY: 'MATIC-AMOY',
  ETH_SEPOLIA: 'ETH-SEPOLIA',
  ARBITRUM_SEPOLIA: 'ARB-SEPOLIA',
  POLYGON: 'MATIC',
  ARBITRUM: 'ARB',
  ETHEREUM: 'ETH',
};

/**
 * Circle User-Controlled Programmable Wallets adapter.
 *
 * Users hold their own private keys secured by a PIN (set up via Circle SDK
 * on the mobile app). Each operation requiring signing returns a challengeId
 * that the mobile must resolve using the Circle SDK with the user's PIN.
 */
export class CircleWalletAdapter implements WalletProvider {
  private readonly baseUrl = 'https://api.circle.com/v1/w3s';
  private readonly apiKey: string;
  private readonly appId: string;

  constructor() {
    this.apiKey = config.circle.apiKey;
    this.appId = config.circle.appId;
  }

  // ─── HTTP helper ────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    userToken?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken ?? this.apiKey}`,
      'X-Request-Id': crypto.randomUUID(),
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ url, status: response.status, error }, 'Circle API error');
      throw new Error(`Circle API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as any;
    return data.data as T;
  }

  // ─── User management ────────────────────────────────────────────────────────

  /**
   * Registers a user in Circle (idempotent — safe to call multiple times).
   * Must be called before any other user-scoped operations.
   */
  async registerUser(userId: string): Promise<void> {
    try {
      await this.request('POST', '/users', { userId });
      logger.info({ userId }, 'Circle user registered');
    } catch (err: any) {
      // Circle returns 409 if user already exists — treat as success
      if (err?.message?.includes('409')) {
        logger.debug({ userId }, 'Circle user already exists');
        return;
      }
      throw err;
    }
  }

  /**
   * Obtains a short-lived user session token and encryption key.
   * The mobile app uses these to interact with the Circle SDK.
   * Tokens expire after ~60 minutes — always generate fresh ones.
   */
  async getUserToken(userId: string): Promise<UserTokenResult> {
    const result = await this.request<CircleUserToken>('POST', '/users/token', { userId });
    return {
      userToken: result.userToken,
      encryptionKey: result.encryptionKey,
    };
  }

  // ─── Wallet setup ────────────────────────────────────────────────────────────

  /**
   * Initiates wallet creation for a user.
   * Returns a challengeId that the mobile must resolve (PIN setup) via Circle SDK.
   * The actual wallet is created on Circle's side after the challenge is completed.
   */
  async initiateWalletSetup(params: InitiateWalletSetupParams): Promise<WalletSetupResult> {
    const circleBlockchain = BLOCKCHAIN_MAP[params.blockchain] ?? BLOCKCHAIN_MAP['BASE_SEPOLIA'];

    const result = await this.request<{ challengeId: string }>(
      'POST',
      '/user/initialize',
      {
        idempotencyKey: params.idempotencyKey,
        accountType: 'SCA',
        blockchains: [circleBlockchain],
      },
      params.userToken
    );

    logger.info(
      { userId: params.userId, challengeId: result.challengeId },
      'Circle wallet setup initiated'
    );

    return { challengeId: result.challengeId };
  }

  /**
   * Retrieves the wallets created for a user after their setup challenge was completed.
   */
  async getWalletsForUser(userToken: string): Promise<WalletDetails[]> {
    const result = await this.request<{ wallets: CircleWallet[] }>(
      'GET',
      '/user/wallets',
      undefined,
      userToken
    );

    return (result.wallets ?? []).map((w) => this.mapWalletDetails(w));
  }

  // ─── WalletProvider interface ────────────────────────────────────────────────

  /**
   * @deprecated Use initiateWalletSetup + confirmWalletSetup instead.
   * Kept for interface compatibility.
   */
  async createWallet(_params: CreateWalletParams): Promise<WalletCreationResult> {
    throw new Error(
      'createWallet is not supported for user-controlled wallets. Use initiateWalletSetup.'
    );
  }

  async getWallet(circleWalletId: string): Promise<WalletDetails> {
    const result = await this.request<{ wallet: CircleWallet }>(
      'GET',
      `/wallets/${circleWalletId}`
    );
    return this.mapWalletDetails(result.wallet);
  }

  async getBalance(circleWalletId: string): Promise<WalletBalance> {
    const result = await this.request<{ tokenBalances: CircleTokenBalance[] }>(
      'GET',
      `/wallets/${circleWalletId}/balances`
    );

    const usdcBalance = result.tokenBalances?.find((tb) => tb.token.symbol === 'USDC');

    return {
      tokenId: usdcBalance?.token.id ?? '',
      amount: usdcBalance?.amount ?? '0',
      blockchain: usdcBalance?.token.blockchain ?? '',
    };
  }

  /**
   * Initiates a user-controlled transfer.
   * Returns a challengeId that the mobile must resolve (PIN entry) via Circle SDK.
   */
  async initiateTransfer(params: InitiateTransferParams): Promise<TransferChallengeResult> {
    const result = await this.request<{ challengeId: string }>(
      'POST',
      '/user/transactions/transfer',
      {
        idempotencyKey: params.idempotencyKey,
        walletId: params.fromWalletId,
        tokenId: params.tokenId,
        destinationAddress: params.toAddress,
        amounts: [params.amount],
        feeLevel: 'MEDIUM',
      },
      params.userToken
    );

    logger.info(
      { challengeId: result.challengeId, from: params.fromWalletId, to: params.toAddress },
      'Circle transfer challenge initiated'
    );

    return { challengeId: result.challengeId };
  }

  /**
   * @deprecated Use initiateTransfer instead.
   * Kept for interface compatibility with existing handlers that haven't migrated yet.
   */
  async transfer(params: TransferParams): Promise<TransferResult> {
    throw new Error(
      'transfer() is not supported for user-controlled wallets. Use initiateTransfer().'
    );
  }

  async getTransferStatus(transferId: string): Promise<TransferResult> {
    const result = await this.request<{ transaction: CircleTransaction }>(
      'GET',
      `/transactions/${transferId}`
    );

    const tx = result.transaction;

    return {
      id: tx?.id ?? '',
      status: this.mapCircleStatus(tx?.state),
      txHash: tx?.txHash,
    };
  }

  async getChallengeStatus(challengeId: string, userToken: string): Promise<CircleChallenge> {
    const result = await this.request<{ challenge: CircleChallenge }>(
      'GET',
      `/user/challenges/${challengeId}`,
      undefined,
      userToken
    );
    return result.challenge;
  }

  async estimateFee(params: EstimateFeeParams): Promise<string> {
    const result = await this.request<{
      high: { networkFee: string };
      medium: { networkFee: string };
      low: { networkFee: string };
    }>('POST', '/user/transactions/transfer/estimateFee', {
      walletId: params.fromWalletId,
      tokenId: params.tokenId,
      destinationAddress: params.toAddress,
      amounts: [params.amount],
    });

    return result.high?.networkFee ?? '0';
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private mapWalletDetails(wallet: CircleWallet): WalletDetails {
    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      state: wallet.state,
      custodyType: wallet.custodyType ?? 'USER',
      accountType: wallet.accountType,
      userId: wallet.userId,
      refId: wallet.refId,
    };
  }

  private mapCircleStatus(state?: string): 'pending' | 'complete' | 'failed' {
    switch (state) {
      case 'COMPLETE':
      case 'CONFIRMED':
      case 'CLEARED':
        return 'complete';
      case 'FAILED':
      case 'CANCELLED':
      case 'DENIED':
      case 'STUCK':
        return 'failed';
      case 'INITIATED':
      case 'QUEUED':
      case 'SENT':
      default:
        return 'pending';
    }
  }
}
