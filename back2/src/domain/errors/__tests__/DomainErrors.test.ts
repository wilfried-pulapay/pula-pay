import Decimal from 'decimal.js';
import { DomainError } from '../DomainError';
import { InsufficientFundsError } from '../InsufficientFundsError';
import { WalletFrozenError } from '../WalletFrozenError';
import { InvalidStateTransitionError } from '../InvalidStateTransitionError';
import { LedgerImbalanceError } from '../LedgerImbalanceError';
import { UserNotFoundError } from '../UserNotFoundError';
import { WalletNotFoundError } from '../WalletNotFoundError';
import { TransactionNotFoundError } from '../TransactionNotFoundError';

describe('Domain Errors', () => {
  describe('DomainError (abstract base)', () => {
    // Since DomainError is abstract, we test it through concrete implementations
    it('should set error name to class name', () => {
      const error = new InsufficientFundsError('wallet-1', new Decimal(10), new Decimal(100));

      expect(error.name).toBe('InsufficientFundsError');
    });

    it('should set timestamp', () => {
      const before = new Date();
      const error = new InsufficientFundsError('wallet-1', new Decimal(10), new Decimal(100));
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should be instance of Error', () => {
      const error = new InsufficientFundsError('wallet-1', new Decimal(10), new Decimal(100));

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });
  });

  describe('InsufficientFundsError', () => {
    it('should create error with wallet info', () => {
      const error = new InsufficientFundsError(
        'wallet-123',
        new Decimal('50.5'),
        new Decimal('100')
      );

      expect(error.code).toBe('INSUFFICIENT_FUNDS');
      expect(error.walletId).toBe('wallet-123');
      expect(error.available.eq('50.5')).toBe(true);
      expect(error.requested.eq('100')).toBe(true);
    });

    it('should have descriptive message', () => {
      const error = new InsufficientFundsError(
        'wallet-123',
        new Decimal('50.5'),
        new Decimal('100')
      );

      expect(error.message).toContain('wallet-123');
      expect(error.message).toContain('50.5');
      expect(error.message).toContain('100');
      expect(error.message).toContain('Insufficient funds');
    });

    it('should serialize to JSON', () => {
      const error = new InsufficientFundsError(
        'wallet-123',
        new Decimal('50.5'),
        new Decimal('100')
      );
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'InsufficientFundsError');
      expect(json).toHaveProperty('code', 'INSUFFICIENT_FUNDS');
      expect(json).toHaveProperty('walletId', 'wallet-123');
      expect(json).toHaveProperty('available', '50.5');
      expect(json).toHaveProperty('requested', '100');
      expect(json).toHaveProperty('timestamp');
    });
  });

  describe('WalletFrozenError', () => {
    it('should create error with wallet status', () => {
      const error = new WalletFrozenError('wallet-456', 'FROZEN');

      expect(error.code).toBe('WALLET_FROZEN');
      expect(error.walletId).toBe('wallet-456');
      expect(error.status).toBe('FROZEN');
    });

    it('should work with PENDING status', () => {
      const error = new WalletFrozenError('wallet-456', 'PENDING');

      expect(error.status).toBe('PENDING');
    });

    it('should work with CLOSED status', () => {
      const error = new WalletFrozenError('wallet-456', 'CLOSED');

      expect(error.status).toBe('CLOSED');
    });

    it('should have descriptive message', () => {
      const error = new WalletFrozenError('wallet-456', 'FROZEN');

      expect(error.message).toContain('wallet-456');
      expect(error.message).toContain('FROZEN');
      expect(error.message).toContain('cannot transact');
    });

    it('should serialize to JSON', () => {
      const error = new WalletFrozenError('wallet-456', 'FROZEN');
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'WalletFrozenError');
      expect(json).toHaveProperty('code', 'WALLET_FROZEN');
      expect(json).toHaveProperty('walletId', 'wallet-456');
      expect(json).toHaveProperty('status', 'FROZEN');
    });
  });

  describe('InvalidStateTransitionError', () => {
    it('should create error with state transition info', () => {
      const error = new InvalidStateTransitionError('COMPLETED', 'PROCESS');

      expect(error.code).toBe('INVALID_STATE_TRANSITION');
      expect(error.currentState).toBe('COMPLETED');
      expect(error.attemptedEvent).toBe('PROCESS');
    });

    it('should have descriptive message', () => {
      const error = new InvalidStateTransitionError('COMPLETED', 'PROCESS');

      expect(error.message).toContain('COMPLETED');
      expect(error.message).toContain('PROCESS');
      expect(error.message).toContain('Cannot apply event');
    });

    it('should serialize to JSON', () => {
      const error = new InvalidStateTransitionError('PENDING', 'COMPLETE');
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'InvalidStateTransitionError');
      expect(json).toHaveProperty('code', 'INVALID_STATE_TRANSITION');
      expect(json).toHaveProperty('currentState', 'PENDING');
      expect(json).toHaveProperty('attemptedEvent', 'COMPLETE');
    });
  });

  describe('LedgerImbalanceError', () => {
    it('should create error with imbalance info', () => {
      const error = new LedgerImbalanceError('tx-abc', new Decimal('0.01'));

      expect(error.code).toBe('LEDGER_IMBALANCE');
      expect(error.transactionId).toBe('tx-abc');
      expect(error.imbalance.eq('0.01')).toBe(true);
    });

    it('should handle negative imbalance', () => {
      const error = new LedgerImbalanceError('tx-abc', new Decimal('-50'));

      expect(error.imbalance.eq('-50')).toBe(true);
    });

    it('should have descriptive message', () => {
      const error = new LedgerImbalanceError('tx-abc', new Decimal('0.01'));

      expect(error.message).toContain('tx-abc');
      expect(error.message).toContain('0.01');
      expect(error.message).toContain('not balanced');
    });

    it('should serialize to JSON', () => {
      const error = new LedgerImbalanceError('tx-abc', new Decimal('5.5'));
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'LedgerImbalanceError');
      expect(json).toHaveProperty('code', 'LEDGER_IMBALANCE');
      expect(json).toHaveProperty('transactionId', 'tx-abc');
      expect(json).toHaveProperty('imbalance', '5.5');
    });
  });

  describe('UserNotFoundError', () => {
    it('should create error with user identifier', () => {
      const error = new UserNotFoundError('user-123');

      expect(error.code).toBe('USER_NOT_FOUND');
      expect(error.message).toContain('user-123');
    });
  });

  describe('WalletNotFoundError', () => {
    it('should create error with wallet identifier', () => {
      const error = new WalletNotFoundError('wallet-123');

      expect(error.code).toBe('WALLET_NOT_FOUND');
      expect(error.message).toContain('wallet-123');
    });
  });

  describe('TransactionNotFoundError', () => {
    it('should create error with transaction identifier', () => {
      const error = new TransactionNotFoundError('tx-123');

      expect(error.code).toBe('TRANSACTION_NOT_FOUND');
      expect(error.message).toContain('tx-123');
    });
  });
});
