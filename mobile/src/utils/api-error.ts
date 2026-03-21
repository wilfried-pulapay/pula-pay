import type { AxiosError } from "axios";

// Error response structure from backend
export type ApiErrorResponse = {
    error: {
        code: string;
        message: string;
    };
};

// Known error codes from backend
export type ApiErrorCode =
    | "VALIDATION_ERROR"
    | "USER_EXISTS"
    | "PHONE_EXISTS"
    | "EMAIL_EXISTS"
    | "ALREADY_VERIFIED"
    | "SELF_TRANSFER"
    | "UNAUTHORIZED"
    | "INVALID_CREDENTIALS"
    | "VERIFICATION_FAILED"
    | "OTP_EXPIRED"
    | "INVALID_OTP"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "USER_NOT_FOUND"
    | "WALLET_NOT_FOUND"
    | "WALLET_FROZEN"
    | "WALLET_PENDING"
    | "CONFLICT"
    | "INSUFFICIENT_FUNDS"
    | "RATE_LIMITED"
    | "INVALID_STATE_TRANSITION"
    | "LEDGER_IMBALANCE"
    | "PHONE_ALREADY_REGISTERED"
    | "REGISTRATION_FAILED"
    | "INTERNAL_ERROR"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";

// Extract error code from axios error
export function getApiErrorCode(error: unknown): ApiErrorCode {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Network error (no response)
    if (!axiosError.response) {
        return "NETWORK_ERROR";
    }

    // Rate limited
    if (axiosError.response.status === 429) {
        return "RATE_LIMITED";
    }

    // Extract error code from response
    const code = axiosError.response.data?.error?.code;
    if (code && isKnownErrorCode(code)) {
        return code;
    }

    // Handle wallet status errors (403 with specific message pattern)
    const message = axiosError.response.data?.error?.message;
    if (axiosError.response.status === 403 && message) {
        if (message.includes("PENDING")) {
            return "WALLET_PENDING";
        }
        if (message.includes("FROZEN")) {
            return "WALLET_FROZEN";
        }
    }

    return "UNKNOWN_ERROR";
}

// Type guard for known error codes
function isKnownErrorCode(code: string): code is ApiErrorCode {
    const knownCodes: ApiErrorCode[] = [
        "VALIDATION_ERROR",
        "USER_EXISTS",
        "PHONE_EXISTS",
        "EMAIL_EXISTS",
        "ALREADY_VERIFIED",
        "SELF_TRANSFER",
        "UNAUTHORIZED",
        "INVALID_CREDENTIALS",
        "VERIFICATION_FAILED",
        "OTP_EXPIRED",
        "INVALID_OTP",
        "FORBIDDEN",
        "NOT_FOUND",
        "USER_NOT_FOUND",
        "WALLET_NOT_FOUND",
        "WALLET_FROZEN",
        "WALLET_PENDING",
        "CONFLICT",
        "INSUFFICIENT_FUNDS",
        "RATE_LIMITED",
        "INVALID_STATE_TRANSITION",
        "LEDGER_IMBALANCE",
        "PHONE_ALREADY_REGISTERED",
        "REGISTRATION_FAILED",
        "INTERNAL_ERROR",
    ];
    return knownCodes.includes(code as ApiErrorCode);
}

// Get translation key for error code
export function getErrorTranslationKey(code: ApiErrorCode): string {
    return `apiErrors.${code}`;
}

// Extract the detailed message from backend (for 400 errors especially)
export function getApiErrorMessage(error: unknown): string | null {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.data?.error?.message ?? null;
}

// Convenience function to get translated error message
// For VALIDATION_ERROR (400), returns the backend message if available for more precision
export function getApiError(error: unknown): {
    code: ApiErrorCode;
    translationKey: string;
    message: string | null;
} {
    const code = getApiErrorCode(error);
    const message = getApiErrorMessage(error);
    return {
        code,
        translationKey: getErrorTranslationKey(code),
        message,
    };
}
