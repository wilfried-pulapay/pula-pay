import {
    TxDTO,
    DepositRequest,
    DepositResponse,
    WithdrawRequest,
    WithdrawResponse,
    TransferRequest,
    TransferResponse,
    DisplayCurrency,
    ExchangeRateDTO,
    WalletDTO,
    WalletSetupChallenge,
    WalletSetupConfirm,
} from "@/src/api/types";

// Wallet types ---------------------------------------------------
export type IdempotencyOpts = { idempotencyKey?: string };

export type WalletState = {
    // Wallet info
    wallet: WalletDTO | null;
    walletNotFound: boolean;

    // Balance
    balanceUsdc: string | null;
    displayBalance: string | null;
    displayCurrency: DisplayCurrency;

    // Exchange rates
    exchangeRates: Record<DisplayCurrency, ExchangeRateDTO> | null;
    ratesLoading: boolean;

    // Transactions
    transactions: TxDTO[];

    // Loading states
    loading: boolean;
    error: string | null;

    // Actions - Fetch
    fetchWallet: () => Promise<void>;
    fetchBalance: () => Promise<void>;
    fetchTransactions: () => Promise<void>;
    fetchExchangeRates: () => Promise<void>;

    // Actions - Operations (return full response for paymentUrl access)
    deposit: (req: DepositRequest, opts?: IdempotencyOpts) => Promise<DepositResponse>;
    withdraw: (req: WithdrawRequest, opts?: IdempotencyOpts) => Promise<WithdrawResponse>;
    transfer: (req: TransferRequest, opts?: IdempotencyOpts) => Promise<TransferResponse>;

    // Actions - Wallet setup (user-controlled)
    initiateWalletSetup: (blockchain?: string) => Promise<WalletSetupChallenge>;
    confirmWalletSetup: (userToken: string, blockchain?: string) => Promise<WalletSetupConfirm>;

    // Actions - Helpers
    setDisplayCurrency: (currency: DisplayCurrency) => void;
    convertToDisplay: (amountUsdc: string) => string;
    convertToUsdc: (displayAmount: string) => string;
    syncWalletStatus: () => Promise<{ wasUpdated: boolean; currentStatus: string }>;

    // Actions - Track
    trackTransaction: (txId: string) => Promise<void>;
    reset: () => void;
};

// Auth types ---------------------------------------------------
// Core auth state (token, user, session) is managed by Better Auth via useAuth().
export type User = {
    id: string;
    phoneNumber: string;
    name?: string;
    email?: string;
    phoneNumberVerified?: boolean;
    displayCurrency: DisplayCurrency;
    kycLevel?: string;
    locale?: string;
};

// UI types ---------------------------------------------------
export type ThemeMode = "system" | "light" | "dark";
export type Language = "fr" | "en";

export type UIState = {
    theme: ThemeMode;
    language: Language;
    setTheme: (mode: ThemeMode) => void;
    setLanguage: (lang: Language) => void;
};
