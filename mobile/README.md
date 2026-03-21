# Pula Pay — Mobile App

Cross-platform fintech mobile app for USDC wallet management, mobile money on/off-ramp, and P2P transfers across Africa.

## Tech Stack

| Category       | Technology                                     |
|----------------|------------------------------------------------|
| Framework      | React Native 0.81 + Expo 54                    |
| Language       | TypeScript 5.9 (strict mode)                   |
| Routing        | Expo Router 6 (file-based, typed routes)        |
| State          | Zustand 5.0                                    |
| HTTP           | Axios 1.13                                     |
| i18n           | i18next 25 + react-i18next (EN, FR)            |
| Icons          | Lucide React Native 0.556                      |
| Phone Input    | react-native-international-phone-number 0.11   |
| QR Code        | react-native-qrcode-svg 6.3                    |
| Animations     | React Native Reanimated 4.1                    |
| Secure Storage | expo-secure-store 15 (Keychain / Keystore)     |
| Clipboard      | expo-clipboard 8                               |
| Gradients      | expo-linear-gradient 15                        |
| Build          | EAS Build (dev, preview, production profiles)  |
| React          | 19.1 (with React Compiler experiment)          |

## Project Structure

```
mobile/
├── src/
│   ├── app/                    # Expo Router screens (file-based routing)
│   │   ├── _layout.tsx         # Root layout (loading guard, toast container)
│   │   ├── index.tsx           # Entry redirect
│   │   ├── (auth)/             # Auth stack
│   │   │   ├── _layout.tsx     # Stack navigator + auth guard
│   │   │   ├── login.tsx       # Email + password login
│   │   │   └── register.tsx    # Email + password + confirm → Circle PIN wallet setup
│   │   └── (main)/            # Main app (tab navigator)
│   │       ├── _layout.tsx     # Bottom tabs (4 tabs) + auth guard
│   │       ├── dashboard.tsx   # Home: balance, quick actions, recent txs
│   │       ├── history.tsx     # Full transaction history
│   │       ├── profile.tsx     # User profile, logout
│   │       └── wallet/         # Nested stack
│   │           ├── _layout.tsx # Stack navigator
│   │           ├── index.tsx   # Wallet overview
│   │           ├── deposit.tsx # Coinbase CDP deposit
│   │           ├── withdraw.tsx# Coinbase CDP withdrawal
│   │           ├── transfert.tsx# P2P transfer
│   │           └── receive.tsx # QR code + address
│   ├── lib/                    # Core library modules
│   │   └── auth.ts             # Better Auth client, useAuth(), getToken(), logout()
│   ├── api/                    # HTTP layer
│   │   ├── client.ts           # Axios instance + interceptors (Bearer token, logging, 401)
│   │   ├── wallet.ts           # Wallet, balance, transaction endpoints
│   │   ├── transactions.ts     # Transaction queries
│   │   ├── users.ts            # User preference updates
│   │   └── types.ts            # All DTOs, enums, request/response types
│   ├── store/                  # Zustand state management
│   │   ├── walletStore.ts      # Wallet, balance, rates, transactions, operations
│   │   ├── toastStore.ts       # Toast notifications
│   │   ├── uiStore.ts          # Theme mode, language preference
│   │   └── types.ts            # Store type definitions
│   ├── components/             # React components
│   │   ├── ui/                 # Primitives
│   │   │   ├── button.tsx      # Primary/secondary/outline variants
│   │   │   ├── Input.tsx       # Text input with label + error
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── phone-input.tsx # International phone with country picker
│   │   │   ├── toast.tsx       # Single toast component
│   │   │   └── toast-container.tsx # Toast stack manager
│   │   ├── wallet-summary.tsx  # Gradient card: balance, actions, wallet creation
│   │   ├── balance-display.tsx # USDC + fiat balance (small/medium/large)
│   │   ├── quick-actions.tsx   # 6-card grid (deposit, receive, transfer, withdraw, ...)
│   │   ├── recent-transactions.tsx # Last 3 txs + "see all"
│   │   ├── transaction-item.tsx# Single tx row (icon, type, amount, status badge)
│   │   ├── transactions.tsx    # Full tx list with pull-to-refresh
│   │   ├── exchange-rate.tsx   # "1 USDC = X EUR" indicator + refresh
│   │   ├── qr-code.tsx        # QR from address + share button
│   │   ├── wallet-address.tsx  # Address display + copy + explorer link
│   │   ├── brand-header.tsx    # App header
│   │   ├── screen.tsx          # SafeArea + KeyboardAvoiding wrapper
│   │   ├── auth-form-layout.tsx# Shared auth form container (login + register)
│   │   ├── circle-challenge-webview.tsx # Circle SDK in WebView modal (PIN / wallet setup)
│   │   └── error-boundary.tsx  # Catch render errors with retry
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-balance.ts      # Fetch balance
│   │   ├── use-conversion.ts   # USDC ↔ fiat conversion utilities
│   │   ├── use-exchange-rate.ts# Rate fetching with 5-min auto-refresh
│   │   ├── use-deposit.ts      # Deposit flow + status polling
│   │   ├── use-withdraw.ts     # Withdrawal flow + status polling
│   │   ├── use-transfert.ts    # Transfer flow + status polling
│   │   ├── use-transactions.ts # Transaction list fetching
│   │   ├── use-recipient-id.ts # Recipient lookup by phone
│   │   ├── use-phone-form.ts   # E.164 phone formatting for forms
│   │   ├── use-wallet-address.ts# Address + copy + blockchain info
│   │   ├── use-theme.ts        # Current theme object
│   │   ├── use-styles.ts       # Memoized StyleSheet from theme
│   │   └── use-color-scheme.ts # System light/dark detection
│   ├── theme/                  # Theming
│   │   ├── index.ts            # Theme resolver (system/light/dark)
│   │   ├── types.ts            # Theme, ColorPalette, Spacing types
│   │   ├── light.ts            # Light palette (purple primary, white surface)
│   │   └── dark.ts             # Dark palette (light purple, navy background)
│   ├── i18n/                   # Translations
│   │   ├── index.ts            # i18next config (fallback: fr)
│   │   ├── en.json             # English translations
│   │   └── fr.json             # French translations
│   ├── utils/                  # Utilities
│   │   ├── api-error.ts        # Error code extraction + i18n key mapping
│   │   ├── phone.ts            # Phone/country code sanitization
│   │   ├── storage.ts          # Secure token storage abstraction
│   │   ├── transactions.ts     # Tx icons, formatting, sorting, filtering
│   │   └── logger.ts           # Structured logging (category + level)
│   └── constants/
│       ├── config.ts           # API_URL, IS_DEV flag
│       └── theme.ts            # Typography constants
├── assets/images/              # Icons, splash, adaptive icons
├── app.json                    # Expo config
├── eas.json                    # EAS Build profiles
├── tsconfig.json               # TypeScript (strict, @/* path alias)
└── package.json
```

