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

// Builds multipart/form-data since the API expects a real file upload
// for `image`, not a URL string.
function buildFormData({ title, link, order, image, isActive }) {
    const fd = new FormData();
    fd.append('title', title ?? '');
    fd.append('link', link ?? '');
    fd.append('order', String(order ?? 0));
    fd.append('isActive', String(Boolean(isActive)));
    // Only attach `image` when a new File was actually selected —
    // on update, omit it entirely to keep the existing image.
    if (image instanceof File) {
        fd.append('image', image);
    }
    return fd;
}

/* -------------------------------------------------------------------------
 * Payload shape sent to / received from the API
 *
 * {
 *   _id, title, link, order, image (URL string on read),
 *   isActive: boolean, createdAt
 * }
 * ---------------------------------------------------------------------- */

// ── Create Banner ─────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/banners/create
// form-data: { title, link, order, image (file), isActive }
export async function createBanner({ title, link, order = 0, image, isActive = true }) {
    try {
        const fd = buildFormData({ title, link, order, image, isActive });
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
        const { data } = await api.get('/banners/getAll', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Single Banner (for View) ────────────────────────────
// GET {{TryDood2.0BaseUrl}}/banners/:id
export async function getBannerById(id) {
    try {
        const { data } = await api.get(`/banners/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Banner ───────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/banners/update/:id
// form-data: { title, link, order, image? (file, optional), isActive }
export async function updateBanner(id, { title, link, order = 0, image, isActive = true }) {
    try {
        const fd = buildFormData({ title, link, order, image, isActive });
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
        const { data } = await api.delete(`/banners/delete/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    createBanner,
    getBanners,
    getBannerById,
    updateBanner,
    deleteBanner,
};
