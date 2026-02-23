# Pula Pay v2 — Backend API

Universal African Money Account backend with Circle/USDC integration, Coinbase CDP onramp/offramp, and double-entry accounting.

## Tech Stack

| Category       | Technology                                |
|----------------|-------------------------------------------|
| Framework      | Express.js 4.18                           |
| Language       | TypeScript 5.3 (strict mode)              |
| Database       | PostgreSQL 16 + Prisma 5.9                |
| Blockchain     | Circle Programmable Wallets               |
| Payment        | Coinbase CDP Onramp/Offramp API           |
| Exchange Rates | CoinGecko API (cached in Redis/DB)        |
| Auth           | Better Auth (sessions, social, OTP)       |
| State Machines | XState 5.28                               |
| Job Queue      | BullMQ (Redis-backed)                     |
| Cache          | Redis 7 (ioredis)                         |
| Validation     | Zod                                       |
| Logging        | Pino (structured)                         |
| Testing        | Jest + ts-jest (70% coverage threshold)   |
| Math Precision | Decimal.js (18,6 for USDC)                |
| Security       | Helmet, CORS, rate limiting (Redis-backed)|
| API Docs       | Swagger / OpenAPI                         |

## Architecture

Clean Architecture with CQRS (Command Query Responsibility Segregation):

```
src/
├── domain/                        # Core business logic (zero framework deps)
│   ├── entities/                  # User, Wallet, Transaction
│   ├── value-objects/             # Money, WalletAddress, ExchangeRate
│   ├── services/                  # LedgerService (double-entry accounting)
│   ├── state-machines/            # XState machines (transaction, wallet)
│   ├── ports/                     # Repository & Provider interfaces
│   │   └── repositories/         # UserRepo, WalletRepo, TransactionRepo, LedgerRepo
│   └── errors/                    # Domain exceptions
│
├── application/                   # Use cases
│   ├── commands/                  # 8 write handlers
│   ├── queries/                   # 8 read handlers
│   └── services/                  # CurrencyConversionService
│
├── infrastructure/                # External world
│   ├── adapters/
│   │   ├── circle/                # CircleWalletAdapter (blockchain)
│   │   ├── coinbase-cdp/          # CoinbaseCdpOnRampAdapter (onramp/offramp)
│   │   └── exchange/              # CoingeckoAdapter + CachedAdapter
│   ├── auth/                      # Better Auth config, middleware, routes
│   ├── cache/                     # Redis cache wrapper
│   ├── jobs/                      # BullMQ queues + workers
│   │   └── workers/               # coinbase-poll, tx-expiry, faucet
│   ├── persistence/
│   │   ├── prisma/                # DB client
│   │   └── repositories/         # 4 Prisma repository implementations
│   └── http/
│       ├── controllers/           # Wallet, Webhook, ExchangeRate, Health
│       ├── middleware/            # auth, errorHandler, requestLogger
│       └── routes/                # Express router
│
└── shared/
    ├── config/                    # Env validation (Zod)
    ├── types/                     # ApiResponse, PaginatedResult, Result<T,E>
    └── utils/                     # Logger, encryption, idempotency
```

**Key principle:** Dependencies flow inward. Domain has no imports from application or infrastructure. Ports define contracts, adapters implement them.

## Domain Model

### Entities

#### User
```
Fields: id, phone, email, kycLevel, kycData, displayCurrency, locale
KYC Levels: NONE → BASIC → VERIFIED → ENHANCED
Daily Limits: $0 / $100 / $1,000 / $10,000
Methods: hasBasicKyc(), hasVerifiedKyc(), hasEnhancedKyc(), getDailyLimit(),
         getMonthlyLimit(), upgradeKyc(), updateDisplayCurrency(), updateLocale()
```

