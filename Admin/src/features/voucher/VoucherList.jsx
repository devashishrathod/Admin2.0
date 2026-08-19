import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Trash2,
  Eye,
  Tag,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Table from "../../components/common/Table";
import VoucherDetails from "./VoucherDetails";
import {
  getVouchers,
  approveVoucher,
  rejectVoucher,
  publishVoucher,
  deleteVoucher,
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
  [VOUCHER_STATUSES.DRAFT]: { dot: "bg-neutral-500", text: "text-neutral-400", bg: "bg-neutral-700/40" },
  [VOUCHER_STATUSES.UNDER_REVIEW]: { dot: "bg-amber-400", text: "text-amber-400", bg: "bg-amber-400/10" },
  [VOUCHER_STATUSES.APPROVED]: { dot: "bg-sky-400", text: "text-sky-400", bg: "bg-sky-400/10" },
  [VOUCHER_STATUSES.PUBLISHED]: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10" },
  [VOUCHER_STATUSES.REJECTED]: { dot: "bg-red-400", text: "text-red-400", bg: "bg-red-500/10" },
  [VOUCHER_STATUSES.EXPIRED]: { dot: "bg-neutral-500", text: "text-neutral-400", bg: "bg-neutral-700/40" },
  [VOUCHER_STATUSES.PAUSED]: { dot: "bg-orange-400", text: "text-orange-400", bg: "bg-orange-400/10" },
  [VOUCHER_STATUSES.ARCHIVED]: { dot: "bg-neutral-600", text: "text-neutral-500", bg: "bg-neutral-800" },
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
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}
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
    entries.push({ action: "Created", date: v.createdAt, by: personLabel(v.createdByUser, v.createdBy), remarks: null });
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
        }
      : null,
    category: v.category?.name || "—",
    subCategory: v.subCategory?.name || "—",
    description: v.description || "",
    tags: v.tags || [],
    images: (v.images || []).map((img) => img.url),
    offers: v.offers || [],
    discount: primaryOffer?.title || "—",
    minBillAmount: primaryOffer?.minBillAmount ?? 0,
    maxDiscountAmount: primaryOffer?.maxDiscountAmount ?? 0,
    attachedSubBrandsCount: v.attachedSubBrandsCount ?? 0,
    publishedDate: formatDate(v.publishedAt || v.createdAt),
    startDate: formatDate(v.startAt),
    endDate: formatDate(v.endAt),
    // The version's own `status` is the authoritative, up-to-date workflow
    // state — the parent `voucher.status` can lag behind it (e.g. a
    // version can show status "PUBLISHED" while `voucher.status` is still
    // "APPROVED"), so prefer the version's status and only fall back to
    // the parent's when the version itself doesn't have one.
    approvalStatus: v.status || voucher.status || VOUCHER_STATUSES.DRAFT,
    isActive: Boolean(v.isActive),
    rejectionReason: v.rejectionReason || null,
    history: buildTimeline(v),
  };
}

/* -------------------------------------------------------------------------
 * Main page — list <-> details (master/detail, no router required)
 * ---------------------------------------------------------------------- */
export default function VoucherListing() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getVouchers({ page: 1, limit: 100 });
      const rows = (res?.data?.data ?? []).map(apiVersionToRow);
      setVouchers(rows);
    } catch (err) {
      setLoadError(err.message);
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

  const selectedVoucher = vouchers.find((v) => v.id === selectedId) || null;

  const handleDelete = async (voucher) => {
    setActionError("");
    setActionBusy(true);
    try {
      await deleteVoucher(voucher.voucherId);
      if (selectedId === voucher.id) setSelectedId(null);
      await fetchList();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---- Approval workflow (Super Admin) ------------------------------ */
  const handleApprove = async (voucher) => {
    setActionError("");
    setActionBusy(true);
    try {
      await approveVoucher(voucher.id);
      await fetchList();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (voucher, reason) => {
    setActionError("");
    setActionBusy(true);
    try {
      await rejectVoucher(voucher.id, reason);
      await fetchList();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handlePublish = async (voucher) => {
    setActionError("");
    setActionBusy(true);
    try {
      await publishVoucher(voucher.id);
      await fetchList();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---- Detail view --------------------------------------------------- */
  if (selectedVoucher) {
    return (
      <VoucherDetails
        voucher={selectedVoucher}
        onBack={() => setSelectedId(null)}
        onApprove={() => handleApprove(selectedVoucher)}
        onReject={(reason) => handleReject(selectedVoucher, reason)}
        onPublish={() => handlePublish(selectedVoucher)}
        busy={actionBusy}
        actionError={actionError}
      />
    );
  }

  /* ---- Table columns -------------------------------------------------- */
  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-14",
      render: (_row, index) => <span className="text-neutral-500">{index + 1}</span>,
    },
    {
      key: "title",
      label: "Voucher",
      render: (row) => (
        <button onClick={() => setSelectedId(row.id)} className="text-left hover:underline">
          <p className="font-medium text-neutral-50">{row.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
            <Tag size={10} /> {row.versionCode} · {row.brandName}
          </p>
        </button>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => <span className="text-neutral-300">{row.category}</span>,
    },
    {
      key: "discount",
      label: "Offer",
      render: (row) => (
        <div>
          <p className="font-semibold text-neutral-200">{row.discount}</p>
          {row.offers.length > 1 && (
            <p className="text-[11px] text-neutral-500">+{row.offers.length - 1} more</p>
          )}
        </div>
      ),
    },
    {
      key: "validity",
      label: "Validity",
      render: (row) => (
        <span className="text-[12.5px] text-neutral-400">
          {row.startDate} → {row.endDate}
        </span>
      ),
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
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedId(row.id)}
            aria-label={`View ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-sky-400"
            title="View details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            disabled={actionBusy}
            aria-label={`Delete ${row.title}`}
            title="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">Vouchers</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Review vendor-submitted vouchers — approve, reject (with a reason) or publish them.
          </p>
        </div>

        {/* Search + status filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voucher, brand or code..."
              className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-1.5">
            <SlidersHorizontal size={14} className="ml-1 shrink-0 text-neutral-500" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  statusFilter === s ? "bg-emerald-400 text-neutral-950" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {s === "All" ? "All" : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>

        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading vouchers…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-400">
            Failed to load vouchers: {loadError}
          </div>
        )}

        {/* Table */}
        {!loading && !loadError && (
          <Table columns={columns} data={filtered} emptyMessage="No vouchers match your filters." />
        )}
      </div>
    </div>
  );
}
