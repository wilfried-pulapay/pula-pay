import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Currency, TxType, TxStatus, Blockchain } from '@prisma/client';
import { ApiResponse } from '../../../shared/types';
import { CreateWalletHandler, CreateWalletResult } from '../../../application/commands/CreateWalletHandler';
import { ConfirmWalletSetupHandler, ConfirmWalletSetupResult } from '../../../application/commands/ConfirmWalletSetupHandler';
import { InitiateDepositHandler, InitiateDepositResult } from '../../../application/commands/InitiateDepositHandler';
import { InitiateWithdrawalHandler, InitiateWithdrawalResult } from '../../../application/commands/InitiateWithdrawalHandler';
import { ExecuteTransferHandler, TransferResult } from '../../../application/commands/ExecuteTransferHandler';
import { SyncWalletStatusHandler, SyncWalletStatusResult } from '../../../application/commands/SyncWalletStatusHandler';
import { ReconcileBalanceHandler, ReconcileBalanceResult } from '../../../application/commands/ReconcileBalanceHandler';
import { GetBalanceHandler, GetBalanceResult } from '../../../application/queries/GetBalanceHandler';
import { GetTransactionHistoryHandler, GetTransactionHistoryResult } from '../../../application/queries/GetTransactionHistoryHandler';
import { GetTransactionByIdHandler, GetTransactionByIdResult } from '../../../application/queries/GetTransactionByIdHandler';
import { GetWalletAddressHandler, GetWalletAddressResult } from '../../../application/queries/GetWalletAddressHandler';
import { ResolveRecipientHandler, ResolveRecipientResult } from '../../../application/queries/ResolveRecipientHandler';
import { GetOnrampQuoteHandler } from '../../../application/queries/GetOnrampQuoteHandler';
import { GetOfframpQuoteHandler } from '../../../application/queries/GetOfframpQuoteHandler';
import { OnrampQuoteResult, OfframpQuoteResult } from '../../../domain/ports/QuoteProvider';
import { GetCircleWalletsHandler } from '../../../application/queries/GetCircleWalletsHandler';
import { EstimateTransferFeeHandler, EstimateTransferFeeResult } from '../../../application/queries/EstimateTransferFeeHandler';

// Validation schemas
const blockchainSchema = z.object({
  blockchain: z.nativeEnum(Blockchain).optional(),
});

const confirmSetupSchema = z.object({
  userToken: z.string().min(1),
  blockchain: z.nativeEnum(Blockchain).optional(),
});

const depositSchema = z.object({
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency),
  country: z.string().length(2).default('US'),
  paymentMethod: z.enum(['CARD', 'ACH_BANK_ACCOUNT', 'APPLE_PAY']).default('CARD'),
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  targetCurrency: z.nativeEnum(Currency),
  country: z.string().length(2).default('US'),
  paymentMethod: z.enum(['ACH_BANK_ACCOUNT', 'CARD']).default('ACH_BANK_ACCOUNT'),
});

const transferSchema = z.object({
  recipientPhone: z.string().min(8).max(15).optional(),
  recipientAddress: z.string().optional(),
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency),
  description: z.string().max(200).optional(),
}).refine(
  (data) => data.recipientPhone || data.recipientAddress,
  { message: 'Either recipientPhone or recipientAddress must be provided' }
);

const historyQuerySchema = z.object({
  type: z.nativeEnum(TxType).optional(),
  status: z.nativeEnum(TxStatus).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const resolveRecipientSchema = z.object({
  phone: z.string().min(8).max(15).optional(),
  address: z.string().optional(),
}).refine(
  (data) => data.phone || data.address,
  { message: 'Either phone or address must be provided' }
);

const onrampQuoteSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.nativeEnum(Currency),
  country: z.string().length(2).default('US'),
  paymentMethod: z.enum(['CARD', 'ACH_BANK_ACCOUNT', 'APPLE_PAY']).default('CARD'),
});

const offrampQuoteSchema = z.object({
  sellAmount: z.coerce.number().positive(),
  cashoutCurrency: z.nativeEnum(Currency),
  country: z.string().length(2).default('US'),
  paymentMethod: z.enum(['ACH_BANK_ACCOUNT', 'CARD']).default('ACH_BANK_ACCOUNT'),
});

const estimateFeeSchema = z.object({
  recipientAddress: z.string().min(1),
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency),
});

export class WalletController {
  constructor(
    private readonly createWalletHandler: CreateWalletHandler,
    private readonly confirmWalletSetupHandler: ConfirmWalletSetupHandler,
    private readonly depositHandler: InitiateDepositHandler,
    private readonly withdrawHandler: InitiateWithdrawalHandler,
    private readonly transferHandler: ExecuteTransferHandler,
    private readonly syncStatusHandler: SyncWalletStatusHandler,
    private readonly balanceHandler: GetBalanceHandler,
    private readonly historyHandler: GetTransactionHistoryHandler,
    private readonly transactionByIdHandler: GetTransactionByIdHandler,
    private readonly addressHandler: GetWalletAddressHandler,
    private readonly resolveRecipientHandler: ResolveRecipientHandler,
    private readonly onrampQuoteHandler: GetOnrampQuoteHandler,
    private readonly offrampQuoteHandler: GetOfframpQuoteHandler,
    private readonly circleWalletsHandler: GetCircleWalletsHandler,
  private readonly reconcileBalanceHandler: ReconcileBalanceHandler,
  private readonly estimateFeeHandler: EstimateTransferFeeHandler,
  ) {}

