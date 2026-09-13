import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as TransactionApi.js / RefundApi.js)
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

function buildParams(params = {}) {
    const out = {};
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        out[key] = value;
    });
    return out;
}

/* -------------------------------------------------------------------------
 * Settlements — the "Settlements" page's real data source: a payout list,
 * one payout's own detail, and the statement lines (transactions) that
 * make up one payout.
 * ---------------------------------------------------------------------- */

// ── Get All Settlements ("Mere payouts") ──────────────────────────
// GET {{base_url}}/settlements?page=&limit=&status=&open=&from=&to=
export async function getSettlements({
    page = 1,
    limit = 20,
    status,
    open,
    from,
    to,
} = {}) {
    try {
        const { data } = await api.get('/settlements', {
            params: buildParams({ page, limit, status, open, from, to }),
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get One Settlement ("Ek payout, iske saath") ──────────────────
// GET {{base_url}}/settlements/:settlement_id
export async function getSettlementById(settlementId) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.get(`/settlements/${settlementId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Statement Lines ("is payout me kya-kya tha") ──────────────
// GET {{base_url}}/settlements/:settlement_id/transactions?page=&limit=
export async function getSettlementTransactions(
    settlementId,
    { page = 1, limit = 50 } = {}
) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.get(`/settlements/${settlementId}/transactions`, {
            params: buildParams({ page, limit }),
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Raise a ticket against a settlement ───────────────────────────
// NOT CONFIRMED — no ticket-raising endpoint was shared for this feature
// (only the 3 GET endpoints above). Left as an explicit "not available
// yet" failure instead of silently faking a success response, so a
// Create Ticket UI would fail honestly until a real endpoint is added.
export async function raiseTicket() {
    throw new Error("Raising a settlement ticket isn't available yet.");
}

/* -------------------------------------------------------------------------
 * Admin Settlement Workflow — approve → pay → confirm, plus hold/cancel/
 * retry/etc. These act on the settlement's own id (the same one
 * getSettlementById takes) via the separate /settlements/admin/... route,
 * distinct from the vendor-facing /settlements read endpoints above. The
 * settlement's real canApprove/canPay/canRetry flags (see
 * normalizeSettlement in Settlement.jsx) say which of these are valid for
 * a given settlement right now.
 * ---------------------------------------------------------------------- */

// ── Approve a settlement ("Approve") — CONFIRMED ──────────────────
// PATCH {{base_url}}/settlements/admin/:id/approve  body: { note? }
export async function approveSettlement(settlementId, { note } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const body = {};
        if (note) body.note = note;
        const { data } = await api.patch(`/settlements/admin/${settlementId}/approve`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Start the payout ("Payout shuru karo") — CONFIRMED ─────────────
// PATCH {{base_url}}/settlements/admin/:id/pay
// Moves status to PROCESSING and opens the first payout "leg".
export async function startSettlementPayout(settlementId) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/pay`, {});
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Confirm the payout landed ("Payout pahunch gaya — UTR ke saath")
// — CONFIRMED ───────────────────────────────────────────────────────
// PATCH {{base_url}}/settlements/admin/:id/confirm  body: { utr, mode, paidAt }
export async function confirmSettlementPayout(settlementId, { utr, mode, paidAt } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/confirm`, { utr, mode, paidAt });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Reverse a payout ("Payout wapas lo") — CONFIRMED ───────────────
// PATCH {{base_url}}/settlements/admin/:id/reverse  body: { reason }
export async function reverseSettlementPayout(settlementId, { reason } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/reverse`, { reason });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Put a settlement on hold ("Hold karo") — CONFIRMED ─────────────
// PATCH {{base_url}}/settlements/admin/:id/hold  body: { reason }
export async function holdSettlement(settlementId, { reason } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/hold`, { reason });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Cancel a settlement ("Cancel karo") — CONFIRMED ────────────────
// PATCH {{base_url}}/settlements/admin/:id/cancel  body: { reason }
export async function cancelSettlement(settlementId, { reason } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/cancel`, { reason });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* ---- Below: same /settlements/admin/:id/<action> pattern as the
   confirmed calls above, matched to the Postman sidebar's names — but
   their exact request body / response wasn't shared yet. Confirm each
   one's real shape before relying on it in production. ---- */

// PATCH {{base_url}}/settlements/admin/:id/fail — "Payout fail hua"
export async function failSettlementPayout(settlementId, { reason } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const body = {};
        if (reason) body.reason = reason;
        const { data } = await api.patch(`/settlements/admin/${settlementId}/fail`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PATCH {{base_url}}/settlements/admin/:id/retry — "Dobara koshish karo (retry)"
export async function retrySettlementPayout(settlementId) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/retry`, {});
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PATCH {{base_url}}/settlements/admin/:id/abandon — "Chhod do (abandon)"
export async function abandonSettlement(settlementId, { note } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const body = {};
        if (note) body.note = note;
        const { data } = await api.patch(`/settlements/admin/${settlementId}/abandon`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PATCH {{base_url}}/settlements/admin/:id/rebuild — "Dobara banao (rebuild)"
export async function rebuildSettlement(settlementId) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/rebuild`, {});
        return data;
    } catch (error) {
        handleError(error);
    }
}

// GET {{base_url}}/settlements/admin/brands/:brandId/debt — "Is brand ka bakaya (debt)"
export async function getBrandSettlementDebt(brandId) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const { data } = await api.get(`/settlements/admin/brands/${brandId}/debt`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PATCH {{base_url}}/settlements/admin/brands/:brandId/debt/write-off — "Bakaya write off karo"
export async function writeOffBrandDebt(brandId, { note } = {}) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const body = {};
        if (note) body.note = note;
        const { data } = await api.patch(`/settlements/admin/brands/${brandId}/debt/write-off`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// GET {{base_url}}/settlements/admin/:id — "Doosre ki settlement — admin ke liye"
// Same shape as getSettlementById, but through the admin-scoped route so
// an admin can view any brand's settlement, not just their own.
export async function getSettlementByIdAsAdmin(settlementId) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.get(`/settlements/admin/${settlementId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// GET {{base_url}}/settlements/statement/:token — "Statement — token se, bina login"
// Public/token-authenticated, so this deliberately calls axios directly
// instead of the `api` instance above — "bina login" means no admin
// Bearer token should be sent with it.
export async function getSettlementStatementByToken(token) {
    try {
        if (!token) throw new Error('token is required');
        const { data } = await axios.get(`${BASE_URL}/settlements/statement/${token}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getSettlements,
    getSettlementById,
    getSettlementTransactions,
    raiseTicket,
    approveSettlement,
    startSettlementPayout,
    confirmSettlementPayout,
    reverseSettlementPayout,
    holdSettlement,
    cancelSettlement,
    failSettlementPayout,
    retrySettlementPayout,
    abandonSettlement,
    rebuildSettlement,
    getBrandSettlementDebt,
    writeOffBrandDebt,
    getSettlementByIdAsAdmin,
    getSettlementStatementByToken,
};
