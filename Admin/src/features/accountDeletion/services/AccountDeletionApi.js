import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

// Attach auth token automatically (same pattern as CustomerApi.js)
api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../auth/store/authStore');
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Same message normalization as the other services, but this one also
// keeps the HTTP status and `details` (code + holds) — the deletion screen
// needs them to tell NOT_SCHEDULED from PURGE_ON_HOLD.
function handleError(error) {
    const body = error?.response?.data;
    const err = new Error(
        body?.message ||
        body?.error ||
        error?.message ||
        'Something went wrong. Please try again.'
    );
    err.status = error?.response?.status;
    err.code = body?.details?.code;
    err.holds = Array.isArray(body?.details?.holds) ? body.details.holds : [];
    throw err;
}

/* -------------------------------------------------------------------------
 * Customer account deletions (API doc §15b, release v1.12 guide §1).
 * ---------------------------------------------------------------------- */

// ── List deletions ──────────────────────────────────────────
// GET {{base_url}}/users/admin/deletions?state=&search=&page=&limit=
// state: DELETION_SCHEDULED | DELETED (omit for both). Empty → 200 + [].
export async function getAccountDeletions({ state, search, page = 1, limit = 20 } = {}) {
    try {
        const params = { page, limit };
        if (state) params.state = state;
        if (search) params.search = search;
        const { data } = await api.get('/users/admin/deletions', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Restore ─────────────────────────────────────────────────
// PATCH {{base_url}}/users/admin/:userId/deletion/restore   body { reason }
export async function restoreAccountDeletion(userId, reason) {
    try {
        if (!userId) throw new Error('userId is required');
        const { data } = await api.patch(`/users/admin/${userId}/deletion/restore`, { reason });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete now ──────────────────────────────────────────────
// PATCH {{base_url}}/users/admin/:userId/deletion/delete-now   body { reason }
// Irreversible. 409 PURGE_ON_HOLD carries details.holds[].
export async function deleteAccountNow(userId, reason) {
    try {
        if (!userId) throw new Error('userId is required');
        const { data } = await api.patch(`/users/admin/${userId}/deletion/delete-now`, { reason });
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getAccountDeletions,
    restoreAccountDeletion,
    deleteAccountNow,
};
