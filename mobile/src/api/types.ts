// === CURRENCIES ===
export type Currency = "EUR" | "XOF" | "USD";
export type DisplayCurrency = "EUR" | "XOF" | "USD";

// === USER ===
export type UserDTO = {
    id: string;
    phoneNumber: string;
    name?: string;
    email?: string;
    phoneNumberVerified?: boolean;
    displayCurrency: DisplayCurrency;
    kycLevel?: "NONE" | "BASIC" | "VERIFIED" | "ENHANCED";
    locale?: string;
    createdAt?: string;
    updatedAt?: string;
};

// === WALLET ===
export type WalletDTO = {
    id: string;
    userId: string;
    address: string;
    blockchain: Blockchain;
    status: WalletStatus;
    createdAt: string;
};

export type Blockchain =
    | "BASE_SEPOLIA"    // Testnet (primary)
    | "BASE"            // Mainnet (primary)
    | "POLYGON_AMOY"    // Legacy testnet
    | "ETH_SEPOLIA"     // Legacy testnet
    | "ARBITRUM_SEPOLIA" // Legacy testnet
    | "POLYGON"         // Legacy mainnet
    | "ARBITRUM"        // Legacy mainnet
    | "ETHEREUM";       // Legacy mainnet

export type WalletStatus = "PENDING" | "ACTIVE" | "FROZEN" | "CLOSED";

// === BALANCE ===
export type BalanceDTO = {
    walletId?: string;
    address?: string;
    balanceUsdc: string;
    displayBalance: string;
    displayCurrency: DisplayCurrency;
    exchangeRate: string;
    rateTimestamp?: string;
    status?: string;
};

// === EXCHANGE RATE ===
export type ExchangeRateDTO = {
    baseCurrency: "USDC";
    quoteCurrency: DisplayCurrency;
    rate: string;
    timestamp: string;
    source: string;
};

// === TRANSACTIONS ===
export type TxStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED";

export type TxType =
    | "DEPOSIT_ONRAMP"      // Coinbase CDP → USDC
    | "DEPOSIT_CRYPTO"      // Crypto external → Wallet
    | "WITHDRAWAL_OFFRAMP"  // USDC → Coinbase CDP
    | "WITHDRAWAL_CRYPTO"   // Wallet → External address
    | "TRANSFER_P2P"        // Wallet → Wallet internal
    | "REFUND"
    | "FEE";

export type TxDirection = 'IN' | 'OUT';

export type TxDTO = {
    id: string;
    idempotencyKey: string;
    externalRef?: string;
    type: TxType;
    status: TxStatus;
    direction: TxDirection;

    // Amounts
    amountUsdc: string;
    feeUsdc: string;
    displayAmount: string;
    displayCurrency: DisplayCurrency;
    exchangeRate: string;

    // Parties
    walletId: string;
    counterpartyId?: string;
    counterpartyAddress?: string;

    // Metadata
    description?: string;
    counterpartyName?: string | null;
    txHash?: string;

    createdAt: string;
    completedAt?: string;
};

// === PAYMENT METHODS (Coinbase CDP) ===
export type PaymentMethod = "CARD" | "ACH_BANK_ACCOUNT" | "APPLE_PAY";

// === ON-RAMP PROVIDERS ===
export type OnRampProvider = "COINBASE_CDP";

// === CIRCLE CHALLENGE (user-controlled wallets) ===

/**
 * Returned by POST /wallet — initiates wallet PIN setup.
 * Mobile passes these to the Circle SDK WebView to complete setup.
 */
export type WalletSetupChallenge = {
    challengeId: string;
    userToken: string;
    encryptionKey: string;
    appId: string;
};

/**
 * Returned by POST /wallet/confirm-setup — after PIN is set.
 */
export type WalletSetupConfirm = {
    walletId: string;
    address: string;
    blockchain: Blockchain;
    status: WalletStatus;
};

/**
 * Returned by POST /wallet/transfer — initiates transfer PIN confirmation.
 */
export type TransferChallenge = {
    transactionId: string;
    challengeId: string;
    userToken: string;
    encryptionKey: string;
    appId: string;
    amountUsdc: string;
    displayAmount: string;
    displayCurrency: DisplayCurrency;
    recipientAddress: string;
    status: string;
};

// === REQUESTS ===
export type DepositRequest = {
    amount: number;
    currency: DisplayCurrency;
    country?: string;
    paymentMethod?: PaymentMethod;
};

export type WithdrawRequest = {
    amount: number;
    targetCurrency: DisplayCurrency;
    country?: string;
    paymentMethod?: PaymentMethod;
};

export type TransferRequest = {
    recipientPhone?: string;
    recipientAddress?: string;
    amount: number;
    currency: DisplayCurrency;
    description?: string;
};

// === RESPONSES ===
export type DepositResponse = {
    transactionId: string;
    providerRef: string;
    status: string;
    amountUsdc: string;
    displayAmount: string;
    displayCurrency: DisplayCurrency;
    paymentUrl?: string;
    fees?: {
        coinbaseFee?: string;
        networkFee?: string;
        paymentTotal?: string;
    };
};

export type WithdrawResponse = {
    transactionId: string;
    providerRef: string;
    status: string;
    amountUsdc: string;
    feeUsdc: string;
    displayAmount: string;
    displayCurrency: DisplayCurrency;
    paymentUrl?: string;
    fees?: {
        coinbaseFee?: string;
        cashoutTotal?: string;
    };
};

export type TransferResponse = TransferChallenge;

// === QUOTES ===
export type OnrampQuoteResult = {
    quoteId?: string;
    purchaseAmount: string;
    paymentSubtotal: string;
    coinbaseFee: string;
    networkFee: string;
    paymentTotal: string;
};

export type OfframpQuoteResult = {
    quoteId?: string;
    sellAmount: string;
    cashoutSubtotal: string;
    cashoutTotal: string;
    coinbaseFee: string;
};
