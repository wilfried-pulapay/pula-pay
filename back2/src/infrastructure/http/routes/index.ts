import { Router, Express } from 'express';
import { PrismaClient } from '@prisma/client';

// Better Auth
import { authHandler } from '../../auth/auth.routes';
import { authMiddleware } from '../../auth/auth.middleware';

// Controllers
import { WalletController } from '../controllers/WalletController';
import { WebhookController } from '../controllers/WebhookController';
import { ExchangeRateController } from '../controllers/ExchangeRateController';
import { HealthController } from '../controllers/HealthController';

// Handlers
import { CreateWalletHandler } from '../../../application/commands/CreateWalletHandler';
import { ConfirmWalletSetupHandler } from '../../../application/commands/ConfirmWalletSetupHandler';
import { InitiateDepositHandler } from '../../../application/commands/InitiateDepositHandler';
import { InitiateWithdrawalHandler } from '../../../application/commands/InitiateWithdrawalHandler';
import { ExecuteTransferHandler } from '../../../application/commands/ExecuteTransferHandler';
import { ConfirmDepositHandler } from '../../../application/commands/ConfirmDepositHandler';
import { ConfirmTransferHandler } from '../../../application/commands/ConfirmTransferHandler';
import { ActivateWalletHandler } from '../../../application/commands/ActivateWalletHandler';
import { ProcessInboundDepositHandler } from '../../../application/commands/ProcessInboundDepositHandler';
import { SyncWalletStatusHandler } from '../../../application/commands/SyncWalletStatusHandler';
import { ReconcileBalanceHandler } from '../../../application/commands/ReconcileBalanceHandler';
import { GetBalanceHandler } from '../../../application/queries/GetBalanceHandler';
import { GetTransactionHistoryHandler } from '../../../application/queries/GetTransactionHistoryHandler';
import { GetTransactionByIdHandler } from '../../../application/queries/GetTransactionByIdHandler';
import { GetExchangeRateHandler } from '../../../application/queries/GetExchangeRateHandler';
import { GetWalletAddressHandler } from '../../../application/queries/GetWalletAddressHandler';
import { ResolveRecipientHandler } from '../../../application/queries/ResolveRecipientHandler';
import { GetOnrampQuoteHandler } from '../../../application/queries/GetOnrampQuoteHandler';
import { GetOfframpQuoteHandler } from '../../../application/queries/GetOfframpQuoteHandler';
import { GetCircleWalletsHandler } from '../../../application/queries/GetCircleWalletsHandler';
import { EstimateTransferFeeHandler } from '../../../application/queries/EstimateTransferFeeHandler';
import { CurrencyConversionService } from '../../../application/services/CurrencyConversionService';

// Repositories
import { PrismaUserRepository } from '../../persistence/repositories/PrismaUserRepository';
import { PrismaWalletRepository } from '../../persistence/repositories/PrismaWalletRepository';
import { PrismaTransactionRepository } from '../../persistence/repositories/PrismaTransactionRepository';

// Adapters
import { CircleWalletAdapter } from '../../adapters/circle/CircleWalletAdapter';
import { CoinbaseCdpOnRampAdapter } from '../../adapters/coinbase-cdp/CoinbaseCdpOnRampAdapter';
import { CoingeckoAdapter } from '../../adapters/exchange/CoingeckoAdapter';
import { CachedExchangeRateAdapter } from '../../adapters/exchange/CachedExchangeRateAdapter';

// BullMQ queues
import { coinbasePollingQueue, txExpiryQueue } from '../../jobs/queues';

export function mountAuthRoutes(app: Express): void {
  app.all('/api/auth/*', authHandler);
}

