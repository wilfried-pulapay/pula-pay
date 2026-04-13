export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const API_URL = `${BASE_URL}/api/v2`;
export const AUTH_URL = `${BASE_URL}/api/auth`;

export const IS_DEV = __DEV__;
