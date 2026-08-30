import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutGrid,
  List,
  MapPin,
  Store,
  Users,
  CreditCard,
  ChevronRight,
  Trash2,
  FileDown,
  AlertTriangle,
  SlidersHorizontal,
  Check,
  MoreVertical,
  ChevronLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import Table from "../../components/common/Table";
import { useBrands } from "./BrandContext";

/* -------------------------------------------------------------------------
 * Cosmetic-only category color coding
 * ---------------------------------------------------------------------- */
const CATEGORY_COLORS = {
  "Beauty & Personal Care": "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  "Food & Beverage": "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  Electronics: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "Home & Furniture": "bg-amber-500/15 text-amber-600 dark:text-amber-300",
};
const categoryPillClass = (category) =>
  CATEGORY_COLORS[category] || "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";

const STATUS_TABS = ["All", "Active Brand", "Deactive Brand", "Expired Brand", "Top Brand"];
const STATUS_TAB_LABELS = {
  All: "All",
  "Active Brand": "Active",
  "Deactive Brand": "Inactive",
  "Expired Brand": "Expired",
  "Top Brand": "Top Brand",
};

const isExpiredBrand = (b) => b.planPrice !== "—" && b.expiredInDays <= 0;

const getBrandStatusLabel = (b) => {
  if (isExpiredBrand(b)) return "Expired";
  return b.active ? "Active" : "Deactive";
};

/* Plans shown in the filter dropdown — ideally this should come from a
   /plans endpoint too, kept static here since that wasn't wired yet. */
const PLANS = [
  { name: "Basic", price: "₹1,999" },
  { name: "Advance", price: "₹2,999" },
  { name: "Pro", price: "₹3,999" },
  { name: "Pro Lite", price: "₹4,999" },
];

/* -------------------------------------------------------------------------
 * CSV export helper
 * ---------------------------------------------------------------------- */
function exportBrandsToCsv(brandList) {
  if (!brandList?.length) return;

  const headers = [
    "Brand Id", "Brand Name", "Category", "Location", "Status",
    "Sub-Brand", "Owner", "Phone", "Email", "GST Number", "PAN Number", "Plan",
  ];

  const rows = brandList.map((b) => [
    b.brandId, b.brandName, b.category, b.location, b.status,
    b.subBrandCount, b.ownerName, b.contactPhone, b.contactEmail,
    b.gstNumber, b.panNumber, b.subscriptionPlan,
  ]);

  const escapeCell = (cell) => {
    const value = String(cell ?? "");
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };

  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `brands-${dateStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */
function BrandAvatar({ brand, size = "md" }) {
  const sizes = {
    sm: "h-9 w-9 text-[13px] rounded-lg",
    md: "h-11 w-11 text-[16px] rounded-xl",
    lg: "h-14 w-14 text-[20px] rounded-2xl",
  };
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-orange-500 font-semibold text-white ${sizes[size]}`}>
      {brand.logo ? (
        <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
      ) : (
        <span>{brand.emoji || brand.brandName?.charAt(0)}</span>
      )}
    </div>
  );
}

