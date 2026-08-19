import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as authApi.js / planApi.js)
// NOTE: adjust this relative path to wherever authStore.js actually lives
// in your project (e.g. "../../auth/store/authStore").
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
function buildFormData({ name, description, image, isActive }) {
    const fd = new FormData();
    fd.append('name', name ?? '');
    fd.append('description', description ?? '');
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
 *   _id, name, description, image (URL string on read),
 *   isActive: boolean, createdAt,
 *   subCategoryCount?, voucherCount?
 * }
 * ---------------------------------------------------------------------- */

// ── Create Category ─────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/categories/create
// form-data: { name, description, image (file), isActive }
export async function createCategory({ name, description, image, isActive = true }) {
    try {
        const fd = buildFormData({ name, description, image, isActive });
        const { data } = await api.post('/categories/create', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Categories (paginated + searchable) ──────────────
// GET {{TryDood2.0BaseUrl}}/categories/getAll?page=&limit=&search=
export async function getCategories({ page = 1, limit = 10, search = '' } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        const { data } = await api.get('/categories/getAll', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Single Category (for View) ────────────────────────────
// GET {{TryDood2.0BaseUrl}}/categories/:id
// NOTE: adjust path if your real "get one" endpoint differs.
export async function getCategoryById(id) {
    try {
        const { data } = await api.get(`/categories/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Category ───────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/categories/update/:id
// form-data: { name, description, image? (file, optional), isActive }
// NOTE: adjust method (PUT/PATCH) and path to match your real endpoint.
export async function updateCategory(id, { name, description, image, isActive = true }) {
    try {
        const fd = buildFormData({ name, description, image, isActive });
        const { data } = await api.put(`/categories/update/${id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete Category ────────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/categories/delete/:id
// NOTE: adjust path to match your real endpoint.
export async function deleteCategory(id) {
    try {
        const { data } = await api.delete(`/categories/delete/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};