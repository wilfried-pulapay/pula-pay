import type { BalanceDTO } from "./types";
import client from "./client";

export async function getUserBalance(userId: string, currency: string): Promise<BalanceDTO> {
    const { data } = await client.get(`/wallet/balance`, {
        params: { currency },
    });
    return data;
}
