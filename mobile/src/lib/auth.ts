import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
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

// Storage key used by expoClient (storagePrefix + "_cookie") and syncSessionFromToken.
// Format: { "better-auth.session_token": { value: string, expires: null } }
const COOKIE_STORE_KEY = "pulapay_cookie";
const SESSION_TOKEN_KEY = "better-auth.session_token";

/**
 * Read the current session token from storage synchronously.
 * Used by the axios client to attach Authorization: Bearer headers.
 */
export function getToken(): string | null {
    try {
        const raw = Platform.OS === "web"
            ? (typeof window !== "undefined" ? window.localStorage.getItem(COOKIE_STORE_KEY) : null)
            : SecureStore.getItem(COOKIE_STORE_KEY);
        return JSON.parse(raw ?? "{}")?.[SESSION_TOKEN_KEY]?.value ?? null;
    } catch {
        return null;
    }
}

