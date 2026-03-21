import Decimal from 'decimal.js';
import { Blockchain } from '@prisma/client';
import { Wallet } from '../../entities/Wallet';

export interface CreateWalletRepoParams {
  userId: string;
  circleWalletId: string;
  walletSetId?: string | null;
  address: string;
  blockchain: Blockchain;
}

/**
 * Repository port for Wallet persistence
 */
export interface WalletRepository {
  findById(id: string): Promise<Wallet | null>;
  findByUserId(userId: string): Promise<Wallet | null>;
  findByAddress(address: string): Promise<Wallet | null>;
  findByCircleWalletId(circleWalletId: string): Promise<Wallet | null>;
  findByUserPhone(phone: string): Promise<Wallet | null>;
  create(params: CreateWalletRepoParams): Promise<Wallet>;
  update(wallet: Wallet): Promise<Wallet>;
  updateBalance(walletId: string, balance: Decimal): Promise<void>;
}