## Navigation

### Route Map

```
/ (Root Layout — auth bootstrap + toast container)
├── /(auth)/ (Stack)
│   ├── login          Email + password
│   └── register       Email + password + confirm → Circle PIN wallet setup
│
└── /(main)/ (Bottom Tabs — protected, redirects if unauthenticated)
    ├── dashboard      Balance card, quick actions, recent transactions
    ├── wallet/ (Nested Stack)
    │   ├── index      Wallet overview
    │   ├── deposit    Method selection → amount → MoMo collection
    │   ├── withdraw   Amount → MoMo disbursement
    │   ├── transfert  Recipient phone → amount → P2P transfer
    │   └── receive    QR code + address + copy + share
    ├── history        Full transaction list
    └── profile        Preferences, display currency, logout
```

**Tab bar icons:** Home, Wallet, Clock, User (Lucide)

### Auth Guard

- Auth state comes from `useAuth()` (wraps Better Auth's `useSession()` via `expoClient`)
- `(main)/_layout.tsx` redirects to `/(auth)/login` if `status !== "authenticated"`
- `(auth)/_layout.tsx` redirects to `/(main)/dashboard` if `status === "authenticated"`
- Both layouts show a loading spinner while `status === "loading"` (initial session fetch)

## State Management

### Auth (Better Auth)

Auth state is managed by **Better Auth** (`src/lib/auth.ts`) — no Zustand auth store.

```typescript
// Hook — use in components
useAuth() → { user: User | null, session, status: "loading" | "authenticated" | "unauthenticated", isPending, error }

// Functions — use outside components
getToken()   // Read session token from SecureStore synchronously (for axios Bearer injection)
logout()     // authClient.signOut() + walletStore.reset()
```

**Session lifecycle:**
- Sign-in/register via `authClient.signIn.email()` or `authClient.signUp.email()`
- `expoClient` plugin stores the session token in `expo-secure-store` (native) / `localStorage` (web) automatically
- `useSession()` refetches `/api/auth/get-session` with `Authorization: Bearer <token>`
- On 401, axios interceptor calls `logout()` and fires `onUnauthorized` callback

**Storage key:** `pulapay_cookie` — JSON format `{ "better-auth.session_token": { value, expires } }`

### Wallet Store

```typescript
State: {
  wallet: WalletDTO | null
  walletNotFound: boolean
  balanceUsdc: string | null
  displayBalance: string | null
  displayCurrency: "EUR" | "XOF"
  exchangeRates: Record<DisplayCurrency, ExchangeRateDTO> | null
  ratesLoading: boolean
  transactions: TxDTO[]
  loading: boolean
  error: string | null
}

Methods:
  fetchWallet()                           // GET /wallet/me
  fetchBalance(currency?)                 // GET /wallet/balance?currency=
  fetchTransactions()                     // GET /wallet/transactions
  fetchExchangeRates()                    // GET /exchange-rates
  deposit(req, opts?)                     // POST /wallet/deposit (idempotent)
  withdraw(req, opts?)                    // POST /wallet/withdraw (idempotent)
  transfer(req, opts?)                    // POST /wallet/transferable → TransferResponse (challenge)
  initiateWalletSetup(blockchain?)        // POST /wallet → WalletSetupChallenge
  confirmWalletSetup(userToken, chain?)   // POST /wallet/confirm-setup → WalletSetupConfirm
  syncWalletStatus()                      // POST /wallet/sync-status
  trackTransaction(txId)                  // Poll every 2s until terminal state
  convertToDisplay(amountUsdc)            // USDC × rate, formatted with Intl
  convertToUsdc(displayAmount)            // displayAmount / rate, 6 decimals
  setDisplayCurrency(currency)            // Update + re-fetch balance
  reset()                                 // Clear all data on logout
```

**Currency decimals:** EUR: 2, XOF: 0. Formatting uses `Intl.NumberFormat`.

### Toast Store

```typescript
State: { toasts: ToastItem[] }

ToastItem: { id, type, message, duration }
Types: "success" | "error" | "info" | "warning"
Default duration: 4000ms

API:
  toast.success(message, duration?)
  toast.error(message, duration?)
  toast.info(message, duration?)
  toast.warning(message, duration?)
```

### UI Store

```typescript
State: {
  theme: "system" | "light" | "dark"
  language: "fr" | "en"
}

Methods:
  setTheme(mode)
  setLanguage(lang)
```

## API Layer

### Client Configuration

Axios instance (`src/api/client.ts`) with:
- **Request interceptor:** Reads session token via `getToken()`, injects `Authorization: Bearer <token>`, logs `→ METHOD URL`
- **Response interceptor:** Logs `← STATUS (duration)ms`
- **401 handler:** Calls `logout()` and fires the `onUnauthorized` callback (set by the root layout to navigate to login)

Auth calls (sign-in, sign-up, get-session) go through `authClient` (Better Auth) which uses its own fetch instance via `expoClient`.

### Endpoints

#### Auth — Better Auth (managed by `authClient`)

```
POST /api/auth/sign-in/email  { email, password }     → session token (stored by expoClient)
POST /api/auth/sign-up/email  { email, password, name } → session token (stored by expoClient)
GET  /api/auth/get-session    Authorization: Bearer   → { session, user }
POST /api/auth/sign-out                               → clears session
```

#### Wallet — Protected

```
POST   /wallet                { blockchain? }         → WalletSetupChallenge { challengeId, userToken, encryptionKey, appId }
POST   /wallet/confirm-setup  { userToken, blockchain? } → WalletSetupConfirm { walletId, address, blockchain, status }
GET    /wallet/me                                     → WalletDTO
GET    /wallet/address                                → { walletId, address, blockchain, status }
POST   /wallet/sync-status                            → { walletId, previousStatus, currentStatus, wasUpdated }
GET    /wallet/balance        ?currency=EUR           → BalanceDTO
GET    /exchange-rates        ?currencies=EUR,XOF     → ExchangeRateDTO[]
POST   /wallet/deposit        + x-idempotency-key     → DepositResponse
POST   /wallet/withdraw       + x-idempotency-key     → WithdrawResponse
POST   /wallet/transferable   + x-idempotency-key     → TransferResponse { transactionId, challengeId, userToken, encryptionKey, appId, ... }
GET    /wallet/transactions                           → TxDTO[]
GET    /wallet/transactions/:txId                     → TxDTO
GET    /wallet/resolve-recipient ?phone=              → userId
```

#### Users — Protected

```
PATCH  /users/me/preferences  { displayCurrency }     → void
```

### Data Types

```typescript
// Enums
DisplayCurrency = "EUR" | "XOF"
Blockchain      = "BASE_SEPOLIA" | "BASE"
WalletStatus    = "PENDING" | "ACTIVE" | "FROZEN"
TxStatus        = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED"
TxType          = "DEPOSIT_ONRAMP" | "DEPOSIT_CRYPTO" | "WITHDRAWAL_OFFRAMP" | "WITHDRAWAL_CRYPTO"
                | "TRANSFER_P2P" | "REFUND" | "FEE"
TxDirection     = "IN" | "OUT"
OnRampProvider  = "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER" | "CRYPTO"

// Key DTOs
UserDTO    = { id, phone, name?, firstName?, email?, isVerified?, displayCurrency, kycLevel? }
WalletDTO  = { id, userId, address, blockchain, status, createdAt }
BalanceDTO = { balanceUsdc, displayBalance, displayCurrency, exchangeRate, rateTimestamp }

TxDTO = {
  id, idempotencyKey, externalRef?, type, status, direction,
  amountUsdc, feeUsdc, displayAmount, displayCurrency, exchangeRate,
  walletId, counterpartyId?, counterpartyAddress?, description?, txHash?,
  createdAt, completedAt?
}

// Wallet setup
WalletSetupChallenge = { challengeId, userToken, encryptionKey, appId }
WalletSetupConfirm   = { walletId, address, blockchain, status }

// Requests
DepositRequest  = { amount, currency, provider, msisdn? }
WithdrawRequest = { amount, currency, provider, msisdn? }
TransferRequest = { receiverId?, receiverPhone?, receiverAddress?, amount, currency, description? }

// Transfer challenge response
TransferResponse = {
  transactionId, challengeId, userToken, encryptionKey, appId,
  amountUsdc, displayAmount, displayCurrency, recipientAddress, status
}
```

## Hooks

| Hook                          | Returns                                                             | Notes                                 |
|-------------------------------|---------------------------------------------------------------------|---------------------------------------|
| `useBalance()`                | `{ balance, loading, error, getBalance() }`                        | Fetches wallet balance                |
| `useConversion(currency)`     | `{ toDisplay(), toUsdc(), rate, loading, refresh() }`              | USDC ↔ fiat conversion utilities      |
| `useExchangeRate(currency)`   | `{ rate, loading, convert(), convertToUsdc(), refresh() }`         | Auto-refreshes every 5 minutes        |
| `useDeposit()`                | `{ txId, status, loading, error, startDeposit() }`                | Polls status every 1.5s after submit  |
| `useWithdraw()`               | `{ txId, status, loading, error, startWithdraw() }`               | Polls status every 1.5s after submit  |
| `useTransfert()`              | `{ txId, status, loading, error, startTransfer() }`               | Polls status every 1.5s after submit  |
| `useTransactions()`           | `{ transactions, loading, error, getTransactions() }`             | Fetch full tx list                    |
| `useRecipientId()`            | `{ recipientId, errorKey, errorCode, getPhoneUserId() }`          | Lookup recipient by phone             |
| `useWalletAddress()`          | `{ address, truncatedAddress, blockchain, copyToClipboard(), copied }` | Address + copy with 2s feedback  |
| `usePhoneForm()`              | `{ phone, setPhone, countryCode, setCountryCode, formatPhone() }`  | E.164 phone formatting for forms      |
| `useTheme()`                  | `Theme`                                                             | Current theme (system/override)       |
| `useStyles(fn)`               | `StyleSheet`                                                        | Memoized styles from theme            |

## Screens

### Login

**Fields:** Email, password
**Validation:** Both required
**Flow:** `authClient.signIn.email()` → `expoClient` stores session token → `useAuth()` becomes `authenticated` → auth layout guard redirects to dashboard

### Register

**Fields:** Name, email, password, confirm password
**Validation:** All required, passwords must match
**Flow:**
1. `authClient.signUp.email()` → session auto-set
2. `POST /wallet` → returns `WalletSetupChallenge` (`challengeId`, `userToken`, `encryptionKey`, `appId`)
3. `CircleChallengeWebView` opens — user sets their PIN via Circle Web SDK
4. On PIN success: `POST /wallet/confirm-setup` → wallet activated
5. Auth layout guard redirects to dashboard

### Dashboard

**Sections:**
1. Greeting with user name + formatted date
2. `WalletSummary` — gradient card with balance (eye toggle), USDC equivalent, 4 action buttons, refresh
3. `QuickActions` — 6-card grid (deposit, receive, transfer, withdraw, recharge\*, bills\*) \*disabled
4. `RecentTransactions` — last 3 txs, "see all" link, empty state
5. Promo card

### Deposit

**Step 1 — Method selection:**
- Coinbase CDP Onramp (card / bank)
- Receive Crypto (redirects to /receive)

**Step 2 — Amount entry (MTN_MOMO):**
- Phone pre-filled from user profile
- Amount input
- Exchange rate indicator with refresh

**Step 3 — Success:**
- Method, amount, USDC equivalent, phone, transaction ID
- "View transactions" button

**Flow:** Sync wallet status → validate ACTIVE → `POST /wallet/deposit` → poll status → success

### Withdraw

**Display:** Available balance (fiat + USDC in parentheses)
**Fields:** Amount, method (fixed: MTN_MOMO), phone (pre-filled, disabled)
**Validation:** Balance >= estimated USDC amount
**Flow:** Sync wallet → `POST /wallet/withdraw` → poll → success

### Transfer

**Fields:** Recipient phone (international input), amount, optional note
**Recipient lookup:** Debounced 400ms → `GET /wallet/resolve-recipient?phone=` → "User found" or error
**Validation:** Recipient found, sufficient balance
**Flow:**
1. Sync wallet status → validate ACTIVE
2. `POST /wallet/transferable` → returns `TransferResponse` (challenge data)
3. `CircleChallengeWebView` opens — user confirms transfer via PIN
4. On PIN success: display transaction confirmation (amount, recipient, tx ID)
5. "View transactions" link

### Receive

**Display:**
- QR code generated from wallet address (200x200)
- Full address with copy button (2s feedback)
- Blockchain network name
- Testnet warning banner (if applicable)
- "Only USDC on correct network" warning
- Share button (system share sheet)

### History

Full transaction list with pull-to-refresh. Each item shows icon, type label, reference, date, signed amount, status badge with color.

### Profile

User info, display currency preference selector, logout button.

## Theme System

### Structure

```typescript
Theme = {
  mode: "light" | "dark"
  colors: ColorPalette
  spacing: { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 }
  borderRadius: { s: 4, m: 8, l: 12, full: 9999 }
  typography: { h1, h2, body, caption }
}
```

### Palettes

| Token        | Light     | Dark      |
|--------------|-----------|-----------|
| Primary      | `#7c3aed` | `#a78bfa` |
| Primary Dark | `#6d28d9` | `#7c3aed` |
| On Primary   | `#FFFFFF` | `#FFFFFF` |
| Background   | `#F8FAFC` | `#0F172A` |
| Surface      | `#FFFFFF` | `#1E293B` |
| Text         | `#1E293B` | `#F8FAFC` |
| Success      | `#22c55e` | `#4ade80` |
| Danger       | `#ef4444` | `#f87171` |
| Warning      | `#f59e0b` | `#fbbf24` |

### Typography

```
h1:      fontSize 28, fontWeight 700, lineHeight 36
h2:      fontSize 20, fontWeight 600, lineHeight 28
body:    fontSize 14, fontWeight 400, lineHeight 20
caption: fontSize 12, fontWeight 400, lineHeight 16
```

Automatic light/dark from device settings, manual override via `uiStore.setTheme()`.

## Internationalization

**Config:** Default language from device locale, fallback to French (`fr`).

**Supported languages:** English (`en`), French (`fr`)

**Key namespaces:**

| Namespace          | Content                                       |
|--------------------|-----------------------------------------------|
| `login.*`          | Auth screen labels and buttons                |
| `register.*`       | Registration, OTP labels                      |
| `wallet.*`         | Balance labels, action buttons, wallet prompts|
| `deposit.*`        | Deposit screen labels                         |
| `withdraw.*`       | Withdrawal screen labels                      |
| `transfer.*`       | Transfer screen labels                        |
| `receive.*`        | Receive screen labels                         |
| `transactions.*`   | History, type labels, status labels           |
| `quickActions.*`   | Dashboard action cards (title, subtitle)      |
| `currencies.*`     | Currency display names                        |
| `apiErrors.*`      | Error code → user-friendly messages           |
| `validation.*`     | Form validation messages                      |
| `common.*`         | Shared labels (cancel, confirm, loading)      |

## Error Handling

### API Error Flow

```
Axios error → getApiError(error)
  → { code: ApiErrorCode, translationKey: string, message: string | null }
  → t(translationKey) for user-facing message
  → toast.error() or inline error display
```

### Error Codes

| Code                 | Translation Key                 |
|----------------------|---------------------------------|
| VALIDATION_ERROR     | apiErrors.VALIDATION_ERROR      |
| USER_EXISTS          | apiErrors.USER_EXISTS           |
| PHONE_EXISTS         | apiErrors.PHONE_EXISTS          |
| INVALID_CREDENTIALS  | apiErrors.INVALID_CREDENTIALS   |
| OTP_EXPIRED          | apiErrors.OTP_EXPIRED           |
| WALLET_NOT_FOUND     | apiErrors.WALLET_NOT_FOUND      |
| WALLET_PENDING       | apiErrors.WALLET_PENDING        |
| WALLET_FROZEN        | apiErrors.WALLET_FROZEN         |
| INSUFFICIENT_FUNDS   | apiErrors.INSUFFICIENT_FUNDS    |
| NETWORK_ERROR        | apiErrors.NETWORK_ERROR         |
| INTERNAL_ERROR       | apiErrors.INTERNAL_ERROR        |
| UNKNOWN_ERROR        | apiErrors.UNKNOWN_ERROR         |

### Error Boundary

Class component wrapping the app. Catches render errors, displays error message with stack trace and retry button.

## Utilities

### Logger

```typescript
Categories: "API" | "AUTH" | "WALLET" | "UI" | "APP"
Levels: "debug" | "info" | "warn" | "error"
Format: [HH:MM:SS] LEVEL [CATEGORY] message data
```

Dev: all levels. Prod: warn + error only. Optional `setRemoteHandler()` for crash reporting.

### Transaction Utils

```typescript
getTxIcon(type)                         // TxType → Lucide icon component
getStatusColors(status, theme)          // → { bg, text } colors
formatAmount(amount, currency, locale)  // Intl.NumberFormat
formatTxDate(dateStr, locale, year?)    // Locale-aware date
sortByDateDesc(transactions)            // Sort newest first
filterTransactions(transactions, query) // Search filter
isCredit(direction)                     // "IN" → true
```

### Phone Utils

Phone numbers **must** be in [E.164 format](https://en.wikipedia.org/wiki/E.164) (`+<country code><subscriber number>`, e.g. `+22961234567`). The `usePhoneForm` hook produces E.164 strings by concatenating the country IDD root (which includes `+`) with the sanitized local number.

```typescript
sanitizePhoneNumber(phone)   // Remove whitespace
```

### Storage

Session storage is handled transparently by the `expoClient` Better Auth plugin:
- **Native:** `expo-secure-store` (iOS Keychain / Android Keystore), key `pulapay_cookie`
- **Web:** `localStorage`, key `pulapay_cookie`

`getToken()` in `src/lib/auth.ts` reads this key synchronously to inject the Bearer token into axios requests.

## Build & Deploy

### EAS Build Profiles

| Profile          | Purpose           | Distribution | Format |
|------------------|-------------------|-------------|--------|
| `development`    | Dev client builds | internal    | —      |
| `preview`        | Internal testing  | internal    | APK    |
| `production`     | App store release | —           | AAB    |
| `production-apk` | Direct APK        | —           | APK    |

Auto-increment version enabled for production profiles.

### App Configuration

```
Name:               PulaPay
Scheme:             pulapay
Bundle ID (iOS):    com.freshnelhouenou.pulapay
Package (Android):  com.freshnelhouenou.pulapay
Orientation:        portrait
New Architecture:   enabled
React Compiler:     enabled (experiment)
Typed Routes:       enabled (experiment)
```

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Platform-specific
npm run android
npm run ios
npm run web

# Lint
npm run lint
```

### API Configuration

Edit `src/constants/config.ts`:
```typescript
export const API_URL = "http://<your-local-ip>:3000/api/v2";
```

Use your local network IP for device testing (not `localhost`).

## Key Patterns

- **Circle Challenge Flow** — Wallet setup and transfers are two-step operations: backend initiates and returns a `challengeId`, mobile resolves via `CircleChallengeWebView` (Circle Web SDK in a Modal WebView). Results communicated via `postMessage`.
- **User-Controlled wallets** — Users hold their own private keys via PIN. The Circle Web SDK (`@circle-fin/w3s-pw-web-sdk`) is loaded from CDN in a WebView since no official React Native SDK exists.
- **Idempotency** — All transaction requests include `x-idempotency-key` header to prevent duplicates on retry
- **Better Auth session** — Session managed by `expoClient` plugin; token stored in SecureStore and sent as `Authorization: Bearer` on every API request
- **Wallet sync before operations** — Every deposit/withdraw/transfer syncs wallet status with Circle first
- **Transaction polling** — After submitting an operation, polls status every 1.5–2s until terminal state
- **Debounced recipient lookup** — 400ms delay before querying recipient by phone number
- **Dual currency display** — All amounts shown in both USDC and user's preferred fiat currency
- **Secure storage** — Session token encrypted at rest on native platforms (iOS Keychain / Android Keystore) via `expo-secure-store`
