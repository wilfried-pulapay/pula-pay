import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { phoneNumber } from 'better-auth/plugins';
import { prisma } from '../persistence/prisma/client';
import { config } from '../../shared/config';
import { logger } from '../../shared/utils/logger';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  basePath: '/api/auth',
  secret: config.betterAuth.secret,
  baseURL: config.betterAuth.url,

  emailAndPassword: { enabled: false },

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
      trustedProviders: ['google', 'apple'],
    },
  },

  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }, _ctx) => {
        // TODO: Integrate with SMS provider (Twilio, etc.)
        logger.info({ phone, code }, 'OTP sent (dev mode — logged to console)');
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone}@pulapay.app`,
        getTempName: (phone) => phone,
      },
      otpLength: 6,
      expiresIn: 300,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  user: {
    additionalFields: {
      kycLevel: { type: 'string', defaultValue: 'NONE' },
      displayCurrency: { type: 'string', defaultValue: 'EUR' },
      locale: { type: 'string', defaultValue: 'fr' },
    },
  },
});
