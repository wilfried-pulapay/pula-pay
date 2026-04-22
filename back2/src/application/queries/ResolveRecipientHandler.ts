import { UserRepository } from '../../domain/ports/repositories/UserRepository';
import { WalletRepository } from '../../domain/ports/repositories/WalletRepository';
import { UserNotFoundError } from '../../domain/errors/UserNotFoundError';
import { WalletNotFoundError } from '../../domain/errors/WalletNotFoundError';
import { DomainError } from '../../domain/errors/DomainError';

export interface ResolveRecipientQuery {
  phone?: string;
  address?: string;
}

export interface ResolveRecipientResult {
  userId: string;
  address: string;
  phone?: string;
}

class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class ResolveRecipientHandler {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly walletRepo: WalletRepository
  ) {}

  async execute(query: ResolveRecipientQuery): Promise<ResolveRecipientResult> {
    if (!query.phone && !query.address) {
      throw new ValidationError('Either phone or address must be provided');
    }

    // Resolve by phone number
    if (query.phone) {
      const user = await this.userRepo.findByPhone(query.phone);
      if (!user) {
        throw new UserNotFoundError(query.phone, 'phone');
      }

      const wallet = await this.walletRepo.findByUserId(user.id);
      if (!wallet) {
        throw new WalletNotFoundError(query.phone, 'phone');
      }

      return {
        userId: user.id,
        address: wallet.address,
        phone: user.phoneNumber ?? undefined,
      };
    }

    // Resolve by wallet address
    if (query.address) {
      const wallet = await this.walletRepo.findByAddress(query.address);
      if (!wallet) {
        throw new WalletNotFoundError(query.address, 'address');
      }

      const user = await this.userRepo.findById(wallet.userId);

      return {
        userId: wallet.userId,
        address: wallet.address,
        phone: user?.phoneNumber ?? undefined,
      };
    }

    // This should never be reached due to the validation above
    throw new ValidationError('Either phone or address must be provided');
  }
}
