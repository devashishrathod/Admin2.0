import { useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import StatTile from "../../components/common/StatTile";
import Table from "../../components/common/Table";
import { useNavigate } from "react-router-dom";
import { Search, Plus, AlertTriangle, LayoutGrid, List } from "lucide-react";
import { useBrands } from "../brand/BrandContext";
import Loader from "../../components/common/Loader";
import VerificationDetails from "./VerificationDetails";
import { fetchAllVerifications, latestByBrand, mapVerification } from "./verificationData";
import OnboardingCard from "./OnboardingCard";
import { ONBOARDING_STEPS, doneStepCount, onboardingTableColumns } from "./onboardingBrand";

/* Most onboarding brands haven't submitted yet, so they have no
   verification record — build one from the brand itself so the details
   page (plan, outlets, vouchers, history) still opens. */
function verificationFromBrand(b) {
  return mapVerification({
    brandId: b.id,
    attemptNumber: 0,
    brand: { _id: b.id, brandName: b.brandName, uniqueId: b.brandId, logo: b.logo, status: b.status },
    vendor: { currentScreen: b.onboardingScreen },
  });
}

/* -------------------------------------------------------------------------
 * New Onboarding — brands whose isOnboarding flag is false. Rejected brands
 * remain visible here only while that onboarding flag is still false.
 * Also the entry point for adding a brand from the admin panel. View only —
 * Approve / Reject happen on Brand Waiting.
 * ---------------------------------------------------------------------- */


const isRejected = (b) => b.status === "Rejected";
const isIncomplete = (b) => b.isOnboarding === false;
// Vendor submitted and is on the UNDER_REVIEW screen — the brand now waits
// for an admin decision on Brand Waiting, so it's left out of this page.
const isUnderReview = (b) =>
  String(b.onboardingScreen || "").trim().toUpperCase().replace(/[\s-]+/g, "_") === "UNDER_REVIEW";

// Rejected brands live on Brand Waiting (Rejected tab), not here — this page
// is only vendors still signing up, split by whether they've started.
const isNotStarted = (b) => isIncomplete(b) && doneStepCount(b) === 0;
const isInProgress = (b) => isIncomplete(b) && doneStepCount(b) > 0;

const TABS = [
  { key: "All", label: "All", match: isIncomplete },
  { key: "NotStarted", label: "Not Started", match: isNotStarted },
  { key: "InProgress", label: "In Progress", match: isInProgress },
];


export default function NewOnboarding() {
  const navigate = useNavigate();
  const { allBrands: everyBrand, loading, error: contextError, fetchBrands } = useBrands();
  // Only replace the list with an error when the brands couldn't be loaded.
  const error = everyBrand.length === 0 ? contextError : "";

  // Opening a brand shows the same details page as Brand Waiting (view only).
  // Its verification record, if the vendor has submitted, comes from the
  // verifications list — loaded once in the background.
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [verificationsByBrand, setVerificationsByBrand] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchAllVerifications()
      .then((list) => !cancelled && setVerificationsByBrand(latestByBrand(list)))
      // No record to show — the details page falls back to the brand's own data.
      .catch(() => !cancelled && setVerificationsByBrand(new Map()));
    return () => {
      cancelled = true;
    };
  }, []);

  // Dummy brands live only on the Dummy Brands page.
  // Rejected and under-review brands are handled on Brand Waiting.
  const allBrands = everyBrand.filter(
    (b) => !b.isDummy && b.isOnboarding === false && !isRejected(b) && !isUnderReview(b)
  );
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  // "Now" captured once when the page opens (render must stay pure).
  const [openedAt] = useState(() => Date.now());
  // Grid by default; switch to a table with the toggle above the list.
  const [view, setView] = useState("grid");

  const query = search.trim().toLowerCase();
  const matchesSearch = (b) =>
    !query || [b.brandName, b.brandId, b.ownerName].some((v) => String(v ?? "").toLowerCase().includes(query));

  const activeTab = TABS.find((t) => t.key === tab);
  const filtered = allBrands.filter((b) => activeTab.match(b) && matchesSearch(b));

  // KPI tiles (same tile as Live Vouchers). The first three also switch the tab.
  const queue = allBrands.filter(TABS[0].match);
  const incomplete = queue.filter(isIncomplete);
  const weekAgo = openedAt - 7 * 24 * 60 * 60 * 1000;
  const onboardingTiles = [
    { icon: "brand", label: "In Queue", value: queue.length, hint: "Still signing up", tint: "emerald", tabKey: "All" },
    { icon: "hourglass", label: "In Progress", value: queue.filter(isInProgress).length, hint: "Started, not finished", tint: "amber", tabKey: "InProgress" },
    { icon: "alert", label: "Not Started", value: queue.filter(isNotStarted).length, hint: "No step done yet", tint: "red", tabKey: "NotStarted" },
    {
      icon: "clock",
      label: "Joined This Week",
      value: queue.filter((b) => b.joinedDate && new Date(b.joinedDate).getTime() >= weekAgo).length,
      hint: "Started in the last 7 days",
      tint: "sky",
    },
    {
      icon: "check",
      label: "Almost Done",
      value: incomplete.filter((b) => doneStepCount(b) >= ONBOARDING_STEPS.length - 1).length,
      hint: "One step or less left",
      tint: "violet",
    },
  ];

  const tableColumns = onboardingTableColumns({ onOpen: setSelectedBrand, now: openedAt });

  if (selectedBrand) {
    if (!verificationsByBrand) return <Loader label="Loading brand details…" />;
    return (
      <VerificationDetails
        verification={verificationsByBrand.get(selectedBrand.id) || verificationFromBrand(selectedBrand)}
        onBack={() => setSelectedBrand(null)}
        readOnly
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            New Onboarding
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Only brands with onboarding incomplete are shown here. Each card shows the vendor's current screen.
          </p>
        </div>
        <button
          onClick={() => navigate("/brand/onboard")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
        >
          <Plus size={14} />
          Add Brand
        </button>
      </div>

      {/* KPI tiles */}
      {!error && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {onboardingTiles.map(({ tabKey, ...t }) => (
            <StatTile
              key={t.label}
              {...t}
              value={loading ? "…" : t.value}
              active={tabKey ? tab === tabKey : false}
              onClick={tabKey ? () => setTab(tabKey) : undefined}
            />
          ))}
        </div>
      )}

      {/* Search + tabs */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-xs sm:flex-1">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand name..."
            className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                tab === t.key
                  ? "bg-emerald-400 text-neutral-950"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {t.label}
              <span className="text-[10.5px] opacity-70">{allBrands.filter(t.match).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid / table switch — right above the list it controls (same as Live Brands). */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-neutral-500">
          {loading ? "Loading brands…" : `${filtered.length} brand${filtered.length === 1 ? "" : "s"} in onboarding`}
        </p>
        <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {[
            ["grid", LayoutGrid, "Grid"],
            ["table", List, "Table"],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              title={`${label} view`}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors ${
                view === key ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader label="Loading brands…" />
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
          <button onClick={() => fetchBrands()} className="font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <EmptyState
            icon={query ? "search" : "onboarding"}
            title={query ? "No brands match your search" : "No brands in onboarding right now"}
            description={
              query
                ? "Check the spelling or try a brand name, ID or phone number."
                : "Vendors who start signing up and haven't submitted yet will show up here."
            }
          />
        </div>
      ) : view === "table" ? (
        <Table columns={tableColumns} data={filtered} minWidth={1080} emptyTitle="No brands in onboarding right now" emptyIcon="onboarding" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <OnboardingCard
              key={b.id}
              brand={b}
              onOpen={setSelectedBrand}
              now={openedAt}
            />
          ))}
        </div>
      )}

    </div>
  );
}
