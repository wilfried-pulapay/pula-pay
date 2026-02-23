import { Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import { ApiResponse } from '../../../shared/types';
import { ConfirmDepositHandler } from '../../../application/commands/ConfirmDepositHandler';
import { ActivateWalletHandler } from '../../../application/commands/ActivateWalletHandler';
import { OnRampProvider } from '../../../domain/ports/OnRampProvider';
import { logger } from '../../../shared/utils/logger';

interface CoinbaseCdpWebhookPayload {
  event_type:
    | 'onramp.transaction.created'
    | 'onramp.transaction.updated'
    | 'onramp.transaction.success'
    | 'onramp.transaction.failed'
    | 'offramp.transaction.created'
    | 'offramp.transaction.updated'
    | 'offramp.transaction.success'
    | 'offramp.transaction.failed';
  transaction_id: string;
  partner_user_id: string;
  status: string;
  metadata?: Record<string, unknown>;
}

interface CircleWebhookPayload {
  subscriptionId: string;
  notificationId: string;
  notificationType: string;
  notification: {
    id: string;
    walletId: string;
    state: string;
    txHash?: string;
    amounts?: string[];
    transactionType?: string;
  };
}

export class WebhookController {
  constructor(
    private readonly confirmDepositHandler: ConfirmDepositHandler,
    private readonly activateWalletHandler: ActivateWalletHandler,
    private readonly coinbaseCdpProvider: OnRampProvider,
    private readonly coinbasePollingQueue: Queue,
    private readonly txExpiryQueue: Queue,
  ) {}

  handleCoinbaseCdpWebhook = async (
    req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
  ): Promise<void> => {
    try {
      // Validate webhook
      const isValid = this.coinbaseCdpProvider.validateWebhook(
        req.headers as Record<string, string>,
        req.body
      );

      if (!isValid) {
        logger.warn({ headers: req.headers }, 'Invalid Coinbase CDP webhook payload');
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_WEBHOOK',
            message: 'Invalid webhook payload',
          },
          meta: {
            requestId: req.headers['x-request-id'] as string,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const payload = req.body as CoinbaseCdpWebhookPayload;

      logger.info(
        { eventType: payload.event_type, transactionId: payload.transaction_id },
        'Coinbase CDP webhook received'
      );

      // Process terminal status events
      if (payload.event_type.endsWith('.success') || payload.event_type.endsWith('.failed')) {
        await this.confirmDepositHandler.execute({
          providerRef: payload.transaction_id,
          providerStatus: payload.event_type.endsWith('.success') ? 'success' : 'failed',
          metadata: {
            partnerUserId: payload.partner_user_id,
            coinbaseStatus: payload.status,
            ...payload.metadata,
          },
        });

        // Cancel polling + expiry jobs (no longer needed)
        await this.cancelRelatedJobs(payload.transaction_id);
      }

      // Always acknowledge receipt
      res.status(200).json({
        success: true,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error processing Coinbase CDP webhook');
      res.status(200).json({
        success: true,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  handleCircleWebhook = async (
    req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
  ): Promise<void> => {
    try {
      const payload = req.body as CircleWebhookPayload;

      logger.info(
        {
          notificationType: payload.notificationType,
          transactionId: payload.notification?.id,
          state: payload.notification?.state,
        },
        'Circle webhook received'
      );

      switch (payload.notificationType) {
        case 'transactions.outbound':
        case 'transactions.inbound':
          break;

        case 'wallets':
          await this.handleWalletStateChange(payload);
          break;

        default:
          logger.debug(
            { notificationType: payload.notificationType },
            'Unhandled Circle notification type'
          );
      }

      res.status(200).json({
        success: true,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error processing Circle webhook');
      res.status(200).json({
        success: true,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  private async cancelRelatedJobs(partnerUserRef: string): Promise<void> {
    try {
      const pollingJobs = await this.coinbasePollingQueue.getJobs(['waiting', 'delayed']);
      const match = pollingJobs.find((j) => j.data?.partnerUserRef === partnerUserRef);
      if (match) {
        await match.remove();

        const expiryJobs = await this.txExpiryQueue.getJobs(['waiting', 'delayed']);
        const expiryMatch = expiryJobs.find((j) => j.data?.transactionId === match.data?.transactionId);
        if (expiryMatch) await expiryMatch.remove();
      }
    } catch (err) {
      logger.warn({ msg: 'Failed to cancel jobs after webhook', err });
    }
  }

  private async handleWalletStateChange(payload: CircleWebhookPayload): Promise<void> {
    const { walletId, state } = payload.notification;

    logger.info(
      { circleWalletId: walletId, state },
      'Processing wallet state change'
    );

    if (state === 'LIVE') {
      try {
        await this.activateWalletHandler.execute({
          circleWalletId: walletId,
        });
        logger.info({ circleWalletId: walletId }, 'Wallet activated via webhook');
      } catch (error) {
        logger.error(
          { error, circleWalletId: walletId },
          'Failed to activate wallet from webhook'
        );
      }
    } else {
      logger.debug(
        { circleWalletId: walletId, state },
        'Wallet state change not actionable'
      );
    }
  }
}
