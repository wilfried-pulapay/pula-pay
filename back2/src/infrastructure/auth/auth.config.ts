import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { expo } from '@better-auth/expo';
import { bearer } from 'better-auth/plugins';
import { prisma } from '../persistence/prisma/client';
import { config } from '../../shared/config';
import { logger } from '../../shared/utils/logger';


export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  basePath: '/api/auth',
  secret: config.betterAuth.secret,
  baseURL: config.betterAuth.url,
  trustedOrigins: ['pulapay://', 'exp://**', ...config.betterAuth.trustedOrigins],

  onAPIError: {
    onError: (error, _ctx) => {
      logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Better-auth API error',
      );
    },
  },

  hooks: {
    after: async (ctx) => {
      const status = (ctx as any).response?.status as number | undefined;
      if (status && status >= 400) {
        let body: unknown;
        try {
          body = await (ctx as any).response?.clone().json();
        } catch {
          body = await (ctx as any).response?.clone().text().catch(() => '<unreadable>');
        }
        logger.warn(
          {
            path: (ctx as any).request?.url,
            method: (ctx as any).request?.method,
            status,
            body,
          },
          'Auth request failed',
        );
      }
      return {};
    },
  },

  emailAndPassword: { enabled: true, autoSignIn: true },

  socialProviders: {
    ...(config.socialProviders.google.clientId && config.socialProviders.google.clientSecret
      ? {
          google: {
            clientId: config.socialProviders.google.clientId,
            clientSecret: config.socialProviders.google.clientSecret,
          },
        }
      : {}),
    ...(config.socialProviders.apple.clientId && config.socialProviders.apple.clientSecret
      ? {
          apple: {
            clientId: config.socialProviders.apple.clientId,
            clientSecret: config.socialProviders.apple.clientSecret,
          },
        }
      : {}),
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'apple', 'credential'],
    },
  },

  plugins: [expo(), bearer()],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      kycLevel: { type: 'string', defaultValue: 'NONE' },
      displayCurrency: { type: 'string', defaultValue: 'EUR' },
      locale: { type: 'string', defaultValue: 'fr' },
    },
  },
});
