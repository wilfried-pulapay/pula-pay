// ============================================
// AUTH ROUTES (Better Auth — base path: /api/auth)
// ============================================

/**
 * @swagger
 * /sign-up/email:
 *   post:
 *     summary: Register with email + password
 *     description: |
 *       Create a new account using email and password.
 *       Auto sign-in is enabled — a session token is returned immediately.
 *       Account linking: if the same email is later used with Google/Apple sign-in, accounts are auto-linked.
 *     tags: [Auth]
 *     servers:
 *       - url: http://localhost:3000/api/auth
 *         description: Auth endpoints (dev)
 *       - url: https://api.pulapay.com/api/auth
 *         description: Auth endpoints (prod)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailSignUpRequest'
 *     responses:
 *       200:
 *         description: Account created — session token returned
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie (`better-auth.session_token`)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: Invalid email or password too short
 *       422:
 *         description: User already exists
 */

/**
 * @swagger
 * /sign-in/email:
 *   post:
 *     summary: Sign in with email + password
 *     description: |
 *       Authenticate using email and password.
 *       Returns a session via `Set-Cookie` header and in the response body.
 *     tags: [Auth]
 *     servers:
 *       - url: http://localhost:3000/api/auth
 *         description: Auth endpoints (dev)
 *       - url: https://api.pulapay.com/api/auth
 *         description: Auth endpoints (prod)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailSignInRequest'
 *     responses:
 *       200:
 *         description: Signed in — session created
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie (`better-auth.session_token`)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       401:
 *         description: Invalid email or password
 */

/**
 * @swagger
 * /get-session:
 *   get:
 *     summary: Get current session
 *     description: Returns the current session and user profile. Requires a valid session cookie or Bearer token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     servers:
 *       - url: http://localhost:3000/api/auth
 *         description: Auth endpoints (dev)
 *       - url: https://api.pulapay.com/api/auth
 *         description: Auth endpoints (prod)
 *     responses:
 *       200:
 *         description: Session retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       401:
 *         description: No active session
 */

/**
 * @swagger
 * /sign-out:
 *   post:
 *     summary: Sign out
 *     description: Invalidate the current session and clear the session cookie.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     servers:
 *       - url: http://localhost:3000/api/auth
 *         description: Auth endpoints (dev)
 *       - url: https://api.pulapay.com/api/auth
 *         description: Auth endpoints (prod)
 *     responses:
 *       200:
 *         description: Signed out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */

/**
 * @swagger
 * /sign-in/social:
 *   post:
 *     summary: Social sign-in (Google / Apple)
 *     description: |
 *       Initiate a social sign-in flow. Returns a redirect URL for the OAuth provider.
 *       The mobile app should open this URL in a browser/WebView.
 *       Account linking is enabled — if the social email matches an existing account, it will be linked.
 *     tags: [Auth]
 *     servers:
 *       - url: http://localhost:3000/api/auth
 *         description: Auth endpoints (dev)
 *       - url: https://api.pulapay.com/api/auth
 *         description: Auth endpoints (prod)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SocialSignInRequest'
 *     responses:
 *       200:
 *         description: Redirect URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: OAuth provider redirect URL
 *                 redirect:
 *                   type: boolean
 *                   example: true
 */

/**
 * @swagger
 * /update-user:
 *   post:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile fields (name, email, custom fields like displayCurrency, locale).
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     servers:
 *       - url: http://localhost:3000/api/auth
 *         description: Auth endpoints (dev)
 *       - url: https://api.pulapay.com/api/auth
 *         description: Auth endpoints (prod)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BetterAuthUser'
 *       401:
 *         description: Unauthorized
 */

// ============================================
// HEALTH ROUTES
// ============================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns the overall health status of the API including database connectivity
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Service is unhealthy
 */

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check
 *     description: Kubernetes readiness probe - indicates if the service can accept traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         ready:
 *                           type: boolean
 */

/**
 * @swagger
 * /live:
 *   get:
 *     summary: Liveness check
 *     description: Kubernetes liveness probe - indicates if the process is alive
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         alive:
 *                           type: boolean
 */

/**
 * @swagger
 * /exchange-rates:
 *   get:
 *     summary: Get exchange rates
 *     description: Returns current USDC exchange rates for specified currencies
 *     tags: [Exchange Rates]
 *     parameters:
 *       - in: query
 *         name: currencies
 *         schema:
 *           type: string
 *         description: Comma-separated list of currencies (default EUR,XOF,USD)
 *         example: EUR,XOF
 *     responses:
 *       200:
 *         description: Exchange rates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ExchangeRatesResponse'
 */

/**
 * @swagger
 * /exchange-rates/preview:
 *   get:
 *     summary: Preview currency conversion
 *     description: Get a preview of currency conversion with fees
 *     tags: [Exchange Rates]
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Amount to convert
 *         example: 100
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: Source currency (USDC, EUR, XOF, USD)
 *         example: EUR
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: Target currency (USDC, EUR, XOF, USD)
 *         example: USDC
 *     responses:
 *       200:
 *         description: Conversion preview
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ConversionPreviewResponse'
 */

