import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Plus, AlertTriangle, Phone, CalendarDays, ChevronRight } from "lucide-react";
import { useBrands } from "../brand/BrandContext";
import { BrandAvatar, RejectionBadge } from "../brand/BrandShared";

/* -------------------------------------------------------------------------
 * New Onboarding — brands that aren't live yet and aren't waiting for
 * approval either:
 *   - Onboarding: status PENDING and vendor.isOnBoardingCompleted false
 *                 (vendor hasn't finished onboarding, not approved yet)
 *   - Rejected:   rejected by an admin
 * Pending-approval brands are on Brand Waiting, approved ones on Live Brands.
 * Also the entry point for adding a brand from the admin panel.
 * ---------------------------------------------------------------------- */

// Labels for the list payload's `onboarding` checklist (has* flags).
const ONBOARDING_STEPS = [
  ["hasPan", "PAN"],
  ["hasGst", "GST"],
  ["hasBank", "Bank"],
  ["hasLocation", "Location"],
  ["hasWorkHours", "Work hours"],
  ["hasFirstOutlet", "First outlet"],
  ["hasSystemVerification", "Verification"],
  ["hasAcceptedPartnershipDeed", "Partnership deed"],
];

const doneStepCount = (b) => ONBOARDING_STEPS.filter(([key]) => b.onboardingFlags?.[key]).length;

// "PAN_VERIFICATION" -> "Pan verification"
const formatScreen = (screen) => {
  const text = screen.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const isRejected = (b) => b.status === "Rejected";
// Not approved yet and the vendor hasn't finished onboarding. Approved
// brands are Live even when vendor.isOnBoardingCompleted is still false.
const isIncomplete = (b) => b.isOnboarding === false && b.status === "Pending";

const TABS = [
  { key: "All", label: "All", match: (b) => isIncomplete(b) || isRejected(b) },
  { key: "Onboarding", label: "Onboarding", match: isIncomplete },
  { key: "Rejected", label: "Rejected", match: isRejected },
];

function OnboardingCard({ brand, onOpen }) {
  const rejected = isRejected(brand);
  const done = doneStepCount(brand);
  return (
    <button
      onClick={() => onOpen(brand)}
      className="group flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-black/30"
    >
      <div className="flex items-center gap-3">
        <BrandAvatar brand={brand} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{brand.brandName}</h3>
          <p className="truncate text-[12px] text-neutral-500">
            {[brand.category !== "—" && brand.category, brand.location !== "—" && brand.location].filter(Boolean).join(" · ") || brand.brandId}
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            rejected
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-amber-400/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {rejected ? "Rejected" : "Onboarding incomplete"}
        </span>
        {rejected && <RejectionBadge brand={brand} />}
      </div>

      {!rejected && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-[11.5px] text-neutral-500">
            <span className="truncate">
              {brand.onboardingScreen ? (
                <>Now on: <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatScreen(brand.onboardingScreen)}</span></>
              ) : (
                "Not started"
              )}
            </span>
            <span className="shrink-0 tabular-nums">{done}/{ONBOARDING_STEPS.length} steps</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${(done / ONBOARDING_STEPS.length) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[12px] text-neutral-500">
        <span className="flex items-center gap-1.5"><Phone size={13} /> {brand.contactPhone}</span>
        {brand.joinedDate && (
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} /> {new Date(brand.joinedDate).toLocaleDateString("en-IN")}
          </span>
        )}
      </div>
    </button>
  );
}

export default function NewOnboarding() {
  const navigate = useNavigate();
  const { allBrands: everyBrand, loading, error, fetchBrands } = useBrands();
  // Dummy brands live only on the Dummy Brands page.
  const allBrands = everyBrand.filter((b) => !b.isDummy);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");

  const query = search.trim().toLowerCase();
  const matchesSearch = (b) =>
    !query || [b.brandName, b.brandId, b.ownerName].some((v) => String(v ?? "").toLowerCase().includes(query));

  const activeTab = TABS.find((t) => t.key === tab);
  const filtered = allBrands.filter((b) => activeTab.match(b) && matchesSearch(b));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            New Onboarding
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Brands still completing onboarding, and brands that were rejected.
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
          <Loader2 size={16} className="animate-spin" />
          Loading brands…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
          <button onClick={() => fetchBrands()} className="font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-10 text-center text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          {query ? "No brands match your search." : "No brands in onboarding right now."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <OnboardingCard key={b.id} brand={b} onOpen={(brand) => navigate(`/brands/${brand.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
