import crypto from 'crypto';
import { OnRampProvider as Provider } from '@prisma/client';
import {
  OnRampProvider,
  InitiateDepositParams,
  DepositResult,
  InitiatePayoutParams,
  PayoutResult,
} from '../../../domain/ports/OnRampProvider';
import {
  QuoteProvider,
  OnrampQuoteParams,
  OnrampQuoteResult,
  OfframpQuoteParams,
  OfframpQuoteResult,
} from '../../../domain/ports/QuoteProvider';
import { CoinbaseCdpAuth } from './CoinbaseCdpAuth';
import { config } from '../../../shared/config';
import { logger } from '../../../shared/utils/logger';
import {
  CoinbaseSessionTokenResponse,
  CoinbaseBuyQuoteResponse,
  CoinbaseSellQuoteResponse,
  CoinbaseTransactionsResponse,
} from './types';

/**
 * Coinbase CDP Onramp/Offramp adapter.
 *
 * Uses a redirect-based flow: the backend generates a session token and
 * buy/sell quote, returns a Coinbase widget URL, and the mobile app opens
 * it in a WebView. Polling is handled by BullMQ workers.
 *
 * Key invariant: partnerUserRef = "pulapay_{internalTransactionId}" is embedded
 * in the widget URL so Coinbase can link widget sessions to the Transaction
 * Status API. The same value is stored as providerRef and used for polling.
 */
export class CoinbaseCdpOnRampAdapter implements OnRampProvider, QuoteProvider {
  readonly providerCode: Provider = 'COINBASE_CDP';

  private readonly auth: CoinbaseCdpAuth;
  private readonly baseUrl: string;

  constructor() {
    this.auth = new CoinbaseCdpAuth();
    this.baseUrl = config.coinbase.baseUrl;
  }

