import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';

/* -------------------------------------------------------------------------
 * Brand Onboarding v2 — admin side.
 * Source: brand_onboarding_v2_admin_panel_guide.md (+ the vendor panel
 * design's per-screen notes).
 *
 * ⚠️ The guide is marked "DESIGN — not implemented yet / planned contract".
 * Paths and bodies follow it exactly; once the backend ships, check the
 * live responses (especially the `status` shape) against the normalizers
 * in onboardingFlow.js.
 *
 * Rules from the guide:
 *  - Onboarding APIs take `?brandId=` as a QUERY param for the admin.
 *  - Existing APIs (subBrands, locations, workHours, brandFeatures,
 *    showcase, grant) take `brandId` / `subBrandId` in the BODY.
 *  - The panel never sends currentScreen; it follows the server's.
 *  - Branch on `details.code`, never on the message — every error thrown
 *    here carries `code`, `details` and `status`.
 * ---------------------------------------------------------------------- */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../auth/store/authStore');
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/** Error with the backend's `details.code` attached — see guide §14. */
export class OnboardingError extends Error {
    constructor(message, { code, details, status } = {}, cause) {
        super(message, { cause });
        this.name = 'OnboardingError';
        this.code = code || null;
        this.details = details || null;
        this.status = status || null;
    }
}

function fail(error) {
    const res = error?.response;
    const data = res?.data || {};
    const message = data.message || data.error || error?.message || 'Something went wrong. Please try again.';
    throw new OnboardingError(message, { code: data?.details?.code || data?.code, details: data.details, status: res?.status }, error);
}

async function call(fn) {
    try {
        const { data } = await fn();
        return data;
    } catch (error) {
        return fail(error);
    }
}

const q = (brandId) => ({ params: { brandId } });
// Multipart: no explicit Content-Type, so the browser adds the boundary.
const multipart = { headers: { 'Content-Type': undefined } };

/* ---- Create + status (guide §5.1, §4) ------------------------------ */

// POST /brands/admin/onboarding/create { whatsappNumber, brandName? }
// → { brandId, userId, currentScreen: "BUSINESS_NAME" }. 409 VENDOR_ALREADY_EXISTS.
export const createOnboardingBrand = ({ whatsappNumber, brandName }) =>
    call(() => api.post('/brands/admin/onboarding/create', brandName ? { whatsappNumber, brandName } : { whatsappNumber }));

// GET /brands/onboarding/status?brandId= → currentScreen, steps, kycPath, editMode, items, deed …
export const getOnboardingStatus = (brandId) => call(() => api.get('/brands/onboarding/status', q(brandId)));

// GET /brands/get?brandId= — full brand (names, category, legal, outlets …)
export const getOnboardingBrand = (brandId) => call(() => api.get('/brands/get', q(brandId)));

// GET /brands/verifications/history?brandId=
export const getOnboardingHistory = (brandId) =>
    call(() => api.get('/brands/verifications/history', { params: { brandId, page: 1, limit: 50 } }));

// GET /brands/profile-strength?brandId= → { score, level, sections[].items[] }
export const getProfileStrength = (brandId) => call(() => api.get('/brands/profile-strength', q(brandId)));

/* ---- Business identity (design 02–05) ------------------------------ */

// POST /brands/onboarding/add-basic-details?brandId= { step, … }
//   BUSINESS_NAME            { legalBusinessName (3–120), brandName? (2–120) }
//   BUSINESS_CATEGORY        { subCategoryId }
//   REGISTRATION_STATUS      { businessRegistrationStatus }
//   REGISTRATION_ENTITY_TYPE { businessEntityType }
// `step` = the screen being saved (not the next one).
export const addBasicDetails = (brandId, step, fields) =>
    call(() => api.post('/brands/onboarding/add-basic-details', { step, ...fields }, q(brandId)));

/* ---- Moving on (continue / skip / submit) -------------------------- */

// POST /brands/onboarding/continue?brandId= → 422 ONBOARDING_STEP_INCOMPLETE { missing }
export const continueOnboarding = (brandId) => call(() => api.post('/brands/onboarding/continue', {}, q(brandId)));

// POST /brands/onboarding/skip?brandId= { screen } — skippable screens only (422 SCREEN_NOT_SKIPPABLE)
export const skipOnboardingScreen = (brandId, screen) =>
    call(() => api.post('/brands/onboarding/skip', { screen }, q(brandId)));

// POST /brands/onboarding/submit?brandId= → UNDER_REVIEW (system verify runs here)
export const submitOnboarding = (brandId) => call(() => api.post('/brands/onboarding/submit', {}, q(brandId)));

/* ---- KYC documents (design 06, guide §7) --------------------------- */

// GET /brands/onboarding/documents?brandId= → { documents, slotHint }
export const getKycDocuments = (brandId) => call(() => api.get('/brands/onboarding/documents', q(brandId)));

// POST /brands/onboarding/documents?brandId= — multipart file + slot + docType. Filled slot = replace.
export const uploadKycDocument = (brandId, { file, slot, docType }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', slot);
    if (docType) fd.append('docType', docType);
    return call(() => api.post('/brands/onboarding/documents', fd, { ...q(brandId), ...multipart }));
};

