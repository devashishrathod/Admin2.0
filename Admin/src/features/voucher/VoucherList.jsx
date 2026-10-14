import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Trash2,
  Eye,
  Tag,
  Loader2,
  AlertTriangle,
  FileDown,
  Printer,
  PieChart as PieChartIcon,
  TrendingUp,
  Star,
  Ticket,
  Clock,
  CalendarDays,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Rocket,
  XCircle,
  RefreshCw,
  X,
  PauseCircle,
  PlayCircle,
  FlaskConical,
  Lock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import Table from "../../components/common/Table";
import StatusStepButton from "../../components/common/StatusStepButton";
import VoucherDetails from "./VoucherDetails";
import { downloadCsv, printAsPdf } from "../../utils/exportTable";
import { isNotFoundMessage } from "../../utils/helpers";
import {
  getAllVoucherVersions,
  getVoucherById,
  approveVoucher,
  rejectVoucher,
  publishVoucher,
  deleteVoucher,
  pauseVoucher,
  resumeVoucher,
  updateVoucherSuggestion,
  approveVoucherBanner,
  rejectVoucherBanner,
  reorderVoucherImages,
  uploadVoucherBanner,
  VOUCHER_STATUSES,
} from "./services/VoucherApi";

/* -------------------------------------------------------------------------
 * Voucher lifecycle (per the backend's VOUCHER_STATUSES enum)
 * -------------------------------------------------------------------------
 *   DRAFT         -> vendor is still editing, not submitted yet.
 *   UNDER_REVIEW  -> vendor submitted; Super Admin can Approve or Reject
 *                     (rejecting requires a reason, shown to the vendor).
 *   APPROVED      -> Super Admin signed off; Super Admin can Publish it.
 *   PUBLISHED     -> live in the app.
 *   REJECTED      -> Super Admin declined it, with a mandatory reason.
 *   EXPIRED / PAUSED / ARCHIVED -> terminal / inactive states set by the
 *                     backend once a published voucher's window ends or
 *                     it's manually paused/archived.
 *
 * `voucher.status` (the parent voucher, not the version) is the source of
 * truth for the workflow and is what drives every badge/filter/action here.
 * ---------------------------------------------------------------------- */

const STATUS_LABELS = {
  [VOUCHER_STATUSES.DRAFT]: "Draft",
  [VOUCHER_STATUSES.UNDER_REVIEW]: "Under Review",
  [VOUCHER_STATUSES.APPROVED]: "Approved",
  [VOUCHER_STATUSES.PUBLISHED]: "Published",
  [VOUCHER_STATUSES.REJECTED]: "Rejected",
  [VOUCHER_STATUSES.EXPIRED]: "Expired",
  [VOUCHER_STATUSES.PAUSED]: "Paused",
  [VOUCHER_STATUSES.ARCHIVED]: "Archived",
};

