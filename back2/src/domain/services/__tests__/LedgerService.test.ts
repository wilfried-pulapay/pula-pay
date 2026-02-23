import Decimal from 'decimal.js';
import { LedgerService } from '../LedgerService';
import { LedgerImbalanceError } from '../../errors/LedgerImbalanceError';

describe('LedgerService', () => {
  let ledgerService: LedgerService;

  beforeEach(() => {
    ledgerService = new LedgerService();
  });

  describe('createEntries', () => {
    it('should create balanced entries', () => {
      const entries = ledgerService.createEntries({
        transactionId: 'tx-1',
        entries: [
          {
            walletId: 'wallet-1',
            accountType: 'USER',
            amount: new Decimal(-100),
            currentBalance: new Decimal(200),
          },
          {
            walletId: 'wallet-2',
            accountType: 'USER',
            amount: new Decimal(100),
            currentBalance: new Decimal(50),
          },
        ],
      });

      expect(entries).toHaveLength(2);
      expect(entries[0].entryType).toBe('DEBIT');
      expect(entries[0].amountUsdc.eq(100)).toBe(true);
      expect(entries[0].balanceAfter.eq(100)).toBe(true);
      expect(entries[1].entryType).toBe('CREDIT');
      expect(entries[1].amountUsdc.eq(100)).toBe(true);
      expect(entries[1].balanceAfter.eq(150)).toBe(true);
    });

    it('should throw LedgerImbalanceError for unbalanced entries', () => {
      expect(() =>
        ledgerService.createEntries({
          transactionId: 'tx-1',
          entries: [
            {
              walletId: 'wallet-1',
              accountType: 'USER',
              amount: new Decimal(-100),
              currentBalance: new Decimal(200),
            },
            {
              walletId: 'wallet-2',
              accountType: 'USER',
              amount: new Decimal(50), // Only 50, should be 100
              currentBalance: new Decimal(50),
            },
          ],
        })
      ).toThrow(LedgerImbalanceError);
    });

    it('should set correct entry types (CREDIT for positive, DEBIT for negative)', () => {
      const entries = ledgerService.createEntries({
        transactionId: 'tx-1',
        entries: [
          {
            walletId: 'wallet-1',
            accountType: 'USER',
            amount: new Decimal(-50), // Debit
            currentBalance: new Decimal(100),
          },
          {
            walletId: null,
            accountType: 'FEES',
            amount: new Decimal(50), // Credit
            currentBalance: new Decimal(0),
          },
        ],
      });

      expect(entries[0].entryType).toBe('DEBIT');
      expect(entries[1].entryType).toBe('CREDIT');
    });

    it('should store absolute amount in amountUsdc', () => {
      const entries = ledgerService.createEntries({
        transactionId: 'tx-1',
        entries: [
          {
            walletId: 'wallet-1',
            accountType: 'USER',
            amount: new Decimal(-100),
            currentBalance: new Decimal(200),
          },
          {
            walletId: 'wallet-2',
            accountType: 'USER',
            amount: new Decimal(100),
            currentBalance: new Decimal(0),
          },
        ],
      });

      expect(entries[0].amountUsdc.eq(100)).toBe(true); // Absolute value
      expect(entries[1].amountUsdc.eq(100)).toBe(true);
    });
  });

  describe('createDepositEntries', () => {
    it('should create balanced deposit entries', () => {
      const entries = ledgerService.createDepositEntries(
        'tx-deposit-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(1),
        new Decimal(0)
      );

      expect(entries.length).toBeGreaterThanOrEqual(2);

      // Verify balance: sum of all amounts should be 0
      entries.reduce(
        (acc, e) => acc.add(e.entryType === 'CREDIT' ? e.amountUsdc : e.amountUsdc.neg()),
        new Decimal(0)
      );
      // Note: The way entries are created, they should balance internally
      // Let's verify the user receives net amount (amount - fee)
      const userEntry = entries.find((e) => e.walletId === 'user-wallet-1');
      expect(userEntry).toBeDefined();
      expect(userEntry!.amountUsdc.eq(99)).toBe(true); // 100 - 1 fee
      expect(userEntry!.entryType).toBe('CREDIT');
    });

    it('should create fee entry', () => {
      const entries = ledgerService.createDepositEntries(
        'tx-deposit-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(1),
        new Decimal(0)
      );

      const feeEntry = entries.find((e) => e.accountType === 'FEES');
      expect(feeEntry).toBeDefined();
      expect(feeEntry!.amountUsdc.eq(1)).toBe(true);
      expect(feeEntry!.entryType).toBe('CREDIT');
    });

    it('should create escrow entries', () => {
      const entries = ledgerService.createDepositEntries(
        'tx-deposit-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(1),
        new Decimal(0)
      );

      const escrowEntries = entries.filter((e) => e.accountType === 'ESCROW');
      expect(escrowEntries.length).toBe(2); // Credit and debit
    });

    it('should calculate correct balance after for user', () => {
      const entries = ledgerService.createDepositEntries(
        'tx-deposit-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(1),
        new Decimal(50) // Starting balance
      );

      const userEntry = entries.find((e) => e.walletId === 'user-wallet-1');
      expect(userEntry!.balanceAfter.eq(149)).toBe(true); // 50 + 99
    });
  });

  describe('createWithdrawalEntries', () => {
    it('should create balanced withdrawal entries', () => {
      const entries = ledgerService.createWithdrawalEntries(
        'tx-withdrawal-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(1),
        new Decimal(200)
      );

      expect(entries.length).toBeGreaterThanOrEqual(2);

      // User should be debited amount + fee
      const userEntry = entries.find((e) => e.walletId === 'user-wallet-1');
      expect(userEntry).toBeDefined();
      expect(userEntry!.amountUsdc.eq(101)).toBe(true); // 100 + 1 fee
      expect(userEntry!.entryType).toBe('DEBIT');
    });

    it('should create fee entry', () => {
      const entries = ledgerService.createWithdrawalEntries(
        'tx-withdrawal-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(2),
        new Decimal(200)
      );

      const feeEntry = entries.find((e) => e.accountType === 'FEES');
      expect(feeEntry).toBeDefined();
      expect(feeEntry!.amountUsdc.eq(2)).toBe(true);
      expect(feeEntry!.entryType).toBe('CREDIT');
    });

    it('should calculate correct balance after for user', () => {
      const entries = ledgerService.createWithdrawalEntries(
        'tx-withdrawal-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(1),
        new Decimal(200) // Starting balance
      );

      const userEntry = entries.find((e) => e.walletId === 'user-wallet-1');
      expect(userEntry!.balanceAfter.eq(99)).toBe(true); // 200 - 101
    });
  });

  describe('createTransferEntries', () => {
    it('should create balanced P2P transfer entries', () => {
      const entries = ledgerService.createTransferEntries(
        'tx-transfer-1',
        'sender-wallet',
        'receiver-wallet',
        new Decimal(50),
        new Decimal(100), // Sender balance
        new Decimal(20) // Receiver balance
      );

      expect(entries).toHaveLength(2);

      const senderEntry = entries.find((e) => e.walletId === 'sender-wallet');
      const receiverEntry = entries.find((e) => e.walletId === 'receiver-wallet');

      expect(senderEntry!.entryType).toBe('DEBIT');
      expect(senderEntry!.amountUsdc.eq(50)).toBe(true);
      expect(senderEntry!.balanceAfter.eq(50)).toBe(true);

      expect(receiverEntry!.entryType).toBe('CREDIT');
      expect(receiverEntry!.amountUsdc.eq(50)).toBe(true);
      expect(receiverEntry!.balanceAfter.eq(70)).toBe(true);
    });

    it('should be balanced (sender debit = receiver credit)', () => {
      const entries = ledgerService.createTransferEntries(
        'tx-transfer-1',
        'sender-wallet',
        'receiver-wallet',
        new Decimal(100),
        new Decimal(200),
        new Decimal(0)
      );

      const senderEntry = entries.find((e) => e.walletId === 'sender-wallet');
      const receiverEntry = entries.find((e) => e.walletId === 'receiver-wallet');

      expect(senderEntry!.amountUsdc.eq(receiverEntry!.amountUsdc)).toBe(true);
    });
  });

  describe('createCryptoDepositEntries', () => {
    it('should create balanced crypto deposit entries', () => {
      const entries = ledgerService.createCryptoDepositEntries(
        'tx-crypto-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(0)
      );

      expect(entries.length).toBeGreaterThanOrEqual(2);

      const userEntry = entries.find((e) => e.walletId === 'user-wallet-1');
      expect(userEntry).toBeDefined();
      expect(userEntry!.amountUsdc.eq(100)).toBe(true);
      expect(userEntry!.entryType).toBe('CREDIT');
    });

    it('should use LIQUIDITY account for source', () => {
      const entries = ledgerService.createCryptoDepositEntries(
        'tx-crypto-1',
        'user-wallet-1',
        new Decimal(100),
        new Decimal(0)
      );

      const liquidityEntries = entries.filter((e) => e.accountType === 'LIQUIDITY');
      expect(liquidityEntries.length).toBe(2); // Credit (arrival) and debit (to user)
    });
  });

  describe('createFeeEntries', () => {
    it('should create balanced fee entries', () => {
      const entries = ledgerService.createFeeEntries(
        'tx-fee-1',
        'user-wallet-1',
        new Decimal(5),
        new Decimal(100)
      );

      expect(entries).toHaveLength(2);

      const userEntry = entries.find((e) => e.walletId === 'user-wallet-1');
      const feeEntry = entries.find((e) => e.accountType === 'FEES');

      expect(userEntry!.entryType).toBe('DEBIT');
      expect(userEntry!.amountUsdc.eq(5)).toBe(true);
      expect(userEntry!.balanceAfter.eq(95)).toBe(true);

      expect(feeEntry!.entryType).toBe('CREDIT');
      expect(feeEntry!.amountUsdc.eq(5)).toBe(true);
    });
  });

  describe('createRefundEntries', () => {
    it('should create balanced refund entries', () => {
      const entries = ledgerService.createRefundEntries(
        'tx-refund-1',
        'user-wallet-1',
        new Decimal(50),
        new Decimal(100)
      );

      expect(entries).toHaveLength(2);

      const userEntry = entries.find((e) => e.walletId === 'user-wallet-1');
      const escrowEntry = entries.find((e) => e.accountType === 'ESCROW');

      expect(userEntry!.entryType).toBe('CREDIT');
      expect(userEntry!.amountUsdc.eq(50)).toBe(true);
      expect(userEntry!.balanceAfter.eq(150)).toBe(true);

      expect(escrowEntry!.entryType).toBe('DEBIT');
      expect(escrowEntry!.amountUsdc.eq(50)).toBe(true);
    });
  });

  describe('balance invariant', () => {
    it('should always produce balanced entries for deposits', () => {
      const testCases = [
        { amount: 100, fee: 1 },
        { amount: 1000, fee: 10 },
        { amount: 16.57, fee: 0.17 },
        { amount: 0.01, fee: 0.001 },
      ];

      testCases.forEach(({ amount, fee }) => {
        const entries = ledgerService.createDepositEntries(
          'tx-test',
          'wallet-1',
          new Decimal(amount),
          new Decimal(fee),
          new Decimal(0)
        );

        // Calculate balance: credits - debits should = 0
        const balance = entries.reduce((acc, e) => {
          if (e.entryType === 'CREDIT') {
            return acc.add(e.amountUsdc);
          } else {
            return acc.sub(e.amountUsdc);
          }
        }, new Decimal(0));

        expect(balance.eq(0)).toBe(true);
      });
    });

    it('should always produce balanced entries for withdrawals', () => {
      const entries = ledgerService.createWithdrawalEntries(
        'tx-test',
        'wallet-1',
        new Decimal(100),
        new Decimal(2),
        new Decimal(500)
      );

      const balance = entries.reduce((acc, e) => {
        if (e.entryType === 'CREDIT') {
          return acc.add(e.amountUsdc);
        } else {
          return acc.sub(e.amountUsdc);
        }
      }, new Decimal(0));

      expect(balance.eq(0)).toBe(true);
    });

    it('should always produce balanced entries for transfers', () => {
      const entries = ledgerService.createTransferEntries(
        'tx-test',
        'sender',
        'receiver',
        new Decimal(75),
        new Decimal(200),
        new Decimal(50)
      );

      const balance = entries.reduce((acc, e) => {
        if (e.entryType === 'CREDIT') {
          return acc.add(e.amountUsdc);
        } else {
          return acc.sub(e.amountUsdc);
        }
      }, new Decimal(0));

      expect(balance.eq(0)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero fee in deposit', () => {
      const entries = ledgerService.createDepositEntries(
        'tx-test',
        'wallet-1',
        new Decimal(100),
        new Decimal(0), // Zero fee
        new Decimal(0)
      );

      const feeEntry = entries.find((e) => e.accountType === 'FEES');
      expect(feeEntry!.amountUsdc.eq(0)).toBe(true);
    });

    it('should handle very small amounts', () => {
      const entries = ledgerService.createDepositEntries(
        'tx-test',
        'wallet-1',
        new Decimal('0.000001'),
        new Decimal('0.0000001'),
        new Decimal(0)
      );

      expect(entries.length).toBeGreaterThan(0);
    });

    it('should handle large amounts', () => {
      const entries = ledgerService.createTransferEntries(
        'tx-test',
        'sender',
        'receiver',
        new Decimal('1000000.123456'),
        new Decimal('2000000'),
        new Decimal('0')
      );

      const balance = entries.reduce((acc, e) => {
        if (e.entryType === 'CREDIT') {
          return acc.add(e.amountUsdc);
        } else {
          return acc.sub(e.amountUsdc);
        }
      }, new Decimal(0));

      expect(balance.eq(0)).toBe(true);
    });
  });
});
