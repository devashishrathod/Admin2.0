import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';
import { throwApiError as handleError } from '../../../lib/apiError';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

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
// GET /brands/admin/verifications (super admin API doc #23). Every key
// besides page / limit is a server filter, passed through when set:
// search, brandId, status, isReviewed, isRejected, isRevoked,
// isAdminApproved, isSuperseded, minScore / maxScore, attemptNumber,
// reviewedByAdminId, fromDate / toDate, sortBy NEWEST|OLDEST|SCORE,
// sortOrder ASC|DESC (uppercase). Superseded attempts are hidden unless
// isSuperseded=true, so `brandId` alone gives the brand's current attempt.
export async function getBrandVerifications({ page = 1, limit = 10, ...filters } = {}) {
    try {
        const params = { page, limit };
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') params[key] = value;
        });
        const { data } = await api.get('/brands/admin/verifications', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Review a brand verification (approve / reject / reviewed flag / revoke) ──
// PUT /brands/admin/verifications/:brandId/review (#24). The validator is
// strict — send only the fields of the action:
//   { action: "APPROVED", note? }                 — 409 SUBMIT_REQUIRED / DEED_NOT_ACCEPTED
//   { action: "REJECTED", rejectionReason, note? } — reason ≤ 1000, shown to the vendor
//   { action: "REVIEWED", isReviewed }             — always an explicit boolean (omitted = toggle)
//   { action: "REVOKED", revokeReason, note? }     — only on an approved brand
// 409 also = superseded attempt / another admin acted first → re-read and retry.
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
    getVerificationHistory,
};
