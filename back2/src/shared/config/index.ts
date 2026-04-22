import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  API_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().default('change-me-in-production-32chars!!'),
  BETTER_AUTH_URL: z.string().default('http://localhost:3000'),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),

  // Social providers (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),

  // Circle (User-Controlled Wallets)
  CIRCLE_API_KEY: z.string(),
  CIRCLE_APP_ID: z.string(),
  CIRCLE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Blockchain
  DEFAULT_BLOCKCHAIN: z.string().default('BASE_SEPOLIA'),
  USDC_TOKEN_ID_BASE_SEPOLIA: z.string().min(1),
  USDC_TOKEN_ID_BASE: z.string().min(1),

  // Exchange Rate
  EXCHANGE_RATE_PROVIDER: z.string().default('coingecko'),
  COINGECKO_API_KEY: z.string().optional(),
  XOF_EUR_FIXED_RATE: z.string().default('655.957').transform(Number),

  // Coinbase CDP (Onramp/Offramp)
  COINBASE_CDP_API_KEY_NAME: z.string().min(1),
  COINBASE_CDP_API_KEY_PRIVATE_KEY: z.string().min(1),
  COINBASE_CDP_BASE_URL: z.string().default('https://api.developer.coinbase.com'),
  COINBASE_CDP_DEFAULT_COUNTRY: z.string().default('US'),

  // Twilio (SMS OTP)
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),

  // SMTP (Email OTP)
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string().default('noreply@pulapay.com'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missing}`);
    }
    throw error;
  }
};

const env = parseEnv();

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  apiUrl: env.API_URL,

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },

  betterAuth: {
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
    trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS
      ? env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((o) => o.trim())
      : [],
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    apple: {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
    },
  },

  circle: {
    apiKey: env.CIRCLE_API_KEY,
    appId: env.CIRCLE_APP_ID,
    environment: env.CIRCLE_ENVIRONMENT,
  },

  blockchain: {
    default: env.DEFAULT_BLOCKCHAIN,
  },

  usdc: {
    tokenIds: {
      BASE_SEPOLIA: env.USDC_TOKEN_ID_BASE_SEPOLIA,
      BASE: env.USDC_TOKEN_ID_BASE,
    } as Record<string, string>,
  },

  exchangeRate: {
    provider: env.EXCHANGE_RATE_PROVIDER,
    coingeckoApiKey: env.COINGECKO_API_KEY,
    xofEurFixedRate: env.XOF_EUR_FIXED_RATE,
  },

  coinbase: {
    apiKeyName: env.COINBASE_CDP_API_KEY_NAME,
    apiKeyPrivateKey: env.COINBASE_CDP_API_KEY_PRIVATE_KEY,
    baseUrl: env.COINBASE_CDP_BASE_URL,
    defaultCountry: env.COINBASE_CDP_DEFAULT_COUNTRY,
  },

  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER,
  },

  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
} as const;

export type Config = typeof config;
