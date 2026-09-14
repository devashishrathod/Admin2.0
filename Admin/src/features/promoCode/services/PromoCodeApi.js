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

/* -------------------------------------------------------------------------
 * Payload shape sent to / received from the API — matches the backend's
 * real Joi validator (validateCreatePromoCode) exactly. Enums live in
 * ../promoCodeEnums.js, not here — this file is HTTP calls only.
 *
 * Create body:
 * {
 *   code, discountType: "PERCENT" | "FLAT",
 *   description?, discountPercent?, discountAmount?, maxDiscountAmount?,
 *   minOrderValue?, subscriptionIds?: string[],
 *   applicableActions?: ("NEW"|"RENEW"|"UPGRADE"|"DOWNGRADE")[],
 *   firstTimeOnly?, audience?: "VENDOR" | "CUSTOMER",
 *
 *   // customer-scope (only meaningful when audience is CUSTOMER)
 *   voucherIds?: string[], brandIds?: string[], categoryIds?: string[],
 *   perCustomerUsageLimit?, firstOrderOnly?, minBillAmount?,
 *   appliesTo?: "NET_BILL" | "CONVENIENCE_FEE",
 *   costBearing?: { mode: "PLATFORM"|"VENDOR"|"SHARED", vendorPercent? },
 *
 *   validFrom?, validTill?, totalUsageLimit?, perBrandUsageLimit?, isActive?
 * }
 *
 * Update body: any subset of the above (partial update) — code is never
 * included, it can't be changed after creation.
 *
 * List response, each record (confirmed from a real getAll call):
 * {
 *   _id, code, description, discountType, discountPercent, discountAmount,
 *   maxDiscountAmount, minOrderValue, subscriptionIds: [],
 *   applicableActions: [], firstTimeOnly, validFrom, validTill,
 *   totalUsageLimit, perBrandUsageLimit, usedCount, createdBy, isActive,
 *   isDeleted, createdAt, updatedAt, updatedBy, consumedCount,
 *   reservedCount, remainingUses, isExpired
 *   // audience/appliesTo/costBearing/voucherIds/brandIds/categoryIds/
 *   // perCustomerUsageLimit/firstOrderOnly/minBillAmount are real schema
 *   // fields per the Joi validator, but weren't in the last confirmed
 *   // list-response sample — normalized defensively in PromoCode.jsx.
 * }
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
};
