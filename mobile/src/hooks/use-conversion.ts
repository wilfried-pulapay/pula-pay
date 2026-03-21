import { useCallback } from "react";
import { useExchangeRate } from "./use-exchange-rate";
import type { DisplayCurrency } from "../api/types";

const CURRENCY_FORMATS: Record<DisplayCurrency, { locale: string; decimals: number }> = {
    EUR: { locale: "fr-FR", decimals: 2 },
    XOF: { locale: "fr-FR", decimals: 0 },
    USD: { locale: "en-US", decimals: 2 },
};

function formatCurrency(value: number, currency: DisplayCurrency): string {
    const { locale, decimals } = CURRENCY_FORMATS[currency];
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: decimals,
    }).format(value);
}

export function useConversion(displayCurrency: DisplayCurrency) {
    const { rate, loading, error, refresh } = useExchangeRate(displayCurrency);

    const toDisplay = useCallback((amountUsdc: string): string => {
        if (!rate) return "—";
        const value = parseFloat(amountUsdc) * parseFloat(rate.rate);
        return formatCurrency(value, displayCurrency);
    }, [rate, displayCurrency]);

    const toDisplayRaw = useCallback((amountUsdc: string): number => {
        if (!rate) return 0;
        return parseFloat(amountUsdc) * parseFloat(rate.rate);
    }, [rate]);

    const toUsdc = useCallback((displayAmount: string): string => {
        if (!rate) return "0";
        const value = parseFloat(displayAmount) / parseFloat(rate.rate);
        return value.toFixed(6);
    }, [rate]);

    const formatDisplay = useCallback((value: number): string => {
        return formatCurrency(value, displayCurrency);
    }, [displayCurrency]);

    return {
        toDisplay,
        toDisplayRaw,
        toUsdc,
        formatDisplay,
        rate,
        loading,
        error,
        refresh
    };
}