const BRAND_STATUS_STYLES = {
  Active: { pill: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400" },
  Deactive: { pill: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400", dot: "bg-neutral-500" },
  Expired: { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-400" },
  Pending: { pill: "bg-amber-400/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
  Rejected: { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-400" },
};

function BrandStatusBadge({ brand }) {
  const label = brand.status === "Pending" || brand.status === "Rejected" ? brand.status : getBrandStatusLabel(brand);
  const style = BRAND_STATUS_STYLES[label] || BRAND_STATUS_STYLES.Deactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

function useConfirmDelete(onConfirm) {
  return (brand) => {
    const ok = window.confirm(
      `Delete "${brand.brandName}"? This will permanently remove the brand and cannot be undone.`
    );
    if (ok) onConfirm(brand);
  };
}

/* -------------------------------------------------------------------------
 * Brand card (list view)
 * ---------------------------------------------------------------------- */
const STATUS_ACCENTS = {
  Active: "from-emerald-400/25 via-emerald-400/0",
  Pending: "from-amber-400/25 via-amber-400/0",
  Rejected: "from-red-400/25 via-red-400/0",
};

function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-2.5 py-1.5 dark:border-neutral-800/80 dark:bg-neutral-950/60">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon size={12} />
      </span>
      <div className="leading-tight">
        <p className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">{value}</p>
        <p className="text-[9.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function BrandCard({ brand, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accent = STATUS_ACCENTS[brand.status] || "from-neutral-500/20 via-neutral-500/0";
  const outletCount = Number(String(brand.subBrandCount).split("/")[0]) || 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg hover:shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:shadow-black/30">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accent} opacity-70`} />

      {brand.isTopBrand && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-950">
          <Sparkles size={10} />
          Top #{brand.topOrder}
        </span>
      )}

      <div className="absolute right-3 top-3 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          aria-label={`More actions for ${brand.brandName}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50/80 text-neutral-500 backdrop-blur transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/80 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
        >
          <MoreVertical size={14} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
              <button
                onClick={() => { setMenuOpen(false); onDelete(brand); }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-red-600 transition-colors hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800"
              >
                <Trash2 size={13} />
                Delete Brand
              </button>
            </div>
          </>
        )}
      </div>

      <button onClick={() => onOpen(brand)} className="relative flex flex-col text-left p-4">
        <div className="mb-3 flex items-start justify-between pr-8">
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl ring-2 ring-neutral-50 dark:ring-neutral-950">
              <BrandAvatar brand={brand} />
            </div>
            <div>
              <h3 className="text-[14.5px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                {brand.brandName}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                <MapPin size={10} />
                {brand.location}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <BrandStatusBadge brand={brand} />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryPillClass(brand.category)}`}>
            {brand.category}
          </span>
        </div>

        <p className="mb-3.5 line-clamp-1 text-[12px] text-neutral-500">
          {brand.tagline || "No description added yet"}
        </p>

        <div className="mb-3.5 grid grid-cols-2 gap-2">
          <StatChip icon={Users} value={brand.followers} label="Followers" />
          <StatChip icon={Store} value={brand.subBrandCount} label={outletCount === 1 ? "Outlet" : "Outlets"} />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-950/60">
          <span className="flex min-w-0 items-center gap-2">
            <CreditCard size={12} className="shrink-0 text-neutral-500" />
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {brand.subscriptionPlan} Plan
              </span>
              <span className="block text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">
                {brand.planPrice}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 transition-colors group-hover:bg-emerald-400/15 dark:text-emerald-400">
            View Profile <ChevronRight size={12} />
          </span>
        </div>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — list only. Clicking a brand navigates to /brands/:id, which
 * BrandDetailsPage.jsx (a separate route) renders. This page never renders
 * <BrandDetails> itself anymore.
 * ---------------------------------------------------------------------- */
const PAGE_SIZE = 6;

export default function Brand() {
  const navigate = useNavigate();
  const {
    brands,
    loading,
    error,
    fetchBrands,
    deleteBrandById,
  } = useBrands();

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  const [view, setView] = useState("grid");
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [page, setPage] = useState(1);

  const categories = [...new Set(brands.map((b) => b.category).filter(Boolean))].sort();

  const filtered = brands.filter((b) => {
    const matchesSearch =
      b.brandName?.toLowerCase().includes(search.toLowerCase()) ||
      b.location?.toLowerCase().includes(search.toLowerCase()) ||
      b.category?.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      statusTab === "All"
        ? true
        : statusTab === "Active Brand"
        ? b.active && !isExpiredBrand(b)
        : statusTab === "Deactive Brand"
        ? !b.active && !isExpiredBrand(b)
        : statusTab === "Expired Brand"
        ? isExpiredBrand(b)
        : statusTab === "Top Brand"
        ? Boolean(b.isTopBrand)
        : true;

    const matchesPlan = planFilter === "All Plans" || b.subscriptionPlan === planFilter;
    const matchesCategory = categoryFilter === "All Categories" || b.category === categoryFilter;

    return matchesSearch && matchesTab && matchesPlan && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const applyFilter = (setter) => (value) => { setter(value); setPage(1); };
  const setStatusTabAndReset = applyFilter(setStatusTab);
  const setSearchAndReset = applyFilter(setSearch);
  const setPlanFilterAndReset = applyFilter(setPlanFilter);
  const setCategoryFilterAndReset = applyFilter(setCategoryFilter);

  const resetFilters = () => {
    setSearch("");
    setStatusTab("All");
    setPlanFilter("All Plans");
    setCategoryFilter("All Categories");
    setPage(1);
  };
  const filtersActive =
    Boolean(search) || statusTab !== "All" || planFilter !== "All Plans" || categoryFilter !== "All Categories";

  const expiredByPlan = brands
    .filter(isExpiredBrand)
    .reduce((acc, b) => {
      acc[b.subscriptionPlan] = (acc[b.subscriptionPlan] || 0) + 1;
      return acc;
    }, {});

  const deleteBrand = useConfirmDelete((brand) => {
    deleteBrandById(brand);
  });

  // Single source of truth for "open a brand" — always goes through the
  // router so the URL carries the id (/brands/:id), works with browser
  // back/forward, refresh, and direct/shared links.
  const handleOpenBrand = (brand) => {
    navigate(`/brands/${brand.id}`);
  };

  const handleExport = () => exportBrandsToCsv(filtered);

  const columns = [
    {
      key: "sno", label: "S.No", width: "w-16",
      render: (_row, index) => <span className="text-neutral-500">{index + 1}</span>,
    },
    {
      key: "brand", label: "Brand",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <BrandAvatar brand={row} size="sm" />
          <div>
            <p className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-neutral-50">
              {row.brandName}
              {row.isTopBrand && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles size={9} />
                  Top
                </span>
              )}
            </p>
            <p className="text-[11.5px] text-neutral-500">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: "location", label: "Location",
      render: (row) => <span className="text-neutral-500 dark:text-neutral-400">{row.location}</span>,
    },
    {
      key: "outlets", label: "Sub-Brand", align: "center",
      render: (row) => <span className="text-neutral-700 dark:text-neutral-300">{row.subBrandCount}</span>,
    },
    {
      key: "plan", label: "Plan",
      render: (row) => (
        <div>
          <p className="text-neutral-700 dark:text-neutral-300">{row.subscriptionPlan}</p>
          {row.planPrice && row.planPrice !== "—" && (
            <p className="text-[11px] text-neutral-500">{row.planPrice}</p>
          )}
        </div>
      ),
    },
    {
      key: "status", label: "Status",
      render: (row) => <BrandStatusBadge brand={row} />,
    },
    {
      key: "action", label: "Action", align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenBrand(row)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-emerald-400"
          >
            View
          </button>
          <button
            onClick={() => deleteBrand(row)}
            aria-label={`Delete ${row.brandName}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Brands</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Browse onboarded brands and open a brand to see its full profile.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
            >
              <FileDown size={14} />
              Export
            </button>

            <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "grid" ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("table")}
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

        {error && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
            <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
            <button onClick={() => fetchBrands()} className="font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        )}

        {/* Status tabs + Search + filters */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const count =
                tab === "All"
                  ? brands.length
                  : tab === "Active Brand"
                  ? brands.filter((b) => b.active && !isExpiredBrand(b)).length
                  : tab === "Deactive Brand"
                  ? brands.filter((b) => !b.active && !isExpiredBrand(b)).length
                  : tab === "Expired Brand"
                  ? brands.filter((b) => isExpiredBrand(b)).length
                  : brands.filter((b) => b.isTopBrand).length;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusTabAndReset(tab)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    statusTab === tab
                      ? tab === "Top Brand"
                        ? "bg-amber-400/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {tab === "Top Brand" && <Sparkles size={12} />}
                  {STATUS_TAB_LABELS[tab]}
                  <span
                    className={`rounded-full px-1.5 text-[10.5px] ${
                      statusTab === tab
                        ? tab === "Top Brand"
                          ? "bg-amber-400/20"
                          : "bg-emerald-400/20"
                        : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:max-w-xs dark:border-neutral-800 dark:bg-neutral-900">
              <Search size={16} className="shrink-0 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearchAndReset(e.target.value)}
                placeholder="Search brand, location, category..."
                className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setPlanMenuOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                  planFilter !== "All Plans"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                Plan: {planFilter === "All Plans" ? "All" : planFilter}
              </button>

              {planMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPlanMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
                    <button
                      onClick={() => { setPlanFilterAndReset("All Plans"); setPlanMenuOpen(false); }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      All Plans
                      {planFilter === "All Plans" && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                    </button>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
                    {PLANS.map((plan) => (
                      <button
                        key={plan.name}
                        onClick={() => { setPlanFilterAndReset(plan.name); setPlanMenuOpen(false); }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <span>
                          {plan.name}
                          <span className="ml-1.5 text-[11px] text-neutral-500">{plan.price}</span>
                        </span>
                        {planFilter === plan.name && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setCategoryMenuOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                  categoryFilter !== "All Categories"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                Category: {categoryFilter === "All Categories" ? "All" : categoryFilter}
              </button>

              {categoryMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCategoryMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
                    <button
                      onClick={() => { setCategoryFilterAndReset("All Categories"); setCategoryMenuOpen(false); }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      All Categories
                      {categoryFilter === "All Categories" && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                    </button>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCategoryFilterAndReset(cat); setCategoryMenuOpen(false); }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        {cat}
                        {categoryFilter === cat && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={resetFilters}
              disabled={!filtersActive}
              title="Reset all filters"
              aria-label="Reset all filters"
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border transition-colors ${
                filtersActive
                  ? "border-neutral-200 bg-white text-neutral-700 hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-red-400"
                  : "cursor-not-allowed border-neutral-200/60 bg-neutral-100/60 text-neutral-400 dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:text-neutral-700"
              }`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {statusTab === "Expired Brand" && Object.keys(expiredByPlan).length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-red-600 dark:text-red-400">
              <AlertTriangle size={13} />
              Expired by plan:
            </span>
            {PLANS.map((plan) => {
              const count = expiredByPlan[plan.name];
              if (!count) return null;
              const isSelected = planFilter === plan.name;
              return (
                <button
                  key={plan.name}
                  onClick={() => setPlanFilterAndReset(isSelected ? "All Plans" : plan.name)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ${
                    isSelected
                      ? "border-red-400/50 bg-red-400/15 text-red-700 dark:text-red-300"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  {plan.name}
                  <span className={`rounded-full px-1.5 text-[10px] ${isSelected ? "bg-red-400/25" : "bg-neutral-200 dark:bg-neutral-800"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-16 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            <Loader2 size={20} className="animate-spin" />
            Loading brands…
          </div>
        ) : view === "grid" ? (
          paged.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-10 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
              No brands found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((brand) => (
                <BrandCard key={brand.id} brand={brand} onOpen={handleOpenBrand} onDelete={deleteBrand} />
              ))}
            </div>
          )
        ) : (
          <Table columns={columns} data={paged} emptyMessage="No brands found." />
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[12.5px] text-neutral-500">
              Showing {rangeStart} to {rangeEnd} of {filtered.length} brand{filtered.length === 1 ? "" : "s"}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
                      n === safePage ? "bg-emerald-400 text-neutral-950" : "border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}