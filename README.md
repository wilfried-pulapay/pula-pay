# Pula Pay

Universal African Money Account — a fintech platform enabling USDC wallet management, fiat on/off-ramp via Coinbase CDP, and peer-to-peer transfers across Africa.

## Overview

Pula Pay lets users buy USDC with fiat via Coinbase onramp, hold it on blockchain, send to other users instantly for free, and sell back to fiat via Coinbase offramp at any time. It supports multi-currency display (EUR, XOF, USD) with live exchange rates.

## Project Structure

```
pula-pay/
├── back2/                # Backend API (Express + TypeScript)
├── mobile/               # Mobile app (React Native + Expo)
└── docker-compose.yml    # PostgreSQL infrastructure
```

## Tech Stack

### Backend (`back2/`)

| Category        | Technology                                      |
|-----------------|-------------------------------------------------|
| Framework       | Express.js                                      |
| Language        | TypeScript (strict mode)                        |
| Database        | PostgreSQL + Prisma ORM                         |
| Blockchain      | Circle User-Controlled Wallets (Base network)   |
| Payment         | Coinbase CDP Onramp/Offramp API                 |
| Exchange Rates  | CoinGecko API (cached)                          |
| Auth            | Better Auth (email/password + Google OAuth)     |
| State Machines  | XState                                          |
| Job Queue       | BullMQ + Redis                                  |
| Validation      | Zod                                             |
| Logging         | Pino                                            |
| Testing         | Jest                                            |
| Math Precision  | Decimal.js                                      |

### Mobile (`mobile/`)

| Category        | Technology                          |
|-----------------|-------------------------------------|
| Framework       | React Native 0.81 + Expo 54        |
| Routing         | Expo Router (file-based)            |
| State           | Zustand                             |
| HTTP Client     | Axios                               |
| i18n            | i18next (EN, FR)                    |
| Icons           | Lucide React Native                 |
| Animations      | React Native Reanimated             |
| Secure Storage  | expo-secure-store                   |
| QR Codes        | react-native-qrcode-svg             |

## Architecture

### Backend — Clean / Hexagonal Architecture

```
back2/src/
├── domain/                    # Core business logic (no framework deps)
│   ├── entities/              # User, Wallet, Transaction
│   ├── value-objects/         # Money, WalletAddress, ExchangeRate
│   ├── services/              # LedgerService (double-entry accounting)
│   ├── ports/                 # Repository & Provider interfaces
│   └── errors/                # Domain exceptions
├── application/               # Use cases (Command/Query pattern)
│   ├── commands/              # 8 state-changing handlers
│   ├── queries/               # 8 read-only handlers
│   └── services/              # CurrencyConversionService
└── infrastructure/            # External integrations
    ├── adapters/              # Circle, Coinbase CDP, CoinGecko
    ├── persistence/           # Prisma repositories
    └── http/                  # Controllers, routes, middleware
```

Dependencies flow inward. The domain layer has zero framework dependencies. Ports define contracts, adapters implement them.

### Mobile — Feature-Based with Expo Router

```
mobile/src/
├── app/
│   ├── (auth)/                # Login, Register, OTP verification
│   └── (main)/               # Dashboard, Wallet, History, Profile
│       └── wallet/            # Deposit, Withdraw, Transfer, Receive
├── api/                       # Axios client + endpoint modules
├── store/                     # Zustand stores (auth, wallet, toast)
├── components/                # Reusable UI components
├── hooks/                     # Custom hooks (useBalance, useDeposit, etc.)
├── theme/                     # Light/dark theme system
├── i18n/                      # Translations (EN, FR)
└── utils/                     # Error handling, logging, formatting
```

## Features

### Wallet Management
- Circle **User-Controlled** USDC wallets on **Base** (Base Sepolia testnet / Base mainnet)
- Users hold their own private keys via PIN secured by Circle SDK
- Real-time balance tracking in USDC with fiat display conversion
- Wallet address sharing via QR code

### Fiat On-Ramp (Deposit)
- Coinbase CDP onramp (USD/EUR to USDC) via redirect-based widget
- Fee preview quotes before committing
- Background polling fallback if webhook doesn't arrive
- Automatic testnet token faucet on deposit confirmation

### Fiat Off-Ramp (Withdrawal)
- Coinbase CDP offramp (USDC to USD/EUR) via redirect-based widget
- Fee preview quotes before committing
- Balance + fee validation before processing

### Peer-to-Peer Transfers
- Send USDC to other users by phone number or wallet address
- Recipient lookup and validation
- Circle **PIN challenge** flow: transfer is initiated by backend, signed by user on mobile
- Free transfers (no fees)

### Transaction Tracking
- Full transaction history with pagination and filtering
- State machine: PENDING → PROCESSING → COMPLETED / FAILED / CANCELLED / EXPIRED
- Real-time status polling (2s intervals on mobile)

### Authentication & KYC
- Email/password registration + Google OAuth via **Better Auth**
- Session token stored natively (iOS Keychain / Android Keystore)
- Automatic wallet setup (Circle PIN) triggered on first registration
- Progressive KYC levels with transaction limits:
  - NONE: $0/day
  - BASIC: $100/day
  - VERIFIED: $1,000/day
  - ENHANCED: $10,000/day

