import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as VoucherApi.js / subscriptionApi.js)
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
 * Voucher Claims — the "Transactions" page's real data source: each row
 * is a voucher redeemed by a customer at an outlet.
 * ---------------------------------------------------------------------- */

// ── Get All Voucher Claims ────────────────────────────────────────
// GET {{base_url}}/voucher-claims?page=&limit=&status=&outletId=&from=&to=
export async function getVoucherClaims({
    page = 1,
    limit = 20,
    status,
    outletId,
    from,
    to,
} = {}) {
    try {
        const params = { page, limit };
        if (status) params.status = status;
        if (outletId) params.outletId = outletId;
        if (from) params.from = from;
        if (to) params.to = to;
        const { data } = await api.get('/voucher-claims', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Voucher Claim Payments ────────────────────────────────
// GET {{base_url}}/voucher-claims/payments?page=&limit=&outletId=
export async function getVoucherClaimPayments({ page = 1, limit = 20, outletId } = {}) {
    try {
        const params = { page, limit };
        if (outletId) params.outletId = outletId;
        const { data } = await api.get('/voucher-claims/payments', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get One Voucher Claim Payment ─────────────────────────────────
// GET {{base_url}}/voucher-claims/payments/:claimTransactionId
export async function getVoucherClaimPaymentById(claimTransactionId) {
    try {
        if (!claimTransactionId) throw new Error('claimTransactionId is required');
        const { data } = await api.get(`/voucher-claims/payments/${claimTransactionId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get One Voucher Claim — full timeline (payment + claim + brand + outlet)
// GET {{base_url}}/voucher-claims/:claimId
export async function getVoucherClaimById(claimId) {
    try {
        if (!claimId) throw new Error('claimId is required');
        const { data } = await api.get(`/voucher-claims/${claimId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Verify a Claim by its human-readable code (counter verification) ─────
// GET {{base_url}}/voucher-claims/code/:claimCode
export async function getVoucherClaimByCode(claimCode) {
    try {
        if (!claimCode) throw new Error('claimCode is required');
        const { data } = await api.get(`/voucher-claims/code/${claimCode}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getVoucherClaims,
    getVoucherClaimPayments,
    getVoucherClaimPaymentById,
    getVoucherClaimById,
    getVoucherClaimByCode,
};
