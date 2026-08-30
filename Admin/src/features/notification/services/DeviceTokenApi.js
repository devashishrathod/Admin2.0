import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach auth token automatically (same pattern as NotificationApi.js)
api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../auth/store/authStore');
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Normalize error responses so callers get a consistent shape
function handleError(error) {
    const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Something went wrong. Please try again.';
    throw new Error(message);
}

/* -------------------------------------------------------------------------
 * Register this device/browser for push notifications.
 * POST {{base_url}}/deviceTokens/register
 * body: { token, platform, deviceId, deviceName, appVersion }
 * `token` is the FCM registration token (see config/firebaseMessaging.js).
 * ---------------------------------------------------------------------- */
export async function registerDeviceToken({ token, platform, deviceId, deviceName, appVersion }) {
    try {
        if (!token) throw new Error('token is required');
        const { data } = await api.post('/deviceTokens/register', {
            token,
            platform,
            deviceId,
            deviceName,
            appVersion,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * Unregister a device — either this one token, or every device on the
 * account when `allDevices` is true.
 * PUT {{base_url}}/deviceTokens/unregister
 * body: { token, allDevices }
 * ---------------------------------------------------------------------- */
export async function unregisterDeviceToken({ token, allDevices = false } = {}) {
    try {
        const { data } = await api.put('/deviceTokens/unregister', { token, allDevices });
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    registerDeviceToken,
    unregisterDeviceToken,
};
