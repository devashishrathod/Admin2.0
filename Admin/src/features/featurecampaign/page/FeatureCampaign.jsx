import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  Lock,
  Tag,
  SlidersHorizontal,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import Table from "../../../components/common/Table";
import CampaignDetails from "./CampaignDetails";

/* -------------------------------------------------------------------------
 * Feature Campaign lifecycle
 * -------------------------------------------------------------------------
 * A campaign moves through these states:
 *
 *   1. Pending Approval  -> created by a brand, waiting for Super Admin.
 *                           Cannot be approved until its ad account is
 *                           complete (see isAdAccountComplete below).
 *   2. Approved           -> Super Admin signed off, ad account was
 *                            confirmed complete at approval time. From here
 *                            the *displayed* status is derived from dates +
 *                            the isActive flag:
 *                              - now > endDate          -> "Expired"
 *                              - !isActive               -> "Inactive"
 *                              - now < startDate          -> "Upcoming"
 *                              - otherwise                -> "Live"
 *   3. Rejected            -> Super Admin declined it, with a mandatory
 *                            reason. Can be reopened for another review.
 *
 * Only once a campaign is Approved does it actually go live on the
 * platforms the brand requested (Android / iOS / both) — see
 * PlatformBadges. Nothing shows as live to end users while Pending or
 * Rejected, no matter what platforms were requested.
 * ---------------------------------------------------------------------- */

const CATEGORY_OPTIONS = [
  "Beauty & Personal Care",
  "Food & Beverage",
  "Electronics",
  "Retail",
  "Wellness",
  "Other",
];

const BRAND_SUGGESTIONS = [
  "Jr Unisex Salon",
  "Spice Route Kitchen",
  "GlowUp Cosmetics",
  "TechHub Electronics",
  "Bloom & Co Florist",
  "FitZone Gym",
];

const AD_PLATFORM_OPTIONS = ["Google Ads", "Meta Ads", "Google Ads + Meta Ads", "Other"];

/* ---- date helpers -------------------------------------------------------
 * The dataset stores dates as "DD-MM-YYYY" strings. <input type="date">
 * needs "YYYY-MM-DD", so we convert both ways at the form boundary and
 * keep DD-MM-YYYY as the storage format everywhere else. */
