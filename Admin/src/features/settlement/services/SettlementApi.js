import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

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
// GET {{base_url}}/settlements?page=&limit=&status=&open=&needsAttention=
//     &settlementNumber=&from=&to=&brandId=
// `needsAttention=true` is the admin worklist (flagged / FAILED / ON_HOLD,
// oldest first) per the super admin API doc. `brandId` is used by a
// brand's detail page; callers still filter rows by it themselves.
export async function getSettlements({
    page = 1,
    limit = 20,
    status,
    open,
    needsAttention,
    settlementNumber,
    from,
    to,
    brandId,
} = {}) {
    try {
        const { data } = await api.get('/settlements', {
            params: buildParams({ page, limit, status, open, needsAttention, settlementNumber, from, to, brandId }),
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Every Settlement (all pages) ──────────────────────────────
// Walks GET /settlements using the response's `totalPages`, so the
// Settlements page's KPIs, filters and export cover every settlement.
// Returns the same { data: { data, total } } shape.
export async function getAllSettlements({ limit = 100, ...filters } = {}) {
    const first = await getSettlements({ ...filters, page: 1, limit });
    const totalPages = Number(first?.data?.totalPages) || 1;
    const more = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
            getSettlements({ ...filters, page: i + 2, limit })
        )
    );
    const rows = [first, ...more].flatMap((res) => res?.data?.data ?? (Array.isArray(res?.data) ? res.data : []));
    return { ...first, data: { ...first?.data, data: rows, page: 1, totalPages: 1, limit: rows.length } };
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

// Every statement line of one settlement (all pages), same shape back.
export async function getAllSettlementTransactions(settlementId, { limit = 100 } = {}) {
    const first = await getSettlementTransactions(settlementId, { page: 1, limit });
    const totalPages = Number(first?.data?.totalPages) || 1;
    const more = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
            getSettlementTransactions(settlementId, { page: i + 2, limit })
        )
    );
    const rows = [first, ...more].flatMap((res) => res?.data?.data ?? (Array.isArray(res?.data) ? res.data : []));
    return { ...first, data: { ...first?.data, data: rows, page: 1, totalPages: 1, limit: rows.length } };
}

// ── Payout health ("kuchh na hone jaise" failures) ────────────────
// GET {{base_url}}/transactions/admin/health
// Signals per the super admin API doc: unconfirmedPayouts (CRITICAL — a
// leg with no UTR for 24h+), overdueSettlements (7d+ unpaid),
// strandedDrafts (empty DRAFT 6h+ old). Also covers the refund jobs.
export async function getPayoutHealth() {
    try {
        const { data } = await api.get('/transactions/admin/health');
        return data;
    } catch (error) {
        handleError(error);
    }
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
// PATCH {{base_url}}/settlements/admin/:id/confirm
// body: { utr, mode?, reference?, paidAt? } — `reference` defaults to the
// UTR. The response carries `paidSoFar`, `remaining` and `settled`: a big
// payout can go out in several legs and is PAID only once they add up.
export async function confirmSettlementPayout(settlementId, { utr, mode, reference, paidAt } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const body = buildParams({ utr, mode, reference, paidAt });
        const { data } = await api.patch(`/settlements/admin/${settlementId}/confirm`, body);
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

// There is no "unhold" endpoint — per the super admin API doc an ON_HOLD
// settlement leaves hold through /rebuild (drops only the tainted rows)
// or /cancel (every row to the next cycle).

// ── Cancel a settlement ("Cancel karo") — CONFIRMED ────────────────
// PATCH {{base_url}}/settlements/admin/:id/cancel  body: { reason }
// ON_HOLD / APPROVED → CANCELLED; every row goes to the next cycle.
export async function cancelSettlement(settlementId, { reason } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/cancel`, { reason });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Payout bounced ("Payout fail hua") ────────────────────────────
// PATCH {{base_url}}/settlements/admin/:id/fail  body: { note } (required —
// what the bank said). The bounced leg is kept; rows stay claimed so the
// same settlement can be retried.
export async function failSettlementPayout(settlementId, { note } = {}) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/fail`, { note });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PATCH {{base_url}}/settlements/admin/:id/retry — "Dobara koshish karo (retry)"
// FAILED → APPROVED with a new leg and a fresh bankSnapshot; rows kept.
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
// FAILED → ABANDONED; rows are released to the next cycle. The doc gives
// no body — `note` is sent as the audit text (unconfirmed field name).
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
// ON_HOLD only: drops just the tainted rows; if nothing (or less than
// minPayoutAmount) is left it becomes CARRIED_FORWARD.
export async function rebuildSettlement(settlementId) {
    try {
        if (!settlementId) throw new Error('settlementId is required');
        const { data } = await api.patch(`/settlements/admin/${settlementId}/rebuild`, {});
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── A brand's settlement debt ("Is brand ka bakaya") ──────────────
// GET {{base_url}}/settlements/admin/debt/:brandId
// netPayable <= 0 carries forward; once a brand stops selling that debt
// just sits there — this shows it.
export async function getBrandSettlementDebt(brandId) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const { data } = await api.get(`/settlements/admin/debt/${brandId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Write off a brand's debt ("Bakaya write off karo") ────────────
// PATCH {{base_url}}/settlements/admin/debt/:brandId/write-off
// body: { reason, olderThanDays } per the super admin API doc.
export async function writeOffBrandDebt(brandId, { reason, olderThanDays } = {}) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const body = buildParams({ reason, olderThanDays });
        const { data } = await api.patch(`/settlements/admin/debt/${brandId}/write-off`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// No statement PDF yet — the doc lists the generator as "abhi nahi bana";
// `documentUrl` / `documentToken` exist on the model only.

export default {
    getSettlements,
    getAllSettlements,
    getSettlementById,
    getSettlementTransactions,
    getAllSettlementTransactions,
    getPayoutHealth,
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
};
