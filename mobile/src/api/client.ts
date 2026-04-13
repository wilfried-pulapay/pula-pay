import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_URL } from "../constants/config";
import { authClient, getSessionCookieHeader } from "../lib/auth";
import { logger } from "../utils/logger";

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) { onUnauthorized = cb; }

// Extend config to track request timing and retry state
interface TimedAxiosRequestConfig extends InternalAxiosRequestConfig {
    metadata?: { startTime: number };
}

const client = axios.create({
    baseURL: API_URL,
});

client.interceptors.request.use(async (config: TimedAxiosRequestConfig) => {
    const cookie = await getSessionCookieHeader();
    if (cookie) config.headers['Cookie'] = cookie;

    // Track request start time
    config.metadata = { startTime: Date.now() };

    // Log outgoing request
    const method = config.method?.toUpperCase() ?? 'GET';
    const url = config.url ?? '';
    logger.debug('API', `→ ${method} ${url}`);

    return config;
});

client.interceptors.response.use(
    (response) => {
        const config = response.config as TimedAxiosRequestConfig;
        const method = config.method?.toUpperCase() ?? 'GET';
        const url = config.url ?? '';
        const status = response.status;
        const duration = config.metadata?.startTime
            ? Date.now() - config.metadata.startTime
            : 0;

        logger.info('API', `← ${method} ${url} ${status} (${duration}ms)`);
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as TimedAxiosRequestConfig | undefined;
        const method = originalRequest?.method?.toUpperCase() ?? 'GET';
        const url = originalRequest?.url ?? '';
        const status = error.response?.status ?? 0;
        const duration = originalRequest?.metadata?.startTime
            ? Date.now() - originalRequest.metadata.startTime
            : 0;

        // Extract error code from response if available
        const errorData = error.response?.data as { error?: { code?: string } } | undefined;
        const errorCode = errorData?.error?.code;

        logger.error('API', `✗ ${method} ${url} ${status} (${duration}ms)`, {
            code: errorCode,
            message: error.message,
        });

        // Handle 401 — session expired, force logout
        if (status === 401) {
            await authClient.signOut();
            onUnauthorized?.();
        }

        // Handle 429 — rate limited
        if (status === 429) {
            logger.error('API', 'Rate limited — too many requests');
        }

        return Promise.reject(error);
    }
);

export default client;
