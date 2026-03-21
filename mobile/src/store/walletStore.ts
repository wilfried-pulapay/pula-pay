import { create } from "zustand";
import {
    createDeposit,
    createWithdraw,
    createTransfer,
    getMyBalance,
    getMyTransactions,
    getMyWallet,
    getExchangeRates,
    getTxStatus,
    syncWalletStatus,
    initiateWalletSetup,
    confirmWalletSetup,
} from "@/src/api/wallet";
import { setOnUnauthorized } from "@/src/api/client";
import { getApiError } from "@/src/utils/api-error";
import type { TxStatus, DisplayCurrency, ExchangeRateDTO } from "@/src/api/types";
import type { WalletState } from "./types";

const CURRENCY_DECIMALS: Record<string, number> = {
    EUR: 2,
    XOF: 0,
    USD: 2,
};

export const useWalletStore = create<WalletState>((set, get) => ({
    // Initial state
    wallet: null,
    walletNotFound: false,
    balanceUsdc: null,
    displayBalance: null,
    displayCurrency: "EUR",
    exchangeRates: null,
    ratesLoading: false,
    transactions: [],
    loading: false,
    error: null,

    // Fetch wallet info
    fetchWallet: async () => {
        set({ loading: true, error: null });
        try {
            const wallet = await getMyWallet();
            set({ wallet });
        } catch {
            set({ error: "Impossible de récupérer le portefeuille" });
        } finally {
            set({ loading: false });
        }
    },

    // Fetch balance with USDC conversion
    fetchBalance: async () => {
        set({ loading: true, error: null, walletNotFound: false });
        try {
            const data = await getMyBalance(get().displayCurrency);
            set({
                balanceUsdc: data.balanceUsdc,
                displayBalance: data.displayBalance,
                walletNotFound: false,
            });
        } catch (e) {
            const { code } = getApiError(e);
            if (code === "WALLET_NOT_FOUND") {
                set({ walletNotFound: true, error: null });
            } else {
                set({ error: "Impossible de récupérer le solde" });
            }
        } finally {
            set({ loading: false });
        }
    },

    // Fetch transactions
    fetchTransactions: async () => {
        set({ loading: true, error: null });
        try {
            const txs = await getMyTransactions();
            set({ transactions: txs });
        } catch {
            set({ error: "Impossible de charger l'historique" });
        } finally {
            set({ loading: false });
        }
    },

    // Fetch exchange rates
    fetchExchangeRates: async () => {
        set({ ratesLoading: true });
        try {
            const rates = await getExchangeRates();
            const ratesMap = rates.reduce((acc, rate) => {
                acc[rate.quoteCurrency] = rate;
                return acc;
            }, {} as Record<DisplayCurrency, ExchangeRateDTO>);
            set({ exchangeRates: ratesMap });
        } catch {
            set({ error: "Impossible de charger les taux de change" });
        } finally {
            set({ ratesLoading: false });
        }
    },

    // Deposit operation — returns full response including paymentUrl
    deposit: async (req, opts) => {
        set({ loading: true, error: null });
        try {
            const response = await createDeposit(req, opts);
            return response;
        } finally {
            set({ loading: false });
        }
    },

    // Withdraw operation — returns full response including paymentUrl
    withdraw: async (req, opts) => {
        set({ loading: true, error: null });
        try {
            const response = await createWithdraw(req, opts);
            return response;
        } finally {
            set({ loading: false });
        }
    },

    // Transfer operation — returns full challenge response (mobile resolves PIN via Circle SDK)
    transfer: async (req, opts) => {
        set({ loading: true, error: null });
        try {
            const response = await createTransfer(req, opts);
            return response;
        } finally {
            set({ loading: false });
        }
    },

    // Initiate wallet setup — returns Circle challenge for PIN setup
    initiateWalletSetup: async (blockchain) => {
        set({ loading: true, error: null });
        try {
            return await initiateWalletSetup(blockchain);
        } finally {
            set({ loading: false });
        }
    },

    // Confirm wallet setup — called after Circle SDK challenge is resolved
    confirmWalletSetup: async (userToken, blockchain) => {
        set({ loading: true, error: null });
        try {
            const result = await confirmWalletSetup(userToken, blockchain);
            // Refresh wallet state after confirmation
            await get().fetchBalance();
            return result;
        } finally {
            set({ loading: false });
        }
    },

    // Set display currency
    setDisplayCurrency: (currency: DisplayCurrency) => {
        set({ displayCurrency: currency });
        // Re-fetch balance with new currency
        get().fetchBalance();
    },

    // Convert USDC to display currency
    convertToDisplay: (amountUsdc: string): string => {
        const { exchangeRates, displayCurrency } = get();
        if (!exchangeRates || !exchangeRates[displayCurrency]) return "—";

        const rate = parseFloat(exchangeRates[displayCurrency].rate);
        const value = parseFloat(amountUsdc) * rate;
        const decimals = CURRENCY_DECIMALS[displayCurrency] ?? 2;

        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: displayCurrency,
            maximumFractionDigits: decimals,
        }).format(value);
    },

    // Convert display currency to USDC
    convertToUsdc: (displayAmount: string): string => {
        const { exchangeRates, displayCurrency } = get();
        if (!exchangeRates || !exchangeRates[displayCurrency]) return "0";

        const rate = parseFloat(exchangeRates[displayCurrency].rate);
        const value = parseFloat(displayAmount) / rate;
        return value.toFixed(6);
    },

    // Sync wallet status with Circle
    syncWalletStatus: async () => {
        try {
            const result = await syncWalletStatus();
            return {
                wasUpdated: result.wasUpdated,
                currentStatus: result.currentStatus
            };
        } catch (error) {
            throw error;
        }
    },

    // Track transaction status
    trackTransaction: async (txId: string) => {
        let status: TxStatus = "PENDING";

        while (status === "PENDING" || status === "PROCESSING") {
            await new Promise((r) => setTimeout(r, 2000));
            status = await getTxStatus(txId);
        }

        // Refresh data after transaction completes
        await Promise.all([
            get().fetchBalance(),
            get().fetchTransactions(),
        ]);
    },

    // Reset store
    reset: () => {
        set({
            wallet: null,
            walletNotFound: false,
            balanceUsdc: null,
            displayBalance: null,
            exchangeRates: null,
            transactions: [],
            loading: false,
            error: null,
        });
    },
}));

setOnUnauthorized(() => useWalletStore.getState().reset());
