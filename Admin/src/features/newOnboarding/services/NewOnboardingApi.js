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

// ── Review a brand verification (approve / reject / reviewed flag / revoke) ──
// PUT {{TryDood2.0BaseUrl}}/brands/admin/verifications/:brandId/review
// Confirmed from Postman for five actions:
//   { action: "APPROVED" }                          — Case A: system already APPROVED
//   { action: "APPROVED", note }                     — Case B: manual override, note optional
//   { action: "REJECTED", rejectionReason }          — Case C: rejectionReason required
//   { action: "REVIEWED" }                           — Case D: toggles the isReviewed flag
//   { action: "REVIEWED", isReviewed }                — Case D2: force the isReviewed flag to true/false
//   { action: "REVOKED", revokeReason }               — Case E: revoke a previously approved verification
export async function reviewBrandVerification(
    brandId,
    { action, note, rejectionReason, isReviewed, revokeReason } = {}
) {
    try {
        if (!brandId) throw new Error('brandId is required');
        if (!action) throw new Error('action is required');
        const payload = { action };
        if (note) payload.note = note;
        if (rejectionReason) payload.rejectionReason = rejectionReason;
        if (typeof isReviewed === 'boolean') payload.isReviewed = isReviewed;
        if (revokeReason) payload.revokeReason = revokeReason;
        const { data } = await api.put(`/brands/admin/verifications/${brandId}/review`, payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Force the isReviewed flag to an explicit true/false ──────────
// Convenience wrapper over Case D2 — used by a real two-way toggle in the UI
// (plain Case D only ever sets the flag on, it can't turn it back off).
export async function forceReviewedFlag(brandId, isReviewed) {
    return reviewBrandVerification(brandId, { action: 'REVIEWED', isReviewed: Boolean(isReviewed) });
}

// ── Revoke a previously approved verification ─────────────────────
// Convenience wrapper over Case E.
export async function revokeVerification(brandId, revokeReason) {
    if (!revokeReason) throw new Error('revokeReason is required');
    return reviewBrandVerification(brandId, { action: 'REVOKED', revokeReason });
}

// ── Get Verification History (audit trail) ──────────────────────
// GET {{base_url}}/brands/verifications/history?page=&limit=&brandId=&performedByType=&attemptNumber=
// Confirmed from Postman. Query params:
//   brandId         — required to scope the trail to one brand.
//   page, limit     — pagination, defaults 1 / 20.
//   performedByType — optional filter: "SYSTEM" | "ADMIN" | "VENDOR".
//   attemptNumber   — optional filter, number ≥ 1.
//
// Response: { success, message, data: { total, totalPages, page, limit, data: [
//   { _id, brandId, systemVerifyId, action, performedByType, performedBy,
//     attemptNumber, brandUniqueId, merchantId, score, previousStatus,
//     newStatus, reason, metadata, createdAt, updatedAt,
//     brand: { _id, brandName, legalBusinessName, uniqueId, merchantId, logo } }
// ] } }
export async function getVerificationHistory({
    brandId,
    page = 1,
    limit = 20,
    performedByType = '',
    attemptNumber = '',
} = {}) {
    try {
        if (!brandId) throw new Error('brandId is required');
        const params = { page, limit, brandId };
        if (performedByType) params.performedByType = performedByType;
        if (attemptNumber) params.attemptNumber = attemptNumber;
        const { data } = await api.get('/brands/verifications/history', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    getBrandVerifications,
    reviewBrandVerification,
    forceReviewedFlag,
    revokeVerification,
    getVerificationHistory,
};
