import client from "./client";
import { authClient } from "../lib/auth";
import {
    BalanceDTO,
    WalletDTO,
    ExchangeRateDTO,
    DisplayCurrency,
    DepositRequest,
    DepositResponse,
    WithdrawRequest,
    WithdrawResponse,
    TransferRequest,
    TransferResponse,
    TxDTO,
    TxStatus,
    PaymentMethod,
    OnrampQuoteResult,
    OfframpQuoteResult,
    WalletSetupChallenge,
    WalletSetupConfirm,
} from "./types";

type Idempotency = { idempotencyKey?: string };

function cfgIdempotency(idempotencyKey?: string) {
    return idempotencyKey
        ? { headers: { "x-idempotency-key": idempotencyKey } }
        : undefined;
}

// === WALLET ===

export async function getMyWallet(): Promise<WalletDTO> {
    const addr = await getWalletAddress();
    return {
        id: addr.walletId,
        userId: "",
        address: addr.address,
        blockchain: addr.blockchain as any,
        status: addr.status as any,
        createdAt: "",
    };
}

export async function getWalletAddress(): Promise<{ walletId: string; address: string; blockchain: string; status: string }> {
    const { data } = await client.get("/wallet/address");
    return data.data;
}

export type SyncWalletStatusResponse = {
    walletId: string;
    previousStatus: string;
    currentStatus: string;
    wasUpdated: boolean;
};

export async function syncWalletStatus(): Promise<SyncWalletStatusResponse> {
    const { data } = await client.post("/wallet/sync-status");
    return data.data;
}

/**
 * Initiates wallet setup for user-controlled wallets.
 * Returns challengeId + userToken + encryptionKey + appId for Circle SDK.
 */
export async function initiateWalletSetup(blockchain: string = "BASE_SEPOLIA"): Promise<WalletSetupChallenge> {
    const { data } = await client.post("/wallet", { blockchain });
    return data.data;
}

/**
 * Called after the Circle SDK challenge (PIN setup) is resolved on mobile.
 * Persists the wallet locally on the backend.
 */
export async function confirmWalletSetup(
    userToken: string,
    blockchain: string = "BASE_SEPOLIA"
): Promise<WalletSetupConfirm> {
    const { data } = await client.post("/wallet/confirm-setup", { userToken, blockchain });
    return data.data;
}

// === BALANCE ===

export async function getMyBalance(currency: DisplayCurrency = "EUR"): Promise<BalanceDTO> {
    const { data } = await client.get("/wallet/balance", {
        params: { currency }
    });
    return data.data;
}

// === EXCHANGE RATES ===

export async function getExchangeRates(): Promise<ExchangeRateDTO[]> {
    const { data } = await client.get("/exchange-rates");
    return data.data.rates;
}

export async function getExchangeRate(currency: DisplayCurrency): Promise<ExchangeRateDTO> {
    const { data } = await client.get(`/exchange-rates`, {params: { currencies: currency }});
    return data.data.rates[0];
}

// === DEPOSITS (Coinbase CDP) ===

export async function createDeposit(
    req: DepositRequest,
    opts?: Idempotency
): Promise<DepositResponse> {
    const backendPayload = {
        amount: req.amount,
        currency: req.currency,
        country: req.country ?? "US",
        paymentMethod: req.paymentMethod ?? "CARD",
    };
    const { data } = await client.post("/wallet/deposit", backendPayload, cfgIdempotency(opts?.idempotencyKey));
    return data.data;
}

// === WITHDRAWALS (Coinbase CDP) ===

export async function createWithdraw(
    req: WithdrawRequest,
    opts?: Idempotency
): Promise<WithdrawResponse> {
    const backendPayload = {
        amount: req.amount,
        targetCurrency: req.targetCurrency,
        country: req.country ?? "US",
        paymentMethod: req.paymentMethod ?? "ACH_BANK_ACCOUNT",
    };
    const { data } = await client.post("/wallet/withdraw", backendPayload, cfgIdempotency(opts?.idempotencyKey));
    return data.data;
}

// === QUOTES ===

export async function getOnrampQuote(params: {
    amount: number;
    currency: DisplayCurrency;
    country?: string;
    paymentMethod?: PaymentMethod;
}): Promise<OnrampQuoteResult> {
    const { data } = await client.get("/wallet/onramp-quote", {
        params: {
            amount: params.amount,
            currency: params.currency,
            country: params.country ?? "US",
            paymentMethod: params.paymentMethod ?? "CARD",
        }
    });
    return data.data;
}

export async function getOfframpQuote(params: {
    sellAmount: number;
    cashoutCurrency: DisplayCurrency;
    country?: string;
    paymentMethod?: PaymentMethod;
}): Promise<OfframpQuoteResult> {
    const { data } = await client.get("/wallet/offramp-quote", {
        params: {
            sellAmount: params.sellAmount,
            cashoutCurrency: params.cashoutCurrency,
            country: params.country ?? "US",
            paymentMethod: params.paymentMethod ?? "ACH_BANK_ACCOUNT",
        }
    });
    return data.data;
}

// === TRANSFERS ===

export async function createTransfer(
    req: TransferRequest,
    opts?: Idempotency
): Promise<TransferResponse> {
    const backendPayload = {
        recipientPhone: req.recipientPhone,
        recipientAddress: req.recipientAddress,
        amount: req.amount,
        currency: req.currency,
        description: req.description,
    };
    const { data } = await client.post("/wallet/transfer", backendPayload, cfgIdempotency(opts?.idempotencyKey));
    return data.data;
}

// === TRANSACTIONS ===

export async function getTxStatus(txId: string): Promise<TxStatus> {
    const { data } = await client.get(`/wallet/transactions/${txId}`);
    return data.data.status;
}

export async function getTransaction(txId: string): Promise<TxDTO> {
    const { data } = await client.get(`/wallet/transactions/${txId}`);
    return data.data;
}

export async function getMyTransactions(): Promise<TxDTO[]> {
    const { data } = await client.get("/wallet/transactions");
    return data.data.items;
}

// === RECIPIENT RESOLUTION ===

export async function resolveRecipient(query: {
    phone?: string;
    address?: string;
}): Promise<{ userId: string; address: string; phone?: string }> {
    const { data } = await client.get("/wallet/resolve-recipient", {
        params: query
    });
    return data.data;
}

export async function resolveRecipientId(phone: string): Promise<string> {
    const { data } = await client.get("/wallet/resolve-recipient", {
        params: { phone }
    });
    return data.data.userId;
}

// === CIRCLE WALLETS (recovery) ===

export type CircleWalletDetails = {
    id: string;
    address: string;
    blockchain: string;
    state: 'LIVE' | 'PENDING' | 'FROZEN';
    userId?: string;
    refId?: string;
};

export async function getCircleWallets(): Promise<CircleWalletDetails> {
    const { data } = await client.get("/wallet/circle-wallets");
    return data.data;
}

// === RECONCILIATION ===

export type ReconcileBalanceResponse = {
    walletId: string;
    dbBalance: string;
    circleBalance: string;
    diff: string;
    corrected: boolean;
    alertOnly: boolean;
};

export async function reconcileBalance(): Promise<ReconcileBalanceResponse> {
    const { data } = await client.post("/wallet/reconcile-balance");
    return data.data;
}

// === USER PREFERENCES ===

export async function updateDisplayCurrency(currency: DisplayCurrency): Promise<void> {
    await authClient.updateUser({ displayCurrency: currency } as any);
}
