import Decimal from 'decimal.js';
import { Currency } from '@prisma/client';
import { ExchangeRateProvider, ExchangeRateResult } from '../../../domain/ports/ExchangeRateProvider';
import { cache } from '../../cache/redis-cache';
import { logger } from '../../../shared/utils/logger';

const CACHE_TTL_SECONDS = 300; // 5 minutes

interface CachedRate {
  baseCurrency: 'USDC';
  quoteCurrency: Currency;
  rate: string;
  timestamp: string;
  source: string;
}

/**
 * Caching decorator for exchange rate providers — uses Redis instead of DB
 */
export class CachedExchangeRateAdapter implements ExchangeRateProvider {
  constructor(
    private readonly upstream: ExchangeRateProvider,
  ) {}

  async getRate(currency: Currency): Promise<ExchangeRateResult> {
    const cacheKey = `exchange-rate:${currency}`;

    const cached = await cache.get<CachedRate>(cacheKey);
    if (cached) {
      logger.debug({ currency, source: 'cache' }, 'Exchange rate from cache');
      return {
        baseCurrency: cached.baseCurrency,
        quoteCurrency: cached.quoteCurrency,
        rate: new Decimal(cached.rate),
        timestamp: new Date(cached.timestamp),
        source: cached.source,
      };
    }

    const rate = await this.upstream.getRate(currency);

    await cache.set<CachedRate>(cacheKey, {
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      rate: rate.rate.toString(),
      timestamp: rate.timestamp.toISOString(),
      source: rate.source,
    }, CACHE_TTL_SECONDS);

    return rate;
  }

  async getRates(currencies: Currency[]): Promise<Map<Currency, ExchangeRateResult>> {
    const results = new Map<Currency, ExchangeRateResult>();
    const missing: Currency[] = [];

    for (const currency of currencies) {
      const cacheKey = `exchange-rate:${currency}`;
      const cached = await cache.get<CachedRate>(cacheKey);
      if (cached) {
        results.set(currency, {
          baseCurrency: cached.baseCurrency,
          quoteCurrency: cached.quoteCurrency,
          rate: new Decimal(cached.rate),
          timestamp: new Date(cached.timestamp),
          source: cached.source,
        });
      } else {
        missing.push(currency);
      }
    }

    if (missing.length > 0) {
      const upstream = await this.upstream.getRates(missing);
      for (const [currency, rate] of upstream) {
        await cache.set<CachedRate>(`exchange-rate:${currency}`, {
          baseCurrency: rate.baseCurrency,
          quoteCurrency: rate.quoteCurrency,
          rate: rate.rate.toString(),
          timestamp: rate.timestamp.toISOString(),
          source: rate.source,
        }, CACHE_TTL_SECONDS);
        results.set(currency, rate);
      }
    }

    return results;
  }
}
