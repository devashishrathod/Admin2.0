import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';

// ── Base URL ────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

// Attach auth token automatically
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
 * GET {{base_url}}/brands/get?brandId=...
 * Matches the "getBrandDetails" Postman request — returns ONE brand with
 * the fully populated pan / gst / bank / subscribed / firstSubBrand blocks.
 * ---------------------------------------------------------------------- */
export async function getBrandDetails(brandId) {
    try {
        const params = {};
        if (brandId) params.brandId = brandId;
        const { data } = await api.get('/brands/get', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// kept so any existing `getBrands(...)` call sites keep working
export const getBrands = getBrandDetails;

/* -------------------------------------------------------------------------
 * GET {{base_url}}/brands/admin/get-all
 * Paginated brand list for the admin panel (the "Brands" list page).
 * ---------------------------------------------------------------------- */
export async function getAllBrands({ page = 1, limit = 10, search = '', status } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        if (status) params.status = status;
        const { data } = await api.get('/brands/admin/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * PUT {{base_url}}/brands/admin/:brandId/status
 * Used for approve / reject / activate / deactivate from the admin panel.
 * `reason` is only sent when present (e.g. rejection reason).
 *
 * Backend requires both:
 *   - isActive (boolean)         → derived from `status` unless passed explicitly
 *   - hideFromCustomers (boolean) → always sent, defaults to false
 * ---------------------------------------------------------------------- */
export async function updateBrandStatus(brandId, status, reason = '', isActive, hideFromCustomers = false) {
    try {
        const resolvedIsActive =
            isActive !== undefined
                ? isActive
                : ['ACTIVE', 'APPROVED'].includes(status);

        const body = {
            status,
            isActive: resolvedIsActive,
            hideFromCustomers,
        };
        if (reason) body.reason = reason;

        const { data } = await api.put(`/brands/admin/${brandId}/status`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * PUT {{base_url}}/brands/admin/:brandId/status — Active / Deactive / Hide.
 * Body per the super admin API doc ("Brands — status aur curation"):
 *   { isActive, hideFromCustomers, reason? }
 * Two different switches: isActive:false shuts the vendor out;
 * hideFromCustomers:true only takes the brand off the customer listing.
 * `reason` is accepted only when deactivating (422 with isActive:true).
 * ---------------------------------------------------------------------- */
export async function setBrandAccess(brandId, { isActive, hideFromCustomers, reason } = {}) {
    try {
        const body = { isActive: Boolean(isActive), hideFromCustomers: Boolean(hideFromCustomers) };
        if (!isActive && reason) body.reason = reason;
        const { data } = await api.put(`/brands/admin/${brandId}/status`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * PUT {{base_url}}/brands/admin/real-dummy/:brandId — "Coming soon" on a
 * real, approved brand (super admin API doc, 2026-10-23). Customers see it
 * like a dummy brand until launch; the DB's isDummy never changes.
 *   ON : { isRealDummy: true,  note }   — note required, max 500, internal
 *   OFF: { isRealDummy: false }         — a note here is a 422
 * ---------------------------------------------------------------------- */
export async function setBrandComingSoon(brandId, { isRealDummy, note } = {}) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const body = { isRealDummy: Boolean(isRealDummy) };
        if (isRealDummy) body.note = String(note || '').trim();
        const { data } = await api.put(`/brands/admin/real-dummy/${brandId}`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * GET {{base_url}}/brands/admin/top-brands
 * ---------------------------------------------------------------------- */
export async function getTopBrands(params = {}) {
    try {
        const { data } = await api.get('/brands/admin/top-brands', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * PUT {{base_url}}/brands/admin/top-brands/:brandId
 * body: { brandId, isTopBrand, topOrder }
 * ---------------------------------------------------------------------- */
export async function updateTopBrand(brandId, { isTopBrand, topOrder }) {
    try {
        const body = { brandId, isTopBrand, topOrder };
        const { data } = await api.put(`/brands/admin/top-brands/${brandId}`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * POST {{base_url}}/brands/admin/create
 * multipart/form-data: `data` (full brand body as a JSON string) + files
 * (logo, listingFeatures[i].icon, showcase[i].files) — see
 * buildBrandFormData in features/brand/add/brandFormConfig.js.
 * NOTE: path and file keys not confirmed yet — match them to the backend.
 * ---------------------------------------------------------------------- */
export async function createBrand(formData) {
    try {
        const { data } = await api.post('/brands/admin/create', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * PUT {{base_url}}/brands/update?brandId=   (super admin API doc #27, A-11)
 * multipart — every field optional: brandName, email, mobile, description,
 * logo (file). 🔴 `email` / `mobile` are the vendor ACCOUNT's keys and
 * drop its verified flag, so callers send them only when they changed.
 * ---------------------------------------------------------------------- */
export async function updateBrand(brandId, { brandName, email, mobile, description, logo } = {}) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const fd = new FormData();
        if (brandName) fd.append('brandName', brandName);
        if (email) fd.append('email', email);
        if (mobile) fd.append('mobile', mobile);
        if (description !== undefined) fd.append('description', description);
        if (logo) fd.append('logo', logo);
        const { data } = await api.put('/brands/update', fd, {
            params: { brandId },
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* -------------------------------------------------------------------------
 * GET {{base_url}}/subBrands/get-all?brandId=   (doc #29) — every outlet of
 * a brand, all pages (limit max 100). The brand detail only carries the
 * first outlet. Each row has `manager.isWhatsappVerified` / `isActive`.
 * "No any subbrand found" (404) is the empty state → [].
 * ---------------------------------------------------------------------- */
export async function getBrandOutlets(brandId) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const fetchPage = (page) =>
            api.get('/subBrands/get-all', { params: { brandId, page, limit: 100, sortBy: 'joinedDate', sortOrder: 'asc' } });
        const { data: first } = await fetchPage(1);
        const totalPages = Number(first?.data?.totalPages) || 1;
        const more = await Promise.all(Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)));
        // Only this brand's outlets — without brandId the API returns every
        // brand's outlets, so rows are also checked here in case the filter
        // is ever dropped.
        return [first, ...more.map((r) => r.data)]
            .flatMap((res) => res?.data?.data ?? [])
            .filter((o) => String(o.brandId?._id ?? o.brandId) === String(brandId));
    } catch (error) {
        if (error?.response?.status === 404) return [];
        handleError(error);
    }
}

/* GET {{base_url}}/locations/get/:id   (doc #33) — one address (an
 * outlet's `locationId`): addressLine1/2, landmark, city, district, state,
 * zipcode, country, formattedAddress, addressType, geo.coordinates
 * [lng, lat]. */
export async function getLocation(locationId) {
    try {
        if (!locationId) throw new Error('locationId is required');
        const { data } = await api.get(`/locations/get/${locationId}`);
        return data?.data ?? null;
    } catch (error) {
        if (error?.response?.status === 404) return null;
        handleError(error);
    }
}

/* PUT {{base_url}}/subBrands/update/:subBrandId   (doc #30)
 * body (all optional): email (manager account), outletType
 * (OUTLET | FRANCHISE — switches plan pool), joinedDate, description,
 * isActive (applied only when sent). */
export async function updateOutlet(subBrandId, body = {}) {
    try {
        if (!subBrandId) throw new Error('subBrandId is required');
        const { data } = await api.put(`/subBrands/update/${subBrandId}`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* PATCH {{base_url}}/subBrands/:subBrandId/whatsapp-number   (doc #28a)
 * Fixes a wrong number BEFORE the manager verifies (409 after). A 200 can
 * still carry otpSent: false — the number changed either way. */
export async function updateOutletWhatsapp(subBrandId, whatsappNumber) {
    try {
        if (!subBrandId) throw new Error('subBrandId is required');
        const { data } = await api.patch(`/subBrands/${subBrandId}/whatsapp-number`, { whatsappNumber });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* POST {{base_url}}/subBrands/signUp-with-whatsapp   (doc #28)
 * Repeating the call for an unverified outlet of the same brand resends
 * the code — no new outlet, no new slot (`data.isNewOutlet: false`). */
export async function resendOutletOtp(brandId, whatsappNumber) {
    try {
        const { data } = await api.post('/subBrands/signUp-with-whatsapp', { brandId, whatsappNumber });
        return data;
    } catch (error) {
        handleError(error);
    }
}

/* POST {{base_url}}/auth/verify-otp-whatsapp   (doc #4) — the admin enters
 * the 6-digit code the outlet manager received on WhatsApp; success marks
 * the manager's account verified (isWhatsappVerified: true).
 * Uses a bare axios call on purpose:
 *   - a wrong/expired code is a 401 here, and the shared `api` instance
 *     treats any 401 as "admin session expired" and logs out;
 *   - the response carries a token for the MANAGER's account — it is
 *     thrown away, never stored.
 * Errors: 401 wrong / expired code, 403 after 5 wrong tries (code is
 * deleted — resend), 404 number not found. */
export async function verifyOutletOtp(whatsappNumber, otp) {
    try {
        const { data } = await axios.post(
            `${BASE_URL}/auth/verify-otp-whatsapp`,
            { whatsappNumber: String(whatsappNumber || ''), otp: String(otp || ''), role: 'SUB_VENDOR' },
            { headers: { 'Content-Type': 'application/json' } }
        );
        return { success: Boolean(data?.success), message: data?.message || 'Outlet verified.' };
    } catch (error) {
        handleError(error);
    }
}

export default {
    createBrand,
    getBrandDetails,
    getBrands,
    getAllBrands,
    updateBrandStatus,
    getTopBrands,
    updateTopBrand,
    updateBrand,
    getBrandOutlets,
    getLocation,
    updateOutlet,
    updateOutletWhatsapp,
    resendOutletOtp,
    verifyOutletOtp,
};