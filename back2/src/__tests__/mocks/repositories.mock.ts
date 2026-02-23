import Decimal from 'decimal.js';
import { User } from '@domain/entities/User';
import { Wallet } from '@domain/entities/Wallet';
import { Transaction } from '@domain/entities/Transaction';
import {
  UserRepository,
  CreateUserParams,
} from '@domain/ports/repositories/UserRepository';
import {
  WalletRepository,
  CreateWalletRepoParams,
} from '@domain/ports/repositories/WalletRepository';
import {
  TransactionRepository,
  CreateTransactionParams,
  CreateOnRampDetailsParams,
  TransactionFilters,
} from '@domain/ports/repositories/TransactionRepository';
import { PaginationParams, PaginatedResult } from '@shared/types';
import {
  createUser,
  createWallet,
  createTransaction,
  createUserProps,
  createWalletProps,
  createTransactionProps,
} from '../fixtures';

/**
 * Mock User Repository
 */
export const createMockUserRepository = (): jest.Mocked<UserRepository> => ({
  findById: jest.fn(),
  findByPhone: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

/**
 * Mock Wallet Repository
 */
export const createMockWalletRepository = (): jest.Mocked<WalletRepository> => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByAddress: jest.fn(),
  findByCircleWalletId: jest.fn(),
  findByUserPhone: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateBalance: jest.fn(),
});

/**
 * Mock Transaction Repository
 */
export const createMockTransactionRepository = (): jest.Mocked<TransactionRepository> => ({
  findById: jest.fn(),
  findByIdempotencyKey: jest.fn(),
  findByExternalRef: jest.fn(),
  findByWalletId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  createOnRampDetails: jest.fn(),
  updateOnRampStatus: jest.fn(),
});

/**
 * In-memory User Repository for integration tests
 */
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private idCounter = 1;

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.phone === phone) {
        return user;
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async create(params: CreateUserParams): Promise<User> {
    const id = `user-${this.idCounter++}`;
    const user = createUser(
      createUserProps({
        id,
        phone: params.phone,
        email: params.email || null,
        name: params.name || null,
        kycLevel: 'NONE',
      })
    );
    this.users.set(id, user);
    return user;
  }

  async update(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Test helpers
  clear(): void {
    this.users.clear();
    this.idCounter = 1;
  }

  seed(users: User[]): void {
    users.forEach((user) => this.users.set(user.id, user));
  }
}

/**
 * In-memory Wallet Repository for integration tests
 */
export class InMemoryWalletRepository implements WalletRepository {
  private wallets: Map<string, Wallet> = new Map();
  private idCounter = 1;

  async findById(id: string): Promise<Wallet | null> {
    return this.wallets.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    for (const wallet of this.wallets.values()) {
      if (wallet.userId === userId) {
        return wallet;
      }
    }
    return null;
  }

  async findByAddress(address: string): Promise<Wallet | null> {
    const normalizedAddress = address.toLowerCase();
    for (const wallet of this.wallets.values()) {
      if (wallet.address.toLowerCase() === normalizedAddress) {
        return wallet;
      }
    }
    return null;
  }

  async findByCircleWalletId(circleWalletId: string): Promise<Wallet | null> {
    for (const wallet of this.wallets.values()) {
      if (wallet.circleWalletId === circleWalletId) {
        return wallet;
      }
    }
    return null;
  }

  async findByUserPhone(_phone: string): Promise<Wallet | null> {
    // In real impl, this would join with users table
    // For in-memory, we'd need to inject user repo
    return null;
  }

  async create(params: CreateWalletRepoParams): Promise<Wallet> {
    const id = `wallet-${this.idCounter++}`;
    const wallet = createWallet(
      createWalletProps({
        id,
        userId: params.userId,
        circleWalletId: params.circleWalletId,
        walletSetId: params.walletSetId,
        address: params.address,
        blockchain: params.blockchain,
        status: 'PENDING',
        balanceUsdc: new Decimal(0),
      })
    );
    this.wallets.set(id, wallet);
    return wallet;
  }

  async update(wallet: Wallet): Promise<Wallet> {
    this.wallets.set(wallet.id, wallet);
    return wallet;
  }

  async updateBalance(walletId: string, balance: Decimal): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (wallet) {
      wallet.syncBalance(balance);
    }
  }

  // Test helpers
  clear(): void {
    this.wallets.clear();
    this.idCounter = 1;
  }

  seed(wallets: Wallet[]): void {
    wallets.forEach((wallet) => this.wallets.set(wallet.id, wallet));
  }
}

/**
 * In-memory Transaction Repository for integration tests
 */
export class InMemoryTransactionRepository implements TransactionRepository {
  private transactions: Map<string, Transaction> = new Map();
  private idCounter = 1;

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) || null;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    for (const tx of this.transactions.values()) {
      if (tx.idempotencyKey === key) {
        return tx;
      }
    }
    return null;
  }

  async findByExternalRef(ref: string): Promise<Transaction | null> {
    for (const tx of this.transactions.values()) {
      if (tx.externalRef === ref) {
        return tx;
      }
    }
    return null;
  }

  async findByWalletId(
    walletId: string,
    filters?: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    let results = Array.from(this.transactions.values()).filter(
      (tx) => tx.walletId === walletId || tx.counterpartyId === walletId
    );

    if (filters?.type) {
      results = results.filter((tx) => tx.type === filters.type);
    }
    if (filters?.status) {
      results = results.filter((tx) => tx.status === filters.status);
    }
    if (filters?.fromDate) {
      results = results.filter((tx) => tx.createdAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      results = results.filter((tx) => tx.createdAt <= filters.toDate!);
    }

    const total = results.length;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const start = (page - 1) * limit;
    const items = results.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(params: CreateTransactionParams): Promise<Transaction> {
    const id = `tx-${this.idCounter++}`;
    const transaction = createTransaction(
      createTransactionProps({
        id,
        idempotencyKey: params.idempotencyKey,
        type: params.type,
        status: params.status || 'PENDING',
        amountUsdc: params.amountUsdc,
        feeUsdc: params.feeUsdc || new Decimal(0),
        exchangeRate: params.exchangeRate || null,
        displayCurrency: params.displayCurrency || null,
        displayAmount: params.displayAmount || null,
        walletId: params.walletId,
        counterpartyId: params.counterpartyId || null,
        description: params.description || null,
        metadata: params.metadata || null,
      })
    );
    this.transactions.set(id, transaction);
    return transaction;
  }

  async update(transaction: Transaction): Promise<Transaction> {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async createOnRampDetails(_params: CreateOnRampDetailsParams): Promise<void> {
    // In-memory implementation does nothing
  }

  async updateOnRampStatus(
    _transactionId: string,
    _status: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    // In-memory implementation does nothing
  }

  // Test helpers
  clear(): void {
    this.transactions.clear();
    this.idCounter = 1;
  }

  seed(transactions: Transaction[]): void {
    transactions.forEach((tx) => this.transactions.set(tx.id, tx));
  }
}
