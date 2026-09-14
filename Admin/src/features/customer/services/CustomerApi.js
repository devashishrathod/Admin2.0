import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// Attach auth token automatically (same pattern as TransactionApi.js / RefundApi.js)
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
 * Customers — the "Customers" page's real data source.
 * ---------------------------------------------------------------------- */

// ── Get All Customers ─────────────────────────────────────────────
// GET {{base_url}}/customers/admin/get-all?page=&limit=&search=&status=
export async function getAllCustomers({ page = 1, limit = 50, search, status } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        if (status) params.status = status;
        const { data } = await api.get('/customers/admin/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get One Customer ──────────────────────────────────────────────
// GET {{base_url}}/customers/admin/:customerId
export async function getCustomerById(customerId) {
    try {
        if (!customerId) throw new Error('customerId is required');
        const { data } = await api.get(`/customers/admin/${customerId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getAllCustomers,
    getCustomerById,
};
