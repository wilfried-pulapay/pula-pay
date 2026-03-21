import { useCallback, useState } from "react";
import { getUserBalance } from "../api/users";

export function useBalance() {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getBalance = useCallback( async (userId: string, currency: string) => {
        setError(null);
        setLoading(true);
        try {
            const data = await getUserBalance(userId, currency);
            setBalance(Number(data.balanceUsdc ?? 0));
        } catch (e: any) {
            setError(e?.response?.data?.error || e.message || "Failed to create deposit");
        } finally {
            setLoading(false);
        }
    }, []);

    return { balance, loading, error, getBalance };
}