/**
 * @swagger
 * /wallet:
 *   post:
 *     summary: Initiate wallet setup (User-Controlled)
 *     description: |
 *       Initiates wallet creation for the authenticated user using Circle User-Controlled Wallets.
 *
 *       **Flow (2 steps):**
 *       1. Call `POST /wallet` → receives `challengeId`, `userToken`, `encryptionKey`, `appId`
 *       2. Mobile resolves the challenge via Circle Web SDK (user sets their PIN)
 *       3. Call `POST /wallet/confirm-setup` with the `userToken` to activate the wallet
 *
 *       If the user already has a wallet, returns a fresh `userToken` with an empty `challengeId`.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWalletRequest'
 *     responses:
 *       202:
 *         description: Wallet setup initiated — challenge data returned for mobile PIN setup
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/WalletSetupChallengeResponse'
 *       401:
 *         description: Unauthorized - missing or invalid token
 */

/**
 * @swagger
 * /wallet/confirm-setup:
 *   post:
 *     summary: Confirm wallet setup after PIN challenge
 *     description: |
 *       Called after the mobile app resolves the Circle PIN challenge (wallet setup).
 *       Fetches the user's wallet from Circle and creates the local wallet record.
 *
 *       **When to call:** After `CircleChallengeWebView` fires `onSuccess` with the `userToken`.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmWalletSetupRequest'
 *     responses:
 *       201:
 *         description: Wallet activated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ConfirmWalletSetupResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No wallet found on Circle for this user token
 */

/**
 * @swagger
 * /wallet/address:
 *   get:
 *     summary: Get wallet address
 *     description: Returns the wallet address and blockchain information for the authenticated user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet address retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/WalletAddressResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */

/**
 * @swagger
 * /wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Returns the current balance of the authenticated user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema:
 *           $ref: '#/components/schemas/Currency'
 *         description: Display currency for balance conversion
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BalanceResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */

/**
 * @swagger
 * /wallet/sync-status:
 *   post:
 *     summary: Sync wallet status
 *     description: Manually sync wallet status with Circle. Useful for activating wallets stuck in PENDING state.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet status synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         walletId:
 *                           type: string
 *                           description: Wallet ID
 *                         previousStatus:
 *                           type: string
 *                           description: Status before sync
 *                           example: PENDING
 *                         currentStatus:
 *                           type: string
 *                           description: Status after sync
 *                           example: ACTIVE
 *                         wasUpdated:
 *                           type: boolean
 *                           description: Whether the status was changed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Failed to sync with Circle
 */

/**
 * @swagger
 * /wallet/reconcile-balance:
 *   post:
 *     summary: Reconcile wallet balance with Circle
 *     description: |
 *       Fetches the live USDC balance from Circle and compares it against the DB value.
 *
 *       **Auto-correction rules:**
 *       - `Circle > DB` (missed credit): balance is corrected automatically → `corrected: true`
 *       - `Circle < DB` (potential overcredit bug): alert logged, no change → `alertOnly: true`
 *       - No drift (< 0.000001 USDC): no-op → `corrected: false, alertOnly: false`
 *
 *       The hourly background job runs the same logic for all wallets automatically.
 *       Use this endpoint to trigger an on-demand reconciliation for the authenticated user.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reconciliation result
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         walletId:
 *                           type: string
 *                           description: Local wallet ID
 *                         dbBalance:
 *                           type: string
 *                           description: Balance in DB before reconciliation (USDC)
 *                           example: "9.500000"
 *                         circleBalance:
 *                           type: string
 *                           description: Live balance from Circle (USDC)
 *                           example: "10.000000"
 *                         diff:
 *                           type: string
 *                           description: circleBalance − dbBalance (negative = DB > Circle)
 *                           example: "0.500000"
 *                         corrected:
 *                           type: boolean
 *                           description: true if DB was updated to match Circle
 *                         alertOnly:
 *                           type: boolean
 *                           description: true if DB > Circle — no auto-correct, manual investigation required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Failed to reach Circle API
 */

