# API Routes Documentation

## Response Structure Overview

### Standard Response Format
All responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2025-01-21T10:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descriptive error message",
    "details": { ... }
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2025-01-21T10:30:00.000Z"
  }
}
```

---

## Error Codes Reference

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body/params/query |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired session |
| 401 | `INVALID_SIGNATURE` | Invalid webhook signature |
| 403 | `FORBIDDEN` | Access denied |
| 404 | `NOT_FOUND` | Resource not found |
| 404 | `USER_NOT_FOUND` | User not found |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |
| 409 | `INSUFFICIENT_FUNDS` | Balance insufficient |
| 429 | `TOO_MANY_REQUESTS` | Rate limited |
| 500 | `INTERNAL_ERROR` | Server error |

> **Note:** Auth error responses from Better Auth (`/api/auth/*`) use Better Auth's own error format, not the standard `ApiResponse` wrapper above.

---

## Supported Enums

### Currency
```
EUR, XOF, USD
```

### Blockchain
```
BASE_SEPOLIA, BASE
```

### TxType (Transaction Type)
```
DEPOSIT_ONRAMP, DEPOSIT_CRYPTO, WITHDRAWAL_OFFRAMP, WITHDRAWAL_CRYPTO, TRANSFER_P2P, REFUND, FEE
```

### TxStatus (Transaction Status)
```
PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, EXPIRED
```

### KycLevel
```
NONE, BASIC, VERIFIED, ENHANCED
```

---

## Routes

### Health Routes

#### `GET /health`
Full health check with database and Redis connection status.

**Auth:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "2.0.0",
    "uptime": 3600,
    "checks": {
      "database": "ok",
      "redis": "ok"
    }
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Error Response (503):**
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "version": "2.0.0",
    "uptime": 3600,
    "checks": {
      "database": "error",
      "redis": "error"
    }
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

#### `GET /ready`
Readiness probe (for Kubernetes).

**Auth:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": { "ready": true },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

#### `GET /live`
Liveness probe (for Kubernetes).

**Auth:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": { "alive": true },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

### Authentication Routes (Better Auth)

> **Base path:** `/api/auth` (not under `/api/v2`)
>
> Authentication is handled by [Better Auth](https://www.better-auth.com/).
> Users can sign in/up via **email + password** or social providers (Google, Apple).
> Phone number is stored on the user record for verification purposes but is not a login method.
>
> **Session management:** Better Auth uses cookie-based sessions (`better-auth.session_token`).
> The session token can also be passed as `Authorization: Bearer <session_token>`.
> Sessions expire after 7 days, with a 1-day rolling update window.
>
> **Account linking:** Linking is **email-based** — when a user signs in with a new provider whose email matches an existing account, the accounts are automatically merged.
> - **Email + Google/Apple:** Register with email+password, then sign in with Google/Apple (same email) — auto-linked.

---

#### `POST /api/auth/sign-up/email`
Register a new account with an email and password. This route is provided by Better Auth's built-in email+password module.

**Auth:** None

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "mySecureP4ss",
  "name": "John Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | 8–128 characters |
| name | string | Yes | Display name |

**Success Response (200):**

A `Set-Cookie` header with `better-auth.session_token` is included (auto sign-in is enabled).

```json
{
  "token": "session-token-string",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "emailVerified": false,
    "kycLevel": "NONE",
    "displayCurrency": "EUR",
    "locale": "fr",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | - | Invalid email or password too short |
| 422 | - | User already exists |

---

#### `POST /api/auth/sign-in/email`
Sign in with email and password. This route is provided by Better Auth's built-in email+password module.

**Auth:** None

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "mySecureP4ss"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Registered email |
| password | string | Yes | Account password |

**Success Response (200):**

A `Set-Cookie` header with `better-auth.session_token` is included in the response.

```json
{
  "session": {
    "id": "session-uuid",
    "userId": "user-uuid",
    "token": "session-token-string",
    "expiresAt": "2026-03-03T10:00:00.000Z"
  },
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "emailVerified": false,
    "kycLevel": "NONE",
    "displayCurrency": "EUR",
    "locale": "fr",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | - | Invalid email or password |

---

#### `POST /api/auth/sign-in/social`
Initiate a social sign-in flow (Google or Apple). Returns a redirect URL for the OAuth provider that the mobile app should open in a browser/WebView.

Account linking is enabled: if the social email matches an existing account, it will be linked automatically.

**Auth:** None

**Request Body:**
```json
{
  "provider": "google",
  "callbackURL": "pulapay://auth/callback"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | Yes | `google` or `apple` |
| callbackURL | string | Yes | Deep link URL for redirect after OAuth |

**Success Response (200):**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "redirect": true
}
```

---

#### `GET /api/auth/get-session`
Get the current session and user profile.

**Auth:** Required (session cookie or Bearer token)

**Request Header (option A):**
```
Cookie: better-auth.session_token=<token>
```

**Request Header (option B):**
```
Authorization: Bearer <session_token>
```

**Success Response (200):**
```json
{
  "session": {
    "id": "session-uuid",
    "userId": "user-uuid",
    "token": "session-token-string",
    "expiresAt": "2026-03-02T21:00:00.000Z"
  },
  "user": {
    "id": "user-uuid",
    "name": "+33612345678",
    "email": "+33612345678@pulapay.app",
    "phoneNumber": "+33612345678",
    "phoneNumberVerified": true,
    "kycLevel": "BASIC",
    "displayCurrency": "EUR",
    "locale": "fr",
    "createdAt": "2026-02-23T21:00:00.000Z",
    "updatedAt": "2026-02-23T21:00:00.000Z"
  }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | - | No active session |

---

#### `POST /api/auth/sign-out`
Invalidate the current session and clear the session cookie.

**Auth:** Required (session cookie or Bearer token)

**Success Response (200):**
```json
{
  "success": true
}
```

---

#### `POST /api/auth/update-user`
Update the authenticated user's profile fields.

**Auth:** Required (session cookie or Bearer token)

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "newemail@example.com",
  "displayCurrency": "XOF",
  "locale": "fr"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Display name |
| email | string | No | Valid email |
| displayCurrency | Currency | No | EUR, XOF, USD |
| locale | string | No | 2-10 chars (e.g., "en", "fr") |

**Success Response (200):**
```json
{
  "id": "user-uuid",
  "name": "John Doe",
  "email": "newemail@example.com",
  "phoneNumber": "+33612345678",
  "phoneNumberVerified": true,
  "kycLevel": "BASIC",
  "displayCurrency": "XOF",
  "locale": "fr",
  "createdAt": "2026-02-23T21:00:00.000Z",
  "updatedAt": "2026-02-23T21:30:00.000Z"
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | - | Unauthorized |

---

### Exchange Rate Routes

#### `GET /exchange-rates`
Get current exchange rates for USDC to fiat currencies.

**Auth:** None

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| currencies | string | No | `EUR,XOF,USD` | Comma-separated currency codes |

**Example:** `GET /exchange-rates?currencies=EUR,XOF`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "baseCurrency": "USDC",
        "quoteCurrency": "EUR",
        "rate": "0.92",
        "timestamp": "2025-01-21T10:30:00.000Z",
        "source": "coingecko"
      },
      {
        "baseCurrency": "USDC",
        "quoteCurrency": "XOF",
        "rate": "605.50",
        "timestamp": "2025-01-21T10:30:00.000Z",
        "source": "coingecko"
      }
    ]
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

#### `GET /exchange-rates/preview`
Get conversion preview between currencies.

**Auth:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| amount | number | Yes | Amount to convert |
| from | Currency or "USDC" | Yes | Source currency |
| to | Currency or "USDC" | Yes | Target currency |

**Example:** `GET /exchange-rates/preview?amount=100&from=EUR&to=USDC`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "inputAmount": "100",
    "inputCurrency": "EUR",
    "outputAmount": "108.69",
    "outputCurrency": "USDC",
    "exchangeRate": "0.92"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid parameters |

---

### Wallet Routes

#### `POST /wallet`
Create a new USDC wallet for the authenticated user.

**Auth:** Required (Bearer token)

**Request Body:**
```json
{
  "blockchain": "BASE_SEPOLIA"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| blockchain | Blockchain | No | `BASE_SEPOLIA` | Target blockchain |

**Success Response (202):**
```json
{
  "success": true,
  "data": {
    "challengeId": "challenge-uuid",
    "userToken": "circle-user-token",
    "encryptionKey": "circle-enc-key",
    "appId": "circle-app-id"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

> **Mobile flow:** Pass `challengeId`, `userToken`, `encryptionKey`, and `appId` to the Circle React Native SDK to open the PIN setup screen. Call `POST /wallet/confirm-setup` once the challenge resolves.

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `USER_NOT_FOUND` | User not found |

---

#### `POST /wallet/confirm-setup`
Complete wallet creation after the Circle PIN challenge resolves on mobile.

**Auth:** Required (Bearer token)

**Request Body:**
```json
{
  "userToken": "circle-user-token",
  "blockchain": "BASE_SEPOLIA"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| userToken | string | Yes | - | Token returned by `POST /wallet` |
| blockchain | Blockchain | No | `BASE_SEPOLIA` | Target blockchain |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "address": "0x1234567890abcdef...",
    "blockchain": "BASE_SEPOLIA",
    "status": "active"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `USER_NOT_FOUND` | User not found |

---

#### `GET /wallet/address`
Get wallet address and blockchain information.

**Auth:** Required (Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "address": "0x1234567890abcdef...",
    "blockchain": "POLYGON_AMOY",
    "status": "ACTIVE"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |

---

#### `GET /wallet/balance`
Get wallet balance in USDC and display currency.

**Auth:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| currency | Currency | No | Display currency (uses user preference if not specified) |

**Example:** `GET /wallet/balance?currency=EUR`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "address": "0x1234567890abcdef...",
    "balanceUsdc": "150.50",
    "displayBalance": "138.46",
    "displayCurrency": "EUR",
    "exchangeRate": "0.92",
    "status": "ACTIVE"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `USER_NOT_FOUND` | User not found |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |

---

#### `POST /wallet/sync-status`
Manually sync wallet status with Circle. Useful for activating wallets stuck in PENDING state.

**Auth:** Required (Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "previousStatus": "PENDING",
    "currentStatus": "ACTIVE",
    "wasUpdated": true
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |
| 500 | `INTERNAL_ERROR` | Failed to sync with Circle |

---

#### `POST /wallet/deposit`
Initiate a fiat-to-USDC deposit via Coinbase onramp. Returns a `paymentUrl` that the mobile app should open in a WebView for the user to complete the purchase on Coinbase.

**Auth:** Required (Bearer token)

**Request Body:**
```json
{
  "amount": 50.00,
  "currency": "USD",
  "country": "US",
  "paymentMethod": "CARD"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| amount | number | Yes | - | Positive fiat amount to deposit |
| currency | Currency | Yes | - | Fiat currency (USD or EUR) |
| country | string (2 chars) | No | `US` | ISO 3166-1 country code |
| paymentMethod | string | No | `CARD` | `CARD`, `ACH_BANK_ACCOUNT`, or `APPLE_PAY` |

**Success Response (202):**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "providerRef": "quote-id-abc",
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
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

> **Mobile flow:** Open `paymentUrl` in a WebView or external browser. The user completes the purchase on Coinbase. The backend polls for completion and receives webhook callbacks.

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |

---

#### `POST /wallet/withdraw`
Initiate a USDC-to-fiat withdrawal via Coinbase offramp. Returns a `paymentUrl` that the mobile app should open in a WebView for the user to complete the sale on Coinbase.

**Auth:** Required (Bearer token)

**Request Body:**
```json
{
  "amount": 25.00,
  "targetCurrency": "EUR",
  "country": "US",
  "paymentMethod": "ACH_BANK_ACCOUNT"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| amount | number | Yes | - | Fiat amount to withdraw |
| targetCurrency | Currency | Yes | - | Fiat cashout currency (USD or EUR) |
| country | string (2 chars) | No | `US` | ISO 3166-1 country code |
| paymentMethod | string | No | `ACH_BANK_ACCOUNT` | `ACH_BANK_ACCOUNT` or `CARD` |

**Success Response (202):**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "providerRef": "quote-id-def",
    "status": "PROCESSING",
    "amountUsdc": "25.000000",
    "feeUsdc": "0.375000",
    "displayAmount": "25.00",
    "displayCurrency": "EUR",
    "paymentUrl": "https://pay.coinbase.com/sell?sessionToken=...",
    "fees": {
      "coinbaseFee": "0.75",
      "cashoutTotal": "24.25"
    }
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

> **Note:** Withdrawal fee is 1.5% of the USDC amount. Open `paymentUrl` in a WebView for the user to complete the sale.

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |
| 409 | `INSUFFICIENT_FUNDS` | Balance insufficient |

---

#### `GET /wallet/onramp-quote`
Preview fees and USDC amount for a fiat-to-USDC deposit before committing.

**Auth:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| amount | number | Yes | - | Fiat amount to deposit |
| currency | Currency | Yes | - | Fiat currency (USD or EUR) |
| country | string | No | `US` | ISO 3166-1 country code |
| paymentMethod | string | No | `CARD` | `CARD`, `ACH_BANK_ACCOUNT`, or `APPLE_PAY` |

**Example:** `GET /wallet/onramp-quote?amount=100&currency=USD&country=US&paymentMethod=CARD`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quoteId": "quote-abc-123",
    "purchaseAmount": "97.50",
    "paymentSubtotal": "100.00",
    "coinbaseFee": "2.50",
    "networkFee": "0.02",
    "paymentTotal": "102.52"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid query parameters |
| 401 | `UNAUTHORIZED` | Missing/invalid token |

---

#### `GET /wallet/offramp-quote`
Preview fees and fiat amount for a USDC-to-fiat withdrawal before committing.

**Auth:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| sellAmount | number | Yes | - | USDC amount to sell |
| cashoutCurrency | Currency | Yes | - | Fiat cashout currency (USD or EUR) |
| country | string | No | `US` | ISO 3166-1 country code |
| paymentMethod | string | No | `ACH_BANK_ACCOUNT` | `ACH_BANK_ACCOUNT` or `CARD` |

**Example:** `GET /wallet/offramp-quote?sellAmount=50&cashoutCurrency=EUR&country=US&paymentMethod=ACH_BANK_ACCOUNT`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quoteId": "quote-def-456",
    "sellAmount": "50.00",
    "cashoutSubtotal": "49.50",
    "cashoutTotal": "48.00",
    "coinbaseFee": "1.50"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid query parameters |
| 401 | `UNAUTHORIZED` | Missing/invalid token |

---

#### `POST /wallet/transfer`
Transfer funds to another user (P2P transfer).

**Auth:** Required (Bearer token)

**Request Body:**
```json
{
  "recipientPhone": "+33687654321",
  "amount": 25,
  "currency": "EUR",
  "description": "Payment for dinner"
}
```

OR

```json
{
  "recipientAddress": "0xabcdef1234567890...",
  "amount": 25,
  "currency": "EUR",
  "description": "Payment for dinner"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recipientPhone | string | No* | Recipient's phone number |
| recipientAddress | string | No* | Recipient's wallet address |
| amount | number | Yes | Amount in display currency |
| currency | Currency | Yes | Display currency |
| description | string | No | Max 200 chars |

> *Either `recipientPhone` or `recipientAddress` must be provided.

**Success Response (202):**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "challengeId": "challenge-uuid",
    "userToken": "circle-user-token",
    "encryptionKey": "circle-enc-key",
    "appId": "circle-app-id",
    "amountUsdc": "27.17",
    "displayAmount": "25",
    "displayCurrency": "EUR",
    "recipientAddress": "0xabcdef1234567890...",
    "status": "PENDING"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

> **Mobile flow:** Pass `challengeId`, `userToken`, `encryptionKey`, and `appId` to the Circle SDK for PIN confirmation. Circle broadcasts the transaction once the user confirms.
>
> **Note:** P2P transfers are free (no network fee charged to the user).

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Sender or recipient wallet not found |
| 409 | `INSUFFICIENT_FUNDS` | Balance insufficient |

---

#### `GET /wallet/transactions`
Get transaction history with pagination and filters.

**Auth:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | TxType | No | All | Filter by type |
| status | TxStatus | No | All | Filter by status |
| fromDate | ISO 8601 | No | - | Start date |
| toDate | ISO 8601 | No | - | End date |
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page (max 100) |

**Example:** `GET /wallet/transactions?type=TRANSFER_P2P&status=COMPLETED&page=1&limit=10`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "TRANSFER_P2P",
        "status": "COMPLETED",
        "amountUsdc": "27.17",
        "feeUsdc": "0",
        "displayAmount": "25",
        "displayCurrency": "EUR",
        "description": "Payment for dinner",
        "createdAt": "2025-01-21T10:30:00.000Z",
        "completedAt": "2025-01-21T10:30:15.000Z"
      },
      {
        "id": "uuid",
        "type": "DEPOSIT_ONRAMP",
        "status": "COMPLETED",
        "amountUsdc": "16.52",
        "feeUsdc": "0",
        "displayAmount": "10000",
        "displayCurrency": "XOF",
        "description": null,
        "createdAt": "2025-01-20T14:00:00.000Z",
        "completedAt": "2025-01-20T14:02:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |

---

#### `GET /wallet/transactions/:txId`
Get a single transaction by ID.

**Auth:** Required (Bearer token)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | string | Yes | Transaction UUID |

**Example:** `GET /wallet/transactions/550e8400-e29b-41d4-a716-446655440000`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "idempotencyKey": "idem-key-123",
    "externalRef": "circle-ref-456",
    "type": "TRANSFER_P2P",
    "status": "COMPLETED",
    "amountUsdc": "27.17",
    "feeUsdc": "0",
    "netAmountUsdc": "27.17",
    "exchangeRate": "0.92",
    "displayCurrency": "EUR",
    "displayAmount": "25",
    "walletId": "wallet-uuid",
    "counterpartyId": "recipient-wallet-uuid",
    "description": "Payment for dinner",
    "failureReason": null,
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:30:15.000Z",
    "completedAt": "2025-01-21T10:30:15.000Z"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Wallet not found |
| 404 | `TRANSACTION_NOT_FOUND` | Transaction not found or not owned by user |

---

#### `POST /wallet/estimate-fee`
Estimate the network fee for a P2P transfer before initiating it.

**Auth:** Required (Bearer token)

**Request Body:**
```json
{
  "recipientAddress": "0xabcdef1234567890...",
  "amount": 25,
  "currency": "EUR"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recipientAddress | string | Yes | Recipient's wallet address |
| amount | number | Yes | Amount in display currency |
| currency | Currency | Yes | Display currency |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "networkFee": "0.001",
    "amountUsdc": "27.17"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Possible Errors:**

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `WALLET_NOT_FOUND` | Sender wallet not found |

---

#### `GET /wallet/circle-wallets`
Fetch wallets directly from Circle for the authenticated user (silent recovery flow).

**Auth:** Required (Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "circle-wallet-id",
        "address": "0x1234567890abcdef...",
        "blockchain": "BASE-SEPOLIA",
        "state": "LIVE"
      }
    ]
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

#### `POST /wallet/reconcile-balance`
Force a balance reconciliation with Circle (dev/debug — compares Circle balance vs local DB).

**Auth:** Required (Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "circleBalance": "150.50",
    "dbBalance": "150.50",
    "discrepancy": "0",
    "action": "none"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

### Webhook Routes

#### `POST /webhooks/coinbase-cdp`
Handle Coinbase CDP onramp/offramp webhook callbacks.

**Auth:** Payload validation (internal)

**Request Body (from Coinbase CDP):**
```json
{
  "event_type": "onramp.transaction.success",
  "transaction_id": "txn-abc-123",
  "partner_user_id": "user-uuid",
  "status": "ONRAMP_TRANSACTION_STATUS_SUCCESS",
  "metadata": {}
}
```

**Supported Event Types:**
- `onramp.transaction.created` - Onramp transaction created
- `onramp.transaction.updated` - Onramp transaction updated
- `onramp.transaction.success` - Onramp payment completed
- `onramp.transaction.failed` - Onramp payment failed
- `offramp.transaction.created` - Offramp transaction created
- `offramp.transaction.updated` - Offramp transaction updated
- `offramp.transaction.success` - Offramp payout completed
- `offramp.transaction.failed` - Offramp payout failed

> **Note:** Only terminal events (`.success` and `.failed`) trigger transaction state changes. Always returns 200 to prevent webhook retries.

**Success Response (200):**
```json
{
  "success": true,
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

#### `POST /webhooks/circle`
Handle Circle wallet notifications.

**Auth:** RSA-SHA256 signature verified via `X-Circle-Signature` header (Circle entity public key)

**Request Body (from Circle):**
```json
{
  "subscriptionId": "sub-123",
  "notificationId": "notif-456",
  "notificationType": "transactions.outbound",
  "notification": {
    "id": "txn-789",
    "walletId": "wallet-abc",
    "state": "COMPLETE",
    "txHash": "0x...",
    "amounts": ["27.17"],
    "transactionType": "TRANSFER"
  }
}
```

**Notification Types:**
- `transactions.outbound` - Outgoing transaction
- `transactions.inbound` - Incoming transaction
- `wallets` - Wallet state changes

**Success Response (200):**
```json
{
  "success": true,
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

## Routes Summary Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v2/health` | No | Full health check |
| `GET` | `/api/v2/ready` | No | Readiness probe |
| `GET` | `/api/v2/live` | No | Liveness probe |
| | | | |
| **Auth** (base: `/api/auth`) | | | |
| `POST` | `/api/auth/sign-up/email` | No | Register with email + password |
| `POST` | `/api/auth/sign-in/email` | No | Login with email + password |
| `POST` | `/api/auth/sign-in/social` | No | Social sign-in (Google/Apple) |
| `GET` | `/api/auth/get-session` | Session | Get current session + user |
| `POST` | `/api/auth/sign-out` | Session | Sign out |
| `POST` | `/api/auth/update-user` | Session | Update user profile |
| | | | |
| **App** (base: `/api/v2`) | | | |
| `GET` | `/api/v2/exchange-rates` | No | Get exchange rates |
| `GET` | `/api/v2/exchange-rates/preview` | No | Conversion preview |
| `POST` | `/api/v2/wallet` | Session | Initiate wallet setup (returns Circle challenge) |
| `POST` | `/api/v2/wallet/confirm-setup` | Session | Confirm wallet after PIN challenge |
| `GET` | `/api/v2/wallet/address` | Session | Get wallet address |
| `GET` | `/api/v2/wallet/balance` | Session | Get wallet balance |
| `POST` | `/api/v2/wallet/sync-status` | Session | Sync wallet status with Circle |
| `POST` | `/api/v2/wallet/reconcile-balance` | Session | Force balance reconciliation (dev) |
| `POST` | `/api/v2/wallet/deposit` | Session | Initiate Coinbase onramp deposit |
| `POST` | `/api/v2/wallet/withdraw` | Session | Initiate Coinbase offramp withdrawal |
| `GET` | `/api/v2/wallet/onramp-quote` | Session | Preview onramp fees |
| `GET` | `/api/v2/wallet/offramp-quote` | Session | Preview offramp fees |
| `POST` | `/api/v2/wallet/transfer` | Session | P2P transfer (returns Circle challenge) |
| `POST` | `/api/v2/wallet/estimate-fee` | Session | Estimate transfer network fee |
| `GET` | `/api/v2/wallet/resolve-recipient` | Session | Resolve recipient by phone/address |
| `GET` | `/api/v2/wallet/circle-wallets` | Session | Fetch wallets from Circle (recovery) |
| `GET` | `/api/v2/wallet/transactions/:txId` | Session | Get single transaction |
| `GET` | `/api/v2/wallet/transactions` | Session | Transaction history |
| `POST` | `/api/v2/webhooks/coinbase-cdp` | Validate | Coinbase CDP callback |
| `POST` | `/api/v2/webhooks/circle` | RSA sig | Circle notifications |
