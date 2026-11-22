import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';
import { throwApiError } from '../../../lib/apiError';

/* -------------------------------------------------------------------------
 * Brand Onboarding v2 — admin side (admin onboards a brand for the vendor).
 * Admin guide §5 / §6 · super admin API doc #25b–#25j · vendor API doc
 * #20–#34 (the same routes, called by the admin with `?brandId=`).
 *
 * Rules:
 *  - Onboarding APIs take `?brandId=` as a QUERY param for the admin.
 *  - Existing APIs (subBrands, locations, workHours, brandFeatures,
 *    showcase, grant) take `brandId` / `subBrandId` in the BODY.
 *  - The panel never sends currentScreen or legalBusinessName — the server
 *    owns both (the legal name comes from the PAN / GST record).
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

// Every error thrown here is an ApiError (status, code, details) — lib/apiError.js.
async function call(fn) {
    try {
        const { data } = await fn();
        return data;
    } catch (error) {
        return throwApiError(error);
    }
}

const q = (brandId) => ({ params: { brandId } });
// Multipart: no explicit Content-Type, so the browser adds the boundary.
const multipart = { headers: { 'Content-Type': undefined } };

/* ---- Create + status (guide §5.1, §4) ------------------------------ */

// POST /brands/admin/onboarding/create { whatsappNumber, brandName? } (#25h) → 201
// { userId, brandId, whatsappNumber, brandName, currentScreen, accountState, createdBy }.
// 409 VENDOR_ALREADY_EXISTS with details { userId, brandId, accountState }.
export const createOnboardingBrand = ({ whatsappNumber, brandName }) =>
    call(() => api.post('/brands/admin/onboarding/create', brandName ? { whatsappNumber, brandName } : { whatsappNumber }));

// GET /brands/onboarding/status?brandId= → currentScreen, kycPath, editMode, groups[].screens[],
// progress, items, editable, deed, verification, systemChecks, profileStrength, limits
export const getOnboardingStatus = (brandId) => call(() => api.get('/brands/onboarding/status', q(brandId)));

// GET /brands/get?brandId= — full brand (names, category, legal, outlets …)
export const getOnboardingBrand = (brandId) => call(() => api.get('/brands/get', q(brandId)));

// GET /brands/verifications/history?brandId=
export const getOnboardingHistory = (brandId) =>
    call(() => api.get('/brands/verifications/history', { params: { brandId, page: 1, limit: 50 } }));

// Profile strength comes inside the status (status.profileStrength); GET /brands/profile-strength isn't needed.

/* ---- Basic details (BRAND_NAME → REGISTRATION_ENTITY_TYPE) ---------- */

// POST /brands/onboarding/add-basic-details?brandId= { step, … } → { brand, currentScreen }
//   BRAND_NAME               { brandName }                    (limits.brandNameMin/MaxLength)
//   BUSINESS_CATEGORY        { categoryId, subCategoryIds[] } (≤ limits.maxSubCategories, one category)
//   REGISTRATION_STATUS      { kycPath: GST | NO_GST | UNREGISTERED }
//   REGISTRATION_ENTITY_TYPE { businessEntityType }
// `step` = the screen being saved (not the next one). Saving an earlier
// screen again is fine — the current screen doesn't move.
export const addBasicDetails = (brandId, step, fields) =>
    call(() => api.post('/brands/onboarding/add-basic-details', { step, ...fields }, q(brandId)));

/* ---- Moving on (continue / skip / submit) -------------------------- */

// POST /brands/onboarding/continue?brandId= → { currentScreen } · 422 ONBOARDING_STEP_INCOMPLETE { screen, missing }
export const continueOnboarding = (brandId) => call(() => api.post('/brands/onboarding/continue', {}, q(brandId)));

// POST /brands/onboarding/skip?brandId= { screen } — only KYC_DOCUMENTS, BANK_VERIFICATION,
// BRAND_PROFESSIONAL_DETAILS, and only the current screen (409 ONBOARDING_SCREEN_MISMATCH).
export const skipOnboardingScreen = (brandId, screen) =>
    call(() => api.post('/brands/onboarding/skip', { screen }, q(brandId)));

// POST /brands/onboarding/submit?brandId= → { currentScreen: UNDER_REVIEW, attemptNumber, submittedAt, systemChecks }
// 422 ONBOARDING_STEP_INCOMPLETE missing[] (e.g. OUTLET_NOT_VERIFIED:<id>, OUTLET_LOCATION:<id>).
export const submitOnboarding = (brandId) => call(() => api.post('/brands/onboarding/submit', {}, q(brandId)));

/* ---- Business documents (KYC_DOCUMENTS) ---------------------------- */

// GET /brands/onboarding/documents?brandId= → { documents[], hints[] (docType codes), limit, count }
export const getKycDocuments = (brandId) => call(() => api.get('/brands/onboarding/documents', q(brandId)));

// POST /brands/onboarding/documents?brandId= — multipart `file` + `title` (2–80)
// + `docType` only when picked from a hint (a custom title is stored as OTHER).
export const addKycDocument = (brandId, { file, title, docType }) => {
    const fd = new FormData();
    fd.append('title', title);
    if (docType) fd.append('docType', docType);
    fd.append('file', file);
    return call(() => api.post('/brands/onboarding/documents', fd, { ...q(brandId), ...multipart }));
};

