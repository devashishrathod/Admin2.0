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

/* -------------------------------------------------------------------------
 * Admin refund workflow — confirmed from Postman:
 * PATCH /refunds/admin/:id/approve | /reject | /pay | /request-bank-details
 * Distinct from the read-only /refunds and /refunds/:id above, same
 * pattern as the settlements admin workflow (/settlements/admin/:id/...).
 * ---------------------------------------------------------------------- */

// ── Approve a Refund ──────────────────────────────────────────────
// PATCH {{base_url}}/refunds/admin/:refundRequestId/approve  body: { note? }
// Matches the confirmed Postman request exactly — no approvedAmount field;
// the endpoint decides the amount itself (echoed back as "amount" in the
// response).
export async function approveRefund(refundRequestId, { note } = {}) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const body = {};
        if (note) body.note = note;
        const { data } = await api.patch(`/refunds/admin/${refundRequestId}/approve`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Reject a Refund ───────────────────────────────────────────────
// PATCH {{base_url}}/refunds/admin/:refundRequestId/reject  body: { note? }
export async function rejectRefund(refundRequestId, { note } = {}) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const body = {};
        if (note) body.note = note;
        const { data } = await api.patch(`/refunds/admin/${refundRequestId}/reject`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Pay a Refund ──────────────────────────────────────────────────
// PATCH {{base_url}}/refunds/admin/:refundRequestId/pay  (no body)
// Triggers the actual Razorpay/gateway refund for an already-approved
// request. Can fail with 422 (e.g. "Razorpay could not process this
// refund: Refund failed") — that message is surfaced as-is via
// handleError so the admin can decide to request bank details instead.
export async function payRefund(refundRequestId) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const { data } = await api.patch(`/refunds/admin/${refundRequestId}/pay`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Request Bank Details ───────────────────────────────────────────
// PATCH {{base_url}}/refunds/admin/:refundRequestId/request-bank-details
// body: { reason }
// Used when the gateway refund window has closed (or the /pay attempt
// failed) — switches the refund to MANUAL_BANK and asks the customer for
// their bank account details so the admin can NEFT it manually.
export async function requestBankDetails(refundRequestId, { reason } = {}) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const { data } = await api.patch(`/refunds/admin/${refundRequestId}/request-bank-details`, { reason });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Pay to Bank (start a manual NEFT payout) ───────────────────────
// PATCH {{base_url}}/refunds/admin/:refundRequestId/pay-to-bank  (no body)
// For MANUAL_BANK refunds once the customer's bank details are on file —
// opens a payout "leg" (status INITIATED) and moves the refund to
// PROCESSING. The actual bank transfer still happens outside this call;
// /confirm-bank-payout closes the loop once it has.
export async function payToBank(refundRequestId) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const { data } = await api.patch(`/refunds/admin/${refundRequestId}/pay-to-bank`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Confirm Bank Payout ─────────────────────────────────────────────
// PATCH {{base_url}}/refunds/admin/:refundRequestId/confirm-bank-payout
// body: { utr, mode, paidAt } — same shape as the settlements admin
// confirm-payout endpoint. Closes out the manual NEFT leg opened by
// /pay-to-bank (leg status -> PAID).
export async function confirmBankPayout(refundRequestId, { utr, mode, paidAt } = {}) {
    try {
        if (!refundRequestId) throw new Error('refundRequestId is required');
        const { data } = await api.patch(`/refunds/admin/${refundRequestId}/confirm-bank-payout`, {
            utr,
            mode,
            paidAt,
        });
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
    payRefund,
    requestBankDetails,
    payToBank,
    confirmBankPayout,
};
