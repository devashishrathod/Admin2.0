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

// ── Banner media kind — FE-only, drives the type picker/UI (accept mime,
// whether a poster is required). The backend no longer takes a `type`
// field at all: it derives the kind itself from the uploaded file's real
// mime type, so this never gets sent to the API.
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

// Builds multipart/form-data for create/update.
// The media file field is ALWAYS named `media` (video's still-image poster
// is always `poster`) — there is no more type-dependent field name, and no
// `type` field at all; the backend reads the kind from the file's real
// mime type. `mediaUploadId`/`posterUploadId` are the presigned-road
// alternative — create-only, see presignUploadAndConfirm below.
function buildFormData({ title, description, redirect, startDate, endDate, isActive, mediaFile, posterFile, mediaUploadId, posterUploadId }) {
    const fd = new FormData();
    if (title !== undefined) fd.append('title', title ?? '');
    if (description !== undefined) fd.append('description', description ?? '');
    if (redirect) fd.append('redirect', typeof redirect === 'string' ? redirect : JSON.stringify(redirect));
    if (startDate) fd.append('startDate', startDate);
    if (endDate) fd.append('endDate', endDate);
    if (isActive !== undefined) fd.append('isActive', String(Boolean(isActive)));

    if (mediaUploadId) {
        fd.append('mediaUploadId', mediaUploadId);
    } else if (mediaFile instanceof File) {
        fd.append('media', mediaFile);
    }
    if (posterUploadId) {
        fd.append('posterUploadId', posterUploadId);
    } else if (posterFile instanceof File) {
        fd.append('poster', posterFile);
    }
    return fd;
}

// ── Presign → S3 → confirm upload flow (create-only for banners) ────────
// Confirmed against the real API doc (super_admin_panel_api_doc.md, #111/#112):
// 1. POST /uploads/presign  -> { uploadId, url, fields, expiresInSeconds, ... }
// 2. POST <url>             -> straight to S3, multipart form: `fields`
//    entries first, `file` appended LAST (S3 stops reading after the file
//    part, so anything after it is dropped). Responds 204, no body.
// 3. POST /uploads/confirm  -> { uploadId } only — no entityId needed from
//    the panel; the surface endpoint (banners/create) attaches it once the
//    row exists.
// 4. POST /banners/create   -> body gets `mediaUploadId` (and, for a video,
//    `posterUploadId`) instead of the raw file(s).
//
// Banner's two purposes (confirmed from the backend's own
// "Unknown upload purpose" error message):
export const BANNER_UPLOAD_PURPOSE = Object.freeze({
    MEDIA: 'BANNER_MEDIA',
    POSTER: 'BANNER_POSTER',
});

// Step 1 — POST {{TryDood2.0BaseUrl}}/uploads/presign
// body: { purpose, contentType, sizeBytes, fileName }
export async function presignUpload({ purpose, file }) {
    try {
        if (!purpose) throw new Error('purpose is required');
        if (!file) throw new Error('file is required');
        const { data } = await api.post('/uploads/presign', {
            purpose,
            contentType: file.type,
            sizeBytes: file.size,
            fileName: file.name,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// Step 2 — POST the file straight to S3 using the presigned policy fields.
// Uses the bare `axios` instance (not `api`): this goes to S3, not our
// backend, so no baseURL/Authorization header belongs on it.
async function postFileToS3(presignResponse, file) {
    const body = presignResponse?.data ?? presignResponse ?? {};
    const { uploadId, url, fields } = body;
    if (!uploadId || !url || !fields) {
        throw new Error(
            `Unexpected /uploads/presign response shape — expected uploadId/url/fields, got keys: ${Object.keys(body).join(', ') || '(empty)'}`
        );
    }
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    form.append('file', file); // must be appended last
    await axios.post(url, form);
    return uploadId;
}

// Step 3 — POST {{TryDood2.0BaseUrl}}/uploads/confirm
// body: { uploadId }
export async function confirmUpload({ uploadId }) {
    try {
        if (!uploadId) throw new Error('uploadId is required');
        await api.post('/uploads/confirm', { uploadId });
        return uploadId;
    } catch (error) {
        handleError(error);
    }
}

// Full presign → S3 → confirm sequence for one file. Returns the id to
// hand the surface endpoint as `mediaUploadId`/`posterUploadId` — confirm's
// own response body (storage/metadata) is internal and never forwarded.
export async function presignUploadAndConfirm({ file, purpose }) {
    const presignResponse = await presignUpload({ purpose, file });
    const uploadId = await postFileToS3(presignResponse, file);
    await confirmUpload({ uploadId });
    return uploadId;
}

/* -------------------------------------------------------------------------
 * Payload shape sent to the API (create/update, multipart/form-data):
 * { title, description,
 *   media (file — image/video/gif, kind auto-detected from its mime type),
 *   poster (file — required alongside a video `media`),
 *   // presign road, create only:
 *   mediaUploadId, posterUploadId,
 *   redirect (JSON string): { type, targetId?, url? }, startDate, endDate,
 *   isActive }
 *
 * Shape received back from getAll/create/update — media is a single
 * unified object:
 * {
 *   _id, title, description,
 *   media: { url, kind: "IMAGE"|"VIDEO"|"GIF", width, height, mimeType,
 *            sizeBytes, originalName, provider,
 *            // VIDEO only:
 *            duration, thumbnail },
 *   redirect: { type, targetId, url }, startDate, endDate,
 *   isActive: boolean, createdBy, updatedBy, createdAt, updatedAt
 * }
 * ---------------------------------------------------------------------- */

// ── Create Banner ─────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/banners/create
export async function createBanner({
    title,
    description = '',
    redirect,
    startDate,
    endDate,
    isActive = true,
    mediaFile,
    posterFile,
    mediaUploadId,
    posterUploadId,
}) {
    try {
        if (!title) throw new Error('title is required');
        const fd = buildFormData({ title, description, redirect, startDate, endDate, isActive, mediaFile, posterFile, mediaUploadId, posterUploadId });
        const { data } = await api.post('/banners/create', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Banners (paginated + searchable) ──────────────
// GET {{TryDood2.0BaseUrl}}/banners/get-all
export async function getBanners({ page = 1, limit = 10, search = '' } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        const { data } = await api.get('/banners/get-all', { params });
        return data;
    } catch (error) {
        // The API answers an empty result set with 404 ("No any banner
        // found") instead of 200 + an empty array — treat that as an
        // empty page rather than a load failure.
        if (error?.response?.status === 404) {
            return { success: true, data: { total: 0, totalPages: 1, page, limit, data: [] } };
        }
        handleError(error);
    }
}

// ── Update Banner ───────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/banners/update/:id
// Multipart only — the presigned road isn't offered for update per the API
// doc, only for create. `media`/`poster` are optional new files; omitting
// both keeps the banner's existing media untouched.
export async function updateBanner(id, { title, description, redirect, startDate, endDate, isActive = true, mediaFile, posterFile } = {}) {
    try {
        if (!id) throw new Error('id is required');
        const fd = buildFormData({ title, description, redirect, startDate, endDate, isActive, mediaFile, posterFile });
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
    presignUpload,
    presignUploadAndConfirm,
    confirmUpload,
    BANNER_TYPES,
    REDIRECT_TYPES,
    BANNER_UPLOAD_PURPOSE,
};