### Exchange Rates
- Live USDC/fiat rates via CoinGecko
- Cached in database (5 min TTL)
- Conversion preview endpoint

### Financial Accounting
- Double-entry ledger (every transaction creates balanced debit/credit entries)
- Account types: USER, ESCROW, FEES, LIQUIDITY
- Full audit trail

### Fee Structure
- Deposits: 1%
- Withdrawals: 1.5%
- P2P Transfers: Free

## API Endpoints

### Auth — Better Auth
| Method | Endpoint                        | Description                      |
|--------|---------------------------------|----------------------------------|
| POST   | /api/auth/sign-up/email         | Register (email + password)      |
| POST   | /api/auth/sign-in/email         | Login (email + password)         |
| POST   | /api/auth/sign-in/social        | Google OAuth                     |
| GET    | /api/auth/get-session           | Get current session + user       |
| POST   | /api/auth/sign-out              | Logout                           |
| PATCH  | /users/me/preferences           | Update display currency          |

### Exchange Rates
| Method | Endpoint                     | Description          |
|--------|------------------------------|----------------------|
| GET    | /exchange-rates              | Get current rates    |
| GET    | /exchange-rates/preview      | Conversion preview   |

### Wallet (Protected)
| Method | Endpoint                     | Description                                              |
|--------|------------------------------|----------------------------------------------------------|
| POST   | /wallet                      | Initiate wallet setup — returns Circle challenge         |
| POST   | /wallet/confirm-setup        | Confirm wallet after PIN resolved on mobile              |
| GET    | /wallet/me                   | Get wallet info                                          |
| GET    | /wallet/address              | Get wallet address                                       |
| GET    | /wallet/balance              | Get balance                                              |
| POST   | /wallet/sync-status          | Sync wallet status with Circle                           |
| POST   | /wallet/deposit              | Initiate Coinbase CDP onramp                             |
| POST   | /wallet/withdraw             | Initiate Coinbase CDP offramp                            |
| POST   | /wallet/transferable         | Initiate P2P transfer — returns Circle challenge         |
| GET    | /wallet/resolve-recipient    | Resolve recipient by phone                               |
| GET    | /wallet/transactions         | Transaction history                                      |
| GET    | /wallet/transactions/:txId   | Transaction details                                      |

### Webhooks
| Method | Endpoint              | Description                |
|--------|-----------------------|----------------------------|
| POST   | /webhooks/coinbase-cdp| Coinbase CDP callbacks     |
| POST   | /webhooks/circle      | Circle wallet notifications|

### Health
| Method | Endpoint  | Description         |
|--------|-----------|---------------------|
| GET    | /health   | Full health check   |
| GET    | /ready    | Readiness probe     |
| GET    | /live     | Liveness probe      |

## Database Schema

Core tables managed by Prisma:

- **users** — Accounts with KYC levels and preferences
- **wallets** — Circle wallets with local balance sync
- **transactions** — All operations with state machine
- **onramp_transactions** — Provider-specific details (Coinbase CDP)
- **ledger_entries** — Double-entry accounting records
- **exchange_rates** — Cached rates with TTL
- **webhook_events** — Webhook processing queue
- **system_accounts** — ESCROW, FEES, LIQUIDITY accounts

## Infrastructure

**Docker Compose** provides:
- PostgreSQL 16 with health checks and persistent volumes

**Supported Blockchains:**
- Base Sepolia (testnet, default)
- Base (mainnet)

## Key Design Decisions

- **User-Controlled Wallets** — Users hold their own private keys via PIN/biometrics. Every signing operation goes through a Circle challenge resolved on mobile.
- **Circle Challenge Flow** — Backend initiates operations (wallet setup, transfer) and returns a `challengeId`. Mobile resolves the challenge via Circle Web SDK (WebView) before the operation executes.
- **Two-step wallet creation** — `POST /wallet` returns a challenge; `POST /wallet/confirm-setup` completes it after PIN setup. Prevents orphan wallet records.
- **Idempotency** — Every command uses idempotency keys to prevent duplicate processing
- **Atomic transactions** — Wallet balance updates + ledger entries in a single Prisma transaction
- **State machine (XState)** — Transactions follow strict valid state transitions managed by XState machines
- **BullMQ polling** — Background job queue (Redis-backed) for Coinbase CDP onramp/offramp status polling
- **Polling fallback** — If Coinbase CDP webhooks don't arrive, background polling completes transactions
- **Decimal precision** — All financial math uses Decimal.js (6 decimals for USDC, 2 for fiat)
- **Secure storage** — Mobile tokens stored in iOS Keychain / Android Keystore

## Getting Started

### Backend

```bash
cd back2
npm install
npx prisma migrate dev
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### Docker (Database)

```bash
docker-compose up db
```

## Related Repositories

- [momo-backend-mvp](https://github.com/hfreshnel/momo-backend-mvp) — Earlier backend prototype (Express + MoMo integration)
- [pula-pay-front](https://github.com/hfreshnel/pula-pay-front) — Web dashboard (React + Vite)