#### Wallet
```
Fields: id, userId, circleWalletId, walletSetId, address, blockchain, status, balanceUsdc
Status: PENDING → ACTIVE → FROZEN | CLOSED  (enforced by XState machine)
Methods: credit(), debit(), syncBalance(), activate(), freeze(), close()
Guards: assertCanTransact() → WalletFrozenError, assertCanWithdraw() → InsufficientFundsError
Display: getDisplayBalance(exchangeRate) → fiat equivalent
```

#### Transaction
```
Fields: id, idempotencyKey, externalRef, type, status, amountUsdc, feeUsdc, exchangeRate,
        displayCurrency, displayAmount, walletId, counterpartyId, description, metadata, failureReason

Types: DEPOSIT_ONRAMP, DEPOSIT_CRYPTO, WITHDRAWAL_OFFRAMP, WITHDRAWAL_CRYPTO, TRANSFER_P2P, FEE, REFUND

State Machine (XState-enforced):
  PENDING → PROCESSING, CANCELLED, EXPIRED, FAILED
  PROCESSING → COMPLETED, FAILED
  COMPLETED, FAILED, CANCELLED, EXPIRED → (terminal)

Methods: markProcessing(), complete(), fail(), cancel(), expire()
Status checks: isPending(), isProcessing(), isCompleted(), isFailed(), isTerminal()
Type checks: isDeposit(), isWithdrawal(), isTransfer()
Computed: netAmountUsdc = amountUsdc - feeUsdc
```

### Value Objects

#### Money
Immutable amount in USDC + display currency. Factory methods `fromUsdc()` and `fromFiat()`. Operations: `add()`, `subtract()`, `multiply()`, `percentage()`. Comparison: `gte()`, `gt()`, `equals()`. Precision: 6 decimals USDC, 2 decimals fiat.

#### WalletAddress
Validates EVM addresses (0x format). Methods: `isTestnet()`, `abbreviated()` (0x1234...5678), `explorerUrl()`.

#### ExchangeRate
Rate with timestamp and source. Methods: `convertFromUsdc()`, `convertToUsdc()`, `isValid(ttlMinutes)`.

### State Machines (XState)

Two XState v5 state machines enforce valid state transitions at the domain level:

| Machine              | States                                              | Guards                   |
|----------------------|-----------------------------------------------------|--------------------------|
| Transaction Machine  | PENDING → PROCESSING → COMPLETED / FAILED / CANCELLED / EXPIRED | Valid transition check |
| Wallet Machine       | PENDING → ACTIVE → FROZEN / CLOSED                 | `hasSufficientFunds`     |

Helper function `applyTransition()` provides a unified interface for both machines. Invalid transitions throw `InvalidStateTransitionError`.

### Domain Services

#### LedgerService — Double-Entry Accounting
Every transaction creates balanced debit/credit entries. Invariant: sum of debits = sum of credits.

| Method                     | Flow                         |
|----------------------------|------------------------------|
| `createDepositEntries()`   | ESCROW → USER (minus fees)   |
| `createWithdrawalEntries()`| USER → ESCROW (plus fees)    |
| `createTransferEntries()`  | SENDER → RECEIVER            |
| `createFeeEntries()`       | USER → FEES                  |
| `createRefundEntries()`    | ESCROW → USER                |

Account types: `USER`, `ESCROW`, `FEES`, `LIQUIDITY`

### Domain Errors

| Error                          | HTTP | Trigger                           |
|--------------------------------|------|-----------------------------------|
| `InsufficientFundsError`       | 400  | Balance < requested amount        |
| `WalletFrozenError`            | 403  | Wallet not in ACTIVE status       |
| `WalletNotFoundError`          | 404  | Wallet lookup failed              |
| `UserNotFoundError`            | 404  | User lookup failed                |
| `TransactionNotFoundError`     | 404  | Transaction lookup failed         |
| `InvalidStateTransitionError`  | 409  | Invalid state machine transition  |
| `LedgerImbalanceError`         | 500  | Debits ≠ credits (invariant)     |

## Use Cases

### Commands (Write Operations)

