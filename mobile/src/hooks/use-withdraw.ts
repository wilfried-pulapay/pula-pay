import { useCallback, useEffect, useRef, useState } from "react";
import { createWithdraw, getTxStatus } from "../api/wallet";
import type { WithdrawRequest, WithdrawResponse, TxStatus } from "../api/types";

type ApiError = { response?: { data?: { error?: { message?: string } | string } }; message?: string };

export function useWithdraw() {
    const [txId, setTxId] = useState<string | null>(null);
    const [status, setStatus] = useState<TxStatus | null>(null);
    const [withdrawResponse, setWithdrawResponse] = useState<WithdrawResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startWithdraw = useCallback(async (payload: WithdrawRequest): Promise<WithdrawResponse> => {
        setError(null);
        setLoading(true);
        setStatus("PENDING");
        try {
            const response = await createWithdraw(payload);
            setTxId(response.transactionId);
            setWithdrawResponse(response);
            return response;
        } catch (e: unknown) {
            const err = e as ApiError;
            const errMsg = typeof err?.response?.data?.error === 'string'
                ? err.response.data.error
                : err?.response?.data?.error?.message ?? err.message ?? "Failed to create withdrawal";
            setError(errMsg);
            setStatus(null);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll transaction status
    useEffect(() => {
        if (!txId) return;
        const tick = async () => {
            try {
                const txStatus = await getTxStatus(txId);
                setStatus(txStatus);
                if (txStatus === "PENDING" || txStatus === "PROCESSING") {
                    timer.current = setTimeout(tick, 2000);
                }
            } catch (e: unknown) {
                const err = e as ApiError;
                const errMsg = typeof err?.response?.data?.error === 'string'
                    ? err.response.data.error
                    : err?.response?.data?.error?.message ?? err.message ?? "Status error";
                setError(errMsg);
            }
        };
        tick();
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [txId]);

    return { txId, status, loading, error, withdrawResponse, startWithdraw };
}
