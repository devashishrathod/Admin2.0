import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach auth token automatically (same pattern as authApi.js)
api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../../features/auth/store/authStore');
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
 * Payload shape sent to / received from the API
 *
 * {
 *   name, description, price, strikePrice,
 *   discountType: "PERCENT" | "FLAT", discountPercent,
 *   type: "MONTHLY" | "YEARLY",
 *   isActive: boolean,
 *   benefits: string[],
 *   limitations: string[],
 *   features: [{ title, value, available }],
 *   entitlements: {
 *     subBrands: { isUnlimited, limit? },
 *     franchises: { isUnlimited, limit? },
 *     vouchers: { isEnabled },
 *     dealPack: { isEnabled },
 *     prioritySupport: { isEnabled },
 *     showcase: { isEnabled }
 *   }
 * }
 * ---------------------------------------------------------------------- */

// ── Add Plan ─────────────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/subscriptions/add
export async function addPlan(plan) {
    try {
        const { data } = await api.post('/subscriptions/create', plan);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Plans (list/load) ───────────────────────────────
// GET {{TryDood2.0BaseUrl}}/subscriptions/list
// NOTE: adjust the path if your real "list" endpoint differs
// (e.g. /subscriptions or /subscriptions/all).
export async function getPlans() {
    try {
        const { data } = await api.get('/subscriptions/getAll');
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Single Plan ──────────────────────────────────────────
// GET {{TryDood2.0BaseUrl}}/subscriptions/:id
export async function getPlanById(id) {
    try {
        const { data } = await api.get(`/subscriptions/get/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update / Edit Plan ───────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/subscriptions/update/:id
// NOTE: adjust method (PUT/PATCH) and path to match your real endpoint.
export async function updatePlan(id, plan) {
    try {
        const { data } = await api.put(`/subscriptions/update/${id}`, plan);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete Plan ──────────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/subscriptions/delete/:id
export async function deletePlan(id) {
    try {
        const { data } = await api.delete(`/subscriptions/delete/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Toggle Plan Status (Active / Inactive) ───────────────────
// PATCH {{TryDood2.0BaseUrl}}/subscriptions/status/:id
// body: { status: "Active" | "Inactive" }
export async function updatePlanStatus(id, status) {
    try {
        const { data } = await api.patch(`/subscriptions/status/${id}`, { status });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Toggle Feature Availability (within a plan) ───────────────
// PATCH {{TryDood2.0BaseUrl}}/subscriptions/:planId/features/:featureId/toggle
export async function toggleFeatureAvailability(planId, featureId) {
    try {
        const { data } = await api.patch(
            `/subscriptions/${planId}/features/${featureId}/toggle`
        );
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Feature Value (within a plan) ──────────────────────
// PATCH {{TryDood2.0BaseUrl}}/subscriptions/:planId/features/:featureId
// body: { value }
export async function updateFeatureValue(planId, featureId, value) {
    try {
        const { data } = await api.patch(
            `/subscriptions/${planId}/features/${featureId}`,
            { value }
        );
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    addPlan,
    getPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    updatePlanStatus,
    toggleFeatureAvailability,
    updateFeatureValue,
};