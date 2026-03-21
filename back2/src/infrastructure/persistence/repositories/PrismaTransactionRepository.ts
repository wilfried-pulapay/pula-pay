import Decimal from 'decimal.js';
import { PrismaClient, Transaction as PrismaTransaction, Prisma } from '@prisma/client';
import { Transaction, TransactionProps } from '../../../domain/entities/Transaction';
import { TransactionRepository, CreateTransactionParams, CreateOnRampDetailsParams, TransactionFilters } from '../../../domain/ports/repositories/TransactionRepository';
import { PaginationParams, PaginatedResult } from '../../../shared/types';

export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Transaction | null> {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    return tx ? this.toDomain(tx) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const tx = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: key },
    });
    return tx ? this.toDomain(tx) : null;
  }

  async findByExternalRef(ref: string): Promise<Transaction | null> {
    const tx = await this.prisma.transaction.findUnique({
      where: { externalRef: ref },
    });
    return tx ? this.toDomain(tx) : null;
  }

  async findByWalletId(
    walletId: string,
    filters?: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const where: Prisma.TransactionWhereInput = {
      // Include transactions where user is sender OR receiver
      OR: [
        { walletId },
        { counterpartyId: walletId },
      ],
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.fromDate || filters?.toDate
        ? {
            createdAt: {
              ...(filters.fromDate && { gte: filters.fromDate }),
              ...(filters.toDate && { lte: filters.toDate }),
            },
          }
        : {}),
    };

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: transactions.map((tx) => this.toDomain(tx)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(params: CreateTransactionParams): Promise<Transaction> {
    const tx = await this.prisma.transaction.create({
      data: {
        idempotencyKey: params.idempotencyKey,
        type: params.type,
        status: params.status ?? 'PENDING',
        amountUsdc: params.amountUsdc.toNumber(),
        feeUsdc: params.feeUsdc?.toNumber() ?? 0,
        exchangeRate: params.exchangeRate?.toNumber(),
        displayCurrency: params.displayCurrency,
        displayAmount: params.displayAmount?.toNumber(),
        walletId: params.walletId,
        counterpartyId: params.counterpartyId,
        description: params.description,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
        challengeId: params.challengeId,
      },
    });
    return this.toDomain(tx);
  }

  async update(transaction: Transaction): Promise<Transaction> {
    const props = transaction.toPersistence();
    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: props.status,
        externalRef: props.externalRef,
        feeUsdc: props.feeUsdc.toNumber(),
        failureReason: props.failureReason,
        metadata: (props.metadata as Prisma.InputJsonValue) ?? undefined,
        completedAt: props.completedAt,
      },
    });
    return this.toDomain(updated);
  }

  async createOnRampDetails(params: CreateOnRampDetailsParams): Promise<void> {
    await this.prisma.onRampTransaction.create({
      data: {
        transactionId: params.transactionId,
        provider: params.provider,
        providerRef: params.providerRef,
        fiatCurrency: params.fiatCurrency,
        fiatAmount: params.fiatAmount.toNumber(),
        providerStatus: params.providerStatus,
        providerData: (params.providerData as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async updateOnRampStatus(
    transactionId: string,
    status: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.onRampTransaction.update({
      where: { transactionId },
      data: {
        providerStatus: status,
        ...(data && { providerData: data as Prisma.InputJsonValue }),
      },
    });
  }

  private toDomain(prismaTx: PrismaTransaction): Transaction {
    const props: TransactionProps = {
      id: prismaTx.id,
      idempotencyKey: prismaTx.idempotencyKey,
      externalRef: prismaTx.externalRef,
      type: prismaTx.type,
      status: prismaTx.status,
      amountUsdc: new Decimal(prismaTx.amountUsdc.toString()),
      feeUsdc: new Decimal(prismaTx.feeUsdc.toString()),
      exchangeRate: prismaTx.exchangeRate
        ? new Decimal(prismaTx.exchangeRate.toString())
        : null,
      displayCurrency: prismaTx.displayCurrency,
      displayAmount: prismaTx.displayAmount
        ? new Decimal(prismaTx.displayAmount.toString())
        : null,
      walletId: prismaTx.walletId,
      counterpartyId: prismaTx.counterpartyId,
      description: prismaTx.description,
      metadata: prismaTx.metadata as Record<string, unknown> | null,
      failureReason: prismaTx.failureReason,
      challengeId: prismaTx.challengeId,
      createdAt: prismaTx.createdAt,
      updatedAt: prismaTx.updatedAt,
      completedAt: prismaTx.completedAt,
    };
    return new Transaction(props);
  }
}
