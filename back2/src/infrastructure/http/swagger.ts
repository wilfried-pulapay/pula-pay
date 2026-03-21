import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Pula Pay API v2',
      version: '2.0.0',
      description: 'Universal African Money Account with Circle/USDC integration',
      contact: {
        name: 'Pula Pay Team',
        email: 'support@pulapay.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v2',
        description: 'Development server',
      },
      {
        url: 'https://api.pulapay.com/api/v2',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Session token from Better Auth (passed as Authorization: Bearer <session_token>)',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Session cookie set by Better Auth after sign-in',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        Currency: {
          type: 'string',
          enum: ['EUR', 'XOF', 'USD'],
        },
        Blockchain: {
          type: 'string',
          enum: ['BASE_SEPOLIA', 'BASE'],
          description: 'Supported blockchains. BASE_SEPOLIA = testnet, BASE = mainnet.',
        },
        TxType: {
          type: 'string',
          enum: ['DEPOSIT_ONRAMP', 'DEPOSIT_CRYPTO', 'WITHDRAWAL_OFFRAMP', 'WITHDRAWAL_CRYPTO', 'TRANSFER_P2P', 'REFUND', 'FEE'],
        },
        TxStatus: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
        },
        WalletStatus: {
          type: 'string',
          enum: ['PENDING', 'ACTIVE', 'FROZEN', 'CLOSED'],
        },
        KycLevel: {
          type: 'string',
          enum: ['NONE', 'BASIC', 'VERIFIED', 'ENHANCED'],
        },
        // Auth schemas (Better Auth)
        EmailSignUpRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', example: 'mySecureP4ss', minLength: 8, maxLength: 128 },
            name: { type: 'string', example: 'John Doe' },
          },
        },
        EmailSignInRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', example: 'mySecureP4ss' },
          },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Session token (usable as Bearer token)' },
            user: { $ref: '#/components/schemas/BetterAuthUser' },
          },
        },
        SocialSignInRequest: {
          type: 'object',
          required: ['provider', 'callbackURL'],
          properties: {
            provider: { type: 'string', enum: ['google', 'apple'] },
            callbackURL: { type: 'string', format: 'uri', description: 'URL to redirect after OAuth flow', example: 'pulapay://auth/callback' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            locale: { type: 'string', example: 'fr', minLength: 2, maxLength: 10 },
          },
        },
        SessionResponse: {
          type: 'object',
          properties: {
            session: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                token: { type: 'string', description: 'Session token (also usable as Bearer token)' },
                expiresAt: { type: 'string', format: 'date-time' },
              },
            },
            user: { $ref: '#/components/schemas/BetterAuthUser' },
          },
        },
        BetterAuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string', example: '+22990123456' },
            phoneNumberVerified: { type: 'boolean' },
            kycLevel: { $ref: '#/components/schemas/KycLevel' },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            locale: { type: 'string', example: 'fr' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateWalletRequest: {
          type: 'object',
          properties: {
            blockchain: { $ref: '#/components/schemas/Blockchain' },
          },
        },
        WalletSetupChallengeResponse: {
          type: 'object',
          description: 'Challenge data returned by POST /wallet. The mobile app must resolve the challenge via Circle Web SDK (PIN setup) then call POST /wallet/confirm-setup.',
          properties: {
            challengeId: { type: 'string', description: 'Circle challenge ID to resolve on mobile' },
            userToken: { type: 'string', description: 'Circle user token (~1h validity)' },
            encryptionKey: { type: 'string', description: 'Encryption key used by Circle SDK on mobile' },
            appId: { type: 'string', description: 'Circle App ID for the Web SDK' },
          },
        },
        ConfirmWalletSetupRequest: {
          type: 'object',
          required: ['userToken'],
          properties: {
            userToken: { type: 'string', description: 'Circle user token received after PIN challenge is resolved on mobile' },
            blockchain: { $ref: '#/components/schemas/Blockchain' },
          },
        },
        ConfirmWalletSetupResponse: {
          type: 'object',
          description: 'Wallet activated after PIN challenge is resolved.',
          properties: {
            walletId: { type: 'string' },
            address: { type: 'string' },
            blockchain: { $ref: '#/components/schemas/Blockchain' },
            status: { $ref: '#/components/schemas/WalletStatus' },
          },
        },
        WalletAddressResponse: {
          type: 'object',
          properties: {
            walletId: { type: 'string' },
            address: { type: 'string' },
            blockchain: { $ref: '#/components/schemas/Blockchain' },
            status: { $ref: '#/components/schemas/WalletStatus' },
          },
        },
        BalanceResponse: {
          type: 'object',
          properties: {
            balanceUsdc: { type: 'string', example: '100.500000' },
            displayBalance: { type: 'string', example: '65000.00' },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            walletAddress: { type: 'string' },
            walletStatus: { $ref: '#/components/schemas/WalletStatus' },
          },
        },
        DepositRequest: {
          type: 'object',
          required: ['amount', 'currency'],
          properties: {
            amount: { type: 'number', example: 50.0, minimum: 0, description: 'Fiat amount to deposit' },
            currency: { $ref: '#/components/schemas/Currency', description: 'Fiat currency (USD or EUR)' },
            country: { type: 'string', example: 'US', default: 'US', minLength: 2, maxLength: 2, description: 'ISO 3166-1 country code' },
            paymentMethod: { type: 'string', enum: ['CARD', 'ACH_BANK_ACCOUNT', 'APPLE_PAY'], default: 'CARD' },
          },
        },
        DepositResponse: {
          type: 'object',
          properties: {
            transactionId: { type: 'string' },
            providerRef: { type: 'string' },
            status: { $ref: '#/components/schemas/TxStatus' },
            amountUsdc: { type: 'string', description: 'Estimated USDC amount' },
            displayAmount: { type: 'string' },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            paymentUrl: { type: 'string', format: 'uri', description: 'Coinbase Pay widget URL - open in WebView/browser' },
            fees: {
              type: 'object',
              properties: {
                coinbaseFee: { type: 'string' },
                networkFee: { type: 'string' },
                paymentTotal: { type: 'string', description: 'Total fiat amount charged' },
              },
            },
          },
        },
        WithdrawRequest: {
          type: 'object',
          required: ['amount', 'targetCurrency'],
          properties: {
            amount: { type: 'number', example: 25.0, minimum: 0, description: 'Fiat amount to withdraw' },
            targetCurrency: { $ref: '#/components/schemas/Currency', description: 'Fiat cashout currency (USD or EUR)' },
            country: { type: 'string', example: 'US', default: 'US', minLength: 2, maxLength: 2 },
            paymentMethod: { type: 'string', enum: ['ACH_BANK_ACCOUNT', 'CARD'], default: 'ACH_BANK_ACCOUNT' },
          },
        },
        WithdrawResponse: {
          type: 'object',
          properties: {
            transactionId: { type: 'string' },
            providerRef: { type: 'string' },
            status: { $ref: '#/components/schemas/TxStatus' },
            amountUsdc: { type: 'string' },
            feeUsdc: { type: 'string' },
            displayAmount: { type: 'string' },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            paymentUrl: { type: 'string', format: 'uri', description: 'Coinbase offramp URL - open in WebView/browser' },
            fees: {
              type: 'object',
              properties: {
                coinbaseFee: { type: 'string' },
                cashoutTotal: { type: 'string', description: 'Net fiat user receives' },
              },
            },
          },
        },
        OnrampQuoteResponse: {
          type: 'object',
          properties: {
            quoteId: { type: 'string' },
            purchaseAmount: { type: 'string', description: 'USDC amount user will receive' },
            paymentSubtotal: { type: 'string' },
            coinbaseFee: { type: 'string' },
            networkFee: { type: 'string' },
            paymentTotal: { type: 'string', description: 'Total fiat user pays' },
          },
        },
        OfframpQuoteResponse: {
          type: 'object',
          properties: {
            quoteId: { type: 'string' },
            sellAmount: { type: 'string' },
            cashoutSubtotal: { type: 'string' },
            cashoutTotal: { type: 'string', description: 'Net fiat user receives' },
            coinbaseFee: { type: 'string' },
          },
        },
        TransferRequest: {
          type: 'object',
          required: ['amount', 'currency'],
          properties: {
            recipientPhone: { type: 'string', example: '+22990654321' },
            recipientAddress: { type: 'string', example: '0x742d35Cc6634C0532925a3b844Bc9e7595f...' },
            amount: { type: 'number', example: 25.0, minimum: 0 },
            currency: { $ref: '#/components/schemas/Currency' },
            description: { type: 'string', maxLength: 200 },
          },
        },
        TransferChallengeResponse: {
          type: 'object',
          description: 'Challenge data returned after initiating a transfer. The mobile app must resolve the challenge via Circle Web SDK (PIN confirmation) to execute the transfer.',
          properties: {
            transactionId: { type: 'string', description: 'Local transaction ID (PENDING until challenge resolved)' },
            challengeId: { type: 'string', description: 'Circle challenge ID to resolve on mobile' },
            userToken: { type: 'string', description: 'Circle user token (~1h validity)' },
            encryptionKey: { type: 'string', description: 'Encryption key used by Circle SDK on mobile' },
            appId: { type: 'string', description: 'Circle App ID for the Web SDK' },
            status: { $ref: '#/components/schemas/TxStatus' },
            amountUsdc: { type: 'string', description: 'Amount in USDC' },
            displayAmount: { type: 'string', description: 'Amount in display currency' },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            recipientAddress: { type: 'string' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { $ref: '#/components/schemas/TxType' },
            status: { $ref: '#/components/schemas/TxStatus' },
            amountUsdc: { type: 'string' },
            feeUsdc: { type: 'string' },
            displayAmount: { type: 'string' },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        TransactionDetail: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            idempotencyKey: { type: 'string' },
            externalRef: { type: 'string', nullable: true },
            type: { $ref: '#/components/schemas/TxType' },
            status: { $ref: '#/components/schemas/TxStatus' },
            amountUsdc: { type: 'string' },
            feeUsdc: { type: 'string' },
            netAmountUsdc: { type: 'string' },
            exchangeRate: { type: 'string', nullable: true },
            displayCurrency: { $ref: '#/components/schemas/Currency' },
            displayAmount: { type: 'string', nullable: true },
            walletId: { type: 'string' },
            counterpartyId: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            failureReason: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        TransactionHistoryResponse: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: { $ref: '#/components/schemas/Transaction' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ExchangeRate: {
          type: 'object',
          properties: {
            currency: { $ref: '#/components/schemas/Currency' },
            rate: { type: 'string', example: '0.92' },
            inverseRate: { type: 'string', example: '1.087' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ExchangeRatesResponse: {
          type: 'object',
          properties: {
            baseCurrency: { type: 'string', example: 'USDC' },
            rates: {
              type: 'array',
              items: { $ref: '#/components/schemas/ExchangeRate' },
            },
          },
        },
        ConversionPreviewResponse: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            inputAmount: { type: 'number' },
            outputAmount: { type: 'number' },
            rate: { type: 'string' },
            fee: { type: 'string' },
            validUntil: { type: 'string', format: 'date-time' },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            version: { type: 'string' },
            uptime: { type: 'integer' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['ok', 'error'] },
                redis: { type: 'string', enum: ['ok', 'error'] },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication via Better Auth (base path: /api/auth). Email+password, social login (Google/Apple), session management. Account linking enabled across all providers.' },
      { name: 'Exchange Rates', description: 'Currency exchange rates' },
      { name: 'Wallet', description: 'Circle User-Controlled Wallet management. Wallet setup and transfers use a 2-step challenge flow: backend initiates → mobile resolves PIN via Circle Web SDK → backend confirms.' },
      { name: 'Webhooks', description: 'Provider webhook handlers' },
    ],
  },
  apis: ['./src/infrastructure/http/routes/*.ts', './src/infrastructure/http/swagger-docs.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
