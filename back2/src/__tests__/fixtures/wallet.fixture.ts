import Decimal from 'decimal.js';
import { WalletStatus, Blockchain } from '@prisma/client';
import { WalletProps, Wallet } from '@domain/entities/Wallet';

export const createWalletProps = (overrides: Partial<WalletProps> = {}): WalletProps => ({
  id: 'wallet-test-id-001',
  userId: 'user-test-id-001',
  circleWalletId: 'circle-wallet-uuid-001',
  walletSetId: null,
  address: '0x1234567890abcdef1234567890abcdef12345678',
  blockchain: 'BASE_SEPOLIA' as Blockchain,
  status: 'ACTIVE' as WalletStatus,
  balanceUsdc: new Decimal('100.000000'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

export const createWallet = (overrides: Partial<WalletProps> = {}): Wallet => {
  return new Wallet(createWalletProps(overrides));
};

// Pre-defined wallet fixtures for different scenarios
export const walletFixtures = {
  // Active wallet with balance
  activeWithBalance: (): Wallet =>
    createWallet({
      id: 'wallet-active-balance',
      balanceUsdc: new Decimal('150.500000'),
    }),

  // Active wallet with zero balance
  activeZeroBalance: (): Wallet =>
    createWallet({
      id: 'wallet-active-zero',
      balanceUsdc: new Decimal('0'),
    }),

  // Pending wallet (just created, not yet activated)
  pending: (): Wallet =>
    createWallet({
      id: 'wallet-pending',
      status: 'PENDING',
      balanceUsdc: new Decimal('0'),
    }),

  // Frozen wallet (cannot transact)
  frozen: (): Wallet =>
    createWallet({
      id: 'wallet-frozen',
      status: 'FROZEN',
      balanceUsdc: new Decimal('500.000000'),
    }),

  // Closed wallet
  closed: (): Wallet =>
    createWallet({
      id: 'wallet-closed',
      status: 'CLOSED',
      balanceUsdc: new Decimal('0'),
    }),

  // Wallet on Base mainnet
  baseMainnet: (): Wallet =>
    createWallet({
      id: 'wallet-base',
      blockchain: 'BASE',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
    }),

  // Wallet with large balance
  largeBalance: (): Wallet =>
    createWallet({
      id: 'wallet-large-balance',
      balanceUsdc: new Decimal('10000.000000'),
    }),

  // Wallet with very small balance (for precision tests)
  smallBalance: (): Wallet =>
    createWallet({
      id: 'wallet-small-balance',
      balanceUsdc: new Decimal('0.000001'),
    }),

  // Second user's wallet (for P2P tests)
  recipient: (): Wallet =>
    createWallet({
      id: 'wallet-recipient',
      userId: 'user-recipient-id',
      circleWalletId: 'circle-wallet-uuid-recipient',
      address: '0xfedcba0987654321fedcba0987654321fedcba09',
      balanceUsdc: new Decimal('50.000000'),
    }),
};
