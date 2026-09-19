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
 * FAQs — no Postman confirmation for this resource yet, so every path
 * below follows this exact backend's own proven convention (confirmed
 * for Plan/Category/SubCategory/PromotionalTicker and — after one
 * correction — Legal docs): camelCase `getAll` for the list, `get/:id`
 * for a single record, `create`, `update/:id`, `delete/:id`. If any of
 * these 404s, that's the one to re-confirm first — same as what
 * happened with Legal's list endpoint.
 *
 * Body shape (create/update): { question, answer, type, isActive }.
 * `type` is admin-curated free grouping, not itself confirmed from a
 * backend enum — see FAQ_TYPES in Faq.jsx.
 * ---------------------------------------------------------------------- */

export async function getFaqs({ page = 1, limit = 100, search = '', type = '' } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        if (type) params.type = type;
        const { data } = await api.get('/faqs/getAll', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

export async function getFaqById(id) {
    try {
        if (!id) throw new Error('id is required');
        const { data } = await api.get(`/faqs/get/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export async function createFaq(payload) {
    try {
        const { data } = await api.post('/faqs/create', payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export async function updateFaq(id, payload) {
    try {
        if (!id) throw new Error('id is required');
        const { data } = await api.put(`/faqs/update/${id}`, payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export async function deleteFaq(id) {
    try {
        if (!id) throw new Error('id is required');
        const { data } = await api.delete(`/faqs/delete/${id}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getFaqs,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq,
};