  // ============================================
  // HTTP helper
  // ============================================

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const jwt = await this.auth.generateJwt(method, path);
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { url, status: response.status, error: errorText },
        'Coinbase CDP API error'
      );
      throw new Error(`Coinbase CDP API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // ============================================
  // Session Token
  // ============================================

  private async createSessionToken(
    walletAddress: string,
    blockchain: string,
    clientIp?: string
  ): Promise<CoinbaseSessionTokenResponse> {
    const blockchainName = this.mapBlockchainName(blockchain);
    return this.request<CoinbaseSessionTokenResponse>('POST', '/onramp/v1/token', {
      addresses: [{ address: walletAddress, blockchains: [blockchainName] }],
      ...(clientIp ? { clientIp } : {}),
    });
  }

  // ============================================
  // QuoteProvider implementation
  // ============================================

  async getOnrampQuote(params: OnrampQuoteParams): Promise<OnrampQuoteResult> {
    const response = await this.request<CoinbaseBuyQuoteResponse>(
      'POST',
      '/onramp/v1/buy/quote',
      {
        purchaseCurrency: params.purchaseCurrency,
        paymentAmount: String(params.paymentAmount),
        paymentCurrency: params.paymentCurrency,
        paymentMethod: params.paymentMethod,
        country: params.country,
      }
    );

    return {
      quoteId: response.quote_id,
      purchaseAmount: response.purchase_amount.value,
      paymentSubtotal: response.payment_subtotal.value,
      coinbaseFee: response.coinbase_fee.value,
      networkFee: response.network_fee.value,
      paymentTotal: response.payment_total.value,
    };
  }

  async getOfframpQuote(params: OfframpQuoteParams): Promise<OfframpQuoteResult> {
    const response = await this.request<CoinbaseSellQuoteResponse>(
      'POST',
      '/onramp/v1/sell/quote',
      {
        sellCurrency: params.sellCurrency,
        sellAmount: String(params.sellAmount),
        cashoutCurrency: params.cashoutCurrency,
        paymentMethod: params.paymentMethod,
        country: params.country,
      }
    );

    return {
      quoteId: response.quote_id,
      sellAmount: response.sell_amount.value,
      cashoutSubtotal: response.cashout_subtotal.value,
      cashoutTotal: response.cashout_total.value,
      coinbaseFee: response.coinbase_fee.value,
    };
  }

  // ============================================
  // OnRampProvider implementation
  // ============================================

  async initiateDeposit(params: InitiateDepositParams): Promise<DepositResult> {
    const walletAddress = params.walletAddress;
    const blockchain = params.blockchain ?? 'BASE_SEPOLIA';
    const country = params.country ?? config.coinbase.defaultCountry;
    const { partnerUserRef, clientIp } = params;

    // 1. Create session token
    const session = await this.createSessionToken(walletAddress, blockchain, clientIp);

    // 2. Get buy quote
    const quoteResponse = await this.request<CoinbaseBuyQuoteResponse>(
      'POST',
      '/onramp/v1/buy/quote',
      {
        purchaseCurrency: 'USDC',
        paymentAmount: String(params.amount),
        paymentCurrency: params.currency,
        paymentMethod: params.paymentMethod ?? 'CARD',
        country,
        destinationAddress: walletAddress,
      }
    );

    // 3. Build widget URL — partnerUserRef must be in the URL so Coinbase links
    //    the session to the Transaction Status API
    const paymentUrl = this.buildWidgetUrl(
      quoteResponse.onramp_url ?? `https://pay.coinbase.com/buy/select-asset?sessionToken=${session.token}`,
      partnerUserRef
    );

    logger.info(
      {
        quoteId: quoteResponse.quote_id,
        partnerUserRef,
        userId: params.userId,
        amount: params.amount,
        currency: params.currency,
        paymentTotal: quoteResponse.payment_total?.value,
      },
      'Coinbase CDP deposit initiated'
    );

    return {
      providerRef: partnerUserRef,
      status: 'pending',
      paymentUrl,
      quoteId: quoteResponse.quote_id,
      fees: {
        coinbaseFee: quoteResponse.coinbase_fee?.value,
        networkFee: quoteResponse.network_fee?.value,
        paymentTotal: quoteResponse.payment_total?.value,
      },
    };
  }

  async getDepositStatus(partnerUserRef: string): Promise<DepositResult> {
    try {
      const response = await this.request<CoinbaseTransactionsResponse>(
        'GET',
        `/onramp/v1/buy/user/${encodeURIComponent(partnerUserRef)}/transactions?page_size=1`
      );

      const tx = response.transactions?.[0];
      if (tx) {
        return {
          providerRef: partnerUserRef,
          status: this.mapCoinbaseStatus(tx.status),
          purchaseAmount: tx.purchase_amount?.value,
        };
      }
    } catch (error) {
      logger.warn({ error, partnerUserRef }, 'Failed to get Coinbase deposit status');
    }

    return { providerRef: partnerUserRef, status: 'pending' };
  }

  async initiatePayout(params: InitiatePayoutParams): Promise<PayoutResult> {
    const walletAddress = params.walletAddress;
    const blockchain = params.blockchain ?? 'BASE_SEPOLIA';
    const country = params.country ?? config.coinbase.defaultCountry;
    const cashoutCurrency = params.cashoutCurrency ?? params.currency;
    const { partnerUserRef, clientIp } = params;
    const redirectUrl = params.redirectUrl ?? `${config.apiUrl}/onramp-complete`;

    // 1. Create session token
    const session = await this.createSessionToken(walletAddress, blockchain, clientIp);

    // 2. Get sell quote
    const quoteResponse = await this.request<CoinbaseSellQuoteResponse>(
      'POST',
      '/onramp/v1/sell/quote',
      {
        sellCurrency: 'USDC',
        sellAmount: String(params.amount),
        cashoutCurrency: cashoutCurrency,
        paymentMethod: params.paymentMethod ?? 'ACH_BANK_ACCOUNT',
        country,
        sourceAddress: walletAddress,
        redirectUrl,
        partnerUserId: partnerUserRef,
      }
    );

    // 3. Build one-click-sell URL with all required parameters
    const fallbackParams = new URLSearchParams({
      sessionToken: session.token,
      partnerUserRef,
      defaultAsset: 'USDC',
      presetCryptoAmount: String(params.amount),
      redirectUrl,
    });
    const paymentUrl = this.buildWidgetUrl(
      quoteResponse.offramp_url ?? `https://pay.coinbase.com/v3/sell/input?${fallbackParams}`,
      partnerUserRef
    );

    logger.info(
      {
        quoteId: quoteResponse.quote_id,
        partnerUserRef,
        userId: params.userId,
        amount: params.amount,
        cashoutCurrency,
        cashoutTotal: quoteResponse.cashout_total?.value,
      },
      'Coinbase CDP payout initiated'
    );

    return {
      providerRef: partnerUserRef,
      status: 'pending',
      paymentUrl,
      quoteId: quoteResponse.quote_id,
      fees: {
        coinbaseFee: quoteResponse.coinbase_fee?.value,
        cashoutTotal: quoteResponse.cashout_total?.value,
      },
    };
  }

  async getPayoutStatus(partnerUserRef: string): Promise<PayoutResult> {
    try {
      const response = await this.request<CoinbaseTransactionsResponse>(
        'GET',
        `/onramp/v1/sell/user/${encodeURIComponent(partnerUserRef)}/transactions?page_size=1`
      );

      const tx = response.transactions?.[0];
      if (tx) {
        return {
          providerRef: partnerUserRef,
          status: this.mapCoinbaseStatus(tx.status),
        };
      }
    } catch (error) {
      logger.warn({ error, partnerUserRef }, 'Failed to get Coinbase payout status');
    }

    return { providerRef: partnerUserRef, status: 'pending' };
  }

  /**
   * Verify Coinbase webhook authenticity using X-Hook0-Signature HMAC-SHA256.
   * Header format: t={timestamp},h={headerNames},v1={hmac}
   */
  validateWebhook(headers: Record<string, string>, rawBody: string): boolean {
    const secret = config.coinbase.webhookSecret;
    if (!secret) {
      logger.error('COINBASE_CDP_WEBHOOK_SECRET not set — rejecting webhook');
      return false;
    }

    const signatureHeader = headers['x-hook0-signature'];
    if (!signatureHeader) {
      logger.warn('Coinbase webhook missing X-Hook0-Signature header');
      return false;
    }

    try {
      const elements = signatureHeader.split(',');
      const timestamp = elements.find((e) => e.startsWith('t='))?.split('=')[1];
      const headerNames = elements.find((e) => e.startsWith('h='))?.split('=')[1];
      // Prefer v1; fall back to v0 (older Coinbase webhook format)
      const providedSignature =
        elements.find((e) => e.startsWith('v1='))?.split('=')[1] ??
        elements.find((e) => e.startsWith('v0='))?.split('=')[1];

      if (!timestamp || !headerNames || !providedSignature) {
        logger.warn({ signatureHeader }, 'Malformed X-Hook0-Signature header');
        return false;
      }

      const ageSeconds = Date.now() / 1000 - parseInt(timestamp);
      if (ageSeconds < -60) {
        logger.warn({ ageSeconds }, 'Coinbase webhook timestamp is in the future');
        return false;
      }
      if (ageSeconds > 300) {
        logger.warn({ ageSeconds }, 'Coinbase webhook timestamp too old');
        return false;
      }

      // Build signed payload: {timestamp}.{headerNames}.{headerValues}.{body}
      const headerNameList = headerNames.split(' ');
      const headerValues = headerNameList.map((name) => headers[name.toLowerCase()] ?? '').join('.');
      const signedPayload = `${timestamp}.${headerNames}.${headerValues}.${rawBody}`;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      logger.error({ error }, 'Webhook signature verification error');
      return false;
    }
  }

  // ============================================
  // Private helpers
  // ============================================

  private mapCoinbaseStatus(
    status: string
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    if (status.endsWith('_SUCCESS')) return 'completed';
    if (status.endsWith('_FAILED')) return 'failed';
    if (status.endsWith('_IN_PROGRESS') || status.endsWith('_STARTED')) return 'processing';
    return 'pending';
  }

  private mapBlockchainName(blockchain: string): string {
    const mapping: Record<string, string> = {
      BASE_SEPOLIA: 'base',
      BASE: 'base',
      POLYGON_AMOY: 'polygon',
      POLYGON: 'polygon',
      ETHEREUM: 'ethereum',
      ETH_SEPOLIA: 'ethereum',
      ARBITRUM: 'arbitrum',
      ARBITRUM_SEPOLIA: 'arbitrum',
    };
    return mapping[blockchain] ?? 'base';
  }

  // Append or replace partnerUserRef in a widget URL (used for both onramp and offramp).
  // Coinbase may return a URL from the quote API — we still need to ensure partnerUserRef is set.
  private buildWidgetUrl(baseUrl: string, partnerUserRef: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('partnerUserRef', partnerUserRef);
    return url.toString();
  }
}
