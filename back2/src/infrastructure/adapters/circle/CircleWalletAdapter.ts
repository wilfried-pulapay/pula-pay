import { createVerify } from 'node:crypto';
import {
  WalletProvider,
  WalletBalance,
  WalletDetails,
  UserTokenResult,
  InitiateWalletSetupParams,
  WalletSetupResult,
  InitiateTransferParams,
  TransferChallengeResult,
  EstimateFeeParams,
  ChallengeStatusResult,
  CircleTransferInfo,
  CircleInboundInfo,
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
  private cachedPublicKey: string | null = null;

  constructor() {
    this.apiKey = config.circle.apiKey;
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
      Authorization: `Bearer ${this.apiKey}`,
      'X-Request-Id': crypto.randomUUID(),
    };
    if (userToken) {
      headers['X-User-Token'] = userToken;
    }

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
        refId: params.userId,
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
   * Requires a valid user token (user-scoped).
   */
  async getWalletsForUser(userToken: string): Promise<WalletDetails[]> {
    const result = await this.request<{ wallets: CircleWallet[] }>(
      'GET',
      '/wallets',
      undefined,
      userToken
    );

    return (result.wallets ?? []).map((w) => this.mapWalletDetails(w));
  }

  /**
   * Tags a wallet with a refId using the user-scoped API.
   * Used to retroactively set refId on wallets created before this field was populated.
   */
  async updateWalletRefIdForUser(circleWalletId: string, refId: string, userToken: string): Promise<void> {
    await this.request('PUT', `/wallets/${circleWalletId}`, { refId }, userToken);
    logger.info({ circleWalletId, refId }, 'Circle wallet refId updated (user-scoped)');
  }

  async getWallet(circleWalletId: string, userToken: string): Promise<WalletDetails> {
    const result = await this.request<{ wallet: CircleWallet }>(
      'GET',
      `/wallets/${circleWalletId}`,
      undefined,
      userToken
    );
    return this.mapWalletDetails(result.wallet);
  }

  async getBalance(circleWalletId: string, userToken: string): Promise<WalletBalance> {
    const result = await this.request<{ tokenBalances: CircleTokenBalance[] }>(
      'GET',
      `/wallets/${circleWalletId}/balances`,
      undefined,
      userToken
    );

    const usdcBalance = result.tokenBalances?.find((tb) => tb.token.symbol === 'USDC');

    return {
      tokenId: usdcBalance?.token.id ?? '',
      amount: usdcBalance?.amount ?? '0',
      blockchain: usdcBalance?.token.blockchain ?? '',
    };
  }

  async getChallengeStatus(challengeId: string, userToken: string): Promise<ChallengeStatusResult> {
    const result = await this.request<{ challenge: CircleChallenge }>(
      'GET',
      `/user/challenges/${challengeId}`,
      undefined,
      userToken
    );
    return {
      status: result.challenge?.status ?? 'UNKNOWN',
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

  async getTransferStatus(transferId: string): Promise<CircleTransferInfo> {
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

  async listWalletTransactions(circleWalletId: string, userToken: string): Promise<CircleTransferInfo[]> {
    const result = await this.request<{ transactions: CircleTransaction[] }>(
      'GET',
      `/transactions?walletIds[]=${encodeURIComponent(circleWalletId)}&transactionType=OUTBOUND`,
      undefined,
      userToken
    );

    return (result.transactions ?? []).map((tx) => ({
      id: tx.id,
      status: this.mapCircleStatus(tx.state),
      txHash: tx.txHash,
    }));
  }

  async listInboundTransactions(circleWalletId: string, userToken: string): Promise<CircleInboundInfo[]> {
    const result = await this.request<{ transactions: CircleTransaction[] }>(
      'GET',
      `/transactions?walletIds[]=${encodeURIComponent(circleWalletId)}&transactionType=INBOUND`,
      undefined,
      userToken
    );

    return (result.transactions ?? []).map((tx) => ({
      id: tx.id,
      status: this.mapCircleStatus(tx.state),
      amount: tx.amounts?.[0] ?? '0',
      txHash: tx.txHash,
    }));
  }

  // ─── Webhook verification ────────────────────────────────────────────────────

  /**
   * Fetches and caches Circle's entity public key used to verify webhook signatures.
   * The key is stable per environment — a single cache per process lifetime is safe.
   */
  private async fetchEntityPublicKey(): Promise<string> {
    if (this.cachedPublicKey) return this.cachedPublicKey;
    const result = await this.request<{ publicKey: string }>('GET', '/config/entity');
    this.cachedPublicKey = result.publicKey;
    return this.cachedPublicKey;
  }

  /**
   * Verifies a Circle webhook signature.
   * Circle signs the raw request body with RSA-SHA256 using their entity private key.
   * The signature is provided in the X-Circle-Signature header (base64 encoded).
   */
  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    try {
      const publicKey = await this.fetchEntityPublicKey();
      const verifier = createVerify('SHA256');
      verifier.update(rawBody);
      return verifier.verify(publicKey, signature, 'base64');
    } catch (err) {
      logger.warn({ err }, 'Circle webhook signature verification failed');
      return false;
    }
  }

  async estimateFee(params: EstimateFeeParams): Promise<string> {
    const result = await this.request<{
      high: { networkFee: string };
      medium: { networkFee: string };
      low: { networkFee: string };
    }>(
      'POST',
      '/user/transactions/transfer/estimateFee',
      {
        walletId: params.fromWalletId,
        tokenId: params.tokenId,
        destinationAddress: params.toAddress,
        amounts: [params.amount],
      },
      params.userToken
    );

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
      // Terminal success — only COMPLETE is truly settled
      case 'COMPLETE':
        return 'complete';
      // Terminal failures
      case 'FAILED':
      case 'CANCELLED':
      case 'DENIED':
        return 'failed';
      // Non-terminal: INITIATED, QUEUED, CLEARED, SENT, CONFIRMED, STUCK
      // STUCK can be resolved (accelerate API) — let polling/expiry handle it
      default:
        return 'pending';
    }
  }
}
