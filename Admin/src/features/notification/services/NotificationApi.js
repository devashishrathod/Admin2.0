import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';

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

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

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

/* -------------------------------------------------------------------------
 * Admin's own in-app notification feed (header bell).
 * GET {{base_url}}/notifications/get-all?page=&limit=&isRead=&type=
 * ⚠️ No `brandId` on purpose — for an admin, omitting it returns the
 * admin-audience feed (WEBHOOK_FAILED, PAYMENT_DISPUTED,
 * BRAND_SUBSCRIPTION_LAPSED, PROMO_LIMIT_EXCEEDED, SUBSCRIPTION_CREDIT_REUSED…).
 * response.data: { total, unreadCount, page, limit, data: [...] }
 * (super_admin_panel_api_doc #20)
 * ---------------------------------------------------------------------- */
export async function getAdminNotifications({ page = 1, limit = 20, isRead, type } = {}) {
    try {
        const params = { page, limit };
        if (isRead !== undefined) params.isRead = isRead;
        if (type) params.type = type;
        const { data } = await api.get('/notifications/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * Mark notifications read.
 * PUT {{base_url}}/notifications/mark-read
 * body: { notificationIds: [...] }  or  { markAll: true }
 * response.data: { modified, unreadCount } — fresh count for the badge.
 * (super_admin_panel_api_doc #21)
 * ---------------------------------------------------------------------- */
export async function markNotificationsRead({ notificationIds, markAll = false } = {}) {
    try {
        const body = markAll ? { markAll: true } : { notificationIds };
        const { data } = await api.put('/notifications/mark-read', body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    sendTestPush,
    broadcastNotification,
    getAdminNotifications,
    markNotificationsRead,
};
