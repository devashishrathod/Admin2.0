import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0ServerUrl}} for this
// endpoint (same server as {{TryDood2.0BaseUrl}} used elsewhere).
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
 * Payload shape returned by / sent to the API — confirmed real document:
 *
 * {
 *   _id, isActive, createdAt, updatedAt, updatedBy,
 *   vendor: { voucher, showcase, subscription },
 *   customer: {
 *     convenienceFee, tax, promoCode, claim, notification, invoice,
 *     settlement (incl. nested reserve), refund, chargeback, search
 *   },
 *   security: { otp },
 *   admin: { notification },
 *   app: { minVersion, latestVersion, forceUpdate, updateMessage, storeUrl, support, features }
 * }
 *
 * updateSettings only ever accepts ONE partial sub-object per call
 * (e.g. { vendor: { voucher } } alone, or { isActive } alone) — never
 * combine multiple top-level/nested keys in a single PUT. See
 * Settings.jsx's buildSavePayload, which maps every sidebar leaf to
 * exactly one such payload.
 * ---------------------------------------------------------------------- */

// ── Get Settings ─────────────────────────────────────────────
// GET {{TryDood2.0ServerUrl}}/settings/get
// Confirmed from Postman. Returns the single settings document — there's
// no list/pagination here, just one record.
export async function getSettings() {
    try {
        const { data } = await api.get('/settings/get');
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Settings ───────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/settings/update
// NOTE: only GET was confirmed from Postman — the update endpoint's path
// and method are a best guess following this collection's conventions
// (see CategoryApi.js / BannerApi.js). Adjust if the real one differs.
export async function updateSettings(payload) {
    try {
        const { data } = await api.put('/settings/update', payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getSettings,
    updateSettings,
};
