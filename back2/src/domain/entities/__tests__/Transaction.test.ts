import Decimal from 'decimal.js';
import { Transaction } from '../Transaction';
import { InvalidStateTransitionError } from '../../errors/InvalidStateTransitionError';
import {
  createTransaction,
  createTransactionProps,
  transactionFixtures,
} from '../../../__tests__/fixtures';

describe('Transaction Entity', () => {
  describe('constructor and getters', () => {
    it('should create transaction with all properties', () => {
      const props = createTransactionProps();
      const tx = new Transaction(props);

      expect(tx.id).toBe(props.id);
      expect(tx.idempotencyKey).toBe(props.idempotencyKey);
      expect(tx.externalRef).toBe(props.externalRef);
      expect(tx.type).toBe(props.type);
      expect(tx.status).toBe(props.status);
      expect(tx.amountUsdc.eq(props.amountUsdc)).toBe(true);
      expect(tx.feeUsdc.eq(props.feeUsdc)).toBe(true);
      expect(tx.exchangeRate!.eq(props.exchangeRate!)).toBe(true);
      expect(tx.displayCurrency).toBe(props.displayCurrency);
      expect(tx.displayAmount!.eq(props.displayAmount!)).toBe(true);
      expect(tx.walletId).toBe(props.walletId);
      expect(tx.counterpartyId).toBe(props.counterpartyId);
      expect(tx.description).toBe(props.description);
      expect(tx.metadata).toBe(props.metadata);
      expect(tx.failureReason).toBe(props.failureReason);
      expect(tx.completedAt).toBe(props.completedAt);
    });

    it('should handle null optional fields', () => {
      const tx = createTransaction({
        externalRef: null,
        exchangeRate: null,
        displayCurrency: null,
        displayAmount: null,
        counterpartyId: null,
        description: null,
        metadata: null,
        failureReason: null,
        completedAt: null,
      });

      expect(tx.externalRef).toBeNull();
      expect(tx.exchangeRate).toBeNull();
      expect(tx.displayCurrency).toBeNull();
      expect(tx.displayAmount).toBeNull();
      expect(tx.counterpartyId).toBeNull();
      expect(tx.description).toBeNull();
      expect(tx.metadata).toBeNull();
      expect(tx.failureReason).toBeNull();
      expect(tx.completedAt).toBeNull();
    });
  });

  describe('netAmountUsdc', () => {
    it('should calculate net amount (amount - fee)', () => {
      const tx = createTransaction({
        amountUsdc: new Decimal('100'),
        feeUsdc: new Decimal('1'),
      });

      expect(tx.netAmountUsdc.eq(new Decimal('99'))).toBe(true);
    });

    it('should return full amount when fee is zero', () => {
      const tx = createTransaction({
        amountUsdc: new Decimal('100'),
        feeUsdc: new Decimal('0'),
      });

      expect(tx.netAmountUsdc.eq(new Decimal('100'))).toBe(true);
    });

    it('should handle small fee precision', () => {
      const tx = createTransaction({
        amountUsdc: new Decimal('16.570000'),
        feeUsdc: new Decimal('0.170000'),
      });

      expect(tx.netAmountUsdc.eq(new Decimal('16.400000'))).toBe(true);
    });
  });

  describe('status checks', () => {
    it('should return true for isPending when status is PENDING', () => {
      const tx = transactionFixtures.pendingDeposit();
      expect(tx.isPending()).toBe(true);
      expect(tx.isProcessing()).toBe(false);
      expect(tx.isCompleted()).toBe(false);
      expect(tx.isFailed()).toBe(false);
      expect(tx.isTerminal()).toBe(false);
    });

    it('should return true for isProcessing when status is PROCESSING', () => {
      const tx = transactionFixtures.processingDeposit();
      expect(tx.isProcessing()).toBe(true);
      expect(tx.isPending()).toBe(false);
      expect(tx.isTerminal()).toBe(false);
    });

    it('should return true for isCompleted when status is COMPLETED', () => {
      const tx = transactionFixtures.completedDeposit();
      expect(tx.isCompleted()).toBe(true);
      expect(tx.isTerminal()).toBe(true);
    });

    it('should return true for isFailed when status is FAILED', () => {
      const tx = transactionFixtures.failedDeposit();
      expect(tx.isFailed()).toBe(true);
      expect(tx.isTerminal()).toBe(true);
    });

    it('should return true for isCancelled when status is CANCELLED', () => {
      const tx = transactionFixtures.cancelledTransaction();
      expect(tx.isCancelled()).toBe(true);
      expect(tx.isTerminal()).toBe(true);
    });

    it('should return true for isExpired when status is EXPIRED', () => {
      const tx = transactionFixtures.expiredTransaction();
      expect(tx.isExpired()).toBe(true);
      expect(tx.isTerminal()).toBe(true);
    });
  });

  describe('type checks', () => {
    it('should return true for isDeposit when type is DEPOSIT_ONRAMP', () => {
      const tx = transactionFixtures.completedDeposit();
      expect(tx.isDeposit()).toBe(true);
      expect(tx.isWithdrawal()).toBe(false);
      expect(tx.isTransfer()).toBe(false);
    });

    it('should return true for isDeposit when type is DEPOSIT_CRYPTO', () => {
      const tx = transactionFixtures.cryptoDeposit();
      expect(tx.isDeposit()).toBe(true);
    });

    it('should return true for isWithdrawal when type is WITHDRAWAL_OFFRAMP', () => {
      const tx = transactionFixtures.completedWithdrawal();
      expect(tx.isWithdrawal()).toBe(true);
      expect(tx.isDeposit()).toBe(false);
      expect(tx.isTransfer()).toBe(false);
    });

    it('should return true for isTransfer when type is TRANSFER_P2P', () => {
      const tx = transactionFixtures.completedTransfer();
      expect(tx.isTransfer()).toBe(true);
      expect(tx.isDeposit()).toBe(false);
      expect(tx.isWithdrawal()).toBe(false);
    });
  });

  describe('state transitions', () => {
    describe('markProcessing', () => {
      it('should transition from PENDING to PROCESSING', () => {
        const tx = transactionFixtures.pendingDeposit();

        tx.markProcessing();

        expect(tx.status).toBe('PROCESSING');
      });

      it('should set external ref when provided', () => {
        const tx = transactionFixtures.pendingDeposit();

        tx.markProcessing('momo-ref-123');

        expect(tx.externalRef).toBe('momo-ref-123');
      });

      it('should throw InvalidStateTransitionError from COMPLETED', () => {
        const tx = transactionFixtures.completedDeposit();

        expect(() => tx.markProcessing()).toThrow(InvalidStateTransitionError);
      });
    });

    describe('complete', () => {
      it('should transition from PROCESSING to COMPLETED', () => {
        const tx = transactionFixtures.processingDeposit();

        tx.complete();

        expect(tx.status).toBe('COMPLETED');
        expect(tx.completedAt).not.toBeNull();
      });

      it('should set completedAt timestamp', () => {
        const tx = transactionFixtures.processingDeposit();
        const before = new Date();

        tx.complete();

        expect(tx.completedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it('should throw InvalidStateTransitionError from PENDING', () => {
        const tx = transactionFixtures.pendingDeposit();

        expect(() => tx.complete()).toThrow(InvalidStateTransitionError);
      });
    });

    describe('fail', () => {
      it('should transition from PROCESSING to FAILED', () => {
        const tx = transactionFixtures.processingDeposit();

        tx.fail('Payment rejected');

        expect(tx.status).toBe('FAILED');
        expect(tx.failureReason).toBe('Payment rejected');
      });

      it('should transition from PENDING to FAILED', () => {
        const tx = transactionFixtures.pendingDeposit();

        tx.fail('User cancelled');

        expect(tx.status).toBe('FAILED');
      });

      it('should throw InvalidStateTransitionError from COMPLETED', () => {
        const tx = transactionFixtures.completedDeposit();

        expect(() => tx.fail('Error')).toThrow(InvalidStateTransitionError);
      });
    });

    describe('cancel', () => {
      it('should transition from PENDING to CANCELLED', () => {
        const tx = transactionFixtures.pendingDeposit();

        tx.cancel();

        expect(tx.status).toBe('CANCELLED');
      });

      it('should throw InvalidStateTransitionError from PROCESSING', () => {
        const tx = transactionFixtures.processingDeposit();

        expect(() => tx.cancel()).toThrow(InvalidStateTransitionError);
      });
    });

    describe('expire', () => {
      it('should transition from PENDING to EXPIRED', () => {
        const tx = transactionFixtures.pendingDeposit();

        tx.expire();

        expect(tx.status).toBe('EXPIRED');
      });

      it('should throw InvalidStateTransitionError from PROCESSING', () => {
        const tx = transactionFixtures.processingDeposit();

        expect(() => tx.expire()).toThrow(InvalidStateTransitionError);
      });
    });
  });

  describe('metadata', () => {
    it('should set metadata key', () => {
      const tx = transactionFixtures.pendingDeposit();

      tx.setMetadata('provider', 'MTN_MOMO');

      expect(tx.metadata).toEqual({ provider: 'MTN_MOMO' });
    });

    it('should merge with existing metadata', () => {
      const tx = createTransaction({
        metadata: { existing: 'value' },
      });

      tx.setMetadata('new', 'data');

      expect(tx.metadata).toEqual({ existing: 'value', new: 'data' });
    });
  });

  describe('setFee', () => {
    it('should update fee on non-terminal transaction', () => {
      const tx = transactionFixtures.pendingDeposit();
      const newFee = new Decimal('0.5');

      tx.setFee(newFee);

      expect(tx.feeUsdc.eq(newFee)).toBe(true);
    });

    it('should throw error when modifying fee on terminal transaction', () => {
      const tx = transactionFixtures.completedDeposit();

      expect(() => tx.setFee(new Decimal('0.5'))).toThrow(
        'Cannot modify fee on terminal transaction'
      );
    });

    it('should throw error when modifying fee on FAILED transaction', () => {
      const tx = transactionFixtures.failedDeposit();

      expect(() => tx.setFee(new Decimal('0.5'))).toThrow(
        'Cannot modify fee on terminal transaction'
      );
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const tx = transactionFixtures.completedDeposit();
      const json = tx.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('idempotencyKey');
      expect(json).toHaveProperty('type');
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('amountUsdc');
      expect(json).toHaveProperty('feeUsdc');
      expect(json).toHaveProperty('netAmountUsdc');
      expect(json).toHaveProperty('walletId');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });

    it('should convert Decimal values to strings', () => {
      const tx = createTransaction();
      const json = tx.toJSON();

      expect(typeof json.amountUsdc).toBe('string');
      expect(typeof json.feeUsdc).toBe('string');
      expect(typeof json.netAmountUsdc).toBe('string');
    });

    it('should handle null optional fields in JSON', () => {
      const tx = createTransaction({
        exchangeRate: null,
        displayCurrency: null,
        completedAt: null,
      });
      const json = tx.toJSON();

      expect(json.exchangeRate).toBeNull();
      expect(json.displayCurrency).toBeNull();
      expect(json.completedAt).toBeNull();
    });

    it('should convert dates to ISO strings', () => {
      const tx = transactionFixtures.completedDeposit();
      const json = tx.toJSON();

      expect(typeof json.createdAt).toBe('string');
      expect(typeof json.updatedAt).toBe('string');
      expect(typeof json.completedAt).toBe('string');
    });

    it('should return persistence format with all properties', () => {
      const tx = createTransaction();
      const persistence = tx.toPersistence();

      expect(persistence.amountUsdc instanceof Decimal).toBe(true);
      expect(persistence.feeUsdc instanceof Decimal).toBe(true);
      expect(persistence).toHaveProperty('metadata');
    });
  });
});