export function createRouter(prisma: PrismaClient): Router {
  const router = Router();

  // Repositories
  const userRepo = new PrismaUserRepository(prisma);
  const walletRepo = new PrismaWalletRepository(prisma);
  const txRepo = new PrismaTransactionRepository(prisma);

  // Adapters
  const circleAdapter = new CircleWalletAdapter();
  const coinbaseCdpAdapter = new CoinbaseCdpOnRampAdapter();
  const coingeckoAdapter = new CoingeckoAdapter();
  const exchangeRateAdapter = new CachedExchangeRateAdapter(coingeckoAdapter);

  // Handlers
  const createWalletHandler = new CreateWalletHandler(userRepo, walletRepo, circleAdapter);
  const confirmWalletSetupHandler = new ConfirmWalletSetupHandler(userRepo, walletRepo, circleAdapter);
  const depositHandler = new InitiateDepositHandler(walletRepo, txRepo, coinbaseCdpAdapter, exchangeRateAdapter, coinbasePollingQueue, txExpiryQueue);
  const withdrawHandler = new InitiateWithdrawalHandler(walletRepo, txRepo, coinbaseCdpAdapter, exchangeRateAdapter, coinbasePollingQueue, txExpiryQueue);
  const transferHandler = new ExecuteTransferHandler(walletRepo, userRepo, txRepo, circleAdapter, exchangeRateAdapter);
  const confirmDepositHandler = new ConfirmDepositHandler(prisma, txRepo, walletRepo);
  const confirmTransferHandler = new ConfirmTransferHandler(prisma, txRepo, walletRepo);
  const activateWalletHandler = new ActivateWalletHandler(walletRepo);
  const syncWalletStatusHandler = new SyncWalletStatusHandler(walletRepo, circleAdapter);
  const reconcileBalanceHandler = new ReconcileBalanceHandler(prisma, walletRepo, txRepo, circleAdapter);
  const balanceHandler = new GetBalanceHandler(userRepo, walletRepo, exchangeRateAdapter);
  const historyHandler = new GetTransactionHistoryHandler(walletRepo, txRepo);
  const transactionByIdHandler = new GetTransactionByIdHandler(walletRepo, txRepo);
  const addressHandler = new GetWalletAddressHandler(walletRepo);
  const rateHandler = new GetExchangeRateHandler(exchangeRateAdapter);
  const resolveRecipientHandler = new ResolveRecipientHandler(userRepo, walletRepo);
  const onrampQuoteHandler = new GetOnrampQuoteHandler(coinbaseCdpAdapter);
  const offrampQuoteHandler = new GetOfframpQuoteHandler(coinbaseCdpAdapter);
  const circleWalletsHandler = new GetCircleWalletsHandler(circleAdapter);
  const estimateTransferFeeHandler = new EstimateTransferFeeHandler(walletRepo, circleAdapter, exchangeRateAdapter);
  const conversionService = new CurrencyConversionService(exchangeRateAdapter);

  // Controllers
  const walletController = new WalletController(
    createWalletHandler,
    confirmWalletSetupHandler,
    depositHandler,
    withdrawHandler,
    transferHandler,
    syncWalletStatusHandler,
    balanceHandler,
    historyHandler,
    transactionByIdHandler,
    addressHandler,
    resolveRecipientHandler,
    onrampQuoteHandler,
    offrampQuoteHandler,
    circleWalletsHandler,
    reconcileBalanceHandler,
    estimateTransferFeeHandler,
  );
  const processInboundDepositHandler = new ProcessInboundDepositHandler(prisma, txRepo, walletRepo);
  const webhookController = new WebhookController(confirmDepositHandler, confirmTransferHandler, activateWalletHandler, processInboundDepositHandler, coinbaseCdpAdapter, coinbasePollingQueue, txExpiryQueue, circleAdapter);
  const rateController = new ExchangeRateController(rateHandler, conversionService);
  const healthController = new HealthController(prisma);

  // Health routes (no auth)
  router.get('/health', healthController.getHealth);
  router.get('/ready', healthController.getReady);
  router.get('/live', healthController.getLive);

  // Public routes
  router.get('/exchange-rates', rateController.getRates);
  router.get('/exchange-rates/preview', rateController.getConversionPreview);

  // Webhook routes (no auth, validated internally)
  router.post('/webhooks/coinbase-cdp', webhookController.handleCoinbaseCdpWebhook);
  router.post('/webhooks/circle', webhookController.handleCircleWebhook);

  // Protected wallet routes
  router.post('/wallet', authMiddleware, walletController.createWallet);               // Initiate setup (returns challenge)
  router.post('/wallet/confirm-setup', authMiddleware, walletController.confirmWalletSetup); // Confirm after PIN
  router.get('/wallet/address', authMiddleware, walletController.getAddress);
  router.get('/wallet/balance', authMiddleware, walletController.getBalance);
  router.post('/wallet/sync-status', authMiddleware, walletController.syncWalletStatus);
  router.post('/wallet/reconcile-balance', authMiddleware, walletController.reconcileBalance);
  router.post('/wallet/deposit', authMiddleware, walletController.initiateDeposit);
  router.post('/wallet/withdraw', authMiddleware, walletController.initiateWithdrawal);
  router.post('/wallet/transfer', authMiddleware, walletController.transfer);
  router.get('/wallet/transactions/:txId', authMiddleware, walletController.getTransaction);
  router.get('/wallet/transactions', authMiddleware, walletController.getTransactionHistory);
  router.get('/wallet/resolve-recipient', authMiddleware, walletController.resolveRecipient);
  router.get('/wallet/onramp-quote', authMiddleware, walletController.getOnrampQuote);
  router.get('/wallet/offramp-quote', authMiddleware, walletController.getOfframpQuote);
  router.get('/wallet/circle-wallets', authMiddleware, walletController.getCircleWallets);
  router.post('/wallet/estimate-fee', authMiddleware, walletController.estimateFee);

  return router;
}
