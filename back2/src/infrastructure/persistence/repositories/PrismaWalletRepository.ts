import Decimal from 'decimal.js';
import { PrismaClient, Wallet as PrismaWallet } from '@prisma/client';
import { Wallet, WalletProps } from '../../../domain/entities/Wallet';
import { WalletRepository, CreateWalletRepoParams } from '../../../domain/ports/repositories/WalletRepository';

export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    return wallet ? this.toDomain(wallet) : null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    return wallet ? this.toDomain(wallet) : null;
  }

  async findByAddress(address: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: address.toLowerCase() },
    });
    return wallet ? this.toDomain(wallet) : null;
  }

  async findByCircleWalletId(circleWalletId: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({ where: { circleWalletId } });
    return wallet ? this.toDomain(wallet) : null;
  }

  async findByUserPhone(phone: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        user: { phone },
      },
    });
    return wallet ? this.toDomain(wallet) : null;
  }

  async create(params: CreateWalletRepoParams): Promise<Wallet> {
    const wallet = await this.prisma.wallet.create({
      data: {
        userId: params.userId,
        circleWalletId: params.circleWalletId,
        walletSetId: params.walletSetId ?? null,
        address: params.address.toLowerCase(),
        blockchain: params.blockchain,
        status: 'PENDING',
        balanceUsdc: 0,
      },
    });
    return this.toDomain(wallet);
  }

  async update(wallet: Wallet): Promise<Wallet> {
    const props = wallet.toPersistence();
    const updated = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        status: props.status,
        balanceUsdc: props.balanceUsdc.toNumber(),
      },
    });
    return this.toDomain(updated);
  }

  async updateBalance(walletId: string, balance: Decimal): Promise<void> {
    await this.prisma.wallet.update({
      where: { id: walletId },
      data: { balanceUsdc: balance.toNumber() },
    });
  }

  private toDomain(prismaWallet: PrismaWallet): Wallet {
    const props: WalletProps = {
      id: prismaWallet.id,
      userId: prismaWallet.userId,
      circleWalletId: prismaWallet.circleWalletId,
      walletSetId: prismaWallet.walletSetId ?? null,
      address: prismaWallet.address,
      blockchain: prismaWallet.blockchain,
      status: prismaWallet.status,
      balanceUsdc: new Decimal(prismaWallet.balanceUsdc.toString()),
      createdAt: prismaWallet.createdAt,
      updatedAt: prismaWallet.updatedAt,
    };
    return new Wallet(props);
  }
}
