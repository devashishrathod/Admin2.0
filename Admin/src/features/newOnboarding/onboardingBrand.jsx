import { Eye } from "lucide-react";

/* -------------------------------------------------------------------------
 * Onboarding step helpers + table columns — shared by New Onboarding and
 * Brand Waiting. Rows are Brand list items (mapBrandListItem).
 * ---------------------------------------------------------------------- */

// Labels for the list payload's `onboarding` checklist (has* flags).
export const ONBOARDING_STEPS = [
  ["hasPan", "PAN"],
  ["hasGst", "GST"],
  ["hasBank", "Bank"],
  ["hasLocation", "Location"],
  ["hasWorkHours", "Work hours"],
  ["hasFirstOutlet", "First outlet"],
  ["hasSystemVerification", "Verification"],
  ["hasAcceptedPartnershipDeed", "Partnership deed"],
];

export const doneStepCount = (b) => ONBOARDING_STEPS.filter(([key]) => b.onboardingFlags?.[key]).length;

// "PAN_VERIFICATION" -> "Pan verification"
export const formatScreen = (screen) => {
  const text = screen.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Table view — same information as the card, one row per brand.
const DAY = 24 * 60 * 60 * 1000;
export function onboardingTableColumns({ onOpen, now, renderStatus, renderActions }) {
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
    {
      key: "progress",
      label: "Progress",
      render: (b) => {
        const done = doneStepCount(b);
        const pct = Math.round((done / ONBOARDING_STEPS.length) * 100);
        return (
          <div className="w-32">
            <div className="flex items-baseline justify-between text-[11.5px]">
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                {done}/{ONBOARDING_STEPS.length} steps
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "current",
      label: "Current Step",
      render: (b) => (
        <span className="font-medium text-neutral-800 dark:text-neutral-100">
          {b.onboardingScreen ? formatScreen(b.onboardingScreen) : "Hasn't started"}
        </span>
      ),
    },
    {
      key: "next",
      label: "Next Step",
      render: (b) => {
        const missing = ONBOARDING_STEPS.filter(([key]) => !b.onboardingFlags?.[key]).map(([, label]) => label);
        return missing.length ? (
          <div>
            <p className="font-semibold text-amber-600 dark:text-amber-400">{missing[0]}</p>
            <p className="text-[11px] text-neutral-500">{missing.length} pending</p>
          </div>
        ) : (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">All done</span>
        );
      },
    },
    {
      key: "category",
      label: "Category",
      render: (b) =>
        b.category && b.category !== "—" ? (
          <span className="text-neutral-700 dark:text-neutral-300">{b.category}</span>
        ) : (
          <span className="italic text-neutral-400">Not selected yet</span>
        ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (b) => <span className="text-neutral-700 dark:text-neutral-300">{b.contactPhone}</span>,
    },
    {
      key: "joined",
      label: "Joined",
      render: (b) => {
        if (!b.joinedDate) return <span className="text-neutral-400">—</span>;
        const days = Math.max(0, Math.floor((now - new Date(b.joinedDate).getTime()) / DAY));
        const stale = days > 7;
        return (
          <div>
            <p className={`font-medium ${stale ? "text-red-600 dark:text-red-400" : "text-neutral-800 dark:text-neutral-100"}`}>
              {new Date(b.joinedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            <p className={`text-[11px] ${stale ? "font-semibold text-red-500 dark:text-red-400" : "text-neutral-500"}`}>
              {days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`}
              {stale && " · follow up"}
            </p>
          </div>
        );
      },
    },
    // Optional — Brand Waiting adds a workflow status pill (Approve).
    ...(renderStatus ? [{ key: "status", label: "Status", render: renderStatus }] : []),
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
