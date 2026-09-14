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

// Attach auth token automatically (same pattern as planApi.js)
api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../../features/auth/store/authStore');
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
 * Grant / re-grant a subscription to a brand (admin action).
 * POST {{base_url}}/subscribeds/admin/grant
 *
 * One endpoint covers all four "grant" flows from the Postman collection —
 * only the payload shape changes:
 *
 *  - Free / complimentary  : { brandId, subscriptionId, paymentMode: "FREE", note }
 *  - Offline payment       : { brandId, subscriptionId, paymentMode, collectedAmount,
 *                              referenceNumber, note }
 *  - Downgrade (grandfather): { brandId, subscriptionId, paymentMode: "FREE", note }
 *  - Change tier, keep end : { brandId, subscriptionId, paymentMode: "FREE",
 *                              keepCurrentEndDate: true, note }
 * ---------------------------------------------------------------------- */
export async function grantSubscription(payload) {
    try {
        const { data } = await api.post('/subscribeds/admin/grant', payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * Cancel a brand's active subscription (admin action).
 * PUT {{base_url}}/subscribeds/admin/cancel
 * body: { brandId, reason }
 * ---------------------------------------------------------------------- */
export async function cancelSubscription(payload) {
    try {
        const { data } = await api.put('/subscribeds/admin/cancel', payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    grantSubscription,
    cancelSubscription,
};