const STATUS_STYLES = {
  [VOUCHER_STATUSES.DRAFT]: { dot: "bg-neutral-500", text: "text-neutral-500 dark:text-neutral-400", bg: "bg-neutral-200 dark:bg-neutral-700/40" },
  [VOUCHER_STATUSES.UNDER_REVIEW]: { dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-400/10" },
  [VOUCHER_STATUSES.APPROVED]: { dot: "bg-sky-400", text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-400/10" },
  [VOUCHER_STATUSES.PUBLISHED]: { dot: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-400/10" },
  [VOUCHER_STATUSES.REJECTED]: { dot: "bg-red-400", text: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  [VOUCHER_STATUSES.EXPIRED]: { dot: "bg-neutral-500", text: "text-neutral-500 dark:text-neutral-400", bg: "bg-neutral-200 dark:bg-neutral-700/40" },
  [VOUCHER_STATUSES.PAUSED]: { dot: "bg-orange-400", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-400/10" },
  [VOUCHER_STATUSES.ARCHIVED]: { dot: "bg-neutral-600", text: "text-neutral-500", bg: "bg-neutral-200 dark:bg-neutral-800" },
};

const STATUS_HEX = {
  [VOUCHER_STATUSES.DRAFT]: "#737373",
  [VOUCHER_STATUSES.UNDER_REVIEW]: "#FBBF24",
  [VOUCHER_STATUSES.APPROVED]: "#38BDF8",
  [VOUCHER_STATUSES.PUBLISHED]: "#2FDE8C",
  [VOUCHER_STATUSES.REJECTED]: "#F87171",
  [VOUCHER_STATUSES.EXPIRED]: "#A3A3A3",
  [VOUCHER_STATUSES.PAUSED]: "#FB923C",
  [VOUCHER_STATUSES.ARCHIVED]: "#525252",
};

export function VoucherStatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES[VOUCHER_STATUSES.DRAFT];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// The mapped row's `approvalStatus` is already the real backend status —
// kept as a named export/function (rather than inlining `v.approvalStatus`
// everywhere) so VoucherDetails.jsx has one place to import from.
export function computeStatus(v) {
  return v.approvalStatus;
}

const STATUS_FILTERS = ["All", ...Object.values(VOUCHER_STATUSES)];

/* ---- date helpers -------------------------------------------------------*/
function formatDateTime(iso) {
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
function personLabel(userObj, fallbackId) {
  if (userObj) return userObj.name || userObj.uniqueId || fallbackId || null;
  return fallbackId || null;
}

function buildTimeline(v) {
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
function apiVersionToRow(v) {
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
function actorLabel(actor) {
  if (!actor) return null;
  return actor.name || actor.username || actor.role || null;
}

// Confirmed shape (GET /vouchers/get/:voucherId) — richer per-version
// timestamps + real populated actors, instead of guessing from raw ids.
function buildTimelineFromVersion(v) {
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
function apiVoucherDetailToRow(payload) {
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

/* -------------------------------------------------------------------------
 * Listing UI bits
 * ---------------------------------------------------------------------- */
const cardClass = "rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";

// "01/02/2026, 10:30 am" -> "01/02/2026" — cards/table only need the date.
const dateOnly = (display) => (display && display !== "—" ? display.split(",")[0] : "—");

// Live validity state from the raw start/end — drives the card's chip.
function validityOf(v) {
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

const TONE_CLASSES = {
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

function BrandMark({ voucher, size = "sm" }) {
  const box = size === "sm" ? "h-7 w-7 rounded-lg text-[11px]" : "h-9 w-9 rounded-xl text-[13px]";
  return voucher.brand?.logo ? (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-white p-0.5 ring-1 ring-neutral-200 dark:ring-neutral-800 ${box}`}>
      <img src={voucher.brand.logo} alt={voucher.brandName} className="h-full w-full object-contain" />
    </div>
  ) : (
    <div className={`flex shrink-0 items-center justify-center bg-orange-500 font-semibold text-white ${box}`}>
      {voucher.brandName?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, hint, tint, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 ${cardClass} ${
        active ? "ring-2 ring-emerald-400" : ""
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tint]}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-[22px] font-bold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">{value}</p>
        <p className="mt-1 truncate text-[11.5px] font-medium text-neutral-500">{label}</p>
        {hint && <p className="truncate text-[10.5px] text-neutral-400">{hint}</p>}
      </div>
    </button>
  );
}

// Purple "Dummy" pill for test/demo vouchers (isDummy) — same look as the
// Brand page's dummy badge.
export function DummyBadge({ size = "md" }) {
  const sm = size === "sm";
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400 ${
        sm ? "bg-violet-500/10 px-1.5 py-0.5 text-[9.5px]" : "bg-white px-2.5 py-1 text-[10.5px] shadow-sm dark:bg-neutral-900"
      }`}
    >
      <FlaskConical size={sm ? 9 : 11} />
      Dummy
    </span>
  );
}

// Coupon-style card: image header, offer on a perforated "ticket" strip,
// validity + actions in the footer.
function VoucherCard({ voucher, onOpen, onToggleSuggested, onDelete, onStep, busy }) {
  const cover = voucher.images?.[0]?.url;
  const validity = validityOf(voucher);
  const step = getVoucherStep(voucher);

  return (
    <div className={`group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 ${cardClass}`}>
      {/* Status pill = workflow button. Sits outside the cover <button>
          (a button can't contain another button). */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5 pr-12">
        {/* Dummy vouchers are view-only — plain status, no workflow step. */}
        {voucher.isDummy ? (
          <VoucherStatusBadge status={voucher.approvalStatus} />
        ) : (
          <StatusStepButton
            label={STATUS_LABELS[voucher.approvalStatus] || voucher.approvalStatus}
            tone={VOUCHER_TONES[voucher.approvalStatus]}
            stepLabel={onStep ? step?.label : null}
            disabled={busy}
            onClick={() => onStep(voucher, step)}
          />
        )}
        {voucher.isDummy && <DummyBadge />}
      </div>
      <button onClick={() => onOpen(voucher)} className="relative block h-36 w-full overflow-hidden text-left">
        {cover ? (
          <img src={cover} alt={voucher.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400/30 via-sky-400/20 to-violet-400/20">
            <Ticket size={34} className="text-emerald-600/60 dark:text-emerald-400/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />
        {voucher.images?.length > 1 && (
          <span className="absolute bottom-2.5 right-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            +{voucher.images.length - 1} photos
          </span>
        )}
        <span className="absolute bottom-2.5 left-3 max-w-[60%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 backdrop-blur dark:bg-neutral-900/80 dark:text-neutral-200">
          {voucher.category}
        </span>
      </button>

      {voucher.isDummy ? (
        <span
          title="Dummy voucher — view only"
          aria-label="View only"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-violet-600 backdrop-blur dark:bg-neutral-900/80 dark:text-violet-400"
        >
          <Lock size={14} />
        </span>
      ) : (
      <button
        onClick={() => onToggleSuggested(voucher)}
        disabled={busy}
        aria-label={voucher.isSuggested ? `Remove ${voucher.title} from suggestions` : `Suggest ${voucher.title}`}
        title={voucher.isSuggested ? "Remove from Suggested" : "Mark as Suggested"}
        className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors disabled:opacity-40 ${
          voucher.isSuggested ? "bg-amber-400 text-neutral-950" : "bg-white/85 text-neutral-500 hover:text-amber-500 dark:bg-neutral-900/80"
        }`}
      >
        <Star size={14} fill={voucher.isSuggested ? "currentColor" : "none"} />
      </button>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center gap-2">
          <BrandMark voucher={voucher} />
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-medium text-neutral-500">{voucher.brandName}</p>
            <button
              onClick={() => onOpen(voucher)}
              className="block max-w-full truncate text-left text-[14px] font-semibold leading-tight text-neutral-900 hover:text-emerald-600 dark:text-neutral-50 dark:hover:text-emerald-400"
            >
              {voucher.title}
            </button>
          </div>
        </div>

        {/* Perforated ticket strip — the offer is the hero of a voucher */}
        <div className="relative mb-3 rounded-xl border border-dashed border-emerald-400/50 bg-emerald-400/[0.06] px-3.5 py-2.5">
          <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-dashed border-emerald-400/50 bg-white dark:bg-neutral-900" />
          <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-dashed border-emerald-400/50 bg-white dark:bg-neutral-900" />
          <p className="line-clamp-1 text-[13.5px] font-bold text-emerald-700 dark:text-emerald-400">{voucher.discount}</p>
          <p className="mt-0.5 text-[10.5px] text-neutral-500">
            {voucher.minBillAmount ? `Min bill ₹${Number(voucher.minBillAmount).toLocaleString("en-IN")}` : "No minimum bill"}
            {voucher.maxDiscountAmount ? ` · Up to ₹${Number(voucher.maxDiscountAmount).toLocaleString("en-IN")} off` : ""}
            {voucher.offers.length > 1 ? ` · +${voucher.offers.length - 1} more` : ""}
          </p>
        </div>

        <div className="mb-3.5 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
          <span className="flex min-w-0 items-center gap-1.5">
            <CalendarDays size={12} className="shrink-0" />
            <span className="truncate">
              {dateOnly(voucher.startDate)} – {dateOnly(voucher.endDate)}
            </span>
          </span>
          {validity && (
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[validity.tone]}`}>
              <Clock size={10} /> {validity.label}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-[10.5px] text-neutral-400">
            <Tag size={10} className="shrink-0" /> {voucher.versionCode}
          </span>
          {!voucher.isDummy && (
            <button
              onClick={() => onDelete(voucher)}
              disabled={busy}
              aria-label={`Delete ${voucher.title}`}
              title="Delete"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={() => onOpen(voucher)}
            className="flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-1.5 text-[11.5px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-400/15 dark:text-emerald-400"
          >
            {voucher.approvalStatus === VOUCHER_STATUSES.UNDER_REVIEW ? "Review" : "View"} <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function GridPager({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-[12.5px] text-neutral-500">
        Showing {rangeStart} to {rangeEnd} of {total} vouchers
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
              n === page
                ? "bg-emerald-400 text-neutral-950"
                : "bg-white text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-[11.5px] shadow-lg shadow-black/10 dark:bg-neutral-800">
      <div className="mb-0.5 text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="font-bold text-neutral-900 dark:text-neutral-50">{payload[0].value} vouchers</div>
    </div>
  );
}

/* Sidebar pages built on this one listing — each shows a slice of the
   vouchers. "all" is the original full listing (sidebar: Live Vouchers). */
const SCOPES = {
  all: {
    title: "Live Vouchers",
    subtitle: "Review vendor-submitted vouchers — approve, reject (with a reason) or publish them.",
    match: null,
    defaultView: "table",
  },
  waiting: {
    title: "Voucher Waiting",
    subtitle: "Vendor-submitted vouchers waiting for your approval — approve or reject them right from the table.",
    match: (v) => v.approvalStatus === VOUCHER_STATUSES.UNDER_REVIEW,
    defaultView: "table",
  },
  expired: {
    title: "Expired Vouchers",
    subtitle: "Vouchers whose validity has ended — no longer available to customers.",
    match: (v) => v.approvalStatus === VOUCHER_STATUSES.EXPIRED,
    defaultView: "table",
  },
  draft: {
    title: "Draft Vouchers",
    subtitle: "Vouchers vendors are still editing and haven't submitted for review yet.",
    match: (v) => v.approvalStatus === VOUCHER_STATUSES.DRAFT,
  },
  // The banner is a separate approval gate on the parent voucher — a
  // voucher has one waiting whenever `banner.pending` is set, whatever the
  // voucher's own status.
  banner: {
    title: "Banner Approval",
    subtitle: "Voucher banners vendors uploaded that are waiting for your approval.",
    match: (v) => Boolean(v.banner?.pending),
    defaultView: "table",
  },
  dummy: {
    title: "Dummy Vouchers",
    subtitle: "Test / demo vouchers (isDummy) — kept separate from Live Vouchers.",
    match: (v) => v.isDummy,
    defaultView: "table",
  },
};

/* Small modal asking for the (mandatory) rejection reason — used by the
   table's Reject buttons on Voucher Waiting and Banner Approval. */
function RejectReasonDialog({ title, subject, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!reason.trim()) {
      setError("Please enter a reason — the vendor will see it.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={busy ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900"
      >
        <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          Tell the vendor why <span className="font-medium text-neutral-700 dark:text-neutral-300">{subject}</span> is being rejected.
        </p>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          disabled={busy}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError("");
          }}
          placeholder="Rejection reason…"
          className={`mt-3 w-full resize-none rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 ${
            error ? "ring-1 ring-red-500/60" : "focus:ring-red-400/60"
          }`}
        />
        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={11} /> {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-neutral-200 px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

/* Voucher workflow from the table's status pill:
     Under Review → Approve → Approved → Publish → Published.
   The banner has its own gate: Banner Pending → Approve Banner. */
const VOUCHER_TONES = {
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
function getVoucherStep(v) {
  if (v.approvalStatus === VOUCHER_STATUSES.UNDER_REVIEW) return { kind: "approve", label: "Approve" };
  if (v.approvalStatus === VOUCHER_STATUSES.APPROVED) return { kind: "publish", label: "Publish" };
  if (v.approvalStatus === VOUCHER_STATUSES.PUBLISHED) return { kind: "pause", label: "Pause" };
  if (v.approvalStatus === VOUCHER_STATUSES.PAUSED) return { kind: "resume", label: "Resume" };
  return null;
}

// Copy + look for each confirm. `points` spell out what will happen;
// `reason` adds an optional note field (pause → internal note, max 1000;
// delete → shown in the admin deleted-list, max 500); `tone` colours the
// icon and confirm button.
const VOUCHER_STEP_COPY = {
  approve: {
    title: "Approve voucher?",
    icon: CheckCircle2,
    tone: "emerald",
    points: ["It moves to Approved.", "You can publish it after this."],
    action: "Approve",
  },
  publish: {
    title: "Publish voucher?",
    icon: Rocket,
    tone: "emerald",
    points: ["It goes live in the app for customers right away."],
    action: "Publish",
  },
  banner: {
    title: "Approve banner?",
    icon: CheckCircle2,
    tone: "emerald",
    points: ["The pending banner replaces the current one in the app."],
    action: "Approve Banner",
  },
  pause: {
    title: "Pause this voucher?",
    icon: PauseCircle,
    tone: "orange",
    points: [
      "It disappears from the customer app straight away.",
      "Dates, offers and images stay exactly as they are.",
      "You can resume it any time — unless its end date passes first.",
    ],
    action: "Yes, pause",
    reason: { label: "Note (optional — customers never see it)", max: 1000, placeholder: "e.g. Stock khatam, Monday tak" },
  },
  resume: {
    title: "Resume this voucher?",
    icon: PlayCircle,
    tone: "emerald",
    points: ["It goes back into the customer app exactly as it was before the pause."],
    action: "Yes, resume",
  },
  delete: {
    title: "Delete this voucher?",
    icon: Trash2,
    tone: "red",
    points: [
      "The voucher and all its versions are removed.",
      "The brand gets its voucher slot back.",
      "This can't be undone — to hide it for now, pause it instead.",
    ],
    action: "Yes, delete",
    reason: { label: "Reason (optional)", max: 500, placeholder: "e.g. Created by mistake" },
  },
};

const CONFIRM_TONES = {
  emerald: { badge: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400", button: "bg-emerald-400 text-neutral-950 hover:bg-emerald-300" },
  orange: { badge: "bg-orange-400/15 text-orange-600 dark:text-orange-400", button: "bg-orange-500 text-white hover:bg-orange-600" },
  red: { badge: "bg-red-500/15 text-red-600 dark:text-red-400", button: "bg-red-500 text-white hover:bg-red-600" },
};

/* Confirmation modal before a status step runs (table pill, card, row
   action or the details page). onConfirm(reason) may throw — the error is
   shown here and the modal stays open (e.g. delete blocked by live customer
   claims, with the backend's "pause it instead" hint). Esc / Cancel close it. */
function ConfirmStepDialog({ kind, subject, busy, onCancel, onConfirm }) {
  const copy = VOUCHER_STEP_COPY[kind];
  const tone = CONFIRM_TONES[copy.tone] || CONFIRM_TONES.emerald;
  const Icon = copy.icon;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const working = busy || running;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !working && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [working, onCancel]);

  const confirm = async () => {
    setError("");
    setRunning(true);
    try {
      await onConfirm(reason.trim() || undefined);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={working ? undefined : onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-step-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start gap-3.5">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.badge}`}>
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-step-title" className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
              {copy.title}
            </h2>
            <p className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1 text-[12px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              <Ticket size={12} className="shrink-0 text-neutral-400" />
              <span className="truncate">{subject}</span>
            </p>
          </div>
          <button onClick={onCancel} disabled={working} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40 dark:hover:bg-neutral-800">
            <X size={15} />
          </button>
        </div>

        <ul className="mt-4 space-y-1.5">
          {copy.points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-[12.5px] text-neutral-600 dark:text-neutral-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
              {p}
            </li>
          ))}
        </ul>

        {copy.reason && (
          <label className="mt-4 block">
            <span className="mb-1 block text-[12px] font-medium text-neutral-600 dark:text-neutral-300">{copy.reason.label}</span>
            <textarea
              rows={2}
              value={reason}
              maxLength={copy.reason.max}
              onChange={(e) => setReason(e.target.value)}
              disabled={working}
              placeholder={copy.reason.placeholder}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
            <span className="mt-0.5 block text-right text-[10.5px] text-neutral-400">
              {reason.length}/{copy.reason.max}
            </span>
          </label>
        )}

        {error && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-red-500/5 px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={working}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={working}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${tone.button}`}
          >
            {working ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
            {copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Reject icon button for table rows (opens the reason dialog). */
function RejectIconButton({ busy, onClick, label }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
    >
      <XCircle size={13} />
    </button>
  );
}

/* -------------------------------------------------------------------------
 * Main page — list <-> details (master/detail, no router required)
 * ---------------------------------------------------------------------- */
export default function VoucherListing({ scope = "all" }) {
  const scopeConfig = SCOPES[scope] || SCOPES.all;
  const isScoped = Boolean(scopeConfig.match);
  // Full list from the API; `vouchers` below is this page's slice of it.
  const [allVouchers, setVouchers] = useState([]);
  // Dummy vouchers only ever show on the Dummy Vouchers page.
  const vouchers = useMemo(() => {
    const pool = scope === "dummy" ? allVouchers : allVouchers.filter((v) => !v.isDummy);
    if (isScoped) return pool.filter(scopeConfig.match);
    // Live Vouchers: drafts aren't submitted yet — they show only on Draft Vouchers.
    return pool.filter((v) => v.approvalStatus !== VOUCHER_STATUSES.DRAFT);
  }, [allVouchers, isScoped, scopeConfig, scope]);
  // Row whose Reject button was clicked — { row, kind: "voucher" | "banner" }.
  const [rejecting, setRejecting] = useState(null);
  // Row whose status pill was clicked — { row, kind: "approve" | "publish" | "banner" }.
  const [stepping, setStepping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [view, setView] = useState(scopeConfig.defaultView || "grid");
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = view === "grid" ? 9 : 10;

  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  // Fresh single-voucher fetch for the details page — the list row from
  // getVouchers() is shown immediately (no blank flash on open), then
  // overlaid with whatever this returns once it resolves.
  const [voucherDetail, setVoucherDetail] = useState(null);

  // `silent` = background refresh after an action — keeps the list on
  // screen instead of swapping it for the loading state.
  const fetchList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      // Every page — one call caps at 100 versions.
      const raw = await getAllVoucherVersions();
      setVouchers(raw.map(apiVersionToRow));
    } catch (err) {
      if (isNotFoundMessage(err.message)) {
        setVouchers([]);
      } else {
        setLoadError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      const q = search.toLowerCase();
      const matchesSearch =
        v.title.toLowerCase().includes(q) ||
        v.brandName.toLowerCase().includes(q) ||
        (v.versionCode || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || v.approvalStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vouchers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Looked up in the full list so the details page stays open after an
  // action moves the voucher out of this page's scope (e.g. approve on
  // Voucher Waiting).
  const selectedListRow = allVouchers.find((v) => v.id === selectedId) || null;

  // GET /vouchers/get/:voucherId — fetches the fresher single-voucher
  // detail once a row is opened. Ids that drive approve/reject/publish/
  // banner actions always come from the list row, never from this fetch,
  // since its exact response shape isn't confirmed yet.
  // `detailReloadKey` is bumped after every approve/reject/publish/banner
  // action — without it this only ran once per opened voucher, so the
  // stale detail (spread over the refreshed list row below) kept the old
  // status and the old action buttons on screen after an approve.
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  useEffect(() => {
    if (!selectedListRow) {
      setVoucherDetail(null);
      return;
    }
    let cancelled = false;
    getVoucherById(selectedListRow.voucherId)
      .then((res) => {
        if (!cancelled) setVoucherDetail(apiVoucherDetailToRow(res?.data));
      })
      .catch((err) => {
        // The list row (already showing) covers the UI — this fetch is a
        // refresh on top of it, so a failure here shouldn't surface as a
        // page-level error, just a note for debugging while the shape of
        // GET /vouchers/get/:voucherId gets confirmed.
        if (!cancelled) console.error("[VoucherList] GET /vouchers/get/:voucherId failed:", err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedListRow?.voucherId, detailReloadKey]);

  // After a workflow action: drop the now-stale detail (so the freshly
  // fetched list row's status shows immediately), refetch the list, then
  // trigger a detail refetch.
  const refreshAfterAction = async () => {
    setVoucherDetail(null);
    await fetchList({ silent: true });
    setDetailReloadKey((k) => k + 1);
  };

  const selectedVoucher = selectedListRow
    ? { ...selectedListRow, ...(voucherDetail || {}), id: selectedListRow.id, voucherId: selectedListRow.voucherId }
    : null;

  // Real status mix + monthly creation trend — both derived straight from
  // the already-loaded vouchers, no separate endpoint needed.
  const statusMix = useMemo(() => {
    const counts = new Map();
    vouchers.forEach((v) => {
      const key = v.approvalStatus || VOUCHER_STATUSES.DRAFT;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([status, count]) => ({ status, count, color: STATUS_HEX[status] || "#A3A3A3" }))
      .sort((a, b) => b.count - a.count);
  }, [vouchers]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { y: dt.getFullYear(), m: dt.getMonth(), label: dt.toLocaleString("en-US", { month: "short" }) };
    });
    const counts = months.map(() => 0);
    vouchers.forEach((v) => {
      if (!v.createdAt) return;
      const d = new Date(v.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const idx = months.findIndex((mo) => mo.y === d.getFullYear() && mo.m === d.getMonth());
      if (idx !== -1) counts[idx] += 1;
    });
    return months.map((mo, i) => ({ d: mo.label, vouchers: counts[i] }));
  }, [vouchers]);

  const handleExportCsv = () => {
    downloadCsv("vouchers", [
      { label: "Title", key: "title" },
      { label: "Version Code", key: "versionCode" },
      { label: "Brand", key: "brandName" },
      { label: "Category", key: "category" },
      { label: "Offer", key: "discount" },
      { label: "Start Date", key: "startDate" },
      { label: "End Date", key: "endDate" },
      { label: "Created", key: "createdAtDisplay" },
      { label: "Status", key: "approvalStatus" },
    ], filtered);
  };

  // Delete opens the confirm dialog (optional reason); runStep does the call.
  const handleDelete = (voucher) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    setStepping({ row: voucher, kind: "delete" });
  };

  /* Runs one confirmed step from ConfirmStepDialog (table, cards or the
     details page). approve / publish / banner keep their own error banner;
     pause / resume / delete throw so the dialog shows the error inline. */
  const runStep = async (kind, row, reason) => {
    if (kind === "approve") return handleApprove(row);
    if (kind === "publish") return handlePublish(row);
    if (kind === "banner") return handleApproveBanner(row);
    if (kind === "delete") {
      await deleteVoucher(row.voucherId, reason); // parent voucher id
      if (selectedId === row.id) setSelectedId(null);
      await fetchList({ silent: true });
      return;
    }
    if (kind === "pause") await pauseVoucher(row.id, reason); // version id
    else if (kind === "resume") await resumeVoucher(row.id); // version id
    await refreshAfterAction();
  };
  const confirmStep = async (reason) => {
    const { row, kind } = stepping;
    if (row?.isDummy) {
      setStepping(null); // dummy vouchers are view-only
      return;
    }
    await runStep(kind, row, reason);
    setStepping(null);
  };

  /* ---- Approval workflow (Super Admin) ------------------------------ */
  const handleApprove = async (voucher) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    setActionError("");
    setActionBusy(true);
    try {
      await approveVoucher(voucher.id);
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (voucher, reason) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    setActionError("");
    setActionBusy(true);
    try {
      await rejectVoucher(voucher.id, reason);
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handlePublish = async (voucher) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    setActionError("");
    setActionBusy(true);
    try {
      await publishVoucher(voucher.id);
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---- Banner review — separate approval gate on the parent voucher,
     independent of the version workflow above --------------------------- */
  const handleApproveBanner = async (voucher) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    setActionError("");
    setActionBusy(true);
    try {
      await approveVoucherBanner(voucher.voucherId);
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectBanner = async (voucher, reason) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    setActionError("");
    setActionBusy(true);
    try {
      await rejectVoucherBanner(voucher.voucherId, reason);
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---- Images + banner from the details page. These throw on failure so
     the gallery / uploader can show the error inline. ------------------- */
  // Images belong to the version, so this takes the version id (voucher.id).
  const handleReorderImages = async (voucher, imageIds) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    await reorderVoucherImages(voucher.id, imageIds);
    await refreshAfterAction();
  };
  // Banner lives on the parent voucher (voucherId); video needs a poster.
  const handleUploadBanner = async (voucher, media, poster) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    await uploadVoucherBanner(voucher.voucherId, media, poster);
    await refreshAfterAction();
  };

  /* ---- Admin curation — feature/un-feature on the "Suggested" rail --- */
  const handleToggleSuggested = async (voucher) => {
    if (voucher?.isDummy) return; // dummy vouchers are view-only
    setActionError("");
    setActionBusy(true);
    try {
      await updateVoucherSuggestion(voucher.voucherId, {
        isSuggested: !voucher.isSuggested,
        suggestionOrder: 1,
      });
      await fetchList({ silent: true });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---- Detail view --------------------------------------------------- */
  if (selectedVoucher) {
    return (
      <>
      <VoucherDetails
        voucher={selectedVoucher}
        onBack={() => setSelectedId(null)}
        onApprove={() => handleApprove(selectedVoucher)}
        onReject={(reason) => handleReject(selectedVoucher, reason)}
        onPublish={() => handlePublish(selectedVoucher)}
        onApproveBanner={() => handleApproveBanner(selectedVoucher)}
        onRejectBanner={(reason) => handleRejectBanner(selectedVoucher, reason)}
        onReorderImages={(ids) => handleReorderImages(selectedVoucher, ids)}
        onUploadBanner={(media, poster) => handleUploadBanner(selectedVoucher, media, poster)}
        busy={actionBusy}
        actionError={actionError}
        onRequestStep={(kind) => setStepping({ row: selectedVoucher, kind })}
      />
      {stepping && (
        <ConfirmStepDialog
          kind={stepping.kind}
          subject={stepping.row.title}
          busy={actionBusy}
          onCancel={() => setStepping(null)}
          onConfirm={confirmStep}
        />
      )}
      </>
    );
  }

  /* ---- Summary counts (full list, independent of filters) ------------ */
  const statusCounts = vouchers.reduce((acc, v) => {
    acc[v.approvalStatus] = (acc[v.approvalStatus] || 0) + 1;
    return acc;
  }, {});
  const countOf = (s) => statusCounts[s] || 0;
  const suggestedCount = vouchers.filter((v) => v.isSuggested).length;
  const createdInRange = monthlyTrend.reduce((s, m) => s + m.vouchers, 0);

  // Only show tabs for statuses that actually have vouchers (plus All and
  // whichever one is currently selected), so the bar doesn't fill up with
  // empty 0-count tabs.
  const visibleStatusTabs = STATUS_FILTERS.filter(
    (s) => s === "All" || s === statusFilter || countOf(s) > 0
  );

  const applyStatusFilter = (s) => {
    setStatusFilter(s);
    setPage(1);
  };
  const changeView = (next) => {
    setView(next);
    setPage(1);
  };
  const filtersActive = Boolean(search) || statusFilter !== "All";

  /* ---- Table columns -------------------------------------------------- */
  const baseColumns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-14",
      render: (_row, index) => <span className="text-neutral-500">{(page - 1) * pageSize + index + 1}</span>,
    },
    {
      key: "title",
      label: "Voucher",
      cellClass: "min-w-56 max-w-72 whitespace-normal",
      render: (row) => (
        <button onClick={() => setSelectedId(row.id)} className="group flex items-center gap-3 text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400/30 via-sky-400/20 to-violet-400/20">
            {row.images?.[0]?.url ? (
              <img src={row.images[0].url} alt={row.title} className="h-full w-full object-cover" />
            ) : (
              <Ticket size={16} className="text-emerald-600/70 dark:text-emerald-400/70" />
            )}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold text-neutral-900 group-hover:text-emerald-600 dark:text-neutral-50 dark:group-hover:text-emerald-400">
              <span className="line-clamp-1">{row.title}</span>
              {row.isSuggested && <Star size={11} className="shrink-0 text-amber-500" fill="currentColor" />}
              {row.isDummy && <DummyBadge size="sm" />}
            </p>
            <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap font-mono text-[10.5px] text-neutral-400">
              <Tag size={10} className="shrink-0" /> {row.versionCode}
            </p>
            {row.isDummy && row.dummyBatch && (
              <p className="mt-0.5 whitespace-nowrap font-mono text-[10.5px] text-violet-600 dark:text-violet-400">
                {row.dummyBatch}
              </p>
            )}
          </div>
        </button>
      ),
    },
    {
      key: "brand",
      label: "Brand",
      render: (row) => (
        <div className="flex items-center gap-2">
          <BrandMark voucher={row} />
          <div className="min-w-0">
            <p className="truncate font-medium text-neutral-800 dark:text-neutral-200">{row.brandName}</p>
            <p className="truncate text-[10.5px] text-neutral-400">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: "discount",
      label: "Offer",
      cellClass: "min-w-44 max-w-56 whitespace-normal",
      render: (row) => (
        <div>
          <span className="inline-block rounded-lg border border-dashed border-emerald-400/50 bg-emerald-400/[0.06] px-2 py-1 text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
            {row.discount}
          </span>
          {row.offers.length > 1 && <p className="mt-1 text-[10.5px] text-neutral-500">+{row.offers.length - 1} more offers</p>}
        </div>
      ),
    },
    {
      key: "validity",
      label: "Validity",
      render: (row) => {
        const validity = validityOf(row);
        return (
          <div>
            <p className="whitespace-nowrap text-[12px] text-neutral-600 dark:text-neutral-300">
              {dateOnly(row.startDate)} – {dateOnly(row.endDate)}
            </p>
            {validity && (
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[validity.tone]}`}>
                <Clock size={10} /> {validity.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <VoucherStatusBadge status={row.approvalStatus} />,
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => row.isDummy ? dummyActions(row) : (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleToggleSuggested(row)}
            disabled={actionBusy}
            aria-label={row.isSuggested ? `Remove ${row.title} from suggestions` : `Suggest ${row.title}`}
            title={row.isSuggested ? "Remove from Suggested" : "Mark as Suggested"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
              row.isSuggested
                ? "border-amber-400/40 bg-amber-400/10 text-amber-500"
                : "border-neutral-200 text-neutral-400 hover:text-amber-500 dark:border-neutral-800 dark:text-neutral-500"
            }`}
          >
            <Star size={13} fill={row.isSuggested ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => setSelectedId(row.id)}
            aria-label={`View ${row.title}`}
            title="View details"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-sky-400/40 hover:text-sky-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-sky-400"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            disabled={actionBusy}
            aria-label={`Delete ${row.title}`}
            title="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const viewButton = (row) => (
    <button
      onClick={() => setSelectedId(row.id)}
      aria-label={`View ${row.title}`}
      title="View details"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-sky-400/40 hover:text-sky-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-sky-400"
    >
      <Eye size={13} />
    </button>
  );

  // Dummy vouchers are view-only: View + a lock, no other actions.
  function dummyActions(row) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span
          title="Dummy voucher — view only"
          aria-label="View only"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
        >
          <Lock size={13} />
        </span>
        {viewButton(row)}
      </div>
    );
  }

  // Status pill doubles as the workflow button (Approve → Publish), on
  // every voucher page's table. Dummy vouchers just get the plain badge.
  const statusStepColumn = {
    key: "status",
    label: "Status",
    render: (row) => {
      if (row.isDummy) return <VoucherStatusBadge status={row.approvalStatus} />;
      const step = getVoucherStep(row);
      return (
        <StatusStepButton
          label={STATUS_LABELS[row.approvalStatus] || row.approvalStatus}
          tone={VOUCHER_TONES[row.approvalStatus]}
          stepLabel={step?.label}
          disabled={actionBusy}
          onClick={() => setStepping({ row, kind: step.kind })}
        />
      );
    },
  };

  // Voucher Waiting — reject sits next to the pill's Approve.
  const waitingActionColumn = {
    key: "action",
    label: "Action",
    align: "right",
    render: (row) => row.isDummy ? dummyActions(row) : (
      <div className="flex items-center justify-end gap-1.5">
        <RejectIconButton busy={actionBusy} label={`Reject ${row.title}`} onClick={() => setRejecting({ row, kind: "voucher" })} />
        {viewButton(row)}
      </div>
    ),
  };

  // Banner Approval — the pending banner next to the live one, plus
  // approve / reject for the banner (not the voucher itself).
  const bannerColumn = {
    key: "banner",
    label: "Banner",
    render: (row) => (
      <div className="flex items-center gap-2">
        {[
          ["Current", row.banner?.current?.url],
          ["Pending", row.banner?.pending?.url],
        ].map(([label, url]) => (
          <div key={label} className="text-center">
            <div className="flex h-12 w-24 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 text-[10px] text-neutral-400 dark:bg-neutral-800">
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="h-full w-full">
                  <img src={url} alt={`${label} banner`} className="h-full w-full object-cover" />
                </a>
              ) : (
                "None"
              )}
            </div>
            <p className={`mt-1 text-[10px] font-medium ${label === "Pending" ? "text-amber-600 dark:text-amber-400" : "text-neutral-400"}`}>{label}</p>
          </div>
        ))}
      </div>
    ),
  };
  // Banner Approval — the pill is the banner's own status, not the voucher's.
  const bannerStatusColumn = {
    key: "bannerStatus",
    label: "Banner Status",
    render: (row) => row.isDummy ? <VoucherStatusBadge status={row.approvalStatus} /> : (
      <StatusStepButton
        label="Banner Pending"
        tone="amber"
        stepLabel="Approve Banner"
        disabled={actionBusy}
        onClick={() => setStepping({ row, kind: "banner" })}
      />
    ),
  };
  const bannerActionColumn = {
    key: "action",
    label: "Action",
    align: "right",
    render: (row) => row.isDummy ? dummyActions(row) : (
      <div className="flex items-center justify-end gap-1.5">
        <RejectIconButton busy={actionBusy} label={`Reject banner for ${row.title}`} onClick={() => setRejecting({ row, kind: "banner" })} />
        {viewButton(row)}
      </div>
    ),
  };

  const withStepPill = baseColumns.map((c) => (c.key === "status" ? statusStepColumn : c));
  const columns =
    scope === "waiting"
      ? withStepPill.map((c) => (c.key === "action" ? waitingActionColumn : c))
      : scope === "banner"
      ? [
          ...baseColumns.filter((c) => ["sno", "title", "brand"].includes(c.key)),
          bannerColumn,
          bannerStatusColumn,
          bannerActionColumn,
        ]
      : withStepPill;

  const confirmReject = async (reason) => {
    const { row, kind } = rejecting;
    await (kind === "banner" ? handleRejectBanner(row, reason) : handleReject(row, reason));
    setRejecting(null);
  };

  const donutData = statusMix.length ? statusMix : [{ status: "none", count: 1, color: "#E5E5E5" }];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">{scopeConfig.title}</h1>
            <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">{scopeConfig.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={fetchList}
              aria-label="Refresh"
              title="Refresh"
              className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleExportCsv}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
            >
              <FileDown size={14} />
              Export CSV
            </button>
            <button
              onClick={printAsPdf}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              <Printer size={14} />
              Download PDF
            </button>
          </div>
        </div>

        {/* KPI tiles — clicking one filters the list to that status. Only on
            the full listing; a scoped page is already a single status. */}
        {!isScoped && (
        <div className="no-print mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiTile
            icon={Ticket}
            label="Total Vouchers"
            value={vouchers.length}
            hint={`${suggestedCount} suggested`}
            tint="emerald"
            active={statusFilter === "All"}
            onClick={() => applyStatusFilter("All")}
          />
          <KpiTile
            icon={ShieldCheck}
            label="Under Review"
            value={countOf(VOUCHER_STATUSES.UNDER_REVIEW)}
            hint="Needs your action"
            tint="amber"
            active={statusFilter === VOUCHER_STATUSES.UNDER_REVIEW}
            onClick={() => applyStatusFilter(VOUCHER_STATUSES.UNDER_REVIEW)}
          />
          <KpiTile
            icon={CheckCircle2}
            label="Approved"
            value={countOf(VOUCHER_STATUSES.APPROVED)}
            hint="Ready to publish"
            tint="sky"
            active={statusFilter === VOUCHER_STATUSES.APPROVED}
            onClick={() => applyStatusFilter(VOUCHER_STATUSES.APPROVED)}
          />
          <KpiTile
            icon={Rocket}
            label="Live"
            value={countOf(VOUCHER_STATUSES.PUBLISHED)}
            hint="Published in app"
            tint="emerald"
            active={statusFilter === VOUCHER_STATUSES.PUBLISHED}
            onClick={() => applyStatusFilter(VOUCHER_STATUSES.PUBLISHED)}
          />
          <KpiTile
            icon={XCircle}
            label="Rejected"
            value={countOf(VOUCHER_STATUSES.REJECTED)}
            hint="Sent back to vendor"
            tint="neutral"
            active={statusFilter === VOUCHER_STATUSES.REJECTED}
            onClick={() => applyStatusFilter(VOUCHER_STATUSES.REJECTED)}
          />
        </div>
        )}

        {/* Overview charts — real data, independent of the filters below.
            Status Mix is skipped on scoped pages (it'd be one 100% slice). */}
        <div className={`no-print mb-5 grid grid-cols-1 gap-4 ${isScoped ? "" : "lg:grid-cols-[1fr_1.4fr]"}`}>
          {!isScoped && (
          <div className={`p-5 ${cardClass}`}>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
              <PieChartIcon size={14} className="text-emerald-500" /> Status Mix
            </div>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">Vouchers by workflow stage</p>
            <div className="flex items-center gap-4 pt-3">
              {/* Box is larger than the donut's diameter (2 × outerRadius)
                  plus Recharts' 5px margin, so the ring never gets clipped. */}
              <div className="relative h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={48}
                      outerRadius={64}
                      paddingAngle={statusMix.length > 1 ? 3 : 0}
                      cornerRadius={6}
                      isAnimationActive={false}
                    >
                      {donutData.map((s) => (
                        <Cell key={s.status} fill={s.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{vouchers.length}</span>
                  <span className="mt-1 text-[10.5px] text-neutral-500">Total</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {statusMix.length ? (
                  statusMix.map((s) => {
                    const pct = vouchers.length ? Math.round((s.count / vouchers.length) * 100) : 0;
                    return (
                      <button key={s.status} onClick={() => applyStatusFilter(s.status)} className="block w-full text-left">
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="truncate text-neutral-600 dark:text-neutral-400">{STATUS_LABELS[s.status] || s.status}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-50">
                            {s.count} <span className="font-normal text-neutral-400">· {pct}%</span>
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[12px] text-neutral-500">No vouchers yet.</p>
                )}
              </div>
            </div>
          </div>
          )}

          <div className={`p-5 ${cardClass}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
                  <TrendingUp size={14} className="text-emerald-500" /> Vouchers Created
                </div>
                <p className="mt-0.5 text-[11.5px] text-neutral-500">{createdInRange} created in the last 6 months</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                Last 6 Months
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="voucherTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2FDE8C" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2FDE8C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#8C9A91" strokeOpacity={0.18} />
                <XAxis dataKey="d" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#2FDE8C", strokeOpacity: 0.4 }} />
                <Area
                  type="natural"
                  dataKey="vouchers"
                  stroke="#2FDE8C"
                  strokeWidth={2.4}
                  fill="url(#voucherTrendFill)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status tabs + search + view toggle */}
        <div className="no-print mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0">
            {!isScoped && visibleStatusTabs.map((s) => {
              const isActive = statusFilter === s;
              const count = s === "All" ? vouchers.length : countOf(s);
              return (
                <button
                  key={s}
                  onClick={() => applyStatusFilter(s)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {s !== "All" && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[s]?.dot}`} />}
                  {s === "All" ? "All" : STATUS_LABELS[s] || s}
                  <span className={`rounded-full px-1.5 text-[10.5px] ${isActive ? "bg-emerald-400/20" : "bg-neutral-200 dark:bg-neutral-800"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex flex-1 items-center gap-2 px-3.5 py-2.5 lg:w-72 lg:flex-none ${cardClass} rounded-xl`}>
              <Search size={15} className="shrink-0 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search voucher, brand or code..."
                className="w-full bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} aria-label="Clear search" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
              <button
                onClick={() => changeView("grid")}
                aria-label="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "grid" ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => changeView("table")}
                aria-label="Table view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "table" ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="no-print mb-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        {/* Load state */}
        {loading && (
          <div className={`flex items-center justify-center gap-2 py-14 text-[13px] text-neutral-500 ${cardClass}`}>
            <Loader2 size={16} className="animate-spin" />
            Loading vouchers…
          </div>
        )}

        {!loading && loadError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <span className="flex items-center gap-2"><AlertTriangle size={14} /> Failed to load vouchers: {loadError}</span>
            <button onClick={fetchList} className="font-semibold underline underline-offset-2">Retry</button>
          </div>
        )}

        {/* Grid / Table */}
        {!loading && !loadError && (
          <div className="print-area">
            {view === "grid" ? (
              pagedRows.length ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {pagedRows.map((v) => (
                      <VoucherCard
                        key={v.id}
                        voucher={v}
                        busy={actionBusy}
                        onOpen={(row) => setSelectedId(row.id)}
                        onToggleSuggested={handleToggleSuggested}
                        onStep={(row, step) => setStepping({ row, kind: step.kind })}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                  <GridPager page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
                </>
              ) : (
                <div className={`flex flex-col items-center gap-3 py-16 text-center ${cardClass}`}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-500">
                    <Ticket size={22} />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">No vouchers found</p>
                    <p className="mt-0.5 text-[12.5px] text-neutral-500">
                      {filtersActive
                        ? "Try a different search or status."
                        : isScoped
                        ? `No ${scopeConfig.title.toLowerCase()} right now.`
                        : "Vendor-submitted vouchers will appear here."}
                    </p>
                  </div>
                  {filtersActive && (
                    <button
                      onClick={() => { setSearch(""); applyStatusFilter("All"); }}
                      className="rounded-xl border border-neutral-200 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )
            ) : (
              <Table
                columns={columns}
                data={pagedRows}
                emptyMessage="No vouchers match your filters."
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                total={filtered.length}
                pageSize={pageSize}
              />
            )}
          </div>
        )}
      </div>

      {stepping && (
        <ConfirmStepDialog
          kind={stepping.kind}
          subject={stepping.row.title}
          busy={actionBusy}
          onCancel={() => setStepping(null)}
          onConfirm={confirmStep}
        />
      )}

      {rejecting && (
        <RejectReasonDialog
          title={rejecting.kind === "banner" ? "Reject banner" : "Reject voucher"}
          subject={rejecting.kind === "banner" ? `the banner for "${rejecting.row.title}"` : `"${rejecting.row.title}"`}
          busy={actionBusy}
          onCancel={() => setRejecting(null)}
          onConfirm={confirmReject}
        />
      )}
    </div>
  );
}
