import { Eye } from "lucide-react";
import ValueOr from "../../components/common/ValueOr";
import { MISSING } from "../../utils/helpers";
import { KycPathChip, ScreenChip, StrengthChip, SubCategoryChips } from "../brand/BrandStageChips";

/* -------------------------------------------------------------------------
 * Table columns shared by New Onboarding (NEW tab) and Brand Waiting
 * (WAITING tab). Rows are brand list items (mapBrandListItem) — every value
 * is the server's (admin guide §3); nothing is worked out from flags here.
 * ---------------------------------------------------------------------- */

const DAY = 24 * 60 * 60 * 1000;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** Whole days between an ISO date and `now` (0 = today). */
export const daysSince = (iso, now) => (iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY)) : null);

/**
 * @param {{ onOpen, now, dateField?: "joined" | "submitted", renderStatus?, renderActions? }} opts
 * `dateField: "submitted"` (Brand Waiting) shows onboarding.submittedAt — the
 * FIRST submit; it never moves on a resubmit.
 */
export function onboardingTableColumns({ onOpen, now, dateField = "joined", renderStatus, renderActions }) {
  const dateOf = (b) => (dateField === "submitted" ? b.submittedAt : b.joinedDate);
  return [
    {
      key: "brand",
      label: "Brand",
      cellClass: "min-w-56 whitespace-normal",
      render: (b) => (
        <button onClick={() => onOpen(b)} className="group flex items-center gap-3 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-[15px] font-bold text-white">
            {b.logo ? <img src={b.logo} alt="" className="h-full w-full bg-white object-cover" /> : b.brandName?.charAt(0)?.toUpperCase() || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-neutral-900 group-hover:text-emerald-600 dark:text-neutral-50 dark:group-hover:text-emerald-400">
              {b.brandName}
            </span>
            <span className="block font-mono text-[10.5px] text-neutral-400">{b.brandId}</span>
          </span>
        </button>
      ),
    },
    // Optional — Brand Waiting shows the server's waitingChip here.
    ...(renderStatus ? [{ key: "status", label: "Status", render: renderStatus }] : []),
    {
      key: "screen",
      label: "Current screen",
      render: (b) => (b.onboardingScreen ? <ScreenChip screen={b.onboardingScreen} /> : <span className="text-neutral-400">Not started</span>),
    },
    {
      key: "path",
      label: "KYC path",
      render: (b) => (b.kycPath ? <KycPathChip kycPath={b.kycPath} /> : <span className="text-neutral-400">Not chosen</span>),
    },
    {
      key: "strength",
      label: "Strength",
      render: (b) => (b.profileStrength ? <StrengthChip strength={b.profileStrength} /> : <span className="text-neutral-400">—</span>),
    },
    {
      key: "category",
      label: "Category",
      cellClass: "whitespace-normal",
      render: (b) =>
        b.category && b.category !== "—" ? (
          <div className="flex min-w-40 flex-col gap-1">
            <span className="text-neutral-700 dark:text-neutral-300">{b.category}</span>
            <span className="flex flex-wrap gap-1">
              <SubCategoryChips names={b.subCategories} />
            </span>
          </div>
        ) : (
          <span className="italic text-neutral-400">Not selected yet</span>
        ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (b) => <span className="text-neutral-700 dark:text-neutral-300"><ValueOr value={b.contactPhone} fallback={MISSING.phone} /></span>,
    },
    {
      key: "date",
      label: dateField === "submitted" ? "Submitted" : "Joined",
      render: (b) => {
        const iso = dateOf(b);
        if (!iso) return <span className="text-neutral-400">{MISSING.date}</span>;
        const days = daysSince(iso, now);
        const stale = days > 7;
        return (
          <div>
            <p className={`font-medium ${stale ? "text-red-600 dark:text-red-400" : "text-neutral-800 dark:text-neutral-100"}`}>{formatDate(iso)}</p>
            <p className={`text-[11px] ${stale ? "font-semibold text-red-500 dark:text-red-400" : "text-neutral-500"}`}>
              {days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`}
              {stale && " · follow up"}
            </p>
          </div>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      sticky: true,
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onOpen(b)}
            title="View brand"
            aria-label={`View ${b.brandName}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-sky-400/40 hover:text-sky-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-sky-400"
          >
            <Eye size={14} />
          </button>
          {/* Optional extra row actions (Brand Waiting: Reject). */}
          {renderActions?.(b)}
        </div>
      ),
    },
  ];
}
