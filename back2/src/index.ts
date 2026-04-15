import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import swaggerUi from 'swagger-ui-express';

import { config } from './shared/config';
import { logger } from './shared/utils/logger';
import { prisma, connectDatabase, disconnectDatabase } from './infrastructure/persistence/prisma/client';
import { mountAuthRoutes, createRouter } from './infrastructure/http/routes';
import { requestLogger, errorHandler } from './infrastructure/http/middleware';
import { swaggerSpec } from './infrastructure/http/swagger';
import { bootstrapWorkers } from './infrastructure/jobs';
import { redis } from './infrastructure/cache/redis-cache';

// Adapters for worker dependencies
import { CoinbaseCdpOnRampAdapter } from './infrastructure/adapters/coinbase-cdp/CoinbaseCdpOnRampAdapter';
import { CircleWalletAdapter } from './infrastructure/adapters/circle/CircleWalletAdapter';
import { ConfirmDepositHandler } from './application/commands/ConfirmDepositHandler';
import { ConfirmTransferHandler } from './application/commands/ConfirmTransferHandler';
import { PrismaTransactionRepository } from './infrastructure/persistence/repositories/PrismaTransactionRepository';
import { PrismaWalletRepository } from './infrastructure/persistence/repositories/PrismaWalletRepository';

async function bootstrap(): Promise<void> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.env === 'production' ? ['https://pulapay.com'] : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  // Rate limiting (Redis-backed for multi-instance support)
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        sendCommand: (...args: string[]) =>
          redis.call(args[0], ...args.slice(1)) as any,
      }),
      message: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
        },
      },
    })
  );

  // Connect to database
  await connectDatabase();

  // Request logging — must be before all routes so every request is captured
  app.use(requestLogger);

  // Better Auth routes — must be mounted BEFORE express.json() because
  // toNodeHandler reads the raw body stream (express.json would drain it)
  mountAuthRoutes(app);

  // Body parsing (for /api/v2 routes only, after auth is mounted)
  // The verify callback saves the raw buffer for Circle webhook signature verification
  app.use(express.json({
    limit: '10kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Compression
  app.use(compression());

  // Swagger documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Pula Pay API v2 Documentation',
  }));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // API routes
  app.use('/api/v2', createRouter(prisma));

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  // Error handler
  app.use(errorHandler);

  // Bootstrap BullMQ workers
  const coinbaseCdpAdapter = new CoinbaseCdpOnRampAdapter();
  const circleAdapter = new CircleWalletAdapter();
  const txRepo = new PrismaTransactionRepository(prisma);
  const walletRepo = new PrismaWalletRepository(prisma);
  const confirmDepositHandler = new ConfirmDepositHandler(prisma, txRepo, walletRepo);
  const confirmTransferHandler = new ConfirmTransferHandler(prisma, txRepo, walletRepo);

  const workers = await bootstrapWorkers({
    coinbaseCdpAdapter,
    confirmDepositHandler,
    confirmTransferHandler,
    walletProvider: circleAdapter,
    walletRepo,
    transactionRepo: txRepo,
  });

  // Start server
  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.env,
      },
      `Pula Pay v2 server started on port ${config.port}`
    );
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    server.close(async () => {
      logger.info('HTTP server closed');
      await workers.shutdown();
      await disconnectDatabase();
      redis.disconnect();
      process.exit(0);
    });

    // Force shutdown after 30s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Start the application
bootstrap().catch((error) => {
  logger.fatal({ error }, 'Failed to start application');
  process.exit(1);
});
