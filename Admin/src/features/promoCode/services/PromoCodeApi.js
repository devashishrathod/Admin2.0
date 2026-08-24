import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as authApi.js / BannerApi.js)
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

export const DISCOUNT_TYPES = Object.freeze({
    PERCENT: 'PERCENT',
    FLAT: 'FLAT',
});

// Effective status, computed server-side from validFrom/validTill — not
// something the admin sets directly.
export const PROMO_STATUSES = Object.freeze({
    LIVE: 'LIVE',
    SCHEDULED: 'SCHEDULED',
    EXPIRED: 'EXPIRED',
});

// Confirmed values only — the "applicableActions" enum may have more than
// these two, but only NEW/UPGRADE have been shown so far.
export const APPLICABLE_ACTIONS = Object.freeze({
    NEW: 'NEW',
    UPGRADE: 'UPGRADE',
});

/* -------------------------------------------------------------------------
 * Payload shape sent to / received from the API
 *
 * Create body:
 * {
 *   code, description, discountType: "PERCENT" | "FLAT",
 *   discountPercent (used when PERCENT), discountAmount (used when FLAT),
 *   maxDiscountAmount (cap applied to a PERCENT discount), minOrderValue,
 *   applicableActions: string[], firstTimeOnly: boolean,
 *   validFrom: "YYYY-MM-DD", validTill: "YYYY-MM-DD",
 *   totalUsageLimit, perBrandUsageLimit, isActive: boolean
 * }
 *
 * Update body: any subset of the above (confirmed example only sent
 * { totalUsageLimit, validTill, isActive }) — partial update.
 *
 * List response, each record (confirmed from a real getAll call):
 * {
 *   _id, code, description, discountType, discountPercent, discountAmount,
 *   minOrderValue, subscriptionIds: [], applicableActions: [],
 *   firstTimeOnly, totalUsageLimit, perBrandUsageLimit, usedCount,
 *   createdBy, isActive, isDeleted, createdAt, updatedAt, consumedCount,
 *   reservedCount, remainingUses, isExpired
 * }
 * NOTE: `maxDiscountAmount`, `validFrom` and `validTill` are real
 * create/update fields but are NOT present on list records — they may
 * only be readable via the get-by-id endpoint, or not projected back at
 * all. `sortBy=validTill` is still a valid list query param regardless,
 * implying the field exists server-side even where it isn't returned.
 *
 * Get-by-id response (confirmed):
 * { data: {
 *     promoCode: { _id, code, discountType, discountPercent, usedCount, totalUsageLimit },
 *     usage: { consumed, reserved, released, remaining },
 *     recentUsages: [{ _id, code, brandId: { _id, brandName, merchantId },
 *       status, discountAmount, transactionId, consumedAt }]
 * } }
 * ---------------------------------------------------------------------- */

// ── Create Promo Code ─────────────────────────────────────────
// POST {{base_url}}/promoCodes/create
export async function createPromoCode(payload) {
    try {
        if (!payload?.code) throw new Error('code is required');
        const { data } = await api.post('/promoCodes/create', payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Promo Codes (paginated + filterable) ────────────────
// GET {{base_url}}/promoCodes/get-all?page=&limit=&search=&status=&isActive=&sortBy=&sortOrder=
// Confirmed from Postman. Query params:
//   page       — default 1
//   limit      — max 100
//   search     — matches code or description
//   status     — LIVE | SCHEDULED | EXPIRED (the effective status)
//   isActive   — true | false
//   sortBy     — createdAt | code | usedCount | validTill
//   sortOrder  — asc | desc
export async function getPromoCodes({
    page = 1,
    limit = 20,
    search = '',
    status = '',
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
} = {}) {
    try {
        const params = { page, limit, sortBy, sortOrder };
        if (search) params.search = search;
        if (status) params.status = status;
        if (isActive !== undefined && isActive !== '') params.isActive = isActive;
        const { data } = await api.get('/promoCodes/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Promo Code (partial) ─────────────────────────────────
// PUT {{base_url}}/promoCodes/update/:id
// Confirmed as a partial update — send only the fields being changed.
export async function updatePromoCode(id, payload) {
    try {
        if (!id) throw new Error('id is required');
        const { data } = await api.put(`/promoCodes/update/${id}`, payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Promo Code By Id (with usage + recent usages) ────────────
// GET {{base_url}}/promoCodes/get/:id
// Confirmed from Postman. Returns richer detail than the list endpoint —
// a usage summary (consumed/reserved/released/remaining) and a list of
// recent redemptions with the redeeming brand populated.
export async function getPromoCodeById(id) {
    try {
        if (!id) throw new Error('id is required');
        const { data } = await api.get(`/promoCodes/get/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    createPromoCode,
    getPromoCodes,
    updatePromoCode,
    getPromoCodeById,
    DISCOUNT_TYPES,
    PROMO_STATUSES,
    APPLICABLE_ACTIONS,
};
