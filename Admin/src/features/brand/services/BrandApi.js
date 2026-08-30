import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach auth token automatically
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
 * GET {{base_url}}/brands/get?brandId=...
 * Matches the "getBrandDetails" Postman request — returns ONE brand with
 * the fully populated pan / gst / bank / subscribed / firstSubBrand blocks.
 * ---------------------------------------------------------------------- */
export async function getBrandDetails(brandId) {
    try {
        const params = {};
        if (brandId) params.brandId = brandId;
        const { data } = await api.get('/brands/get', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// kept so any existing `getBrands(...)` call sites keep working
export const getBrands = getBrandDetails;

/* -------------------------------------------------------------------------
 * GET {{base_url}}/brands/admin/get-all
 * Paginated brand list for the admin panel (the "Brands" list page).
 * ---------------------------------------------------------------------- */
export async function getAllBrands({ page = 1, limit = 10, search = '', status } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        if (status) params.status = status;
        const { data } = await api.get('/brands/admin/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * PUT {{base_url}}/brands/admin/:brandId/status
 * Used for approve / reject / activate / deactivate from the admin panel.
 * `reason` is only sent when present (e.g. rejection reason).
 *
 * Backend requires both:
 *   - isActive (boolean)         → derived from `status` unless passed explicitly
 *   - hideFromCustomers (boolean) → always sent, defaults to false
 * ---------------------------------------------------------------------- */
export async function updateBrandStatus(brandId, status, reason = '', isActive, hideFromCustomers = false) {
    try {
        const resolvedIsActive =
            isActive !== undefined
                ? isActive
                : ['ACTIVE', 'APPROVED'].includes(status);

        const body = {
            status,
            isActive: resolvedIsActive,
            hideFromCustomers,
        };
        if (reason) body.reason = reason;

        const { data } = await api.put(`/brands/admin/${brandId}/status`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * GET {{base_url}}/brands/admin/top-brands
 * ---------------------------------------------------------------------- */
export async function getTopBrands(params = {}) {
    try {
        const { data } = await api.get('/brands/admin/top-brands', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * PUT {{base_url}}/brands/admin/top-brands/:brandId
 * body: { brandId, isTopBrand, topOrder }
 * ---------------------------------------------------------------------- */
export async function updateTopBrand(brandId, { isTopBrand, topOrder }) {
    try {
        const body = { brandId, isTopBrand, topOrder };
        const { data } = await api.put(`/brands/admin/top-brands/${brandId}`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getBrandDetails,
    getBrands,
    getAllBrands,
    updateBrandStatus,
    getTopBrands,
    updateTopBrand,
};