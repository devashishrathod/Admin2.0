import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as authApi.js / CategoryApi.js)
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

// ── Banner media type — the `type` field itself must be uppercase
// (backend validates it as one of IMAGE | VIDEO | GIF), while the file
// upload still goes under the lowercase field name (image/video/gif) —
// see buildFormData below.
export const BANNER_TYPES = Object.freeze({
    IMAGE: 'IMAGE',
    VIDEO: 'VIDEO',
    GIF: 'GIF',
});

// ── Redirect target types — matches the backend's `redirect` contract ───
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
// string, e.g. {"type":"BRAND","targetId":"...","url":"..."}.
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

// Builds multipart/form-data. `file` is uploaded under whichever field
// name matches `type` (image/video/gif) — only appended when a new File
// was actually selected, so updates can omit it to keep the existing media.
function buildFormData({ title, description, type, redirect, startDate, endDate, isActive, file }) {
    const fd = new FormData();
    fd.append('title', title ?? '');
    if (description !== undefined) fd.append('description', description ?? '');
    if (type) fd.append('type', type);
    if (redirect) fd.append('redirect', typeof redirect === 'string' ? redirect : JSON.stringify(redirect));
    if (startDate) fd.append('startDate', startDate);
    if (endDate) fd.append('endDate', endDate);
    fd.append('isActive', String(Boolean(isActive)));
    // The file field name is lowercase (image/video/gif) even though the
    // `type` value sent above is uppercase.
    if (file instanceof File && type) {
        fd.append(type.toLowerCase(), file);
    }
    return fd;
}

/* -------------------------------------------------------------------------
 * Payload shape sent to / received from the API
 *
 * {
 *   _id, title, description, type: "image"|"video"|"gif",
 *   image|video|gif (URL string on read, matching `type`),
 *   redirect: { type, targetId?, url? }, startDate, endDate,
 *   isActive: boolean, createdAt
 * }
 * ---------------------------------------------------------------------- */

// ── Create Banner ─────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/banners/create
// form-data: { title, description, type, redirect (JSON string),
// startDate, endDate, isActive, image|video|gif (file, matching type) }
export async function createBanner({
    title,
    description = '',
    type,
    redirect,
    startDate,
    endDate,
    isActive = true,
    file,
}) {
    try {
        if (!title) throw new Error('title is required');
        if (!type) throw new Error('type is required');
        const fd = buildFormData({ title, description, type, redirect, startDate, endDate, isActive, file });
        const { data } = await api.post('/banners/create', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Banners (paginated + searchable) ──────────────
// GET {{TryDood2.0BaseUrl}}/banners/getAll?page=&limit=&search=
export async function getBanners({ page = 1, limit = 10, search = '' } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        const { data } = await api.get('/banners/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Banner ───────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/banners/update/:id
// form-data: same fields as create — `type`/file are optional and only
// need sending if the banner's media is being changed.
export async function updateBanner(id, { title, description, type, redirect, startDate, endDate, isActive = true, file } = {}) {
    try {
        if (!id) throw new Error('id is required');
        const fd = buildFormData({ title, description, type, redirect, startDate, endDate, isActive, file });
        const { data } = await api.put(`/banners/update/${id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete Banner ────────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/banners/delete/:id
export async function deleteBanner(id) {
    try {
        if (!id) throw new Error('id is required');
        const { data } = await api.delete(`/banners/delete/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    createBanner,
    getBanners,
    updateBanner,
    deleteBanner,
    buildRedirectPayload,
    BANNER_TYPES,
    REDIRECT_TYPES,
};
