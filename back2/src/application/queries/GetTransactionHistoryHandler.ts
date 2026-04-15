import { TxType, TxStatus } from '@prisma/client';
import { TransactionRepository, TransactionFilters } from '../../domain/ports/repositories/TransactionRepository';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { PaginationParams, PaginatedResult } from '../../shared/types';

export interface GetTransactionHistoryQuery {
  userId: string;
  type?: TxType;
  status?: TxStatus;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface TransactionHistoryItem {
  id: string;
  type: TxType;
  status: TxStatus;
  direction: 'IN' | 'OUT';
  amountUsdc: string;
  feeUsdc: string;
  displayAmount: string | null;
  displayCurrency: string | null;
  description: string | null;
  counterpartyName: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface GetTransactionHistoryResult extends PaginatedResult<TransactionHistoryItem> {}

export class GetTransactionHistoryHandler {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly txRepo: TransactionRepository
  ) {}

  private getDirection(type: TxType, txWalletId: string, userWalletId: string): 'IN' | 'OUT' {
    // Deposits are always incoming
    if (type === 'DEPOSIT_ONRAMP' || type === 'DEPOSIT_CRYPTO') {
      return 'IN';
    }
    // Withdrawals are always outgoing
    if (type === 'WITHDRAWAL_OFFRAMP' || type === 'WITHDRAWAL_CRYPTO') {
      return 'OUT';
    }
    // Fees are always outgoing
    if (type === 'FEE') {
      return 'OUT';
    }
    // Refunds are always incoming
    if (type === 'REFUND') {
      return 'IN';
    }
    // P2P transfers: check if user is sender or receiver
    return txWalletId === userWalletId ? 'OUT' : 'IN';
  }

  async execute(query: GetTransactionHistoryQuery): Promise<GetTransactionHistoryResult> {
    // Get wallet
    const wallet = await this.walletRepo.findByUserId(query.userId);
    if (!wallet) {
      throw new WalletNotFoundError(query.userId, 'userId');
    }

    // Build filters
    const filters: TransactionFilters = {
      type: query.type,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
    };

    // Build pagination
    const pagination: PaginationParams = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };

    // Fetch transactions
    const result = await this.txRepo.findByWalletId(wallet.id, filters, pagination);

    return {
      items: result.items.map((tx) => {
        const direction = this.getDirection(tx.type, tx.walletId, wallet.id);
        const meta = tx.metadata as Record<string, string | null> | null;
        const counterpartyName = tx.type === 'TRANSFER_P2P'
          ? (direction === 'IN' ? (meta?.senderName ?? null) : (meta?.recipientName ?? null))
          : null;
        return {
          id: tx.id,
          type: tx.type,
          status: tx.status,
          direction,
          amountUsdc: tx.amountUsdc.toString(),
          feeUsdc: tx.feeUsdc.toString(),
          displayAmount: tx.displayAmount?.toString() ?? null,
          displayCurrency: tx.displayCurrency,
          description: tx.description,
          counterpartyName,
          createdAt: tx.createdAt.toISOString(),
          completedAt: tx.completedAt?.toISOString() ?? null,
        };
      }),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