// PUT /brands/onboarding/documents/:documentId?brandId= — rename and / or replace the file
// (a new file comes back with a NEW _id).
export const updateKycDocument = (brandId, documentId, { title, file }) => {
    const fd = new FormData();
    if (title) fd.append('title', title);
    if (file) fd.append('file', file);
    return call(() => api.put(`/brands/onboarding/documents/${documentId}`, fd, { ...q(brandId), ...multipart }));
};

// DELETE /brands/onboarding/documents/:documentId?brandId= → { documentsStatus, count }
export const deleteKycDocument = (brandId, documentId) =>
    call(() => api.delete(`/brands/onboarding/documents/${documentId}`, q(brandId)));

// PUT /brands/admin/onboarding/documents/:documentId/review (#25d) { status: ACCEPTED } | { status: REJECTED, reason ≤ 500 }
export const reviewKycDocument = (documentId, { status, reason }) =>
    call(() =>
        api.put(`/brands/admin/onboarding/documents/${documentId}/review`, status === 'REJECTED' ? { status, reason } : { status })
    );

/* ---- PAN / GST / bank ---------------------------------------------- */
// verify-* is a PAID provider call (only on an explicit "Verify" press; the
// same value within the reuse window comes back `reused: true` for free).
// A failed check is still 200 with isVerified: false + the provider message.
// Then add-*-details { verificationId } — never isVerified or provider data.

// → { verificationId, isVerified, nameOnRecord, panType, suggestedEntity }. 422 PAN_NOT_IN_GSTIN on the GST path.
export const verifyPan = (brandId, pan) =>
    call(() => api.post('/verification/brands/onboarding/verify-pan', { pan }, q(brandId)));
export const savePan = (brandId, verificationId) =>
    call(() => api.post('/brands/onboarding/add-pan-details', { verificationId }, q(brandId)));

// → { verificationId, isVerified, nameOnRecord, isActive, constitution, suggestedEntity, panFromGstin, gstStateCode, details.address }
export const verifyGst = (brandId, gstNumber) =>
    call(() => api.post('/verification/brands/onboarding/verify-gst', { gstNumber }, q(brandId)));
export const saveGst = (brandId, verificationId) =>
    call(() => api.post('/brands/onboarding/add-gst-details', { verificationId }, q(brandId)));

// ₹1 penny drop. Never send beneficiaryName — stage rejects it ("beneficiaryName" is not allowed).
export const verifyBank = (brandId, { accountNumber, ifscCode }) =>
    call(() => api.post('/verification/brands/onboarding/verify-bank', { accountNumber, ifscCode }, q(brandId)));
export const saveBank = (brandId, { verificationId, accountType }) =>
    call(() =>
        api.post('/brands/onboarding/add-bank-details', accountType ? { verificationId, accountType } : { verificationId }, q(brandId))
    );

/* ---- Owner verification (OWNER_VERIFICATION, not-registered path) --- */
// POST /brands/onboarding/owner-verification?brandId= → { ownerVerification, legalBusinessName, currentScreen }

// PAN: verify-pan first, then { method: "PAN", verificationId }.
export const saveOwnerPan = (brandId, verificationId) =>
    call(() => api.post('/brands/onboarding/owner-verification', { method: 'PAN', verificationId }, q(brandId)));

// ID document: multipart { method: "ID_DOCUMENT", idType, file } (PDF / JPG / PNG, max 5 MB).
export const saveOwnerIdDocument = (brandId, { idType, file }) => {
    const fd = new FormData();
    fd.append('method', 'ID_DOCUMENT');
    fd.append('idType', idType);
    fd.append('file', file);
    return call(() => api.post('/brands/onboarding/owner-verification', fd, { ...q(brandId), ...multipart }));
};

/* ---- Partnership deed, offline (guide §12) ------------------------- */

// PUT /brands/admin/:brandId/deed (#25g) — multipart `file` (signed copy) + `note` (2–1000) → { deed, currentScreen }.
// 409 DEED_ALREADY_ACCEPTED when the vendor accepted it themselves; a repeat on an ADMIN deed replaces the proof.
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

// POST /subBrands/signUp-with-whatsapp { brandId, whatsappNumber | useOwnerNumber, isFirstOutlet, outletType }
// → { isNewOutlet, otpSent, isVerified, verifiedVia, subBrand … }. useOwnerNumber: the owner
// manages the outlet on their own number (verified at once, no OTP).
// 403 OUTLET_ALREADY_VERIFIED. Location / hours return 409 OUTLET_NOT_VERIFIED until the manager verifies.
export const addOutlet = ({ brandId, whatsappNumber, useOwnerNumber, isFirstOutlet, outletType = 'OUTLET' }) =>
    call(() =>
        api.post('/subBrands/signUp-with-whatsapp', {
            brandId,
            ...(useOwnerNumber ? { useOwnerNumber: true } : { whatsappNumber }),
            isFirstOutlet: Boolean(isFirstOutlet),
            outletType,
        })
    );

// POST /locations/create { subBrandId, isSubBrandAddress: true, addressLine1, city, state, zipcode, coordinates[lng,lat], … }
export const addOutletAddress = (subBrandId, address) =>
    call(() => api.post('/locations/create', { ...address, subBrandId, isSubBrandAddress: true, addressType: 'WORK' }));

// POST /workHours/upsert { subBrandId, monday … sunday: { isOpen, start, end } }
export const saveOutletHours = (subBrandId, days) => call(() => api.post('/workHours/upsert', { subBrandId, ...days }));
