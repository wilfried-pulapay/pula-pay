import Decimal from 'decimal.js';
import { Currency, OnRampProvider as Provider } from '@prisma/client';
import {
  WalletProvider,
  WalletBalance,
  WalletDetails,
  EstimateFeeParams,
} from '@domain/ports/WalletProvider';
import {
  OnRampProvider,
  InitiateDepositParams,
  DepositResult,
  InitiatePayoutParams,
  PayoutResult,
} from '@domain/ports/OnRampProvider';
import {
  ExchangeRateProvider,
  ExchangeRateResult,
} from '@domain/ports/ExchangeRateProvider';

/**
 * Mock Wallet Provider (Circle User-Controlled)
 */
export const createMockWalletProvider = (): jest.Mocked<WalletProvider> => ({
  registerUser: jest.fn(),
  getUserToken: jest.fn(),
  initiateWalletSetup: jest.fn(),
  getWalletsForUser: jest.fn(),
  updateWalletRefIdForUser: jest.fn(),
  getWallet: jest.fn(),
  getBalance: jest.fn(),
  getChallengeStatus: jest.fn(),
  initiateTransfer: jest.fn(),
  getTransferStatus: jest.fn(),
  estimateFee: jest.fn(),
});

/**
 * Mock OnRamp Provider (Coinbase CDP)
 */
export const createMockOnRampProvider = (): jest.Mocked<OnRampProvider> => ({
  providerCode: 'COINBASE_CDP' as Provider,
  initiateDeposit: jest.fn(),
  getDepositStatus: jest.fn(),
  initiatePayout: jest.fn(),
  getPayoutStatus: jest.fn(),
  validateWebhook: jest.fn(),
});

/**
 * Mock Exchange Rate Provider
 */
export const createMockExchangeRateProvider = (): jest.Mocked<ExchangeRateProvider> => ({
  getRate: jest.fn(),
  getRates: jest.fn(),
});

type TransferRecord = { id: string; status: 'pending' | 'complete' | 'failed'; txHash?: string };

/**
 * In-memory Wallet Provider for integration tests (User-Controlled)
 */
export class InMemoryWalletProvider implements WalletProvider {
  private wallets: Map<string, { balance: string; address: string }> = new Map();
  private transfers: Map<string, TransferRecord> = new Map();
  private users: Set<string> = new Set();
  private idCounter = 1;

  async registerUser(userId: string): Promise<void> {
    this.users.add(userId);
  }

  async getUserToken(_userId: string): Promise<{ userToken: string; encryptionKey: string }> {
    return {
      userToken: `user-token-${this.idCounter++}`,
      encryptionKey: `enc-key-${this.idCounter}`,
    };
  }

  async initiateWalletSetup(_params: unknown): Promise<{ challengeId: string }> {
    return { challengeId: `challenge-${this.idCounter++}` };
  }

  async getWalletsForUser(_userToken: string): Promise<WalletDetails[]> {
    const circleWalletId = `circle-wallet-${this.idCounter++}`;
    const address = `0x${this.idCounter.toString(16).padStart(40, '0')}`;
    this.wallets.set(circleWalletId, { balance: '0', address });
    return [{
      id: circleWalletId,
      address,
      blockchain: 'BASE-SEPOLIA',
      state: 'LIVE',
      custodyType: 'END_USER_CONTROLLED',
      accountType: 'SCA',
    }];
  }

  async updateWalletRefIdForUser(_circleWalletId: string, _refId: string, _userToken: string): Promise<void> {
    // no-op in tests
  }

  async getWallet(circleWalletId: string, _userToken: string): Promise<WalletDetails> {
    const wallet = this.wallets.get(circleWalletId);
    return {
      id: circleWalletId,
      address: wallet?.address ?? '0x0',
      blockchain: 'BASE-SEPOLIA',
      state: 'LIVE',
      custodyType: 'END_USER_CONTROLLED',
      accountType: 'SCA',
    };
  }

  async getBalance(circleWalletId: string, _userToken: string): Promise<WalletBalance> {
    const wallet = this.wallets.get(circleWalletId);
    return {
      tokenId: 'usdc-token-base-sepolia',
      amount: wallet?.balance || '0',
      blockchain: 'BASE_SEPOLIA',
    };
  }

  async getChallengeStatus(_challengeId: string, _userToken: string): Promise<{ status: string }> {
    return { status: 'COMPLETE' };
  }

