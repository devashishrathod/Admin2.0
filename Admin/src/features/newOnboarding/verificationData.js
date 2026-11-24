/* -------------------------------------------------------------------------
 * Maps one API brand-verification record into the flat shape this page's
 * UI uses. No status is derived here: the admin's decision is read from
 * GET /brands/onboarding/status → verification, and the system's verdict
 * (`latestStatus` / `status`) is advice only (guide §4, D81).
 * ---------------------------------------------------------------------- */

// UNREGISTERED owner verified by an uploaded ID: the system can't read the
// ID, so PAN_VERIFIED fails by design and the attempt carries the remark
// code OWNER_ID_MANUAL (backend, Milestone A). Shown next to "PAN not verified".
export const OWNER_ID_MANUAL_NOTE = "The owner gave an ID — check it by hand.";
export const ownerIdManual = (remarkCodes) => Array.isArray(remarkCodes) && remarkCodes.includes("OWNER_ID_MANUAL");

export function mapVerification(raw) {
  const brand = raw.brand || {};
  const vendor = raw.vendor || {};
  return {
    id: raw._id,
    brandId: raw.brandId,
    attemptNumber: raw.attemptNumber,
    score: raw.score ?? 0,
    status: raw.status,
    flags: raw.flags || {},
    nameMatch: raw.nameMatch || {},
    bankNameMatch: raw.bankNameMatch || {},
    entityMatch: raw.entityMatch || {},
    duplicateDetails: raw.duplicateDetails || {},
    remarks: Array.isArray(raw.remarks) ? raw.remarks : [],
    // Onboarding v2 (#23 note 6): path-wise checks, what the vendor skipped,
    // remark codes and the re-score after a post-submit add. Advisory only.
    kycPath: raw.kycPath || null,
    checks: Array.isArray(raw.checks) ? raw.checks : [],
    skippedItems: Array.isArray(raw.skippedItems) ? raw.skippedItems : [],
    remarkCodes: Array.isArray(raw.remarkCodes) ? raw.remarkCodes : [],
    latestScore: raw.latestScore ?? null,
    latestStatus: raw.latestStatus || null,
    latestScoredAt: raw.latestScoredAt || null,
    verifiedAt: raw.verifiedAt,
    verifiedBy: raw.verifiedBy,
    rejectedAt: raw.rejectedAt,
    rejectedBy: raw.rejectedBy,
    rejectionReason: raw.rejectionReason,
    reviewedAt: raw.reviewedAt,
    reviewedByAdminId: raw.reviewedByAdminId,
    adminApprovedAt: raw.adminApprovedAt,
    revokedAt: raw.revokedAt,
    revokedBy: raw.revokedBy,
    revokeReason: raw.revokeReason,
    isReviewed: Boolean(raw.isReviewed),
    isAdminApproved: Boolean(raw.isAdminApproved),
    isRejected: Boolean(raw.isRejected),
    isRevoked: Boolean(raw.isRevoked),
    isSuperseded: Boolean(raw.isSuperseded),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    rejectionCount: raw.rejectionCount ?? 0,
    revocationCount: raw.revocationCount ?? 0,
    submissionCount: raw.submissionCount ?? 0,
    reviewedByAdmin: raw.reviewedByAdmin || null,
    verifiedByAdmin: raw.verifiedByAdmin || null,
    rejectedByAdmin: raw.rejectedByAdmin || null,
    revokedByAdmin: raw.revokedByAdmin || null,
    brand: {
      id: brand._id,
      brandName: brand.brandName || "Untitled Brand",
      legalBusinessName: brand.legalBusinessName || "",
      uniqueId: brand.uniqueId || "",
      merchantId: brand.merchantId || "",
      logo: brand.logo || "",
      status: brand.status || "",
      isApproved: Boolean(brand.isApproved),
      isReviewed: Boolean(brand.isReviewed),
      isRejected: Boolean(brand.isRejected),
      email: brand.email || "",
      mobile: brand.mobile || "",
      whatsappNumber: brand.whatsappNumber || "",
      businessEntityType: brand.businessEntityType || "",
      businessRegistrationStatus: brand.businessRegistrationStatus || "",
      verificationAttemptCount: brand.verificationAttemptCount ?? 0,
    },
    // Real vendor user record — this platform logs in via WhatsApp OTP, so
    // there's no name/email/mobile field to map; uniqueId + whatsappNumber
    // are the real identifiers.
    vendor: {
      id: vendor._id,
      uniqueId: vendor.uniqueId || "",
      role: vendor.role || "",
      loginType: vendor.loginType || "",
      whatsappNumber: vendor.whatsappNumber || "",
      referralCode: vendor.referralCode || "",
      walletBalance: vendor.walletBalance ?? 0,
      tCoinsBalance: vendor.tCoinsBalance ?? 0,
      isMobileVerified: Boolean(vendor.isMobileVerified),
      isEmailVerified: Boolean(vendor.isEmailVerified),
      isOnBoardingCompleted: Boolean(vendor.isOnBoardingCompleted),
      currentScreen: vendor.currentScreen || "",
    },
  };
}