| Handler                      | Input                                          | What it does                                                    |
|------------------------------|-------------------------------------------------|-----------------------------------------------------------------|
| `CreateWalletHandler`        | userId, blockchain?                            | Creates Circle wallet, persists locally, activates if LIVE      |
| `ActivateWalletHandler`      | circleWalletId                                 | Transitions wallet PENDING → ACTIVE                             |
| `InitiateDepositHandler`     | userId, fiatAmount, fiatCurrency, country?, paymentMethod? | Creates tx, initiates Coinbase onramp, enqueues polling + expiry jobs, returns paymentUrl |
| `ConfirmDepositHandler`      | providerRef, providerStatus                    | Credits wallet, creates ledger entries, enqueues faucet job     |
| `InitiateWithdrawalHandler`  | userId, fiatAmount, fiatCurrency, country?, paymentMethod? | Validates balance+fee, initiates Coinbase offramp, enqueues jobs, returns paymentUrl |
| `ExecuteTransferHandler`     | senderUserId, recipientPhone/address, amount   | Resolves wallets, executes Circle transfer, creates ledger      |
| `ExecuteSimpleTransferHandler`| senderUserId, recipientPhone, amount           | Simplified P2P without Circle API interaction                   |
| `SyncWalletStatusHandler`    | userId                                         | Queries Circle for latest wallet state and balance              |

### Queries (Read Operations)

| Handler                        | Input                              | Returns                                    |
|--------------------------------|------------------------------------|--------------------------------------------|
| `GetBalanceHandler`            | userId, displayCurrency?          | USDC balance + fiat conversion             |
| `GetTransactionHistoryHandler` | userId, type?, status?, dates?, page, limit | Paginated transactions with direction |
| `GetTransactionByIdHandler`    | userId, txId                      | Single transaction details                 |
| `GetWalletAddressHandler`      | userId                            | Wallet address + blockchain                |
| `GetExchangeRateHandler`       | currencies[]                      | Current rates with source + timestamp      |
| `ResolveRecipientHandler`      | phone? or address?                | Recipient wallet info                      |
| `GetOnrampQuoteHandler`        | paymentAmount, paymentCurrency, country?, paymentMethod? | Fee preview for fiat→USDC deposit |
| `GetOfframpQuoteHandler`       | sellAmount, cashoutCurrency, country?, paymentMethod?    | Fee preview for USDC→fiat withdrawal |

## API Endpoints

### Auth (Better Auth — `/api/auth`)

