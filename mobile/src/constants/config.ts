//const BASE_URL = "https://backend-production-ec17.up.railway.app";
const IP = "192.168.1.76";
//const IP = "192.168.1.27";
export const BASE_URL = `http://${IP}:3000`;
//const BASE_URL = "http://localhost:3000";

export const API_URL = `${BASE_URL}/api/v2`;
export const AUTH_URL = `${BASE_URL}/api/auth`;

export const IS_DEV = __DEV__;