  async initiateTransfer(params: { fromWalletId: string; amount: string }): Promise<{ challengeId: string }> {
    const fromWallet = this.wallets.get(params.fromWalletId);
    if (fromWallet) {
      const newBalance = new Decimal(fromWallet.balance).sub(params.amount);
      fromWallet.balance = newBalance.toString();
    }
    return { challengeId: `challenge-transfer-${this.idCounter++}` };
  }

  async getTransferStatus(transferId: string): Promise<TransferRecord> {
    return (
      this.transfers.get(transferId) || {
        id: transferId,
        status: 'failed',
      }
    );
  }

  async estimateFee(_params: EstimateFeeParams): Promise<string> {
    return '0.001';
  }

  // Test helpers
  setBalance(circleWalletId: string, balance: string): void {
    const wallet = this.wallets.get(circleWalletId);
    if (wallet) {
      wallet.balance = balance;
    } else {
      this.wallets.set(circleWalletId, { balance, address: '0x0' });
    }
  }

  clear(): void {
    this.wallets.clear();
    this.transfers.clear();
    this.users.clear();
    this.idCounter = 1;
  }
}

/**
 * In-memory OnRamp Provider for integration tests
 */
export class InMemoryOnRampProvider implements OnRampProvider {
  readonly providerCode: Provider = 'COINBASE_CDP';
  private deposits: Map<string, DepositResult> = new Map();
  private payouts: Map<string, PayoutResult> = new Map();
  private idCounter = 1;

  async initiateDeposit(_params: InitiateDepositParams): Promise<DepositResult> {
    const providerRef = `cdp-dep-${this.idCounter++}`;
    const result: DepositResult = {
      providerRef,
      status: 'pending',
    };
    this.deposits.set(providerRef, result);
    return result;
  }

  async getDepositStatus(providerRef: string): Promise<DepositResult> {
    return (
      this.deposits.get(providerRef) || {
        providerRef,
        status: 'failed',
      }
    );
  }

  async initiatePayout(_params: InitiatePayoutParams): Promise<PayoutResult> {
    const providerRef = `cdp-pay-${this.idCounter++}`;
    const result: PayoutResult = {
      providerRef,
      status: 'pending',
    };
    this.payouts.set(providerRef, result);
    return result;
  }

  async getPayoutStatus(providerRef: string): Promise<PayoutResult> {
    return (
      this.payouts.get(providerRef) || {
        providerRef,
        status: 'failed',
      }
    );
  }

  validateWebhook(_headers: Record<string, string>, _body: unknown): boolean {
    return true; // Always valid for testing
  }

  // Test helpers
  confirmDeposit(providerRef: string): void {
    const deposit = this.deposits.get(providerRef);
    if (deposit) {
      deposit.status = 'completed';
    }
  }

  failDeposit(providerRef: string): void {
    const deposit = this.deposits.get(providerRef);
    if (deposit) {
      deposit.status = 'failed';
    }
  }

  confirmPayout(providerRef: string): void {
    const payout = this.payouts.get(providerRef);
    if (payout) {
      payout.status = 'completed';
    }
  }

  clear(): void {
    this.deposits.clear();
    this.payouts.clear();
    this.idCounter = 1;
  }
}

/**
 * In-memory Exchange Rate Provider for integration tests
 */
export class InMemoryExchangeRateProvider implements ExchangeRateProvider {
  private rates: Map<Currency, Decimal> = new Map([
    ['EUR', new Decimal('0.92')],
    ['XOF', new Decimal('603.45')],
    ['USD', new Decimal('1.00')],
  ]);

  async getRate(currency: Currency): Promise<ExchangeRateResult> {
    const rate = this.rates.get(currency);
    if (!rate) {
      throw new Error(`Rate not found for currency: ${currency}`);
    }

    return {
      baseCurrency: 'USDC',
      quoteCurrency: currency,
      rate,
      timestamp: new Date(),
      source: 'mock',
    };
  }

  async getRates(currencies: Currency[]): Promise<Map<Currency, ExchangeRateResult>> {
    const results = new Map<Currency, ExchangeRateResult>();

    for (const currency of currencies) {
      const result = await this.getRate(currency);
      results.set(currency, result);
    }

    return results;
  }

  // Test helpers
  setRate(currency: Currency, rate: Decimal | string | number): void {
    this.rates.set(currency, new Decimal(rate));
  }

  clear(): void {
    this.rates = new Map([
      ['EUR', new Decimal('0.92')],
      ['XOF', new Decimal('603.45')],
      ['USD', new Decimal('1.00')],
    ]);
  }
}
