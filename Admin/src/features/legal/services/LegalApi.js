import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as every other *Api.js)
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
 * Legal documents — Terms & Conditions and Privacy Policy are two
 * separate real resources that share the exact same shape (confirmed via
 * Postman):
 *   POST   /terms-and-conditions/create        { title, type, description }
 *   PUT    /terms-and-conditions/update/:id     { isActive } (confirmed —
 *          shown toggling status; also sent here as a partial update for
 *          title/type/description edits, matching every other admin PUT
 *          in this app)
 *   DELETE /terms-and-conditions/delete/:id
 * and the mirrored /privacy-and-policies/... paths.
 *
 * `type` confirmed as "CUSTOMER" in the create examples; VENDOR is kept as
 * a second option since that split (CUSTOMER vs VENDOR) is the standing
 * convention everywhere else in this app (Promo Code's audience, Legal's
 * likely counterpart) — not itself confirmed from Postman.
 *
 * NOT shown in the confirmed screenshots, so inferred from this exact
 * backend's own naming convention used everywhere else (e.g.
 * /banners/get-all, /promoCodes/get-all, both returning
 * { data: { data: [...], total, page, limit } }):
 *   - the list (get-all) endpoint for either resource
 *   - Privacy & Policies' own delete path (mirrored from Terms')
 * If either of those 404s against the real backend, that's the first
 * thing to re-confirm.
 * ---------------------------------------------------------------------- */

function buildLegalApi(resource) {
    return {
        async getAll({ page = 1, limit = 50, search = '' } = {}) {
            try {
                const params = { page, limit };
                if (search) params.search = search;
                const { data } = await api.get(`/${resource}/get-all`, { params });
                return data;
            } catch (error) {
                handleError(error);
            }
        },
        async create(payload) {
            try {
                const { data } = await api.post(`/${resource}/create`, payload);
                return data;
            } catch (error) {
                handleError(error);
            }
        },
        async update(id, payload) {
            try {
                if (!id) throw new Error('id is required');
                const { data } = await api.put(`/${resource}/update/${id}`, payload);
                return data;
            } catch (error) {
                handleError(error);
            }
        },
        async remove(id) {
            try {
                if (!id) throw new Error('id is required');
                const { data } = await api.delete(`/${resource}/delete/${id}`);
                return data;
            } catch (error) {
                handleError(error);
            }
        },
    };
}

export const termsAndConditionsApi = buildLegalApi('terms-and-conditions');
export const privacyPoliciesApi = buildLegalApi('privacy-and-policies');
