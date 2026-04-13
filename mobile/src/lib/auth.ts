import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../constants/config";
import type { User } from "../store/types";

export const authClient = createAuthClient({
    baseURL: BASE_URL,
    plugins: [
        expoClient({
            scheme: "pulapay",
            storagePrefix: "pulapay",
            storage: SecureStore,
        }),
    ],
});

/**
 * Map Better Auth session user to app's User type.
 * Handles both plugin field names (phoneNumber) and DB column names (phone).
 */
export function mapSessionUser(sessionUser: Record<string, any> | null | undefined): User | null {
    if (!sessionUser) return null;
    return {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        phoneNumber: sessionUser.phoneNumber ?? sessionUser.phone ?? "",
        phoneNumberVerified: sessionUser.phoneNumberVerified ?? sessionUser.phoneVerified,
        displayCurrency: sessionUser.displayCurrency ?? "EUR",
        kycLevel: sessionUser.kycLevel,
        locale: sessionUser.locale,
    };
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Convenience hook wrapping useSession() with app User type mapping.
 */
export function useAuth() {
    const session = authClient.useSession();

    const status: AuthStatus = session.isPending
        ? "loading"
        : session.data?.user
            ? "authenticated"
            : "unauthenticated";

    const user: User | null = mapSessionUser(session.data?.user as Record<string, any> | null);

    return { session: session.data, user, status, isPending: session.isPending, error: session.error };
}

export async function logout(): Promise<void> {
    await authClient.signOut();
    // Lazy import to avoid circular dependency (walletStore → api/client → auth)
    const { useWalletStore } = await import("../store/walletStore");
    useWalletStore.getState().reset();
}

// Storage key used by expoClient (storagePrefix + "_cookie").
// Format: { [cookieName]: { value: string, expires: string | null } }
const COOKIE_STORE_KEY = "pulapay_cookie";

/**
 * Build a Cookie header string from SecureStore, replicating what expoClient does
 * internally for its own fetch calls. better-auth session validation reads cookies,
 * not Authorization: Bearer headers (the bearer plugin is for API keys only).
 */
export async function getSessionCookieHeader(): Promise<string | null> {
    try {
        const raw = await SecureStore.getItemAsync(COOKIE_STORE_KEY);
        const jar: Record<string, { value: string; expires: string | null }> = JSON.parse(raw ?? "{}");
        const now = new Date();
        const cookie = Object.entries(jar)
            .filter(([, v]) => v.value && (!v.expires || new Date(v.expires) > now))
            .map(([name, v]) => `${name}=${v.value}`)
            .join("; ");
        return cookie || null;
    } catch {
        return null;
    }
}

