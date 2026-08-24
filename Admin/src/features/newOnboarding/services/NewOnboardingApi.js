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

/* -------------------------------------------------------------------------
 * Response shape (confirmed from Postman)
 *
 * { success, message, data: { total, totalPages, page, limit, data: [
 *   {
 *     _id, brandId, attemptNumber, score, status ("MANUAL_REVIEW", ...),
 *     flags: { panVerified, gstVerified, bankVerified, panMatchedWithGST,
 *       panMatchedWithBrand, gstMatchedWithBrand, bankMatched,
 *       businessEntityMatched, gstActive, duplicatePAN, duplicateGST,
 *       duplicateBank, duplicateWhatsapp, duplicateEmail },
 *     nameMatch: { panGstScore, panBrandScore, gstBrandScore, averageScore },
 *     bankNameMatch: { bankPanScore, bankGstScore, bankBrandScore, highestScore },
 *     entityMatch: { gstConstitution, brandEntityType, matched },
 *     duplicateDetails: { panBrandIds, gstBrandIds, bankBrandIds,
 *       whatsappBrandIds, emailBrandIds },
 *     remarks: string[],
 *     verifiedAt, verifiedBy, verifiedByAdminId,
 *     rejectedAt, rejectedBy, rejectedByAdminId, rejectionReason,
 *     reviewedByAdminId, reviewedAt, adminApprovedAt,
 *     revokedBy, revokedByAdminId, revokedAt, revokeReason,
 *     isReviewed, isAdminApproved, isRejected, isRevoked, isSuperseded, isDeleted,
 *     createdAt, updatedAt,
 *     brand: { _id, brandName, legalBusinessName, uniqueId, merchantId,
 *       logo, status, isApproved, isReviewed, isRejected, email, mobile,
 *       whatsappNumber, businessEntityType, businessRegistrationStatus,
 *       verificationAttemptCount },
 *     vendor: { _id, name, email, mobile, role, currentScreen },
 *     reviewedByAdmin, verifiedByAdmin, rejectedByAdmin, revokedByAdmin,
 *     rejectionCount, revocationCount, submissionCount,
 *   }
 * ] } }
 * ---------------------------------------------------------------------- */

// ── List Brand Verifications ──────────────────────────────────
// GET {{TryDood2.0BaseUrl}}/brands/admin/verifications?page=&limit=&search=
// Confirmed from Postman. Query params:
//   page   — number ≥ 1, default 1
//   limit  — number 1-100, default 10
//   search — regex across brand.brandName, brand.legalBusinessName (and
//            possibly more fields — the Postman param description was cut
//            off after "legalB...", so there may be additional fields
//            matched server-side).
export async function getBrandVerifications({ page = 1, limit = 10, search = '' } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        const { data } = await api.get('/brands/admin/verifications', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Review a brand verification (approve / reject / mark reviewed) ──
// PUT {{TryDood2.0BaseUrl}}/brands/admin/verifications/:brandId/review
// Confirmed from Postman for three actions:
//   { action: "APPROVED" }                          — Case A: system already APPROVED
//   { action: "APPROVED", note }                     — Case B: manual override, note optional
//   { action: "REJECTED", rejectionReason }          — Case C: rejectionReason required
//   { action: "REVIEWED" }                           — Case D: toggles the isReviewed flag
// NOTE: "Force Reviewed flag" (Case D2) and "Revoke Approval" (Case E) were
// listed in the collection but their request bodies were not shared — they
// are intentionally not wired up here yet.
export async function reviewBrandVerification(brandId, { action, note, rejectionReason } = {}) {
    try {
        if (!brandId) throw new Error('brandId is required');
        if (!action) throw new Error('action is required');
        const payload = { action };
        if (note) payload.note = note;
        if (rejectionReason) payload.rejectionReason = rejectionReason;
        const { data } = await api.put(`/brands/admin/verifications/${brandId}/review`, payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getBrandVerifications,
    reviewBrandVerification,
};
