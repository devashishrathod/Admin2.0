import { getBrandVerifications } from "./services/NewOnboardingApi";

/* -------------------------------------------------------------------------
 * Maps one API brand-verification record into the flat shape this page's
 * UI uses. `derivedStatus` is computed from the confirmed boolean flags
 * (isAdminApproved/isRejected/isRevoked) rather than the raw `status`
 * enum, since only "MANUAL_REVIEW" has been confirmed as a possible value
 * for that field so far.
 * ---------------------------------------------------------------------- */
export function deriveStatus(raw) {
  const status = String(raw.status || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (raw.isRevoked) return "REVOKED";
  if (raw.isRejected) return "REJECTED";
  if (raw.isAdminApproved || status === "APPROVED") return "APPROVED";
  if (status === "MANUAL_REVIEW") return "MANUAL_REVIEW";
  if (["PENDING", "PENDING_APPROVAL", "WAITING", "UNDER_REVIEW", "IN_REVIEW"].includes(status)) {
    return "PENDING";
  }
  return status || "PENDING";
}

export function mapVerification(raw) {
  const brand = raw.brand || {};
  const vendor = raw.vendor || {};
  return {
    id: raw._id,
    brandId: raw.brandId,
    attemptNumber: raw.attemptNumber,
    score: raw.score ?? 0,
    status: raw.status,
    derivedStatus: deriveStatus(raw),
    flags: raw.flags || {},
    nameMatch: raw.nameMatch || {},
    bankNameMatch: raw.bankNameMatch || {},
    entityMatch: raw.entityMatch || {},
    duplicateDetails: raw.duplicateDetails || {},
    remarks: Array.isArray(raw.remarks) ? raw.remarks : [],
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

/* -------------------------------------------------------------------------
 * The list endpoint only takes page/limit/search — it can't filter by
 * status or brand — so every server page is loaded and mapped here.
 * ---------------------------------------------------------------------- */
export async function fetchAllVerifications(search = "") {
  const PAGE = 100;
  const first = await getBrandVerifications({ page: 1, limit: PAGE, search });
  const payload = first?.data ?? {};
  const rows = [...(payload.data ?? [])];
  const rowTotal = payload.total ?? payload.totalCount ?? payload.count;
  const serverPages = payload.totalPages ?? payload.pages ?? (rowTotal ? Math.ceil(rowTotal / PAGE) : 1);
  if (serverPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: serverPages - 1 }, (_, i) => getBrandVerifications({ page: i + 2, limit: PAGE, search }))
    );
    rest.forEach((r) => rows.push(...(r?.data?.data ?? [])));
  }
  return rows.map(mapVerification);
}

// One verification per brand — its latest attempt (highest attemptNumber,
// newest createdAt on a tie). Returns a Map keyed by brand id.
export function latestByBrand(verifications) {
  const byBrand = new Map();
  verifications.forEach((v) => {
    const key = v.brandId || v.brand?.id || v.id;
    const prev = byBrand.get(key);
    const newer =
      !prev ||
      (v.attemptNumber ?? 0) > (prev.attemptNumber ?? 0) ||
      ((v.attemptNumber ?? 0) === (prev.attemptNumber ?? 0) &&
        new Date(v.createdAt || 0).getTime() > new Date(prev.createdAt || 0).getTime());
    if (newer) byBrand.set(key, v);
  });
  return byBrand;
}
