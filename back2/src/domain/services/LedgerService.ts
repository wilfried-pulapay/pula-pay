import Decimal from 'decimal.js';
import { AccountType, EntryType } from '@prisma/client';
import { LedgerImbalanceError } from '../errors/LedgerImbalanceError';

export interface LedgerEntry {
  transactionId: string;
  walletId: string | null;
  accountType: AccountType;
  amountUsdc: Decimal;
  entryType: EntryType;
  balanceAfter: Decimal;
}

export interface CreateEntriesParams {
  transactionId: string;
  entries: Array<{
    walletId: string | null;
    accountType: AccountType;
    amount: Decimal; // Positive = credit, Negative = debit
    currentBalance: Decimal;
  }>;
}

/**
 * Domain service for double-entry accounting
 *
 * INVARIANTS:
 * - Sum of debits MUST equal sum of credits
 * - Each transaction generates at least 2 entries
 */
export class LedgerService {
  /**
   * Create ledger entries for a transaction
   * Validates that entries are balanced
   */
  createEntries(params: CreateEntriesParams): LedgerEntry[] {
    const entries: LedgerEntry[] = params.entries.map((entry) => ({
      transactionId: params.transactionId,
      walletId: entry.walletId,
      accountType: entry.accountType,
      amountUsdc: entry.amount.abs(),
      entryType: entry.amount.gte(0) ? 'CREDIT' : 'DEBIT',
      balanceAfter: entry.currentBalance.add(entry.amount),
    }));

    this.assertBalanced(params.transactionId, params.entries);
    return entries;
  }

  /**
   * Create entries for on-ramp deposit (Fiat → USDC)
   */
  createDepositEntries(
    transactionId: string,
    userWalletId: string,
    amount: Decimal,
    fee: Decimal,
    userBalance: Decimal
  ): LedgerEntry[] {
    const netAmount = amount.sub(fee);

    return this.createEntries({
      transactionId,
      entries: [
        // Debit: Escrow pays out USDC to user
        {
          walletId: null,
          accountType: 'ESCROW',
          amount: amount.neg(),
          currentBalance: new Decimal(0),
        },
        // Credit: User receives net amount (after fees)
        {
          walletId: userWalletId,
          accountType: 'USER',
          amount: netAmount,
          currentBalance: userBalance,
        },
        // Credit: Fees collected
        {
          walletId: null,
          accountType: 'FEES',
          amount: fee,
          currentBalance: new Decimal(0),
        },
      ],
    });
  }

  /**
   * Create entries for off-ramp withdrawal (USDC → Fiat)
   */
  createWithdrawalEntries(
    transactionId: string,
    userWalletId: string,
    amount: Decimal,
    fee: Decimal,
    userBalance: Decimal
  ): LedgerEntry[] {
    const totalDebit = amount.add(fee);

    return this.createEntries({
      transactionId,
      entries: [
        // Debit: User pays amount + fee
        {
          walletId: userWalletId,
          accountType: 'USER',
          amount: totalDebit.neg(),
          currentBalance: userBalance,
        },
        // Credit: Escrow receives USDC for fiat payout
        {
          walletId: null,
          accountType: 'ESCROW',
          amount: amount,
          currentBalance: new Decimal(0),
        },
        // Credit: Fees collected
        {
          walletId: null,
          accountType: 'FEES',
          amount: fee,
          currentBalance: new Decimal(0),
        },
      ],
    });
  }

  /**
   * Create entries for P2P transfer
   */
  createTransferEntries(
    transactionId: string,
    senderWalletId: string,
    receiverWalletId: string,
    amount: Decimal,
    senderBalance: Decimal,
    receiverBalance: Decimal
  ): LedgerEntry[] {
    return this.createEntries({
      transactionId,
      entries: [
        // Debit: Sender
        {
          walletId: senderWalletId,
          accountType: 'USER',
          amount: amount.neg(),
          currentBalance: senderBalance,
        },
        // Credit: Receiver
        {
          walletId: receiverWalletId,
          accountType: 'USER',
          amount: amount,
          currentBalance: receiverBalance,
        },
      ],
    });
  }

  /**
   * Create entries for direct crypto deposit
   */
  createCryptoDepositEntries(
    transactionId: string,
    userWalletId: string,
    amount: Decimal,
    userBalance: Decimal
  ): LedgerEntry[] {
    return this.createEntries({
      transactionId,
      entries: [
        // Debit: External on-chain source (USDC arrives from blockchain)
        {
          walletId: null,
          accountType: 'LIQUIDITY',
          amount: amount.neg(),
          currentBalance: new Decimal(0),
        },
        // Credit: User receives
        {
          walletId: userWalletId,
          accountType: 'USER',
          amount: amount,
          currentBalance: userBalance,
        },
      ],
    });
  }

  /**
   * Create entries for fee charge
   */
  createFeeEntries(
    transactionId: string,
    userWalletId: string,
    fee: Decimal,
    userBalance: Decimal
  ): LedgerEntry[] {
    return this.createEntries({
      transactionId,
      entries: [
        // Debit: User
        {
          walletId: userWalletId,
          accountType: 'USER',
          amount: fee.neg(),
          currentBalance: userBalance,
        },
        // Credit: Fees
        {
          walletId: null,
          accountType: 'FEES',
          amount: fee,
          currentBalance: new Decimal(0),
        },
      ],
    });
  }

  /**
   * Create entries for refund
   */
  createRefundEntries(
    transactionId: string,
    userWalletId: string,
    amount: Decimal,
    userBalance: Decimal
  ): LedgerEntry[] {
    return this.createEntries({
      transactionId,
      entries: [
        // Debit: Escrow (source of refund)
        {
          walletId: null,
          accountType: 'ESCROW',
          amount: amount.neg(),
          currentBalance: new Decimal(0),
        },
        // Credit: User
        {
          walletId: userWalletId,
          accountType: 'USER',
          amount: amount,
          currentBalance: userBalance,
        },
      ],
    });
  }

  /**
   * Verify entries are balanced (sum = 0)
   */
  private assertBalanced(
    transactionId: string,
    entries: Array<{ amount: Decimal }>
  ): void {
    const sum = entries.reduce((acc, entry) => acc.add(entry.amount), new Decimal(0));

    if (!sum.eq(0)) {
      throw new LedgerImbalanceError(transactionId, sum);
    }
  }
}
