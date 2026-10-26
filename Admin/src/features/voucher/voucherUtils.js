// Voucher status labels / colours, date helpers and the API → row mappers,
// shared by the voucher pages and the brand page's Voucher tab. Moved
// unchanged from VoucherList.jsx.
import { VOUCHER_STATUSES } from "./services/VoucherApi";
import { MISSING } from "../../utils/helpers";

export const STATUS_LABELS = {
  [VOUCHER_STATUSES.DRAFT]: "Draft",
  [VOUCHER_STATUSES.UNDER_REVIEW]: "Under Review",
  [VOUCHER_STATUSES.APPROVED]: "Approved",
  [VOUCHER_STATUSES.PUBLISHED]: "Published",
  [VOUCHER_STATUSES.REJECTED]: "Rejected",
  [VOUCHER_STATUSES.EXPIRED]: "Expired",
  [VOUCHER_STATUSES.PAUSED]: "Paused",
  [VOUCHER_STATUSES.ARCHIVED]: "Archived",
};

export const STATUS_STYLES = {
  [VOUCHER_STATUSES.DRAFT]: { dot: "bg-neutral-500", text: "text-neutral-500 dark:text-neutral-400", bg: "bg-neutral-200 dark:bg-neutral-700/40" },
  [VOUCHER_STATUSES.UNDER_REVIEW]: { dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-400/10" },
  [VOUCHER_STATUSES.APPROVED]: { dot: "bg-sky-400", text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-400/10" },
  [VOUCHER_STATUSES.PUBLISHED]: { dot: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-400/10" },
  [VOUCHER_STATUSES.REJECTED]: { dot: "bg-red-400", text: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  [VOUCHER_STATUSES.EXPIRED]: { dot: "bg-neutral-500", text: "text-neutral-500 dark:text-neutral-400", bg: "bg-neutral-200 dark:bg-neutral-700/40" },
  [VOUCHER_STATUSES.PAUSED]: { dot: "bg-orange-400", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-400/10" },
  [VOUCHER_STATUSES.ARCHIVED]: { dot: "bg-neutral-600", text: "text-neutral-500", bg: "bg-neutral-200 dark:bg-neutral-800" },
};

export const STATUS_HEX = {
  [VOUCHER_STATUSES.DRAFT]: "#737373",
  [VOUCHER_STATUSES.UNDER_REVIEW]: "#FBBF24",
  [VOUCHER_STATUSES.APPROVED]: "#38BDF8",
  [VOUCHER_STATUSES.PUBLISHED]: "#2FDE8C",
  [VOUCHER_STATUSES.REJECTED]: "#F87171",
  [VOUCHER_STATUSES.EXPIRED]: "#A3A3A3",
  [VOUCHER_STATUSES.PAUSED]: "#FB923C",
  [VOUCHER_STATUSES.ARCHIVED]: "#525252",
};

// The mapped row's `approvalStatus` is already the real backend status —
// kept as a named export/function (rather than inlining `v.approvalStatus`
// everywhere) so VoucherDetails.jsx has one place to import from.
export function computeStatus(v) {
  return v.approvalStatus;
}

/* ---- date helpers -------------------------------------------------------*/
export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Reconstructs a simple approval timeline from the version's own
// timestamp fields (createdAt/submittedAt/reviewedAt/rejectedAt/
// publishedAt/expiredAt/archivedAt) — the API doesn't return an explicit
// audit-log array, so this is a best-effort chronological view.
// Prefers a real name/uniqueId over a bare Mongo ID string when both a
// populated user object and a raw id field are available for the same
// actor (e.g. `rejectedByUser` vs `rejectedBy`).
export function personLabel(userObj, fallbackId) {
  if (userObj) return userObj.name || userObj.uniqueId || fallbackId || null;
  return fallbackId || null;
}

export function buildTimeline(v) {
  const entries = [];
  if (v.createdAt) {
    const brandName = v.brand?.brandName;
    entries.push({
      action: "Created",
      date: v.createdAt,
      by: personLabel(v.createdByUser, v.createdBy),
      remarks: brandName ? `For brand ${brandName}.` : null,
    });
  }
  if (v.submittedAt) {
    entries.push({
      action: "Submitted",
      date: v.submittedAt,
      by: personLabel(v.submittedByUser, v.submittedBy),
      remarks: "Submitted for review.",
    });
  }
  if (v.rejectedAt) {
    entries.push({
      action: "Rejected",
      date: v.rejectedAt,
      by: personLabel(v.rejectedByUser, v.rejectedBy),
      remarks: v.rejectionReason,
    });
  } else if (v.reviewedAt) {
    entries.push({
      action: "Approved",
      date: v.reviewedAt,
      by: personLabel(v.reviewedByUser, v.reviewedBy),
      remarks: "Approved by admin.",
    });
  }
  if (v.publishedAt) {
    entries.push({
      action: "Published",
      date: v.publishedAt,
      by: personLabel(v.approvedByUser, v.approvedBy),
      remarks: "Made live in the app.",
    });
  }
  if (v.expiredAt) entries.push({ action: "Expired", date: v.expiredAt, by: null, remarks: null });
  if (v.archivedAt) entries.push({ action: "Archived", date: v.archivedAt, by: null, remarks: null });
  return entries
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({ ...e, date: formatDateTime(e.date) }));
}

// Maps one API voucher-version object (as returned by GET
// /vouchers/versions/get-all) into the flat shape this page's UI uses.
export function apiVersionToRow(v) {
  const voucher = v.voucher || {};
  const brand = v.brand || null;
  const category = v.category || null;
  const subCategory = v.subCategory || null;
  const creatorUser = v.createdByUser || null;
  const primaryOffer = v.offers?.[0];
  return {
    id: v._id, // version id — approve/reject/publish act on this
    voucherId: v.voucherId || voucher._id, // parent voucher id — delete acts on this
    versionCode: v.versionCode,
    versionNumber: v.versionNumber,
    voucherCode: voucher.voucherCode || "—",
    title: v.name,
    brandName: brand?.brandName || brand?.legalBusinessName || voucher.brandId || personLabel(v.createdByUser, null) || "—",
    brand: brand
      ? {
        name: brand.brandName || "—",
        legalName: brand.legalBusinessName || "—",
        uniqueId: brand.uniqueId || "—",
        merchantId: brand.merchantId || "—",
        logo: brand.logo || "",
        whatsappNumber: brand.whatsappNumber || "—",
        onboardingStatus: brand.status || "—",
        isApproved: Boolean(brand.isApproved),
        isSubscribed: Boolean(brand.isSubscribed),
        description: brand.description || "",
        businessEntityType: brand.businessEntityType || "—",
        businessRegistrationStatus: brand.businessRegistrationStatus || "—",
        joinedDate: brand.joinedDate ? formatDateTime(brand.joinedDate) : "—",
        isRevoked: Boolean(brand.isRevoked),
        isReviewed: Boolean(brand.isReviewed),
        followersCount: brand.followersCount ?? 0,
        franchises: {
          used: brand.franchisesUsed ?? 0,
          limit: brand.franchisesLimit ?? 0,
          unlimited: Boolean(brand.isFranchisesUnlimited),
        },
        subBrands: {
          used: brand.subBrandsUsed ?? 0,
          limit: brand.subBrandsLimit ?? 0,
          unlimited: Boolean(brand.isSubBrandsUnlimited),
        },
        showcase: {
          used: brand.showcaseUsed ?? 0,
          limit: brand.showcaseLimit ?? 0,
          unlimited: Boolean(brand.isShowcaseUnlimited),
        },
        vouchers: {
          used: brand.vouchersUsed ?? 0,
          limit: brand.vouchersLimit ?? 0,
          unlimited: Boolean(brand.isVouchersUnlimited),
        },
      }
      : null,
    // The banner lives on the parent voucher (not any one version) — a
    // separate approval gate from the version's own review/approve/publish
    // workflow above. `pending` is the vendor's latest upload awaiting an
    // admin decision; `current` is whatever's actually live right now.
    banner: voucher.banner
      ? {
          current: voucher.banner.current || null,
          pending: voucher.banner.pending || null,
          status: voucher.banner.status || null,
          rejectionReason: voucher.banner.rejectionReason || null,
          reviewedBy: voucher.banner.reviewedBy || null,
          reviewedAt: voucher.banner.reviewedAt ? formatDateTime(voucher.banner.reviewedAt) : null,
        }
      : null,
    category: category?.name || "—",
    subCategory: subCategory?.name || "—",
    categoryDetails: category
      ? { name: category.name || "—", description: category.description || "", image: category.image || "" }
      : null,
    subCategoryDetails: subCategory
      ? { name: subCategory.name || "—", description: subCategory.description || "", image: subCategory.image || "" }
      : null,
    description: v.description || "",
    tags: v.tags || [],
    images: (v.images || [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((img) => ({
        // Image id — needed to save a new order (drag & drop on the details page).
        id: img._id || null,
        url: img.media?.url || img.url || null,
        sortOrder: img.sortOrder,
        provider: img.media?.storage?.provider || img.storage?.provider || null,
      })),
    offers: v.offers || [],
    discount: primaryOffer?.title || "—",
    minBillAmount: primaryOffer?.minBillAmount ?? 0,
    maxDiscountAmount: primaryOffer?.maxDiscountAmount ?? 0,
    attachedSubBrandsCount: v.attachedSubBrandsCount ?? 0,
    // Admin curation — PUT /vouchers/admin/suggestions/:voucherId
    isSuggested: Boolean(voucher.isSuggested ?? v.isSuggested),
    suggestionOrder: voucher.suggestionOrder ?? v.suggestionOrder ?? null,
    // Date + time (not just the date) — shown in both the table and the
    // details page.
    createdAt: v.createdAt || null,
    createdAtDisplay: formatDateTime(v.createdAt),
    updatedAtDisplay: formatDateTime(v.updatedAt),
    // No fallback to createdAt here — a DRAFT/never-published version has
    // no publishedAt at all, and showing createdAt in its place would
    // falsely imply it went live.
    publishedDate: v.publishedAt ? formatDateTime(v.publishedAt) : null,
    startDate: formatDateTime(v.startAt),
    endDate: formatDateTime(v.endAt),
    // Raw ISO values — for the listing's validity chip ("Ends in 5 days").
    startAt: v.startAt || null,
    endAt: v.endAt || null,
    // Who actually created this voucher — falls back to whoever submitted
    // it when a separate creator isn't populated (older records only
    // carry submittedBy/submittedByUser).
    creator: {
      name: personLabel(v.createdByUser, v.createdBy) || personLabel(v.submittedByUser, v.submittedBy) || "—",
      role: v.createdByUser?.role || v.submittedByUser?.role || null,
      whatsappNumber: v.createdByUser?.whatsappNumber || v.submittedByUser?.whatsappNumber || null,
    },
    // Full raw record of whoever created the version, for the "Created By"
    // panel — separate from `creator` above (which is just a display label
    // with a submittedBy fallback used elsewhere).
    creatorUser: creatorUser
      ? {
        role: creatorUser.role || "—",
        loginType: creatorUser.loginType || "—",
        whatsappNumber: creatorUser.whatsappNumber || "—",
        uniqueId: creatorUser.uniqueId || "—",
        referralCode: creatorUser.referralCode || "—",
        isEmailVerified: Boolean(creatorUser.isEmailVerified),
        isMobileVerified: Boolean(creatorUser.isMobileVerified),
        isOnBoardingCompleted: Boolean(creatorUser.isOnBoardingCompleted),
        walletBalance: creatorUser.walletBalance ?? 0,
        tCoinsBalance: creatorUser.tCoinsBalance ?? 0,
        currentScreen: creatorUser.currentScreen || "—",
      }
      : null,
    // The parent voucher record (as opposed to this version) — its own
    // lifecycle/status/timestamps, distinct from the version's.
    parentVoucher: v.voucher
      ? {
        normalizedName: voucher.normalizedName || "—",
        timezone: voucher.timezone || "—",
        currentVersion: voucher.currentVersion ?? "—",
        status: voucher.status || "—",
        isActive: Boolean(voucher.isActive),
        isDeleted: Boolean(voucher.isDeleted),
        createdAtDisplay: voucher.createdAt ? formatDateTime(voucher.createdAt) : "—",
        updatedAtDisplay: voucher.updatedAt ? formatDateTime(voucher.updatedAt) : "—",
      }
      : null,
    // The version's own `status` is the authoritative, up-to-date workflow
    // state — the parent `voucher.status` can lag behind it (e.g. a
    // version can show status "PUBLISHED" while `voucher.status` is still
    // "APPROVED"), so prefer the version's status and only fall back to
    // the parent's when the version itself doesn't have one.
    approvalStatus: v.status || voucher.status || VOUCHER_STATUSES.DRAFT,
    isActive: Boolean(v.isActive),
    isDeleted: Boolean(v.isDeleted),
    isImmutable: Boolean(v.isImmutable),
    // Test/demo voucher (or one under a dummy brand) — shown only on
    // Dummy Vouchers, kept out of every other voucher page.
    isDummy: Boolean(v.isDummy ?? voucher.isDummy ?? brand?.isDummy),
    // Seed batch, e.g. "CHENNAI-DUMMY-1" — from the voucher or its brand.
    dummyBatch: v.dummyBatch || voucher.dummyBatch || brand?.dummyBatch || null,
    rejectionReason: v.rejectionReason || null,
    history: buildTimeline(v),
  };
}

// Who did it, for the timeline below — real names/usernames for an admin
// actor, role-only for a vendor one (that's all GET /vouchers/get/:id
// populates for a vendor's createdBy/submittedBy/etc.).
export function actorLabel(actor) {
  if (!actor) return null;
  return actor.name || actor.username || actor.role || null;
}

// Confirmed shape (GET /vouchers/get/:voucherId) — richer per-version
// timestamps + real populated actors, instead of guessing from raw ids.
export function buildTimelineFromVersion(v) {
  const entries = [];
  if (v.createdAt) entries.push({ action: "Created", date: v.createdAt, by: actorLabel(v.createdBy), remarks: null });
  if (v.submittedAt) {
    entries.push({ action: "Submitted", date: v.submittedAt, by: actorLabel(v.submittedBy), remarks: "Submitted for review." });
  }
  if (v.rejectedAt) {
    entries.push({ action: "Rejected", date: v.rejectedAt, by: actorLabel(v.rejectedBy), remarks: v.rejectionReason });
  } else if (v.reviewedAt) {
    entries.push({
      action: "Approved",
      date: v.reviewedAt,
      by: actorLabel(v.approvedBy || v.reviewedBy),
      remarks: "Approved by admin.",
    });
  }
  if (v.publishedAt) {
    entries.push({ action: "Published", date: v.publishedAt, by: actorLabel(v.approvedBy), remarks: "Made live in the app." });
  }
  if (v.pausedAt) entries.push({ action: "Paused", date: v.pausedAt, by: actorLabel(v.pausedBy), remarks: v.pauseReason });
  if (v.expiredAt) entries.push({ action: "Expired", date: v.expiredAt, by: null, remarks: null });
  if (v.archivedAt) entries.push({ action: "Archived", date: v.archivedAt, by: null, remarks: null });
  return entries
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({ ...e, date: formatDateTime(e.date) }));
}

// Maps the confirmed GET /vouchers/get/:voucherId response — { voucher,
// brand, currentVersion, publishedVersion, versions, versionCount, stats }
// — into the details page's row shape. This endpoint is noticeably
// slimmer than /vouchers/versions/get-all on some fields (brand has no
// contact/subscription/limit info, category/subCategory have no
// description, createdBy is role-only for a vendor) but adds real
// claims/revenue stats, attached outlets, and full version history that
// the list endpoint never had.
export function apiVoucherDetailToRow(payload) {
  if (!payload) return null;
  const voucher = payload.voucher || {};
  const brand = payload.brand || null;
  const cv = payload.currentVersion || {};

  return {
    id: cv._id || voucher.currentVersionId,
    voucherId: voucher._id,
    versionCode: cv.versionCode,
    versionNumber: cv.versionNumber,
    voucherCode: voucher.voucherCode || "—",
    title: cv.name || voucher.name,
    brandName: brand?.brandName || "—",
    brand: brand
      ? {
          name: brand.brandName || "—",
          legalName: brand.legalBusinessName || "—",
          uniqueId: brand.uniqueId || "—",
          merchantId: brand.merchantId || "—",
          logo: brand.logo || "",
          isApproved: Boolean(brand.isApproved),
          isActive: Boolean(brand.isActive),
        }
      : null,
    category: cv.category?.name || "—",
    subCategory: cv.subCategory?.name || "—",
    categoryDetails: cv.category ? { name: cv.category.name || "—", image: cv.category.image || "" } : null,
    subCategoryDetails: cv.subCategory ? { name: cv.subCategory.name || "—", image: cv.subCategory.image || "" } : null,
    description: cv.description || voucher.description || "",
    tags: cv.tags || voucher.tags || [],
    images: (cv.images || [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((img) => ({ id: img._id || null, url: img.media?.url || null, sortOrder: img.sortOrder, provider: img.media?.provider || null })),
    offers: cv.offers || [],
    banner: voucher.banner
      ? {
          current: voucher.banner.current || null,
          pending: voucher.banner.pending || null,
          status: voucher.banner.status || null,
          rejectionReason: voucher.banner.rejectionReason || null,
          reviewedBy: voucher.banner.reviewedBy || null,
          reviewedAt: voucher.banner.reviewedAt ? formatDateTime(voucher.banner.reviewedAt) : null,
        }
      : null,
    createdAtDisplay: formatDateTime(cv.createdAt || voucher.createdAt),
    updatedAtDisplay: formatDateTime(cv.updatedAt || voucher.updatedAt),
    publishedDate: cv.publishedAt ? formatDateTime(cv.publishedAt) : null,
    startDate: formatDateTime(cv.startAt),
    endDate: formatDateTime(cv.endAt),
    // Only `_id`/`role` are populated for a vendor actor — no name at all.
    creator: { role: cv.createdBy?.role || voucher.createdBy?.role || null },
    approvalStatus: cv.status || voucher.status || VOUCHER_STATUSES.DRAFT,
    isActive: Boolean(cv.isActive ?? voucher.isActive),
    isDeleted: Boolean(cv.isDeleted ?? voucher.isDeleted),
    isImmutable: Boolean(cv.isImmutable),
    rejectionReason: cv.rejectionReason || null,
    history: buildTimelineFromVersion(cv),

    // Parent voucher record — same card as before, minus normalizedName
    // (this endpoint never returns it).
    parentVoucher: {
      timezone: voucher.timezone || "—",
      currentVersionNumber: voucher.currentVersionNumber ?? "—",
      status: voucher.status || "—",
      isActive: Boolean(voucher.isActive),
      isDeleted: Boolean(voucher.isDeleted),
      createdAtDisplay: voucher.createdAt ? formatDateTime(voucher.createdAt) : "—",
      updatedAtDisplay: voucher.updatedAt ? formatDateTime(voucher.updatedAt) : "—",
    },

    // ---- New sections this endpoint uniquely provides ----
    stats: payload.stats || cv.stats || null,
    outlets: (cv.outlets || []).map((o) => ({
      id: o._id,
      uniqueId: o.uniqueId,
      storeId: o.storeId,
      outletType: o.outletType,
      description: o.description || "",
      whatsappNumber: o.whatsappNumber,
      isActive: Boolean(o.isActive),
      address: o.location?.formattedAddress || [o.location?.city, o.location?.state].filter(Boolean).join(", "),
    })),
    outletCount: cv.outletCount ?? 0,
    liveOutletCount: cv.liveOutletCount ?? 0,
    totalBrandOutlets: cv.totalBrandOutlets ?? 0,
    isAppliedOnAllOutlets: Boolean(cv.isAppliedOnAllOutlets),
    versions: (payload.versions || []).map((v) => ({
      id: v._id,
      versionNumber: v.versionNumber,
      versionCode: v.versionCode,
      status: v.status,
      startDate: formatDateTime(v.startAt),
      endDate: formatDateTime(v.endAt),
      claimCount: v.claimCount ?? 0,
      customerPaid: v.customerPaid ?? 0,
    })),
    versionCount: payload.versionCount ?? 0,
  };
}

// "01/02/2026, 10:30 am" -> "01/02/2026" — cards/table only need the date.
export const dateOnly = (display, fallback = MISSING.date) => (display && display !== "—" ? display.split(",")[0] : fallback);

// Live validity state from the raw start/end — drives the card's chip.
export function validityOf(v) {
  const now = Date.now();
  const start = v.startAt ? new Date(v.startAt).getTime() : null;
  const end = v.endAt ? new Date(v.endAt).getTime() : null;
  if (end && end < now) return { label: "Ended", tone: "neutral" };
  if (start && start > now) {
    const days = Math.ceil((start - now) / 86400000);
    return { label: `Starts in ${days}d`, tone: "sky" };
  }
  if (end) {
    const days = Math.ceil((end - now) / 86400000);
    return { label: days <= 1 ? "Ends today" : `Ends in ${days}d`, tone: days <= 7 ? "amber" : "emerald" };
  }
  return null;
}

export const TONE_CLASSES = {
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

/* Voucher workflow from the table's status pill:
     Under Review → Approve → Approved → Publish → Published.
   The banner has its own gate: Banner Pending → Approve Banner. */
export const VOUCHER_TONES = {
  [VOUCHER_STATUSES.DRAFT]: "neutral",
  [VOUCHER_STATUSES.UNDER_REVIEW]: "amber",
  [VOUCHER_STATUSES.APPROVED]: "sky",
  [VOUCHER_STATUSES.PUBLISHED]: "emerald",
  [VOUCHER_STATUSES.REJECTED]: "red",
  [VOUCHER_STATUSES.EXPIRED]: "neutral",
  [VOUCHER_STATUSES.PAUSED]: "orange",
  [VOUCHER_STATUSES.ARCHIVED]: "neutral",
};

// The status pill's next step. Live vouchers can be paused (API doc #57a)
// and paused ones resumed (#57b) — both act on the version.
export function getVoucherStep(v) {
  if (v.approvalStatus === VOUCHER_STATUSES.UNDER_REVIEW) return { kind: "approve", label: "Approve" };
  if (v.approvalStatus === VOUCHER_STATUSES.APPROVED) return { kind: "publish", label: "Publish" };
  if (v.approvalStatus === VOUCHER_STATUSES.PUBLISHED) return { kind: "pause", label: "Pause" };
  if (v.approvalStatus === VOUCHER_STATUSES.PAUSED) return { kind: "resume", label: "Resume" };
  return null;
}
