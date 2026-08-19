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
  SlidersHorizontal,
  Check,
  X,
  FileText,
} from "lucide-react";
import Table from "../../components/common/Table";
import {
  STATUS_TABS,
  PLANS,
  BUSINESS_STATUSES,
  BUSINESS_TYPES,
  PAYMENT_METHODS,
  exportBrandsToCsv,
} from "./data/BrandData";
import {
  BrandAvatar,
  StatChip,
  OnboardingBadge,
  RejectionBadge,
  ApprovalDropdown,
  StatusBadge,
  Field,
  FileField,
  inputClass,
  useConfirmDelete,
} from "./BrandShared";
import { useBrands } from "./BrandContext";

/* -------------------------------------------------------------------------
 * Brand card (grid view) — brand-only data, no GST / PAN / bank
 * ---------------------------------------------------------------------- */

const STATUS_ACCENTS = {
  Active: "from-emerald-400/25 via-emerald-400/0",
  Pending: "from-amber-400/25 via-amber-400/0",
  Rejected: "from-red-400/25 via-red-400/0",
  Draft: "from-amber-400/25 via-amber-400/0",
};

function BrandCard({ brand, onOpen, onDelete, onDecision }) {
  const incomplete = brand.onboardingComplete === false;
  const awaitingApproval = !incomplete && brand.status === "Pending";
  const accent = STATUS_ACCENTS[brand.status] || "from-neutral-500/20 via-neutral-500/0";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-lg hover:shadow-black/30">
      {/* Ambient accent glow */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accent} opacity-70`}
      />

      <button
        onClick={() => onDelete(brand)}
        aria-label={`Delete ${brand.brandName}`}
        className="absolute right-3.5 top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950/80 text-neutral-500 opacity-0 backdrop-blur transition-all hover:border-red-500/40 hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>

      <div
        onClick={() => onOpen(brand)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen(brand);
        }}
        className="relative flex cursor-pointer flex-col text-left p-4"
      >
        <div className="mb-3 flex items-start justify-between pr-8">
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl ring-2 ring-neutral-950">
              <BrandAvatar brand={brand} />
            </div>
            <div>
              <h3 className="text-[14.5px] font-semibold leading-tight text-neutral-50">
                {brand.brandName}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                <MapPin size={10} />
                {brand.location}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {incomplete ? (
            <OnboardingBadge brand={brand} />
          ) : awaitingApproval ? (
            <ApprovalDropdown brand={brand} onDecision={onDecision} size="sm" />
          ) : (
            <StatusBadge status={brand.status} activeLabel="Active" />
          )}
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
            {brand.category}
          </span>
        </div>

        {brand.status === "Rejected" && (
          <div className="mb-3">
            <RejectionBadge brand={brand} />
          </div>
        )}

        <p className="mb-3.5 line-clamp-1 text-[12px] text-neutral-500">
          {brand.tagline || "No description added yet"}
        </p>

        {incomplete ? (
          <div className="mb-3.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-2.5">
            <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-neutral-400">
              <span>Onboarding progress</span>
              <span className="font-semibold text-amber-400">
                {brand.onboardingStepIndex}/{brand.onboardingTotalSteps}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                style={{
                  width: `${(brand.onboardingStepIndex / brand.onboardingTotalSteps) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-3.5 grid grid-cols-2 gap-2">
            <StatChip icon={Users} value={brand.followers} label="Followers" />
            <StatChip icon={Store} value={brand.subBrandCount} label="Outlets" />
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-neutral-950/60 px-3 py-2.5">
          {incomplete ? (
            <span className="text-[11.5px] font-medium text-neutral-400">Incomplete onboarding</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-neutral-400">
              <CreditCard size={12} className="text-neutral-500" />
              {brand.subscriptionPlan} Plan
              <span className="text-neutral-600">·</span>
              <span className="font-semibold text-neutral-300">{brand.planPrice}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-400 transition-transform group-hover:translate-x-0.5">
            View <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Add Listing — form used by super admin to manually add a brand that has
 * completed onboarding info and is ready to be queued for approval.
 * ---------------------------------------------------------------------- */

function AddListingModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    brandName: "",
    shortName: "",
    businessStatus: BUSINESS_STATUSES[0],
    businessType: BUSINESS_TYPES[0],
    panNumber: "",
    gstNumber: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    gstAddress: "",
    planName: PLANS[0].name,
    paymentMethod: PAYMENT_METHODS[0],
    location: "",
    latitude: "",
    longitude: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [productPhotos, setProductPhotos] = useState([]);
  const [ambienceVideo, setAmbienceVideo] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.brandName.trim()) return;
    onSubmit({ ...form, logoFile, productPhotos, ambienceVideo });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-neutral-50">Add New Listing</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Submitted listings go to the <span className="text-neutral-300">Complete Listing</span> tab, awaiting super admin approval.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business Name" required>
              <input
                value={form.brandName}
                onChange={update("brandName")}
                required
                placeholder="e.g. Urban Bites Cafe"
                className={inputClass}
              />
            </Field>
            <Field label="Short Name">
              <input
                value={form.shortName}
                onChange={update("shortName")}
                placeholder="e.g. Urban Bites"
                className={inputClass}
              />
            </Field>
            <Field label="Business Status">
              <select value={form.businessStatus} onChange={update("businessStatus")} className={inputClass}>
                {BUSINESS_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Business Type">
              <select value={form.businessType} onChange={update("businessType")} className={inputClass}>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="PAN Number">
              <input
                value={form.panNumber}
                onChange={update("panNumber")}
                placeholder="ABCDE1234F"
                className={inputClass}
              />
            </Field>
            <Field label="GST Number">
              <input
                value={form.gstNumber}
                onChange={update("gstNumber")}
                placeholder="09ABCDE1234F1Z5"
                className={inputClass}
              />
            </Field>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Location
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Location / Address">
                <input
                  value={form.location}
                  onChange={update("location")}
                  placeholder="e.g. Kanpur, Uttar Pradesh"
                  className={inputClass}
                />
              </Field>
              <Field label="Latitude">
                <input
                  value={form.latitude}
                  onChange={update("latitude")}
                  inputMode="decimal"
                  placeholder="e.g. 26.4499"
                  className={inputClass}
                />
              </Field>
              <Field label="Longitude">
                <input
                  value={form.longitude}
                  onChange={update("longitude")}
                  inputMode="decimal"
                  placeholder="e.g. 80.3319"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Plan &amp; Payment
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Subscription Plan">
                <select value={form.planName} onChange={update("planName")} className={inputClass}>
                  {PLANS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} — {p.price}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment Method">
                <select value={form.paymentMethod} onChange={update("paymentMethod")} className={inputClass}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Bank Details
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Bank Name">
                <input value={form.bankName} onChange={update("bankName")} className={inputClass} />
              </Field>
              <Field label="Account Holder Name">
                <input value={form.accountHolder} onChange={update("accountHolder")} className={inputClass} />
              </Field>
              <Field label="Account Number">
                <input value={form.accountNumber} onChange={update("accountNumber")} className={inputClass} />
              </Field>
              <Field label="IFSC Code">
                <input value={form.ifsc} onChange={update("ifsc")} className={inputClass} />
              </Field>
            </div>
          </div>

          <Field label="GST Address">
            <textarea
              value={form.gstAddress}
              onChange={update("gstAddress")}
              rows={2}
              placeholder="Registered GST address"
              className={inputClass}
            />
          </Field>

          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Media
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FileField
                label="Brand Logo"
                accept="image/*"
                files={logoFile ? [logoFile] : []}
                onChange={(files) => setLogoFile(files[0] || null)}
              />
              <FileField
                label="Brand Product Photos"
                accept="image/*"
                multiple
                files={productPhotos}
                onChange={setProductPhotos}
              />
              <FileField
                label="Ambience Video"
                accept="video/*"
                files={ambienceVideo ? [ambienceVideo] : []}
                onChange={(files) => setAmbienceVideo(files[0] || null)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-800 px-4 py-2 text-[13px] font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — list (grid / table) + navigation into the separate
 * BrandDetails page
 * ---------------------------------------------------------------------- */

export default function Brand() {
  const navigate = useNavigate();
  const { brands, handleApprovalDecision, deleteBrandById, addBrand } = useBrands();

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  const [view, setView] = useState("grid"); // "grid" | "table"
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const openBrandDetails = (brand) => navigate(`/brands/${brand.id}`);

  const filtered = brands.filter((b) => {
    const matchesSearch =
      b.brandName.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      statusTab === "All"
        ? b.onboardingComplete !== false && b.status !== "Pending"
        : statusTab === "Complete Listing"
        ? b.onboardingComplete !== false && b.status === "Pending"
        : statusTab === "UnderListing"
        ? b.onboardingComplete === false
        : b.status === statusTab;

    const matchesPlan = planFilter === "All Plans" || b.subscriptionPlan === planFilter;

    return matchesSearch && matchesTab && matchesPlan;
  });

  // Delete stays list-page-only; details page has its own confirm-delete
  // via the same useConfirmDelete hook + deleteBrandById from context.
  const deleteBrand = useConfirmDelete(deleteBrandById);

  const handleExport = () => exportBrandsToCsv(filtered);

  const handleAddListing = (form) => {
    const nextId = brands.length ? Math.max(...brands.map((b) => b.id)) + 1 : 1;
    const logoUrl = form.logoFile ? URL.createObjectURL(form.logoFile) : undefined;
    const selectedPlan = PLANS.find((p) => p.name === form.planName) || PLANS[0];

    const newBrand = {
      id: nextId,
      brandId: `#${Math.random().toString(16).slice(2, 8)}`,
      brandName: form.brandName,
      tagline: form.shortName || "",
      emoji: form.brandName?.charAt(0)?.toUpperCase() || "B",
      logo: logoUrl,
      followers: 0,
      location: form.location || "—",
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      category: form.businessType,
      liveSince: String(new Date().getFullYear()),
      active: false,
      status: "Pending", // completed onboarding, awaiting super admin approval
      rejectionReason: "",

      shortName: form.shortName || "",
      businessStatus: form.businessStatus,
      businessType: form.businessType,
      merchantToken: `mch_${Math.random().toString(16).slice(2, 8)}_${Math.random()
        .toString(16)
        .slice(2, 12)}`,
      subBrandCount: "0/0",
      outlets: [],

      contactPhone: "—",
      contactEmail: "—",

      planPrice: selectedPlan.price,
      planType: "Annual",
      subscriptionPlan: selectedPlan.name,
      subscriptionTerm: "1 Year",
      paymentMethod: form.paymentMethod,
      expiredInDays: 0,
      remainderPercent: 0,

      ownerName: form.accountHolder || "—",
      gstNumber: form.gstNumber,
      gstVerified: false,
      panNumber: form.panNumber,
      panVerified: false,
      bankVerified: false,
      bankName: form.bankName,
      accountHolder: form.accountHolder,
      accountNumber: form.accountNumber,
      ifsc: form.ifsc,
      gstAddress: form.gstAddress,

      about: "",
      website: "—",
      tags: [],

      ambiencePhotos: [],
      ambienceVideo: null,
      productPhotoCount: form.productPhotos?.length || 0,
      hasAmbienceVideo: !!form.ambienceVideo,

      listings: [],
      settlements: [],
      reviews: [],
      invoices: [],
    };

    addBrand(newBrand);
    setShowAddModal(false);
    setStatusTab("Complete Listing");
  };

  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-16",
      render: (_row, index) => <span className="text-neutral-500">{index + 1}</span>,
    },
    {
      key: "brand",
      label: "Brand",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <BrandAvatar brand={row} size="sm" />
          <div>
            <p className="font-medium text-neutral-50">{row.brandName}</p>
            <p className="text-[11.5px] text-neutral-500">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (row) => <span className="text-neutral-400">{row.location}</span>,
    },
    {
      key: "outlets",
      label: "Sub-Brand",
      align: "center",
      render: (row) => <span className="text-neutral-300">{row.subBrandCount}</span>,
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) => (
        <div>
          <p className="text-neutral-300">{row.subscriptionPlan}</p>
          {row.planPrice && row.planPrice !== "—" && (
            <p className="text-[11px] text-neutral-500">{row.planPrice}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) =>
        row.onboardingComplete === false ? (
          <OnboardingBadge brand={row} />
        ) : row.status === "Pending" ? (
          <ApprovalDropdown brand={row} onDecision={handleApprovalDecision} size="sm" />
        ) : (
          <div className="flex flex-col gap-1">
            <StatusBadge status={row.status} activeLabel="Active" />
            {row.status === "Rejected" && <RejectionBadge brand={row} />}
          </div>
        ),
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openBrandDetails(row)}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-[12.5px] font-medium text-neutral-300 transition-colors hover:border-emerald-400/60 hover:text-emerald-400"
          >
            View
          </button>
          <button
            onClick={() => deleteBrand(row)}
            aria-label={`Delete ${row.brandName}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">Brands</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Browse onboarded brands and open a brand to see its full profile.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Add listing */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              <Store size={14} />
              Add Listing
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-[12.5px] font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileDown size={14} />
              Export
            </button>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "grid"
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "table"
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Status tabs + Search */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const count =
                tab === "All"
                  ? brands.filter((b) => b.onboardingComplete !== false && b.status !== "Pending")
                      .length
                  : tab === "Complete Listing"
                  ? brands.filter((b) => b.onboardingComplete !== false && b.status === "Pending")
                      .length
                  : tab === "UnderListing"
                  ? brands.filter((b) => b.onboardingComplete === false).length
                  : brands.filter((b) => b.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    statusTab === tab
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab === "UnderListing" ? "Under Listing" : tab}
                  <span
                    className={`rounded-full px-1.5 text-[10.5px] ${
                      statusTab === tab ? "bg-emerald-400/20" : "bg-neutral-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
              <Search size={16} className="shrink-0 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand, location, category..."
                className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            {/* Plan filter */}
            <div className="relative">
              <button
                onClick={() => setPlanMenuOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                  planFilter !== "All Plans"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                    : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                <SlidersHorizontal size={14} />
                {planFilter === "All Plans" ? "Filter by Plan" : planFilter}
                {planFilter !== "All Plans" && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlanFilter("All Plans");
                    }}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 hover:bg-emerald-400/30"
                    aria-label="Clear plan filter"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>

              {planMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setPlanMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40">
                    <button
                      onClick={() => {
                        setPlanFilter("All Plans");
                        setPlanMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-300 transition-colors hover:bg-neutral-800"
                    >
                      All Plans
                      {planFilter === "All Plans" && <Check size={14} className="text-emerald-400" />}
                    </button>
                    <div className="h-px bg-neutral-800" />
                    {PLANS.map((plan) => (
                      <button
                        key={plan.name}
                        onClick={() => {
                          setPlanFilter(plan.name);
                          setPlanMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-300 transition-colors hover:bg-neutral-800"
                      >
                        <span>
                          {plan.name}
                          <span className="ml-1.5 text-[11px] text-neutral-500">{plan.price}</span>
                        </span>
                        {planFilter === plan.name && <Check size={14} className="text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Grid or Table */}
        {view === "grid" ? (
          filtered.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-10 text-center text-neutral-500">
              No brands found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onOpen={openBrandDetails}
                  onDelete={deleteBrand}
                  onDecision={handleApprovalDecision}
                />
              ))}
            </div>
          )
        ) : (
          <Table columns={columns} data={filtered} emptyMessage="No brands found." />
        )}
      </div>

      {showAddModal && (
        <AddListingModal onClose={() => setShowAddModal(false)} onSubmit={handleAddListing} />
      )}
    </div>
  );
}