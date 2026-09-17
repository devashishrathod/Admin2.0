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

// Attach auth token automatically (same pattern as subscriptionApi.js)
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
 * Send a test push to the logged-in admin's own registered devices.
 * POST {{base_url}}/deviceTokens/test
 * body: { title, body }
 * ---------------------------------------------------------------------- */
export async function sendTestPush({ title, body }) {
    try {
        const { data } = await api.post('/deviceTokens/test', { title, body });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * Broadcast — one endpoint covers dry-run / role-targeted send /
 * user-targeted send, the payload shape just changes:
 * POST {{base_url}}/notifications/broadcast
 *
 *  - Dry run (resolve audience, send nothing):
 *      { title, body, target: { roles }, severity, dryRun: true }
 *  - Send to role(s):
 *      { title, body, target: { roles }, severity, deepLink, push, dryRun: false }
 *  - Send to specific users:
 *      { title, body, target: { userIds }, severity, deepLink }
 * ---------------------------------------------------------------------- */
export async function broadcastNotification(payload) {
    try {
        const { data } = await api.post('/notifications/broadcast', payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    sendTestPush,
    broadcastNotification,
};
