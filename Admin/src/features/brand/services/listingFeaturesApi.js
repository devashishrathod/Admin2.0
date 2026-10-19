import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';

// ── Listing Features (a.k.a. Brand Features) ─────────────────────
// Same endpoints the VenderPanel's Listing Features tab uses; here the
// admin acts on behalf of a brand, so brandId is sent on every write
// (same convention as showcaseApi.js).

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../../features/auth/store/authStore');
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

function handleError(error) {
    const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Something went wrong. Please try again.';
    throw new Error(message);
}

export const LISTING_FEATURE_LIMITS = { title: 20, description: 300 };

// ── Get All ─────────────────────────────────────────────────────
// GET {{TryDood2.0BaseUrl}}/brandFeatures/get-all?brandId=xxx
// Response: { success, message, data: { total, totalPages, page, limit, data: [...] } }
export async function getListingFeatures(brandId) {
    try {
        const { data } = await api.get('/brandFeatures/get-all', { params: { brandId } });
        const list = data?.data?.data ?? data?.data ?? [];
        return Array.isArray(list) ? list : [];
    } catch (error) {
        handleError(error);
    }
}

// ── Add ─────────────────────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/brandFeatures/add   (multipart/form-data)
// fields: brandId, title, description, isActive, icon (file, required)
export async function addListingFeature(brandId, { title, description = '', isActive = true, iconFile }) {
    try {
        if (!title) throw new Error('Title is required');
        if (!iconFile) throw new Error('Icon file is required');

        const formData = new FormData();
        formData.append('brandId', brandId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('isActive', String(isActive));
        formData.append('icon', iconFile);

        // No explicit Content-Type — the browser adds the multipart boundary.
        const { data } = await api.post('/brandFeatures/add', formData);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update ──────────────────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/brandFeatures/update/:id   (multipart/form-data)
// fields: title, description, isActive, icon (optional — omit to keep the
// current icon)
export async function updateListingFeature(featureId, { brandId, title, description, isActive, iconFile } = {}) {
    try {
        if (!featureId) throw new Error('featureId is required');

        const formData = new FormData();
        if (brandId) formData.append('brandId', brandId);
        if (title !== undefined) formData.append('title', title);
        if (description !== undefined) formData.append('description', description);
        if (isActive !== undefined) formData.append('isActive', String(!!isActive));
        if (iconFile) formData.append('icon', iconFile);

        const { data } = await api.put(`/brandFeatures/update/${featureId}`, formData);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete ──────────────────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/brandFeatures/delete/:id
export async function deleteListingFeature(featureId, brandId) {
    try {
        if (!featureId) throw new Error('featureId is required');
        const { data } = await api.delete(`/brandFeatures/delete/${featureId}`, {
            params: brandId ? { brandId } : undefined,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}