Auth is handled by [Better Auth](https://www.better-auth.com/) with social providers and phone OTP.

```
POST   /api/auth/sign-up           Register (email/phone + password or social)
POST   /api/auth/sign-in           Login → session cookie
POST   /api/auth/sign-out          Logout
POST   /api/auth/send-otp          Send OTP to phone
GET    /api/auth/session           Get current session
```

Social login: Google and Apple OAuth are supported. Account linking is enabled for users who sign up with multiple providers.

### Exchange Rates (Public — `/api/v2`)

```
GET    /exchange-rates               Get rates (?currencies=EUR,XOF)
GET    /exchange-rates/preview       Conversion preview (?amount=100&from=EUR&to=USDC)
```

### Wallet (Protected — requires session — `/api/v2`)

```
POST   /wallet                       Create wallet (body: { blockchain? })
GET    /wallet/address               Get wallet address
GET    /wallet/balance               Get balance (?currency=XOF)
POST   /wallet/sync-status           Sync status with Circle
POST   /wallet/deposit               Initiate Coinbase onramp deposit
POST   /wallet/withdraw              Initiate Coinbase offramp withdrawal
GET    /wallet/onramp-quote          Preview onramp fees (?amount=100&currency=USD)
GET    /wallet/offramp-quote         Preview offramp fees (?sellAmount=50&cashoutCurrency=EUR)
POST   /wallet/transfer              P2P transfer (Circle on-chain)
POST   /wallet/transferable          Simple P2P transfer
GET    /wallet/transactions          Transaction history (?page=1&limit=20&type=&status=)
GET    /wallet/transactions/:txId    Single transaction
GET    /wallet/resolve-recipient     Lookup by ?phone= or ?address=
```

### Webhooks

```
POST   /webhooks/coinbase-cdp         Coinbase CDP onramp/offramp callbacks
POST   /webhooks/circle              Circle wallet notifications
```

### Health

```
GET    /health                       Full health check (DB + Redis status)
GET    /ready                        Kubernetes readiness probe
GET    /live                         Kubernetes liveness probe
```

### Request/Response Format

All responses follow:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

Error responses:
```json
{
  "success": false,
  "error": { "code": "INSUFFICIENT_FUNDS", "message": "...", "details": {} }
}
```

### Example: Deposit Flow (Coinbase Onramp)

```
POST /api/v2/wallet/deposit
Cookie: better-auth.session_token=...
Content-Type: application/json

{ "amount": 50, "currency": "USD", "country": "US", "paymentMethod": "CARD" }

→ 202 Accepted
{
  "success": true,
  "data": {
    "transactionId": "clx...",
    "providerRef": "quote-id-...",
    "status": "PROCESSING",
    "amountUsdc": "49.500000",
    "displayAmount": "50.00",
    "displayCurrency": "USD",
    "paymentUrl": "https://pay.coinbase.com/buy/select-asset?sessionToken=...",
    "fees": {
      "coinbaseFee": "1.50",
      "networkFee": "0.02",
      "paymentTotal": "51.52"
    }
  }
}
```

> The mobile app opens `paymentUrl` in a WebView. The user completes the purchase on Coinbase. BullMQ workers poll for completion and process webhook callbacks.

## Background Jobs (BullMQ)

Three BullMQ queues handle async work, backed by Redis:

| Queue              | Purpose                                | Attempts | Backoff            |
|--------------------|----------------------------------------|----------|--------------------|
| `coinbase-polling` | Poll Coinbase CDP for deposit/withdrawal status | 60 | Fixed 10s delay   |
| `tx-expiry`        | Expire pending transactions after timeout      | 3  | Exponential (2s base) |
| `faucet`           | Request testnet USDC tokens via Circle         | 5  | Exponential (3s base) |

Workers are bootstrapped at startup and shut down gracefully (30s timeout).

## Database Schema

8 core tables + 3 Better Auth tables, managed by Prisma:

| Table                | Purpose                                           |
|----------------------|---------------------------------------------------|
| `users`              | Accounts with KYC levels, preferences             |
| `wallets`            | Circle wallets with local balance (Decimal 18,6)  |
| `transactions`       | All operations with state machine                 |
| `onramp_transactions`| Provider-specific details (provider ref, fiat amount) |
| `ledger_entries`     | Double-entry accounting (debit/credit, balanceAfter)|
| `exchange_rates`     | Cached rates with TTL                             |
| `webhook_events`     | Webhook processing queue with retry count         |
| `system_accounts`    | ESCROW, FEES, LIQUIDITY balances                  |
| `sessions`           | Better Auth session tracking                      |
| `accounts`           | Better Auth OAuth provider accounts               |
| `verifications`      | Better Auth OTP/email verification tokens         |

### Key Enums

```
Blockchain:    POLYGON_AMOY, ETH_SEPOLIA, ARBITRUM_SEPOLIA, POLYGON, ARBITRUM, ETHEREUM
WalletStatus:  PENDING, ACTIVE, FROZEN, CLOSED
TxType:        DEPOSIT_ONRAMP, DEPOSIT_CRYPTO, WITHDRAWAL_OFFRAMP, WITHDRAWAL_CRYPTO, TRANSFER_P2P, FEE, REFUND
TxStatus:      PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, EXPIRED
KycLevel:      NONE, BASIC, VERIFIED, ENHANCED
Currency:      EUR, XOF, USD
AccountType:   USER, ESCROW, FEES, LIQUIDITY
EntryType:     DEBIT, CREDIT
OnRampProvider: MTN_MOMO, COINBASE_CDP, MOOV_MONEY, CELTIIS, ORANGE_MONEY, WAVE, BANK_TRANSFER
```

## External Integrations

### Circle Programmable Wallets

Adapter: `CircleWalletAdapter` implements `WalletProvider`

| Method                  | Circle API                        | Purpose                      |
|-------------------------|-----------------------------------|------------------------------|
| `createWallet()`        | POST /developer/wallets           | Create blockchain wallet     |
| `getWallet()`           | GET /wallets/{id}                 | Fetch wallet state           |
| `getBalance()`          | GET /wallets/{id}/balances        | Query USDC balance           |
| `transfer()`            | POST /developer/transactions/transfer | On-chain USDC transfer   |
| `getTransferStatus()`   | GET /transactions/{id}            | Poll transfer status         |
| `estimateFee()`         | POST /transactions/transfer/estimateFee | Gas fee estimate       |
| `requestTestnetTokens()`| POST /faucet/drips                | Request testnet USDC + gas   |

Blockchain mapping: `POLYGON_AMOY → MATIC-AMOY`, `ETH_SEPOLIA → ETH-SEPOLIA`, etc.

Entity secret encrypted with RSA public key before each API call.

### Coinbase CDP Onramp/Offramp API

Adapter: `CoinbaseCdpOnRampAdapter` implements `OnRampProvider` + `QuoteProvider`

| Method                | Coinbase API                        | Purpose                           |
|-----------------------|-------------------------------------|-----------------------------------|
| `initiateDeposit()`   | POST /onramp/v1/token + /buy/quote | Session token + buy quote → widget URL |
| `getDepositStatus()`  | GET /onramp/v1/buy/user/{ref}/transactions | Poll deposit by partnerUserRef |
| `initiatePayout()`    | POST /offramp/v1/token + /sell/quote | Session token + sell quote → offramp URL |
| `getPayoutStatus()`   | GET /offramp/v1/sell/user/{ref}/transactions | Poll payout by partnerUserRef |
| `getOnrampQuote()`    | POST /onramp/v1/buy/quote           | Fee preview for deposits          |
| `getOfframpQuote()`   | POST /offramp/v1/sell/quote          | Fee preview for withdrawals       |

Features:
- ES256 JWT authentication (signed with EC private key from `cdp_api_key.json`)
- Redirect-based flow: returns a `paymentUrl` for the user to complete on Coinbase
- Composite `providerRef` format (`userId:quoteId`) for user-level transaction polling
- Background polling via BullMQ (replaces in-process polling)
- Supported fiat currencies: USD, EUR
- Supported payment methods: CARD, ACH_BANK_ACCOUNT, APPLE_PAY

### CoinGecko Exchange Rates

Two adapters (decorator pattern):
- `CoingeckoAdapter` — fetches live rates from CoinGecko API
- `CachedExchangeRateAdapter` — wraps upstream with Redis/DB caching (5 min TTL)

Fixed rate: 1 EUR = 655.957 XOF (CFA franc peg)

### Better Auth

Handles all authentication concerns:
- Session-based auth (7-day expiry, 1-day update age)
- Social providers: Google, Apple (with account linking)
- Phone number + OTP verification
- Prisma adapter for session/account/verification storage

## Design Decisions

### Idempotency
Every command accepts an `idempotencyKey`. If a transaction with that key already exists, the handler returns the existing result instead of creating a duplicate. Safe to retry on network failures.

### Atomic Database Transactions
Wallet balance updates and ledger entries are persisted in a single Prisma `$transaction()` call. This prevents inconsistencies between balance and accounting records.

### XState State Machines
Transaction and Wallet state transitions are enforced by XState machines at the domain level. Invalid transitions throw `InvalidStateTransitionError` with context about the current state and attempted event. This replaces ad-hoc status validation with a formal model.

### BullMQ Background Jobs
After initiating a deposit/withdrawal via Coinbase CDP, the handler enqueues a polling job and an expiry job. If the webhook arrives first, the polling worker detects the terminal state and stops. If the webhook never arrives, polling completes the transaction. Transaction expiry jobs ensure stale transactions don't remain in PENDING state indefinitely.

### Decimal Precision
All financial math uses `Decimal.js`. USDC amounts stored with 6 decimal places (`Decimal(18,6)`), exchange rates with 8 (`Decimal(18,8)`), fiat amounts with 2 (`Decimal(18,2)`).

### Fee Structure
- Deposits: 1% fee deducted from credited USDC
- Withdrawals: 1.5% fee added to deducted USDC
- P2P Transfers: Free

## Infrastructure

### Docker Compose

```yaml
services:
  db:       PostgreSQL 16 (port 5433, persistent volume)
  redis:    Redis 7 (port 6379, AOF persistence, 256MB max with LRU eviction)
```

### Redis Usage
- **BullMQ job queues** — coinbase-polling, tx-expiry, faucet
- **Rate limiting** — Redis-backed store for distributed rate limiting
- **Exchange rate cache** — 5 min TTL

## Environment Variables

```bash
# Server
NODE_ENV=development          # development | production | test
PORT=3000
API_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/pulapay_v2

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                # optional

# Better Auth
BETTER_AUTH_SECRET=<32-char-secret>
BETTER_AUTH_URL=http://localhost:3000

# Social Providers (optional)
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-secret>
APPLE_CLIENT_ID=<oauth-client-id>
APPLE_CLIENT_SECRET=<oauth-secret>

# Circle
CIRCLE_API_KEY=TEST_API_KEY:...
CIRCLE_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
CIRCLE_ENTITY_SECRET=<hex-encoded-secret>
CIRCLE_WALLET_SET_ID=<uuid>
CIRCLE_ENVIRONMENT=sandbox    # sandbox | production

# Blockchain
DEFAULT_BLOCKCHAIN=POLYGON_AMOY
USDC_TOKEN_ID_POLYGON_AMOY=<circle-token-id>
USDC_TOKEN_ID_POLYGON=<circle-token-id>

# Exchange Rates
EXCHANGE_RATE_PROVIDER=coingecko
EXCHANGE_RATE_CACHE_TTL_MINUTES=5
COINGECKO_API_KEY=<api-key>
XOF_EUR_FIXED_RATE=655.957

# Coinbase CDP
COINBASE_CDP_API_KEY_NAME=organizations/<org-id>/apiKeys/<key-id>
COINBASE_CDP_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
COINBASE_CDP_BASE_URL=https://api.developer.coinbase.com
COINBASE_CDP_DEFAULT_COUNTRY=US

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Scripts

```bash
npm run dev              # Start dev server (ts-node-dev, auto-reload)
npm run build            # Compile TypeScript → dist/
npm start                # Run compiled output
npm test                 # Run Jest tests
npm run test:watch       # Jest in watch mode
npm run test:coverage    # Jest with coverage report
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:migrate:prod  # Run migrations (production)
npm run prisma:studio    # Open Prisma Studio (DB GUI)
npm run prisma:seed      # Seed database
```

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env     # Edit with your credentials

# Start infrastructure
docker-compose up -d     # PostgreSQL + Redis

# Database
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate client

# Start server
npm run dev              # http://localhost:3000

# Verify
curl http://localhost:3000/api/v2/health
```

## Testing

```bash
npm test                 # Run all tests
npm run test:coverage    # Coverage report (min 70% branches/functions/lines)
```

Tests are colocated in `__tests__/` folders next to source files. Path aliases (`@domain/*`, `@application/*`, `@infrastructure/*`, `@shared/*`) are configured in Jest.

## TypeScript Config

- Target: ES2022
- Strict mode enabled (noImplicitAny, strictNullChecks, noUnusedLocals, noUnusedParameters)
- Path aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@shared/*`
- Declaration maps and source maps enabled
