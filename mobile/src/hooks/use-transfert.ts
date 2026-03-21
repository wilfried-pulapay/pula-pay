import { useCallback, useEffect, useRef, useState } from "react";
import { createTransfer, getTxStatus } from "../api/wallet";
import type { TransferRequest, TxStatus } from "../api/types";

type ApiError = { response?: { data?: { error?: string } }; message?: string };

export function useTransfer() {
    const [txId, setTxId] = useState<string | null>(null);
    const [status, setStatus] = useState<TxStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startTransfer = useCallback(async (payload: TransferRequest) => {
        setError(null);
        setLoading(true);
        setStatus("PENDING");
        try {
            const { transactionId } = await createTransfer(payload);
            setTxId(transactionId);
        } catch (e: unknown) {
            const err = e as ApiError;
            setError(err?.response?.data?.error || err.message || "Failed to create transfer");
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!txId) return;
        const tick = async () => {
            try {
                const txStatus = await getTxStatus(txId);
                setStatus(txStatus);
                if (txStatus === "PENDING") {
                    timer.current = setTimeout(tick, 1500);
                }
            } catch (e: unknown) {
                const err = e as ApiError;
                setError(err?.response?.data?.error || err.message || "Status error");
            }
        };
        tick();
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [txId]);

    return { txId, status, loading, error, startTransfer };
}