  /**
   * POST /wallet
   * Initiates wallet setup for user-controlled wallets.
   * Returns challengeId + userToken + encryptionKey for the mobile Circle SDK.
   */
  createWallet = async (
    req: Request,
    res: Response<ApiResponse<CreateWalletResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = blockchainSchema.parse(req.body);
      const result = await this.createWalletHandler.execute({
        userId: req.user!.id,
        blockchain: data.blockchain,
      });

      res.status(202).json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /wallet/confirm-setup
   * Called after the mobile resolves the Circle wallet challenge (PIN setup).
   * Fetches the created wallet from Circle and persists it locally.
   */
  confirmWalletSetup = async (
    req: Request,
    res: Response<ApiResponse<ConfirmWalletSetupResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = confirmSetupSchema.parse(req.body);
      const result = await this.confirmWalletSetupHandler.execute({
        userId: req.user!.id,
        userToken: data.userToken,
        blockchain: data.blockchain,
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getBalance = async (
    req: Request,
    res: Response<ApiResponse<GetBalanceResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currency = req.query.currency as Currency | undefined;
      const result = await this.balanceHandler.execute({
        userId: req.user!.id,
        displayCurrency: currency,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  initiateDeposit = async (
    req: Request,
    res: Response<ApiResponse<InitiateDepositResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = depositSchema.parse(req.body);
      const result = await this.depositHandler.execute({
        userId: req.user!.id,
        fiatAmount: data.amount,
        fiatCurrency: data.currency,
        country: data.country,
        paymentMethod: data.paymentMethod,
        clientIp: req.ip,
      });

      res.status(202).json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  initiateWithdrawal = async (
    req: Request,
    res: Response<ApiResponse<InitiateWithdrawalResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = withdrawSchema.parse(req.body);
      const result = await this.withdrawHandler.execute({
        userId: req.user!.id,
        fiatAmount: data.amount,
        fiatCurrency: data.targetCurrency,
        country: data.country,
        paymentMethod: data.paymentMethod,
        clientIp: req.ip,
      });

      res.status(202).json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  transfer = async (
    req: Request,
    res: Response<ApiResponse<TransferResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = transferSchema.parse(req.body);
      const result = await this.transferHandler.execute({
        senderUserId: req.user!.id,
        recipientPhone: data.recipientPhone,
        recipientWalletAddress: data.recipientAddress,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
      });

      res.status(202).json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getTransactionHistory = async (
    req: Request,
    res: Response<ApiResponse<GetTransactionHistoryResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = historyQuerySchema.parse(req.query);
      const result = await this.historyHandler.execute({
        userId: req.user!.id,
        type: query.type,
        status: query.status,
        fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
        toDate: query.toDate ? new Date(query.toDate) : undefined,
        page: query.page,
        limit: query.limit,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getTransaction = async (
    req: Request,
    res: Response<ApiResponse<GetTransactionByIdResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { txId } = req.params;
      const result = await this.transactionByIdHandler.execute({
        userId: req.user!.id,
        transactionId: txId,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getAddress = async (
    req: Request,
    res: Response<ApiResponse<GetWalletAddressResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.addressHandler.execute({
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  syncWalletStatus = async (
    req: Request,
    res: Response<ApiResponse<SyncWalletStatusResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.syncStatusHandler.execute({
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  reconcileBalance = async (
    req: Request,
    res: Response<ApiResponse<ReconcileBalanceResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.reconcileBalanceHandler.execute({
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  resolveRecipient = async (
    req: Request,
    res: Response<ApiResponse<ResolveRecipientResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = resolveRecipientSchema.parse(req.query);
      const result = await this.resolveRecipientHandler.execute({
        phone: query.phone,
        address: query.address,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getOnrampQuote = async (
    req: Request,
    res: Response<ApiResponse<OnrampQuoteResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = onrampQuoteSchema.parse(req.query);
      const result = await this.onrampQuoteHandler.execute({
        paymentAmount: query.amount,
        paymentCurrency: query.currency,
        country: query.country,
        paymentMethod: query.paymentMethod,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getCircleWallets = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.circleWalletsHandler.execute({
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getOfframpQuote = async (
    req: Request,
    res: Response<ApiResponse<OfframpQuoteResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = offrampQuoteSchema.parse(req.query);
      const result = await this.offrampQuoteHandler.execute({
        sellAmount: query.sellAmount,
        cashoutCurrency: query.cashoutCurrency,
        country: query.country,
        paymentMethod: query.paymentMethod,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /wallet/estimate-fee
   * Estimates the network fee for a P2P transfer before initiating it.
   */
  estimateFee = async (
    req: Request,
    res: Response<ApiResponse<EstimateTransferFeeResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = estimateFeeSchema.parse(req.body);
      const result = await this.estimateFeeHandler.execute({
        userId: req.user!.id,
        recipientAddress: data.recipientAddress,
        amount: data.amount,
        currency: data.currency,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