// PUT /brands/admin/onboarding/documents/:documentId/review { status: ACCEPTED } | { status: REJECTED, reason }
export const reviewKycDocument = (documentId, { status, reason }) =>
    call(() =>
        api.put(`/brands/admin/onboarding/documents/${documentId}/review`, status === 'REJECTED' ? { status, reason } : { status })
    );

/* ---- PAN / GST / bank (design 07–09) ------------------------------- */
// verify-* (paid provider call) → { verificationId, isVerified, nameOnRecord, … }
// then add-*-details { verificationId } — only that. isVerified is never sent.

export const verifyPan = (brandId, pan) =>
    call(() => api.post('/verification/brands/onboarding/verify-pan', { pan }, q(brandId)));
export const savePan = (brandId, verificationId) =>
    call(() => api.post('/brands/onboarding/add-pan-details', { verificationId }, q(brandId)));

export const verifyGst = (brandId, gstNumber) =>
    call(() => api.post('/verification/brands/onboarding/verify-gst', { gstNumber }, q(brandId)));
export const saveGst = (brandId, verificationId) =>
    call(() => api.post('/brands/onboarding/add-gst-details', { verificationId }, q(brandId)));

export const verifyBank = (brandId, { accountNumber, ifscCode, beneficiaryName }) =>
    call(() =>
        api.post(
            '/verification/brands/onboarding/verify-bank',
            beneficiaryName ? { accountNumber, ifscCode, beneficiaryName } : { accountNumber, ifscCode },
            q(brandId)
        )
    );
export const saveBank = (brandId, verificationId) =>
    call(() => api.post('/brands/onboarding/add-bank-details', { verificationId }, q(brandId)));

/* ---- Partnership deed, offline (guide §12) ------------------------- */

// PUT /brands/admin/:brandId/deed — multipart `file` (signed copy) + `note` (required) → { deed }
export const recordOfflineDeed = (brandId, { file, note }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('note', note);
    return call(() => api.put(`/brands/admin/${brandId}/deed`, fd, multipart));
};

/* ---- Billing address + plan (guide §8, §9) ------------------------- */

// GET /brands/billing-address?brandId= → { billingAddress, suggestedAddress, gstAddress, gstin, gstStateCode }
export const getBillingAddress = (brandId) => call(() => api.get('/brands/billing-address', q(brandId)));

// PUT /brands/billing-address?brandId= — outlet-address fields + coordinates [lng, lat]
export const saveBillingAddress = (brandId, address) =>
    call(() => api.put('/brands/billing-address', address, q(brandId)));

// POST /subscribeds/admin/grant { brandId, subscriptionId, paymentMode, note, … } — 422 BILLING_ADDRESS_REQUIRED
export const grantPlan = (payload) => call(() => api.post('/subscribeds/admin/grant', payload));

/* ---- Brand setup (design 12–14) ------------------------------------ */

// PUT /brands/update?brandId= — multipart logo / coverImage + description, email, mobile.
// Doesn't move the screen; call continueOnboarding after.
export const updateBrandBasics = (brandId, { logo, coverImage, description, email, mobile }) => {
    const fd = new FormData();
    if (logo) fd.append('logo', logo);
    if (coverImage) fd.append('coverImage', coverImage);
    if (description !== undefined) fd.append('description', description);
    if (email) fd.append('email', email);
    if (mobile) fd.append('mobile', mobile);
    return call(() => api.put('/brands/update', fd, { ...q(brandId), ...multipart }));
};

// POST /brandFeatures/add — multipart { brandId, title, description?, icon? }
export const addBrandFeature = (brandId, { title, description, icon }) => {
    const fd = new FormData();
    fd.append('brandId', brandId);
    fd.append('title', title);
    if (description) fd.append('description', description);
    if (icon) fd.append('icon', icon);
    return call(() => api.post('/brandFeatures/add', fd, multipart));
};

// GET /brandFeatures/get-all?brandId=
export const getBrandFeatures = (brandId) => call(() => api.get('/brandFeatures/get-all', q(brandId)));

// GET /subBrands/get-all?brandId= — the brand's outlets
export const getOutlets = (brandId) => call(() => api.get('/subBrands/get-all', { params: { brandId, page: 1, limit: 50 } }));

// POST /subBrands/signUp-with-whatsapp { brandId, whatsappNumber, isFirstOutlet, outletType }
export const addOutlet = ({ brandId, whatsappNumber, isFirstOutlet, outletType = 'OUTLET' }) =>
    call(() => api.post('/subBrands/signUp-with-whatsapp', { brandId, whatsappNumber, isFirstOutlet: Boolean(isFirstOutlet), outletType }));

// POST /locations/create { subBrandId, isSubBrandAddress: true, addressLine1, city, state, zipcode, coordinates[lng,lat], … }
export const addOutletAddress = (subBrandId, address) =>
    call(() => api.post('/locations/create', { ...address, subBrandId, isSubBrandAddress: true, addressType: 'WORK' }));

// POST /workHours/upsert { subBrandId, monday … sunday: { isOpen, start, end } }
export const saveOutletHours = (subBrandId, days) => call(() => api.post('/workHours/upsert', { subBrandId, ...days }));