function parseDMY(str) {
  if (!str) return null;
  const [d, m, y] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dmyToIso(dmy) {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("-");
  return `${y}-${m}-${d}`;
}
function isoToDmy(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
function formatToday() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

/* ---- ad-account completeness --------------------------------------------
 * "Sab ads account details aa gaya hai na" — the checklist a Super Admin
 * must clear before a campaign can be approved. Exported so both the list
 * page and CampaignDetails share one definition of "complete". */
export function getAdAccountChecklist(adAccount = {}) {
  return [
    { key: "accountId", label: "Ad Account ID provided", done: Boolean(adAccount.accountId?.trim()) },
    { key: "accountName", label: "Ad Account name provided", done: Boolean(adAccount.accountName?.trim()) },
    { key: "platform", label: "Ad platform selected", done: Boolean(adAccount.platform?.trim()) },
    { key: "accessGranted", label: "Admin access granted on the ad account", done: Boolean(adAccount.accessGranted) },
    { key: "billingVerified", label: "Billing details verified", done: Boolean(adAccount.billingVerified) },
  ];
}
export function isAdAccountComplete(adAccount) {
  return getAdAccountChecklist(adAccount).every((item) => item.done);
}

/* ---- status derivation --------------------------------------------------*/
export function computeCampaignStatus(c) {
  if (c.approvalStatus === "Pending") return "Pending Approval";
  if (c.approvalStatus === "Rejected") return "Rejected";
  const now = new Date();
  const end = parseDMY(c.endDate);
  const start = parseDMY(c.startDate);
  if (end && now > end) return "Expired";
  if (!c.isActive) return "Inactive";
  if (start && now < start) return "Upcoming";
  return "Live";
}

const STATUS_STYLES = {
  Live: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10" },
  Upcoming: { dot: "bg-sky-400", text: "text-sky-400", bg: "bg-sky-400/10" },
  "Pending Approval": { dot: "bg-amber-400", text: "text-amber-400", bg: "bg-amber-400/10" },
  Rejected: { dot: "bg-red-400", text: "text-red-400", bg: "bg-red-500/10" },
  Expired: { dot: "bg-neutral-500", text: "text-neutral-400", bg: "bg-neutral-700/40" },
  Inactive: { dot: "bg-neutral-500", text: "text-neutral-400", bg: "bg-neutral-700/40" },
};

export function CampaignStatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

/* Small Android / iOS chips. Only lit up (colored) once the campaign is
 * actually Approved + Live/Upcoming; otherwise shown dim so it's obvious
 * the platform isn't serving ads yet. */
export function PlatformBadges({ campaign, size = "md" }) {
  const status = computeCampaignStatus(campaign);
  const isLiveOrUpcoming = campaign.approvalStatus === "Approved" && status !== "Inactive";
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  const chip = (label, requested) => {
    const lit = requested && isLiveOrUpcoming;
    return (
      <span
        key={label}
        className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${
          !requested
            ? "bg-neutral-800/50 text-neutral-600"
            : lit
            ? "bg-emerald-400/10 text-emerald-400"
            : "bg-neutral-800 text-neutral-400"
        }`}
        title={
          !requested
            ? `${label} not requested`
            : lit
            ? `Live on ${label}`
            : `${label} requested — waiting on approval`
        }
      >
        <Smartphone size={10} />
        {label}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-1.5">
      {chip("Android", campaign.platforms?.includes("Android"))}
      {chip("iOS", campaign.platforms?.includes("iOS"))}
    </div>
  );
}

/* Small "ad account complete?" pill, used in the list table */
export function AdAccountPill({ adAccount }) {
  const complete = isAdAccountComplete(adAccount);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        complete ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"
      }`}
    >
      {complete ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
      {complete ? "Ad account complete" : "Ad account incomplete"}
    </span>
  );
}

const STATUS_FILTERS = ["All", "Pending Approval", "Live", "Upcoming", "Inactive", "Expired", "Rejected"];

/* -------------------------------------------------------------------------
 * Mock dataset — six campaigns deliberately covering every branch of
 * computeCampaignStatus() plus both complete/incomplete ad accounts, so the
 * approval + platform logic can be exercised end to end.
 * ---------------------------------------------------------------------- */
const INITIAL_CAMPAIGNS = [
  {
    id: "FCM39304309",
    title: "FitZone Summer Membership Push",
    brandName: "FitZone Gym",
    category: "Wellness",
    description: "App-install campaign promoting the summer membership offer.",
    platforms: ["Android", "iOS"],
    budget: 25000.0,
    spentAmount: 14239.0,
    publishedDate: "01-05-2025",
    startDate: "01-05-2025",
    endDate: "30-05-2025",
    approvalStatus: "Approved",
    isActive: true,
    approvedBy: "Super Admin",
    approvedDate: "02-05-2025",
    rejectionReason: null,
    adAccount: {
      accountId: "GAD-771029384",
      accountName: "FitZone Gym — Google Ads",
      platform: "Google Ads",
      accessGranted: true,
      billingVerified: true,
    },
    history: [
      { action: "Submitted", by: "Brand Owner", date: "01-05-2025", remarks: "Submitted for approval." },
      { action: "Approved", by: "Super Admin", date: "02-05-2025", remarks: "Ad account verified, approved for both platforms." },
    ],
  },
  {
    id: "FCM39304400",
    title: "Salon Makeover Combo Campaign",
    brandName: "Jr Unisex Salon",
    category: "Beauty & Personal Care",
    description: "Retargeting campaign for the haircut + facial combo offer.",
    platforms: ["Android"],
    budget: 18000.0,
    spentAmount: 9600.0,
    publishedDate: "10-07-2026",
    startDate: "15-07-2026",
    endDate: "15-08-2026",
    approvalStatus: "Approved",
    isActive: true,
    approvedBy: "Super Admin",
    approvedDate: "11-07-2026",
    rejectionReason: null,
    adAccount: {
      accountId: "META-55839201",
      accountName: "Jr Unisex Salon Ads",
      platform: "Meta Ads",
      accessGranted: true,
      billingVerified: true,
    },
    history: [
      { action: "Submitted", by: "Brand Owner", date: "10-07-2026", remarks: "Submitted for approval." },
      { action: "Approved", by: "Super Admin", date: "11-07-2026", remarks: "Approved — Android only, as requested." },
    ],
  },
  {
    id: "FCM39304455",
    title: "Spice Route Weekend Thali Push",
    brandName: "Spice Route Kitchen",
    category: "Food & Beverage",
    description: "Weekend thali offer promoted to nearby app users.",
    platforms: ["Android", "iOS"],
    budget: 22000.0,
    spentAmount: 0,
    publishedDate: "20-07-2026",
    startDate: "01-08-2026",
    endDate: "31-08-2026",
    approvalStatus: "Pending",
    isActive: true,
    approvedBy: null,
    approvedDate: null,
    rejectionReason: null,
    adAccount: {
      accountId: "GAD-90042113",
      accountName: "Spice Route Kitchen — Google Ads",
      platform: "Google Ads",
      accessGranted: true,
      billingVerified: true,
    },
    history: [{ action: "Submitted", by: "Brand Owner", date: "20-07-2026", remarks: "Submitted for approval. Ad account fully set up." }],
  },
  {
    id: "FCM39304488",
    title: "GlowUp Festive Makeup Kit Campaign",
    brandName: "GlowUp Cosmetics",
    category: "Beauty & Personal Care",
    description: "Festive combo kit campaign targeting both app stores.",
    platforms: ["Android", "iOS"],
    budget: 9000.0,
    spentAmount: 0,
    publishedDate: "22-07-2026",
    startDate: "25-07-2026",
    endDate: "25-08-2026",
    approvalStatus: "Pending",
    isActive: true,
    approvedBy: null,
    approvedDate: null,
    rejectionReason: null,
    adAccount: {
      accountId: "",
      accountName: "",
      platform: "",
      accessGranted: false,
      billingVerified: false,
    },
    history: [{ action: "Submitted", by: "Brand Owner", date: "22-07-2026", remarks: "Submitted for approval — ad account setup still pending from brand." }],
  },
  {
    id: "FCM39304502",
    title: "TechHub Gadget Clearance Campaign",
    brandName: "TechHub Electronics",
    category: "Electronics",
    description: "Clearance sale campaign for last season's audio & accessories.",
    platforms: ["Android", "iOS"],
    budget: 30000.0,
    spentAmount: 0,
    publishedDate: "18-07-2026",
    startDate: "20-07-2026",
    endDate: "05-08-2026",
    approvalStatus: "Rejected",
    isActive: false,
    approvedBy: null,
    approvedDate: null,
    rejectionReason: "Ad account billing could not be verified — please re-link a valid billing method and resubmit.",
    adAccount: {
      accountId: "GAD-11209983",
      accountName: "TechHub Electronics — Google Ads",
      platform: "Google Ads",
      accessGranted: true,
      billingVerified: false,
    },
    history: [
      { action: "Submitted", by: "Brand Owner", date: "18-07-2026", remarks: "Submitted for approval." },
      {
        action: "Rejected",
        by: "Super Admin",
        date: "19-07-2026",
        remarks: "Ad account billing could not be verified — please re-link a valid billing method and resubmit.",
      },
    ],
  },
  {
    id: "FCM39304515",
    title: "Bloom & Co Anniversary Bouquet Campaign",
    brandName: "Bloom & Co Florist",
    category: "Retail",
    description: "Anniversary bouquet + greeting card campaign, paused for restock.",
    platforms: ["iOS"],
    budget: 6000.0,
    spentAmount: 3200.0,
    publishedDate: "23-07-2026",
    startDate: "24-07-2026",
    endDate: "10-08-2026",
    approvalStatus: "Approved",
    isActive: false,
    approvedBy: "Super Admin",
    approvedDate: "23-07-2026",
    rejectionReason: null,
    adAccount: {
      accountId: "META-77102938",
      accountName: "Bloom & Co Florist Ads",
      platform: "Meta Ads",
      accessGranted: true,
      billingVerified: true,
    },
    history: [
      { action: "Submitted", by: "Brand Owner", date: "23-07-2026", remarks: "Submitted for approval." },
      { action: "Approved", by: "Super Admin", date: "23-07-2026", remarks: "Approved for iOS." },
      { action: "Deactivated", by: "Super Admin", date: "24-07-2026", remarks: "Paused — stock running low." },
    ],
  },
];

const EMPTY_FORM = {
  id: null,
  title: "",
  brandName: "",
  category: CATEGORY_OPTIONS[0],
  description: "",
  platforms: ["Android", "iOS"],
  budget: "",
  startDate: "",
  endDate: "",
  adAccountId: "",
  adAccountName: "",
  adPlatform: AD_PLATFORM_OPTIONS[0],
  accessGranted: false,
  billingVerified: false,
};

/* -------------------------------------------------------------------------
 * Add / Edit campaign modal
 * ---------------------------------------------------------------------- */
function CampaignFormModal({ open, initialData, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          id: initialData.id,
          title: initialData.title,
          brandName: initialData.brandName,
          category: initialData.category,
          description: initialData.description || "",
          platforms: initialData.platforms || [],
          budget: initialData.budget,
          startDate: dmyToIso(initialData.startDate),
          endDate: dmyToIso(initialData.endDate),
          adAccountId: initialData.adAccount?.accountId || "",
          adAccountName: initialData.adAccount?.accountName || "",
          adPlatform: initialData.adAccount?.platform || AD_PLATFORM_OPTIONS[0],
          accessGranted: initialData.adAccount?.accessGranted || false,
          billingVerified: initialData.adAccount?.billingVerified || false,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [open, initialData]);

  if (!open) return null;

  const isEdit = Boolean(form.id);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const togglePlatform = (platform) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Campaign title is required";
    if (!form.brandName.trim()) nextErrors.brandName = "Brand name is required";
    if (!form.platforms.length) nextErrors.platforms = "Select at least one platform";
    if (!form.budget || Number(form.budget) <= 0) nextErrors.budget = "Enter a valid budget";
    if (!form.startDate) nextErrors.startDate = "Start date is required";
    if (!form.endDate) nextErrors.endDate = "End date is required";
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      nextErrors.endDate = "End date must be after start date";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      ...form,
      budget: Number(form.budget),
      startDate: isoToDmy(form.startDate),
      endDate: isoToDmy(form.endDate),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-50">
              {isEdit ? "Edit Campaign" : "Add Feature Campaign"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit
                ? "Editing resets this campaign to Pending Approval for re-review."
                : "New campaigns are created as Pending Approval and won't go live until an admin approves them."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {/* Title */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Campaign Title</label>
            <input
              value={form.title}
              onChange={handleChange("title")}
              placeholder="e.g. Weekend Thali Push"
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                errors.title
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            />
            {errors.title && <p className="mt-1.5 text-[12px] text-red-400">{errors.title}</p>}
          </div>

          {/* Brand + Category */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Brand</label>
              <input
                value={form.brandName}
                onChange={handleChange("brandName")}
                placeholder="e.g. Spice Route Kitchen"
                list="brand-suggestions"
                className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                  errors.brandName
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                }`}
              />
              <datalist id="brand-suggestions">
                {BRAND_SUGGESTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              {errors.brandName && <p className="mt-1.5 text-[12px] text-red-400">{errors.brandName}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Category</label>
              <select
                value={form.category}
                onChange={handleChange("category")}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Show ads on
            </label>
            <div className="flex items-center gap-2">
              {["Android", "iOS"].map((platform) => {
                const checked = form.platforms.includes(platform);
                return (
                  <button
                    type="button"
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                      checked
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <Smartphone size={13} />
                    {platform}
                  </button>
                );
              })}
            </div>
            {errors.platforms && <p className="mt-1.5 text-[12px] text-red-400">{errors.platforms}</p>}
          </div>

          {/* Budget + Dates */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Budget (₹)</label>
              <input
                type="number"
                min="0"
                value={form.budget}
                onChange={handleChange("budget")}
                placeholder="25000"
                className={`w-full rounded-xl border bg-neutral-950 px-3 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                  errors.budget
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                }`}
              />
              {errors.budget && <p className="mt-1.5 text-[11.5px] text-red-400">{errors.budget}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={handleChange("startDate")}
                className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 ${
                  errors.startDate
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                }`}
              />
              {errors.startDate && <p className="mt-1.5 text-[11.5px] text-red-400">{errors.startDate}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={handleChange("endDate")}
                className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 ${
                  errors.endDate
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                }`}
              />
              {errors.endDate && <p className="mt-1.5 text-[11.5px] text-red-400">{errors.endDate}</p>}
            </div>
          </div>

          {/* Ad Account details */}
          <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3.5">
            <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              <ShieldCheck size={12} />
              Ad Account Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-400">Ad Account ID</label>
                <input
                  value={form.adAccountId}
                  onChange={handleChange("adAccountId")}
                  placeholder="e.g. GAD-90042113"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-400">Ad Account Name</label>
                <input
                  value={form.adAccountName}
                  onChange={handleChange("adAccountName")}
                  placeholder="e.g. Brand — Google Ads"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-400">Ad Platform</label>
                <select
                  value={form.adPlatform}
                  onChange={handleChange("adPlatform")}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-200 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
                >
                  {AD_PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <label className="col-span-2 flex items-center gap-2 text-[12.5px] text-neutral-300">
                <input
                  type="checkbox"
                  checked={form.accessGranted}
                  onChange={(e) => setForm((f) => ({ ...f, accessGranted: e.target.checked }))}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-emerald-400"
                />
                Admin access has been granted on this ad account
              </label>
              <label className="col-span-2 flex items-center gap-2 text-[12.5px] text-neutral-300">
                <input
                  type="checkbox"
                  checked={form.billingVerified}
                  onChange={(e) => setForm((f) => ({ ...f, billingVerified: e.target.checked }))}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-emerald-400"
                />
                Billing details are set up and verified
              </label>
            </div>
            <p className="mt-3 text-[11.5px] text-neutral-500">
              A Super Admin will re-check these details before approving. Incomplete details will block approval.
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Description <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              rows={3}
              placeholder="What is this campaign promoting?"
              className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center rounded-xl border border-neutral-800 px-4 text-[13.5px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              {isEdit ? "Save & Resubmit" : "Submit for Approval"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — list <-> details (master/detail, no router required)
 * ---------------------------------------------------------------------- */
export default function FeatureCampaign() {
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.brandName.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || computeCampaignStatus(c) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId) || null;

  /* ---- CRUD -------------------------------------------------------- */
  const handleAddClick = () => {
    setEditingCampaign(null);
    setModalOpen(true);
  };

  const handleEdit = (campaign) => {
    if (campaign.approvalStatus === "Approved") return; // guarded in UI too
    setEditingCampaign(campaign);
    setModalOpen(true);
  };

  const handleDelete = (campaign) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
    if (selectedId === campaign.id) setSelectedId(null);
  };

  const nextCampaignId = () => `FCM${Math.floor(10000000 + Math.random() * 89999999)}`;

  const handleSave = (formValues) => {
    const adAccount = {
      accountId: formValues.adAccountId.trim(),
      accountName: formValues.adAccountName.trim(),
      platform: formValues.adPlatform,
      accessGranted: formValues.accessGranted,
      billingVerified: formValues.billingVerified,
    };

    if (formValues.id) {
      // Editing an existing campaign always sends it back through approval —
      // a Super Admin must never see stale-approved content that was
      // quietly changed after the fact.
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === formValues.id
            ? {
                ...c,
                title: formValues.title.trim(),
                brandName: formValues.brandName.trim(),
                category: formValues.category,
                description: formValues.description.trim(),
                platforms: formValues.platforms,
                budget: formValues.budget,
                startDate: formValues.startDate,
                endDate: formValues.endDate,
                adAccount,
                approvalStatus: "Pending",
                isActive: true,
                approvedBy: null,
                approvedDate: null,
                rejectionReason: null,
                history: [
                  ...c.history,
                  { action: "Resubmitted", by: "Brand Owner", date: formatToday(), remarks: "Details updated and resubmitted for approval." },
                ],
              }
            : c
        )
      );
    } else {
      const newCampaign = {
        id: nextCampaignId(),
        title: formValues.title.trim(),
        brandName: formValues.brandName.trim(),
        category: formValues.category,
        description: formValues.description.trim(),
        platforms: formValues.platforms,
        budget: formValues.budget,
        spentAmount: 0,
        publishedDate: formatToday(),
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        approvalStatus: "Pending",
        isActive: true,
        approvedBy: null,
        approvedDate: null,
        rejectionReason: null,
        adAccount,
        history: [{ action: "Submitted", by: "Brand Owner", date: formatToday(), remarks: "Submitted for approval." }],
      };
      setCampaigns((prev) => [newCampaign, ...prev]);
    }
    setModalOpen(false);
    setEditingCampaign(null);
  };

  /* ---- Approval workflow (Super Admin) ------------------------------
   * handleApprove is guarded — it silently refuses to approve a campaign
   * whose ad account isn't complete yet. CampaignDetails also disables the
   * Approve button client-side, this is the belt-and-braces backend check. */
  const handleApprove = (id, remarks) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (!isAdAccountComplete(c.adAccount)) return c;
        return {
          ...c,
          approvalStatus: "Approved",
          isActive: true,
          approvedBy: "Super Admin",
          approvedDate: formatToday(),
          rejectionReason: null,
          history: [
            ...c.history,
            {
              action: "Approved",
              by: "Super Admin",
              date: formatToday(),
              remarks: remarks || `Ad account verified. Approved for ${c.platforms.join(" & ")}.`,
            },
          ],
        };
      })
    );
  };

  const handleReject = (id, reason) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              approvalStatus: "Rejected",
              isActive: false,
              rejectionReason: reason,
              history: [...c.history, { action: "Rejected", by: "Super Admin", date: formatToday(), remarks: reason }],
            }
          : c
      )
    );
  };

  const handleReopen = (id) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              approvalStatus: "Pending",
              rejectionReason: null,
              history: [
                ...c.history,
                { action: "Reopened", by: "Super Admin", date: formatToday(), remarks: "Sent back for another review." },
              ],
            }
          : c
      )
    );
  };

  const handleToggleActive = (id) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextActive = !c.isActive;
        return {
          ...c,
          isActive: nextActive,
          history: [
            ...c.history,
            {
              action: nextActive ? "Activated" : "Deactivated",
              by: "Super Admin",
              date: formatToday(),
              remarks: nextActive ? "Campaign re-enabled." : "Campaign paused.",
            },
          ],
        };
      })
    );
  };

  /* Toggle a single ad-account checklist item — lets a Super Admin mark
     items as confirmed while reviewing, without editing the whole campaign. */
  const handleAdAccountFieldToggle = (id, field) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, adAccount: { ...c.adAccount, [field]: !c.adAccount[field] } }
          : c
      )
    );
  };

  /* ---- Detail view --------------------------------------------------- */
  if (selectedCampaign) {
    return (
      <CampaignDetails
        campaign={selectedCampaign}
        onBack={() => setSelectedId(null)}
        onApprove={(remarks) => handleApprove(selectedCampaign.id, remarks)}
        onReject={(reason) => handleReject(selectedCampaign.id, reason)}
        onReopen={() => handleReopen(selectedCampaign.id)}
        onToggleActive={() => handleToggleActive(selectedCampaign.id)}
        onToggleAdAccountField={(field) => handleAdAccountFieldToggle(selectedCampaign.id, field)}
        onEdit={
          selectedCampaign.approvalStatus !== "Approved"
            ? () => {
                setEditingCampaign(selectedCampaign);
                setModalOpen(true);
              }
            : null
        }
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
      label: "Campaign",
      render: (row) => (
        <button onClick={() => setSelectedId(row.id)} className="text-left hover:underline">
          <p className="font-medium text-neutral-50">{row.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
            <Tag size={10} /> {row.id} · {row.brandName}
          </p>
        </button>
      ),
    },
    {
      key: "platforms",
      label: "Platforms",
      render: (row) => <PlatformBadges campaign={row} size="sm" />,
    },
    {
      key: "adAccount",
      label: "Ad Account",
      render: (row) => <AdAccountPill adAccount={row.adAccount} />,
    },
    {
      key: "budget",
      label: "Budget / Spent",
      align: "right",
      render: (row) => (
        <div>
          <p className="text-neutral-200">₹{row.budget.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-neutral-500">Spent ₹{(row.spentAmount || 0).toLocaleString("en-IN")}</p>
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
      render: (row) => <CampaignStatusBadge status={computeCampaignStatus(row)} />,
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => {
        const locked = row.approvalStatus === "Approved";
        return (
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
              onClick={() => handleEdit(row)}
              disabled={locked}
              aria-label={`Edit ${row.title}`}
              title={locked ? "Approved campaigns can't be edited directly" : "Edit"}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                locked
                  ? "cursor-not-allowed text-neutral-700"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-emerald-400"
              }`}
            >
              {locked ? <Lock size={14} /> : <Pencil size={15} />}
            </button>
            <button
              onClick={() => handleDelete(row)}
              aria-label={`Delete ${row.title}`}
              title="Delete"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">Feature Campaigns</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Brands submit ad campaigns here. A Super Admin verifies the ad account before
              approving — once approved, the campaign goes live on the requested platforms.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={16} />
            Add Campaign
          </button>
        </div>

        {/* Search + status filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaign, brand or ID..."
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
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Table columns={columns} data={filtered} emptyMessage="No campaigns match your filters." />
      </div>

      {/* Add / Edit modal */}
      <CampaignFormModal
        open={modalOpen}
        initialData={editingCampaign}
        onClose={() => {
          setModalOpen(false);
          setEditingCampaign(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}