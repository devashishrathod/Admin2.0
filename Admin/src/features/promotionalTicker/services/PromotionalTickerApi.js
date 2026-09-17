import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
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

// ── Redirect target types — same contract as banners' `redirect` field ──
// targetId is required for CATEGORY / DEAL / BRAND / OFFER, url is
// required for EXTERNAL_URL, NONE needs neither.
export const REDIRECT_TYPES = Object.freeze({
    NONE: 'NONE',
    CATEGORY: 'CATEGORY',
    DEAL: 'DEAL',
    BRAND: 'BRAND',
    OFFER: 'OFFER',
    EXTERNAL_URL: 'EXTERNAL_URL',
});

const TARGET_ID_REQUIRED = [
    REDIRECT_TYPES.CATEGORY,
    REDIRECT_TYPES.DEAL,
    REDIRECT_TYPES.BRAND,
    REDIRECT_TYPES.OFFER,
];

// Builds and validates the `redirect` field, sent to the backend as a JSON
// string, e.g. {"type":"CATEGORY","targetId":"..."}.
export function buildRedirectPayload({ type = REDIRECT_TYPES.NONE, targetId, url } = {}) {
    if (TARGET_ID_REQUIRED.includes(type) && !targetId) {
        throw new Error(`A target is required for redirect type ${type}`);
    }
    if (type === REDIRECT_TYPES.EXTERNAL_URL && !url) {
        throw new Error('A URL is required for redirect type EXTERNAL_URL');
    }
    const payload = { type };
    if (targetId) payload.targetId = targetId;
    if (url) payload.url = url;
    return JSON.stringify(payload);
}

// Builds multipart/form-data. `icon` is only appended when a new File was
// actually selected, so updates can omit it to keep the existing icon.
function buildFormData({ title, redirect, displayOrder, startDate, endDate, isActive, icon }) {
    const fd = new FormData();
    fd.append('title', title ?? '');
    if (redirect) fd.append('redirect', typeof redirect === 'string' ? redirect : JSON.stringify(redirect));
    fd.append('displayOrder', String(displayOrder ?? 0));
    if (startDate) fd.append('startDate', startDate);
    if (endDate) fd.append('endDate', endDate);
    fd.append('isActive', String(Boolean(isActive)));
    if (icon instanceof File) {
        fd.append('icon', icon);
    }
    return fd;
}

/* -------------------------------------------------------------------------
 * Payload shape sent to / received from the API
 *
 * {
 *   _id, title, icon (URL string on read), redirect: { type, targetId?, url? },
 *   displayOrder, startDate, endDate, isActive: boolean, createdAt
 * }
 * ---------------------------------------------------------------------- */

// ── Create Promotional Ticker ─────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/promotionalTickers/create
// form-data: { title, redirect (JSON string, optional), displayOrder,
// startDate, endDate, isActive, icon (file) }
export async function createPromotionalTicker({ title, redirect, displayOrder = 0, startDate, endDate, isActive = true, icon }) {
    try {
        if (!title) throw new Error('title is required');
        const fd = buildFormData({ title, redirect, displayOrder, startDate, endDate, isActive, icon });
        const { data } = await api.post('/promotionalTickers/create', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Promotional Tickers (paginated + searchable) ──────────────
// GET {{TryDood2.0BaseUrl}}/promotionalTickers/getAll?page=&limit=&search=
export async function getPromotionalTickers({ page = 1, limit = 10, search = '' } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        const { data } = await api.get('/promotionalTickers/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Promotional Ticker ───────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/promotionalTickers/update/:id
// form-data: same fields as create — `icon` is optional and only needs
// sending if the ticker's icon is being changed.
export async function updatePromotionalTicker(id, { title, redirect, displayOrder, startDate, endDate, isActive = true, icon } = {}) {
    try {
        if (!id) throw new Error('id is required');
        const fd = buildFormData({ title, redirect, displayOrder, startDate, endDate, isActive, icon });
        const { data } = await api.put(`/promotionalTickers/update/${id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete Promotional Ticker ────────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/promotionalTickers/delete/:id
export async function deletePromotionalTicker(id) {
    try {
        if (!id) throw new Error('id is required');
        const { data } = await api.delete(`/promotionalTickers/delete/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    createPromotionalTicker,
    getPromotionalTickers,
    updatePromotionalTicker,
    deletePromotionalTicker,
    buildRedirectPayload,
    REDIRECT_TYPES,
};
