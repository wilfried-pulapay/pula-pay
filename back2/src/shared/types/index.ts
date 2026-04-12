import { Currency, Blockchain, TxStatus, TxType, KycLevel, WalletStatus } from '@prisma/client';

// Re-export Prisma types for convenience
export { Currency, Blockchain, TxStatus, TxType, KycLevel, WalletStatus };

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}
