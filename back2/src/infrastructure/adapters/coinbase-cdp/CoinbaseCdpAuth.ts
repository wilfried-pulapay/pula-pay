import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { config } from '../../../shared/config';
import { logger } from '../../../shared/utils/logger';

export class CoinbaseCdpAuth {
  async generateJwt(requestMethod: string, requestPath: string): Promise<string> {
    try {
      return await generateJwt({
        apiKeyId: config.coinbase.apiKeyId,
        apiKeySecret: config.coinbase.apiKeySecret,
        requestMethod,
        requestHost: 'api.developer.coinbase.com',
        requestPath,
        expiresIn: 120,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate Coinbase CDP JWT');
      throw new Error('Failed to generate Coinbase CDP authentication token');
    }
  }
}
