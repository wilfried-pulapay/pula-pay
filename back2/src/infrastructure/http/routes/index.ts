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
import { InitiateDepositHandler } from '../../../application/commands/InitiateDepositHandler';
import { InitiateWithdrawalHandler } from '../../../application/commands/InitiateWithdrawalHandler';
import { ExecuteTransferHandler } from '../../../application/commands/ExecuteTransferHandler';
import { ExecuteSimpleTransferHandler } from '../../../application/commands/ExecuteSimpleTransferHandler';
import { ConfirmDepositHandler } from '../../../application/commands/ConfirmDepositHandler';
import { ActivateWalletHandler } from '../../../application/commands/ActivateWalletHandler';
import { SyncWalletStatusHandler } from '../../../application/commands/SyncWalletStatusHandler';
import { GetBalanceHandler } from '../../../application/queries/GetBalanceHandler';
import { GetTransactionHistoryHandler } from '../../../application/queries/GetTransactionHistoryHandler';
import { GetTransactionByIdHandler } from '../../../application/queries/GetTransactionByIdHandler';
import { GetExchangeRateHandler } from '../../../application/queries/GetExchangeRateHandler';
import { GetWalletAddressHandler } from '../../../application/queries/GetWalletAddressHandler';
import { ResolveRecipientHandler } from '../../../application/queries/ResolveRecipientHandler';
import { GetOnrampQuoteHandler } from '../../../application/queries/GetOnrampQuoteHandler';
import { GetOfframpQuoteHandler } from '../../../application/queries/GetOfframpQuoteHandler';
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
  // Better Auth — handles all /api/auth/* routes
  app.all('/api/auth/*', authHandler);
}

export function createRouter(prisma: PrismaClient): Router {
  const router = Router();

  // Initialize repositories
  const userRepo = new PrismaUserRepository(prisma);
  const walletRepo = new PrismaWalletRepository(prisma);
  const txRepo = new PrismaTransactionRepository(prisma);

  // Initialize adapters
  const circleAdapter = new CircleWalletAdapter();
  const coinbaseCdpAdapter = new CoinbaseCdpOnRampAdapter();
  const coingeckoAdapter = new CoingeckoAdapter();
  const exchangeRateAdapter = new CachedExchangeRateAdapter(coingeckoAdapter);

  // Initialize handlers
  const createWalletHandler = new CreateWalletHandler(userRepo, walletRepo, circleAdapter);
  const depositHandler = new InitiateDepositHandler(walletRepo, txRepo, coinbaseCdpAdapter, exchangeRateAdapter, coinbasePollingQueue, txExpiryQueue);
  const withdrawHandler = new InitiateWithdrawalHandler(walletRepo, txRepo, coinbaseCdpAdapter, exchangeRateAdapter, coinbasePollingQueue, txExpiryQueue);
  const transferHandler = new ExecuteTransferHandler(prisma, walletRepo, txRepo, circleAdapter, exchangeRateAdapter);
  const simpleTransferHandler = new ExecuteSimpleTransferHandler(prisma, walletRepo, txRepo, exchangeRateAdapter);
  const confirmDepositHandler = new ConfirmDepositHandler(prisma, txRepo, walletRepo);
  const activateWalletHandler = new ActivateWalletHandler(walletRepo);
  const syncWalletStatusHandler = new SyncWalletStatusHandler(walletRepo, circleAdapter);
  const balanceHandler = new GetBalanceHandler(userRepo, walletRepo, exchangeRateAdapter);
  const historyHandler = new GetTransactionHistoryHandler(walletRepo, txRepo);
  const transactionByIdHandler = new GetTransactionByIdHandler(walletRepo, txRepo);
  const addressHandler = new GetWalletAddressHandler(walletRepo);
  const rateHandler = new GetExchangeRateHandler(exchangeRateAdapter);
  const resolveRecipientHandler = new ResolveRecipientHandler(userRepo, walletRepo);
  const onrampQuoteHandler = new GetOnrampQuoteHandler(coinbaseCdpAdapter);
  const offrampQuoteHandler = new GetOfframpQuoteHandler(coinbaseCdpAdapter);
  const conversionService = new CurrencyConversionService(exchangeRateAdapter);

  // Initialize controllers
  const walletController = new WalletController(createWalletHandler, depositHandler, withdrawHandler, transferHandler, simpleTransferHandler, syncWalletStatusHandler, balanceHandler, historyHandler, transactionByIdHandler, addressHandler, resolveRecipientHandler, onrampQuoteHandler, offrampQuoteHandler);
  const webhookController = new WebhookController(confirmDepositHandler, activateWalletHandler, coinbaseCdpAdapter, coinbasePollingQueue, txExpiryQueue);
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
  router.post('/wallet', authMiddleware, walletController.createWallet);
  router.get('/wallet/address', authMiddleware, walletController.getAddress);
  router.get('/wallet/balance', authMiddleware, walletController.getBalance);
  router.post('/wallet/sync-status', authMiddleware, walletController.syncWalletStatus);
  router.post('/wallet/deposit', authMiddleware, walletController.initiateDeposit);
  router.post('/wallet/withdraw', authMiddleware, walletController.initiateWithdrawal);
  router.post('/wallet/transfer', authMiddleware, walletController.transfer);
  router.post('/wallet/transferable', authMiddleware, walletController.simpleTransfer);
  router.get('/wallet/transactions/:txId', authMiddleware, walletController.getTransaction);
  router.get('/wallet/transactions', authMiddleware, walletController.getTransactionHistory);
  router.get('/wallet/resolve-recipient', authMiddleware, walletController.resolveRecipient);
  router.get('/wallet/onramp-quote', authMiddleware, walletController.getOnrampQuote);
  router.get('/wallet/offramp-quote', authMiddleware, walletController.getOfframpQuote);

  return router;
}
