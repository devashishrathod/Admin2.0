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

/* Every page of getAllSubscriptions (limit is capped at 100 per call) —
 * returns the flat array of rows. Used to split real vs dummy (isDummy)
 * subscriptions client-side, since the endpoint has no isDummy filter. */
export async function getAllSubscriptionPages(params = {}) {
    const limit = 100;
    const first = await getAllSubscriptions({ ...params, page: 1, limit });
    const rows = [...(first?.data?.data ?? [])];
    const totalPages = first?.data?.totalPages ?? 1;
    if (totalPages > 1) {
        const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) => getAllSubscriptions({ ...params, page: i + 2, limit }))
        );
        rest.forEach((r) => rows.push(...(r?.data?.data ?? [])));
    }
    return rows;
}

/* -------------------------------------------------------------------------
 * (Re-)issue the invoice for a subscription's payment transaction.
 * POST {{base_url}}/transactions/invoice/regenerate
 *
 * body: { transactionId }
 * Amounts are never recomputed — the PDF is rebuilt from the pricing frozen
 * on the transaction. Admin is exempt from the ownership check.
 *
 * response (live — differs from the API doc's `data.invoice` shape):
 *   { success, message, data: { transactionId, invoiceId, invoiceUrl (null),
 *     invoiceDownloadUrl (/documents/:token), previousUrl, snapshotBackfilled,
 *     snapshot: { kind, title, documentNumber, issuedAt, seller, billTo,
 *                 details[], timeline[], pricing } } }
 * errors: 404 transaction / brand not found · 422 no completed payment ·
 *   422 no stored pricing breakdown (old transaction)
 * ---------------------------------------------------------------------- */
export async function regenerateInvoice(transactionId) {
    try {
        const { data } = await api.post('/transactions/invoice/regenerate', { transactionId });
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getAllSubscriptions,
    getAllSubscriptionPages,
    regenerateInvoice,
};
