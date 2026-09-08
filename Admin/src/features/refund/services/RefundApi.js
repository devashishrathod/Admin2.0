import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as TransactionApi.js / VoucherApi.js)
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
 * Refunds — the "Refunds" page's real data source: each row is a refund
 * request raised against a redeemed voucher claim.
 * ---------------------------------------------------------------------- */

// ── Get Refund Worklist ────────────────────────────────────────────
// GET {{base_url}}/refunds?open=&page=&limit=&outletId=
export async function getRefundWorklist({ open, page = 1, limit = 20, outletId } = {}) {
    try {
        const params = { page, limit };
        if (open !== undefined) params.open = open;
        if (outletId) params.outletId = outletId;
        const { data } = await api.get('/refunds', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get One Refund — full timeline (refund + claim + brand + outlet) ─────
// GET {{base_url}}/refunds/:refundRequestId
export async function getRefundById(refundRequestId) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const { data } = await api.get(`/refunds/${refundRequestId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Approve a Refund ──────────────────────────────────────────────
// PATCH {{base_url}}/refunds/:refundRequestId/approve  body: { approvedAmount, note? }
export async function approveRefund(refundRequestId, { approvedAmount, note } = {}) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const body = { approvedAmount };
        if (note) body.note = note;
        const { data } = await api.patch(`/refunds/${refundRequestId}/approve`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Reject a Refund ───────────────────────────────────────────────
// PATCH {{base_url}}/refunds/:refundRequestId/reject  body: { note? }
export async function rejectRefund(refundRequestId, { note } = {}) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const body = {};
        if (note) body.note = note;
        const { data } = await api.patch(`/refunds/${refundRequestId}/reject`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getRefundWorklist,
    getRefundById,
    approveRefund,
    rejectRefund,
};
