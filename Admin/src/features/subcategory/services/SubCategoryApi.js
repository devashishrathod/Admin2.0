import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as authApi.js / CategoryApi.js)
// NOTE: adjust this relative path to wherever authStore.js actually lives.
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
 *   _id, categoryId, name, description, image (URL string on read),
 *   isActive: boolean, isDeleted: boolean, createdAt, updatedAt,
 *   voucherCount?
 * }
 * ---------------------------------------------------------------------- */

// ── Create Sub-Category ───────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/subCategories/:categoryId/create
// form-data: { name, description, image (file), isActive }
export async function createSubCategory(categoryId, { name, description, image, isActive = true }) {
    try {
        const fd = buildFormData({ name, description, image, isActive });
        const { data } = await api.post(`/subCategories/${categoryId}/create`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Sub-Categories (paginated + filterable) ────────────
// GET {{TryDood2.0BaseUrl}}/subCategories/getAll
// query params: page, limit, type, sortBy, sortOrder, isActive, categoryId, search
export async function getSubCategories({
    page = 1,
    limit = 10,
    search = '',
    categoryId,
    isActive,
    type,
    sortBy,
    sortOrder,
} = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        if (categoryId) params.categoryId = categoryId;
        if (isActive !== undefined) params.isActive = isActive;
        if (type) params.type = type;
        if (sortBy) params.sortBy = sortBy;
        if (sortOrder) params.sortOrder = sortOrder;

        const { data } = await api.get('/subCategories/getAll', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Single Sub-Category (for View) ──────────────────────────
// GET {{TryDood2.0BaseUrl}}/subCategories/:id
// NOTE: adjust path if your real "get one" endpoint differs.
export async function getSubCategoryById(id) {
    try {
        const { data } = await api.get(`/subCategories/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Sub-Category ───────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/subCategories/update/:id
// form-data: { name, description, image? (file, optional), isActive }
// NOTE: adjust method (PUT/PATCH) and path to match your real endpoint.
export async function updateSubCategory(id, { name, description, image, isActive = true }) {
    try {
        const fd = buildFormData({ name, description, image, isActive });
        const { data } = await api.put(`/subCategories/update/${id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete Sub-Category ─────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/subCategories/delete/:id
// NOTE: adjust path to match your real endpoint.
export async function deleteSubCategory(id) {
    try {
        const { data } = await api.delete(`/subCategories/delete/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    createSubCategory,
    getSubCategories,
    getSubCategoryById,
    updateSubCategory,
    deleteSubCategory,
};