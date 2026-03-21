import Decimal from 'decimal.js';
import { TxType, TxStatus, Currency } from '@prisma/client';
import { TransactionProps, Transaction } from '@domain/entities/Transaction';

export const createTransactionProps = (
  overrides: Partial<TransactionProps> = {}
): TransactionProps => ({
  id: 'tx-test-id-001',
  idempotencyKey: 'idempotency-key-001',
  externalRef: null,
  type: 'DEPOSIT_ONRAMP' as TxType,
  status: 'PENDING' as TxStatus,
  amountUsdc: new Decimal('100.000000'),
  feeUsdc: new Decimal('1.000000'),
  exchangeRate: new Decimal('603.45'),
  displayCurrency: 'XOF' as Currency,
  displayAmount: new Decimal('60345.00'),
  walletId: 'wallet-test-id-001',
  counterpartyId: null,
  description: null,
  metadata: null,
  failureReason: null,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
  completedAt: null,
  challengeId: null,
  ...overrides,
});

export const createTransaction = (overrides: Partial<TransactionProps> = {}): Transaction => {
  return new Transaction(createTransactionProps(overrides));
};

// Pre-defined transaction fixtures for different scenarios
export const transactionFixtures = {
  // Pending deposit (MoMo → USDC)
  pendingDeposit: (): Transaction =>
    createTransaction({
      id: 'tx-pending-deposit',
      type: 'DEPOSIT_ONRAMP',
      status: 'PENDING',
      amountUsdc: new Decimal('16.570000'),
      feeUsdc: new Decimal('0.170000'),
      exchangeRate: new Decimal('603.45'),
      displayCurrency: 'XOF',
      displayAmount: new Decimal('10000.00'),
    }),

  // Processing deposit (waiting for MoMo confirmation)
  processingDeposit: (): Transaction =>
    createTransaction({
      id: 'tx-processing-deposit',
      type: 'DEPOSIT_ONRAMP',
      status: 'PROCESSING',
      externalRef: 'momo-ref-123',
      amountUsdc: new Decimal('16.570000'),
      feeUsdc: new Decimal('0.170000'),
    }),

  // Completed deposit
  completedDeposit: (): Transaction =>
    createTransaction({
      id: 'tx-completed-deposit',
      type: 'DEPOSIT_ONRAMP',
      status: 'COMPLETED',
      externalRef: 'momo-ref-456',
      amountUsdc: new Decimal('16.400000'),
      feeUsdc: new Decimal('0.170000'),
      completedAt: new Date('2026-01-01T10:05:00.000Z'),
    }),

  // Failed deposit
  failedDeposit: (): Transaction =>
    createTransaction({
      id: 'tx-failed-deposit',
      type: 'DEPOSIT_ONRAMP',
      status: 'FAILED',
      failureReason: 'MoMo payment rejected by user',
    }),

  // Pending withdrawal (USDC → MoMo)
  pendingWithdrawal: (): Transaction =>
    createTransaction({
      id: 'tx-pending-withdrawal',
      type: 'WITHDRAWAL_OFFRAMP',
      status: 'PENDING',
      amountUsdc: new Decimal('50.000000'),
      feeUsdc: new Decimal('0.500000'),
      exchangeRate: new Decimal('603.45'),
      displayCurrency: 'XOF',
      displayAmount: new Decimal('30172.50'),
    }),

  // Completed withdrawal
  completedWithdrawal: (): Transaction =>
    createTransaction({
      id: 'tx-completed-withdrawal',
      type: 'WITHDRAWAL_OFFRAMP',
      status: 'COMPLETED',
      externalRef: 'momo-ref-789',
      amountUsdc: new Decimal('49.500000'),
      feeUsdc: new Decimal('0.500000'),
      completedAt: new Date('2026-01-01T11:00:00.000Z'),
    }),

  // P2P transfer (pending)
  pendingTransfer: (): Transaction =>
    createTransaction({
      id: 'tx-pending-transfer',
      type: 'TRANSFER_P2P',
      status: 'PENDING',
      amountUsdc: new Decimal('25.500000'),
      feeUsdc: new Decimal('0'),
      counterpartyId: 'wallet-recipient',
      description: 'Remboursement restaurant',
    }),

  // P2P transfer (completed)
  completedTransfer: (): Transaction =>
    createTransaction({
      id: 'tx-completed-transfer',
      type: 'TRANSFER_P2P',
      status: 'COMPLETED',
      amountUsdc: new Decimal('25.500000'),
      feeUsdc: new Decimal('0'),
      counterpartyId: 'wallet-recipient',
      description: 'Remboursement restaurant',
      externalRef: 'circle-tx-abc123',
      completedAt: new Date('2026-01-01T12:00:00.000Z'),
    }),

  // Crypto deposit (direct USDC transfer)
  cryptoDeposit: (): Transaction =>
    createTransaction({
      id: 'tx-crypto-deposit',
      type: 'DEPOSIT_CRYPTO',
      status: 'COMPLETED',
      amountUsdc: new Decimal('100.000000'),
      feeUsdc: new Decimal('0'),
      exchangeRate: null,
      displayCurrency: null,
      displayAmount: null,
      externalRef: '0xabcdef1234567890',
      completedAt: new Date('2026-01-01T13:00:00.000Z'),
    }),

  // Expired transaction
  expiredTransaction: (): Transaction =>
    createTransaction({
      id: 'tx-expired',
      type: 'DEPOSIT_ONRAMP',
      status: 'EXPIRED',
    }),

  // Cancelled transaction
  cancelledTransaction: (): Transaction =>
    createTransaction({
      id: 'tx-cancelled',
      type: 'WITHDRAWAL_OFFRAMP',
      status: 'CANCELLED',
    }),

  // Transaction in EUR
  eurTransaction: (): Transaction =>
    createTransaction({
      id: 'tx-eur',
      type: 'DEPOSIT_ONRAMP',
      status: 'COMPLETED',
      amountUsdc: new Decimal('108.700000'),
      feeUsdc: new Decimal('1.087000'),
      exchangeRate: new Decimal('0.92'),
      displayCurrency: 'EUR',
      displayAmount: new Decimal('100.00'),
      completedAt: new Date('2026-01-01T14:00:00.000Z'),
    }),
};