/**
 * @swagger
 * /wallet/deposit:
 *   post:
 *     summary: Initiate a deposit (onramp)
 *     description: Initiate a Coinbase deposit to convert fiat to USDC. Returns a paymentUrl that the mobile app should open in a WebView for the user to complete the purchase on Coinbase.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepositRequest'
 *     responses:
 *       202:
 *         description: Deposit initiated - open paymentUrl in WebView
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DepositResponse'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /wallet/withdraw:
 *   post:
 *     summary: Initiate a withdrawal (offramp)
 *     description: Initiate a Coinbase withdrawal to convert USDC to fiat. Returns a paymentUrl that the mobile app should open in a WebView for the user to complete the sale on Coinbase.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WithdrawRequest'
 *     responses:
 *       202:
 *         description: Withdrawal initiated - open paymentUrl in WebView
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/WithdrawResponse'
 *       400:
 *         description: Invalid request / Insufficient funds
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /wallet/onramp-quote:
 *   get:
 *     summary: Get onramp fee quote
 *     description: Preview the fees and USDC amount for a fiat-to-USDC deposit before committing
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Fiat amount to deposit
 *         example: 100
 *       - in: query
 *         name: currency
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Currency'
 *         description: Fiat currency (USD or EUR)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: US
 *         description: ISO 3166-1 country code
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CARD, ACH_BANK_ACCOUNT, APPLE_PAY]
 *           default: CARD
 *     responses:
 *       200:
 *         description: Onramp fee quote
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/OnrampQuoteResponse'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /wallet/offramp-quote:
 *   get:
 *     summary: Get offramp fee quote
 *     description: Preview the fees and fiat amount for a USDC-to-fiat withdrawal before committing
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sellAmount
 *         required: true
 *         schema:
 *           type: number
 *         description: USDC amount to sell
 *         example: 50
 *       - in: query
 *         name: cashoutCurrency
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/Currency'
 *         description: Fiat cashout currency (USD or EUR)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: US
 *         description: ISO 3166-1 country code
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [ACH_BANK_ACCOUNT, CARD]
 *           default: ACH_BANK_ACCOUNT
 *     responses:
 *       200:
 *         description: Offramp fee quote
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/OfframpQuoteResponse'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /wallet/transferable:
 *   post:
 *     summary: Initiate P2P transfer (User-Controlled)
 *     description: |
 *       Initiates a P2P USDC transfer using Circle User-Controlled Wallets.
 *
 *       **Flow (2 steps):**
 *       1. Call `POST /wallet/transferable` → receives challenge data (`challengeId`, `userToken`, `encryptionKey`, `appId`)
 *       2. Mobile resolves the challenge via Circle Web SDK (user enters their PIN)
 *       3. Circle executes the transfer on-chain — transaction moves to COMPLETED
 *
 *       The transaction is created locally in PENDING status and updated asynchronously once Circle confirms.
 *
 *       Idempotency: include `x-idempotency-key` header to prevent duplicate submissions.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-idempotency-key
 *         schema:
 *           type: string
 *         description: Idempotency key to prevent duplicate transfers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *           examples:
 *             phoneTransfer:
 *               summary: Transfer to phone number
 *               value:
 *                 recipientPhone: "+22990654321"
 *                 amount: 25.0
 *                 currency: "EUR"
 *                 description: "Payment for services"
 *             addressTransfer:
 *               summary: Transfer to wallet address
 *               value:
 *                 recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f..."
 *                 amount: 50.0
 *                 currency: "USD"
 *     responses:
 *       202:
 *         description: Transfer initiated — challenge data returned for mobile PIN confirmation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransferChallengeResponse'
 *       400:
 *         description: Invalid request / Insufficient funds
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recipient not found
 *       409:
 *         description: Wallet not ACTIVE — sync required
 */

/**
 * @swagger
 * /wallet/transactions/{txId}:
 *   get:
 *     summary: Get transaction by ID
 *     description: Returns a single transaction by its ID, if it belongs to the authenticated user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: txId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction UUID
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionDetail'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */

/**
 * @swagger
 * /wallet/resolve-recipient:
 *   get:
 *     summary: Resolve recipient
 *     description: Resolve a recipient by phone number or wallet address before initiating a transfer
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Recipient's phone number
 *         example: "+22990654321"
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Recipient's wallet address
 *     responses:
 *       200:
 *         description: Recipient resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 address:
 *                   type: string
 *                 phone:
 *                   type: string
 *       400:
 *         description: Either phone or address must be provided
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recipient not found
 */

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: Returns the transaction history for the authenticated user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/TxType'
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/TxStatus'
 *         description: Filter by transaction status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter transactions from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter transactions until this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Transaction history
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionHistoryResponse'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /webhooks/coinbase-cdp:
 *   post:
 *     summary: Coinbase CDP webhook handler
 *     description: Receives webhook notifications from Coinbase CDP for onramp/offramp transaction events
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_type:
 *                 type: string
 *                 enum: [onramp.transaction.success, onramp.transaction.failed, offramp.transaction.success, offramp.transaction.failed]
 *               transaction_id:
 *                 type: string
 *               partner_user_id:
 *                 type: string
 *               status:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       401:
 *         description: Invalid webhook payload
 */

/**
 * @swagger
 * /webhooks/circle:
 *   post:
 *     summary: Circle webhook handler
 *     description: Receives webhook notifications from Circle
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriptionId:
 *                 type: string
 *               notificationId:
 *                 type: string
 *               notificationType:
 *                 type: string
 *               notification:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */
