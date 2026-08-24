import React, { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { getBrandVerifications, reviewBrandVerification } from "./services/NewOnboardingApi";
import BrandCard from "./BrandCard";
import VerificationDetails from "./VerificationDetails";

/* -------------------------------------------------------------------------
 * Maps one API brand-verification record into the flat shape this page's
 * UI uses. `derivedStatus` is computed from the confirmed boolean flags
 * (isAdminApproved/isRejected/isRevoked) rather than the raw `status`
 * enum, since only "MANUAL_REVIEW" has been confirmed as a possible value
 * for that field so far.
 * ---------------------------------------------------------------------- */
function deriveStatus(raw) {
  if (raw.isRevoked) return "REVOKED";
  if (raw.isRejected) return "REJECTED";
  if (raw.isAdminApproved) return "APPROVED";
  return raw.status || "PENDING";
}

function mapVerification(raw) {
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
    vendor: {
      id: vendor._id,
      name: vendor.name || "",
      email: vendor.email || "",
      mobile: vendor.mobile || "",
      role: vendor.role || "",
      currentScreen: vendor.currentScreen || "",
    },
  };
}

const STATUS_TABS = ["All", "MANUAL_REVIEW", "APPROVED", "REJECTED", "REVOKED"];
const STATUS_TAB_LABELS = {
  All: "All",
  MANUAL_REVIEW: "Manual Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
};

/* -------------------------------------------------------------------------
 * Main page — list (grid) + navigation into the verification details page.
 * ---------------------------------------------------------------------- */

export default function NewOnboarding() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedId, setSelectedId] = useState(null);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getBrandVerifications({ page, limit, search });
      const rows = (res?.data?.data ?? []).map(mapVerification);
      setVerifications(rows);
      setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchVerifications();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Refetch on page change (search effect already handles search changes)
  useEffect(() => {
    fetchVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Status filtering is client-side (within the current page) since the
  // list endpoint's confirmed query params are only page/limit/search.
  const filtered =
    statusTab === "All" ? verifications : verifications.filter((v) => v.derivedStatus === statusTab);

  const selected = verifications.find((v) => v.id === selectedId) || null;

  /* ---- Review workflow (Approve / Reject / Mark Reviewed) ------------ */
  const handleReview = async (verification, payload) => {
    setActionError("");
    setActionBusy(true);
    try {
      const brandId = verification.brandId || verification.brand?.id;
      await reviewBrandVerification(brandId, payload);
      await fetchVerifications();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleApprove = (verification, note) => handleReview(verification, { action: "APPROVED", note });
  const handleReject = (verification, rejectionReason) =>
    handleReview(verification, { action: "REJECTED", rejectionReason });
  const handleMarkReviewed = (verification) => handleReview(verification, { action: "REVIEWED" });

  if (selected) {
    return (
      <VerificationDetails
        verification={selected}
        onBack={() => setSelectedId(null)}
        onApprove={(note) => handleApprove(selected, note)}
        onReject={(reason) => handleReject(selected, reason)}
        onMarkReviewed={() => handleMarkReviewed(selected)}
        busy={actionBusy}
        actionError={actionError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">
            Brand Onboarding Verifications
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Automated verification attempts from vendor brand onboarding — review scores, checks and
            open a card for the full breakdown.
          </p>
        </div>

        {/* Search + status tabs */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand name..."
              className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  statusTab === tab ? "bg-emerald-400 text-neutral-950" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {STATUS_TAB_LABELS[tab] || tab}
              </button>
            ))}
          </div>
        </div>

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading verifications…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-400">
            Failed to load verifications: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-10 text-center text-neutral-500">
                No verifications found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((v) => (
                  <BrandCard key={v.id} verification={v} onOpen={(row) => setSelectedId(row.id)} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-[12.5px] text-neutral-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
