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

// Normalize error responses so callers get a consistent shape. `status` and
// `details` ride along on the Error — the two-step flows (delete, deactivate,
// apply-terms, feature delete) answer 409 with `details.impact` plus a
// `confirmToken` / fresh impact, and the UI builds its confirm dialog from it.
function handleError(error) {
    const body = error?.response?.data;
    const message =
        body?.message ||
        body?.error ||
        error?.message ||
        'Something went wrong. Please try again.';
    const err = new Error(message);
    err.status = error?.response?.status;
    err.details = body?.details;
    throw err;
}

/* -------------------------------------------------------------------------
 * Payload shape sent to the API (subscription redesign, Phases 1–8)
 *
 * {
 *   name, description, price, tier (1–100, required on create),
 *   durationValue, durationUnit: "DAY" | "MONTH" | "YEAR",
 *   discountType: "PERCENT" | "FLAT", discountPercent, discountAmount,
 *   isTrial: boolean (price must be 0),
 *   isActive: boolean, confirmToken? (deactivate guard),
 *   benefits: string[], limitations: string[],          // legacy
 *   entitlements: { subBrands, franchises, vouchers, showcase: { limit, isUnlimited },
 *                   dealPack, prioritySupport: { isEnabled } },
 *   featureValues: [{ key, value }]                     // display features
 * }
 *
 * `discountedPrice`, `type`, `typeLabel`, `durationLabel` come back derived
 * by the server — never sent.
 * ---------------------------------------------------------------------- */

// ── Plans ────────────────────────────────────────────────────
// POST /subscriptions/create (#71)
export async function addPlan(plan) {
    try {
        const { data } = await api.post('/subscriptions/create', plan);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// GET /subscriptions/getAll (#72) — empty list answers 404, treated as [].
export async function getPlans() {
    try {
        const { data } = await api.get('/subscriptions/getAll');
        return data;
    } catch (error) {
        if (error?.response?.status === 404) return { data: [] };
        handleError(error);
    }
}

// GET /subscriptions/get/:id (#73)
export async function getPlanById(id) {
    try {
        const { data } = await api.get(`/subscriptions/get/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PUT /subscriptions/update/:id (#74) — `{ isActive: false }` on a plan in
// use answers 409 + `details.confirmToken`; resend the same body with it.
export async function updatePlan(id, plan) {
    try {
        const { data } = await api.put(`/subscriptions/update/${id}`, plan);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// DELETE /subscriptions/delete/:id[?confirmToken=] (#75) — two-step.
export async function deletePlan(id, confirmToken) {
    try {
        const { data } = await api.delete(`/subscriptions/delete/${id}`, {
            params: confirmToken ? { confirmToken } : undefined,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Plan image (#75a, #75b) ──────────────────────────────────
// PUT /subscriptions/admin/:id/image — multipart `image` (jpeg/png/webp/gif, ≤ 10 MB)
export async function uploadPlanImage(id, file) {
    try {
        const fd = new FormData();
        fd.append('image', file);
        const { data } = await api.put(`/subscriptions/admin/${id}/image`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// DELETE /subscriptions/admin/:id/image — idempotent
export async function removePlanImage(id) {
    try {
        const { data } = await api.delete(`/subscriptions/admin/${id}/image`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Apply limits to running subscribers (#75c, #75d) ─────────
// GET /subscriptions/admin/:id/apply-terms/preview — read only
export async function previewApplyTerms(id) {
    try {
        const { data } = await api.get(`/subscriptions/admin/${id}/apply-terms/preview`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PUT /subscriptions/admin/:id/apply-terms { impactToken } — stale token → 409 + fresh impact
export async function applyTerms(id, impactToken) {
    try {
        const { data } = await api.put(`/subscriptions/admin/${id}/apply-terms`, { impactToken });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Comparison (#75e) ────────────────────────────────────────
// GET /subscriptions/compare[?includeInactive=true]
export async function getPlanComparison(includeInactive = true) {
    try {
        const { data } = await api.get('/subscriptions/compare', {
            params: includeInactive ? { includeInactive: true } : undefined,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Feature master (#75f–#75j) ───────────────────────────────
// GET /subscriptions/admin/features — full list in display order
export async function getPlanFeatures(params) {
    try {
        const { data } = await api.get('/subscriptions/admin/features', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// POST /subscriptions/admin/features — display features only
export async function createPlanFeature(feature) {
    try {
        const { data } = await api.post('/subscriptions/admin/features', feature);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PUT /subscriptions/admin/features/:featureId
export async function updatePlanFeature(featureId, patch) {
    try {
        const { data } = await api.put(`/subscriptions/admin/features/${featureId}`, patch);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// PUT /subscriptions/admin/features/reorder { items: [{ featureId, sortOrder, group? }] }
export async function reorderPlanFeatures(items) {
    try {
        const { data } = await api.put('/subscriptions/admin/features/reorder', { items });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// DELETE /subscriptions/admin/features/:featureId[?confirmToken=] — two-step
export async function deletePlanFeature(featureId, confirmToken) {
    try {
        const { data } = await api.delete(`/subscriptions/admin/features/${featureId}`, {
            params: confirmToken ? { confirmToken } : undefined,
        });
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
    uploadPlanImage,
    removePlanImage,
    previewApplyTerms,
    applyTerms,
    getPlanComparison,
    getPlanFeatures,
    createPlanFeature,
    updatePlanFeature,
    reorderPlanFeatures,
    deletePlanFeature,
};
