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

// Attach auth token automatically (same pattern as brand/services/subscriptionApi.js)
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
 * List every brand's subscription record (the global cross-brand view,
 * as opposed to a single brand's Subscription tab).
 * GET {{base_url}}/subscribeds/admin/get-all
 *
 * query params: page (1-based), limit (max 100), search (brand name / legal
 * name / merchantId), brandId, subscriptionId, status
 * (PENDING | ACTIVE | EXPIRED | UPGRADED | ...), source
 * (PAYMENT | ADMIN_PAYMENT | ADMIN_MANUAL), fromDate, toDate (ISO, filters
 * createdAt).
 *
 * response: { success, message, data: { total, totalPages, page, limit, data: [...] } }
 * ---------------------------------------------------------------------- */
export async function getAllSubscriptions({
    page = 1,
    limit = 10,
    search = '',
    brandId,
    subscriptionId,
    status,
    source,
    fromDate,
    toDate,
} = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        if (brandId) params.brandId = brandId;
        if (subscriptionId) params.subscriptionId = subscriptionId;
        if (status) params.status = status;
        if (source) params.source = source;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const { data } = await api.get('/subscribeds/admin/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getAllSubscriptions,
};
