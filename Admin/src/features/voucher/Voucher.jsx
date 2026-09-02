import React, { useState } from "react";
import {
  Search,
  Download,
  Calendar,
  Trash2,
  Pencil,
  Eye,
  Check,
  X,
  ArrowLeft,
  Percent,
  Package,
  Crown,
  Tag,
  Clock,
  IndianRupee,
  Store,
  Phone,
  Mail,
  Star,
} from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";

/* -------------------------------------------------------------------------
 * Type configuration — Voucher / Deal Pack / Membership share the same
 * page shell, table shape and approval workflow, but differ in a few
 * labels and their icon.
 * ---------------------------------------------------------------------- */

const MAIN_TABS = ["Voucher", "Deal Pack", "Membership"];

const TYPE_META = {
  Voucher: {
    icon: Percent,
    priceLabel: "Discount",
    valueLabel: "Value Of Amount",
    activityLabel: "Redemptions",
    personLabel: "Customer",
  },
  "Deal Pack": {
    icon: Package,
    priceLabel: "Pack Price",
    valueLabel: "Items Included",
    activityLabel: "Purchases",
    personLabel: "Customer",
  },
  Membership: {
    icon: Crown,
    priceLabel: "Plan Price",
    valueLabel: "Duration",
    activityLabel: "Members",
    personLabel: "Member",
  },
};

// Dynamic "Top X" label per active type, e.g. "Top Voucher", "Top Deal Pack",
// "Top Membership" — used on the filter toggle, table header and badge.
const topSuggestionLabel = (type) => `Top ${type}`;

const APPROVAL_FILTERS = ["All", "Pending", "Approved", "Rejected"];

const DETAIL_TABS = (type) => ["Overview", `${type} Info`, TYPE_META[type].activityLabel, "Merchant"];

/* -------------------------------------------------------------------------
 * Mock data — vendor-submitted items awaiting / holding admin approval.
 * Only items with approvalStatus "Approved" (and status "Active") are
 * meant to be visible in the live app; everything else is admin-only.
 *
 * `topSuggestion` marks an item as a featured "Top Suggestion" for its
 * type (Top Voucher / Top Deal Pack / Top Membership).
 * ---------------------------------------------------------------------- */

const INITIAL_DATA = {
  Voucher: [
    {
      id: 1,
      itemId: "#V35122345",
      merchant: "Arent",
      title: "New resort 50% off all bills",
      publishedDate: "1-7-2026",
      priceValue: "50%",
      secondaryValue: "₹200.00",
      approvalStatus: "Approved",
      status: "Active",
      topSuggestion: true,
      time: "2/7/2026",
      code: "ARENT50",
      category: "Travel & Resorts",
      description:
        "Get 50% off on all bills at Arent Resort. Applicable on room stays, dining and spa services. Valid for a limited time only.",
      terms: [
        "Valid on minimum billing of ₹1,000.",
        "Cannot be combined with any other offer or promotion.",
        "Applicable once per customer per month.",
        "Management reserves the right to withdraw the offer anytime.",
      ],
      minPurchase: "₹1,000",
      maxDiscount: "₹2,000",
      validFrom: "2026-07-01",
      validTo: "2026-08-31",
      usageLimit: 500,
      usageCount: 128,
      merchantContact: { phone: "+91 98765 43210", email: "partnerships@arentresorts.com" },
      outlets: ["Arent Resort - Lake View, Nainital", "Arent Resort - Hilltop, Mussoorie"],
      activity: [
        { name: "Ishita R.", date: "2026-07-10", amount: "₹1,850" },
        { name: "Kabir M.", date: "2026-07-06", amount: "₹2,400" },
        { name: "Priya D.", date: "2026-07-03", amount: "₹1,200" },
      ],
    },
    {
      id: 2,
      itemId: "#V35122998",
      merchant: "Spice Route Kitchen",
      title: "Flat ₹100 off on thali combos",
      publishedDate: "9-7-2026",
      priceValue: "₹100",
      secondaryValue: "₹499.00",
      approvalStatus: "Pending",
      status: "Inactive",
      topSuggestion: false,
      time: "9/7/2026",
      code: "THALI100",
      category: "Food & Beverage",
      description: "Flat ₹100 off on all thali combo orders above ₹499, dine-in and takeaway both.",
      terms: ["Valid on minimum billing of ₹499.", "One redemption per table per visit."],
      minPurchase: "₹499",
      maxDiscount: "₹100",
      validFrom: "2026-07-15",
      validTo: "2026-09-15",
      usageLimit: 300,
      usageCount: 0,
      merchantContact: { phone: "+91 91234 56789", email: "contact@spiceroute.in" },
      outlets: ["Spice Route - Hazratganj, Lucknow"],
      activity: [],
    },
  ],
  "Deal Pack": [
    {
      id: 1,
      itemId: "#DP12045",
      merchant: "GlowUp Cosmetics",
      title: "Skincare Starter Bundle",
      publishedDate: "5-7-2026",
      priceValue: "₹1,499",
      secondaryValue: "4 items",
      approvalStatus: "Pending",
      status: "Inactive",
      topSuggestion: false,
      time: "5/7/2026",
      code: "GLOW4PACK",
      category: "Beauty & Personal Care",
      description:
        "A curated bundle of 4 best-selling skincare essentials, packaged together at a discounted price.",
      terms: ["Non-refundable once redeemed.", "Bundle contents cannot be swapped."],
      minPurchase: "—",
      maxDiscount: "₹500",
      validFrom: "2026-07-10",
      validTo: "2026-10-10",
      usageLimit: 200,
      usageCount: 0,
      merchantContact: { phone: "+91 90000 11223", email: "support@glowupcosmetics.com" },
      outlets: ["GlowUp - Sector 18, Noida"],
      activity: [],
    },
  ],
  Membership: [
    {
      id: 1,
      itemId: "#MB87621",
      merchant: "Jr Unisex Salon",
      title: "Gold Grooming Membership",
      publishedDate: "3-7-2026",
      priceValue: "₹2,499",
      secondaryValue: "12 Months",
      approvalStatus: "Approved",
      status: "Active",
      topSuggestion: true,
      time: "3/7/2026",
      code: "SALONGOLD",
      category: "Beauty & Personal Care",
      description: "Unlimited haircuts and 20% off all other services for 12 months.",
      terms: ["Non-transferable.", "Applicable at enrolled outlet only."],
      minPurchase: "—",
      maxDiscount: "—",
      validFrom: "2026-07-01",
      validTo: "2027-06-30",
      usageLimit: 150,
      usageCount: 42,
      merchantContact: { phone: "+91 98765 43210", email: "hello@jrunisexsalon.com" },
      outlets: ["Jr Unisex Salon - Mall Road, Kanpur"],
      activity: [
        { name: "Rohan Mehta", date: "2026-07-05", amount: "₹2,499" },
        { name: "Aditi J.", date: "2026-07-02", amount: "₹2,499" },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

function ApprovalBadge({ status }) {
  const styles = {
    Approved: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    Pending: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
    Rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

// Static "Top Suggestion" tag shown wherever an item is flagged as featured.
function TopSuggestionBadge({ type }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2.5 py-1 text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
      <Star size={11} className="fill-yellow-600 dark:fill-yellow-400" />
      {topSuggestionLabel(type)}
    </span>
  );
}

// Clickable star toggle used in the table + details page to mark/unmark an
// item as a Top Suggestion. Works identically for all three tabs since the
// label and the underlying field name are the same across types.
function TopSuggestionToggle({ item, type, onToggle, size = "sm" }) {
  const active = !!item.topSuggestion;
  const dims = size === "lg" ? "h-9 px-3" : "h-8 w-8";
  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
      aria-pressed={active}
      title={active ? `Remove from ${topSuggestionLabel(type)}` : `Mark as ${topSuggestionLabel(type)}`}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg transition-colors ${dims} ${
        active
          ? "bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"
          : "text-neutral-500 hover:bg-neutral-800 hover:text-yellow-400"
      }`}
    >
      <Star size={size === "lg" ? 15 : 15} className={active ? "fill-yellow-400" : ""} />
      {size === "lg" && (
        <span className="text-[12px] font-semibold">
          {active ? topSuggestionLabel(type) : `Mark as ${topSuggestionLabel(type)}`}
        </span>
      )}
    </button>
  );
}

function TypeIcon({ type, size = "md" }) {
  const Icon = TYPE_META[type].icon;
  const sizes = {
    sm: "h-9 w-9 text-[13px] rounded-lg",
    md: "h-11 w-11 text-[16px] rounded-xl",
    lg: "h-14 w-14 text-[20px] rounded-2xl",
  };
  return (
    <div className={`flex shrink-0 items-center justify-center bg-emerald-400/10 text-emerald-400 ${sizes[size]}`}>
      <Icon size={size === "lg" ? 22 : size === "sm" ? 15 : 18} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="flex items-center gap-2 text-[12.5px] text-neutral-500">
        {Icon && <Icon size={13} />}
        {label}
      </span>
      <span className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 ${className}`}>
      {title && (
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      )}
      {children}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
      {label}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main type tabs — Voucher / Deal Pack / Membership
 * ---------------------------------------------------------------------- */

function MainTabs({ activeType, onChange, counts }) {
  return (
    <div className="mb-5 flex items-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
      {MAIN_TABS.map((type) => {
        const Icon = TYPE_META[type].icon;
        const active = activeType === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              active ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <Icon size={15} />
            {type}
            <span
              className={`rounded-full px-1.5 text-[10.5px] ${
                active ? "bg-neutral-950/15" : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            >
              {counts[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * List header — approval status tabs, top-suggestion filter, export,
 * date range, search
 * ---------------------------------------------------------------------- */

function ListHeader({
  approvalFilter,
  onApprovalFilterChange,
  counts,
  activeType,
  topOnly,
  onTopOnlyChange,
  topCount,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  search,
  onSearchChange,
  onExport,
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800 lg:flex-row lg:items-center lg:justify-between">
      {/* Approval status tabs + Top Suggestions filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {APPROVAL_FILTERS.map((tab) => (
          <button
            key={tab}
            onClick={() => onApprovalFilterChange(tab)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              approvalFilter === tab
                ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {tab}
            <span
              className={`rounded-full px-1.5 text-[10.5px] ${
                approvalFilter === tab ? "bg-emerald-400/20" : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            >
              {counts[tab]}
            </span>
          </button>
        ))}

        {/* Divider */}
        <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

        {/* Same filter, works for all tabs: label flips to
            "Top Voucher" / "Top Deal Pack" / "Top Membership" */}
        <button
          onClick={() => onTopOnlyChange(!topOnly)}
          aria-pressed={topOnly}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            topOnly ? "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          <Star size={12} className={topOnly ? "fill-yellow-600 dark:fill-yellow-400" : ""} />
          {topSuggestionLabel(activeType)}
          <span className={`rounded-full px-1.5 text-[10.5px] ${topOnly ? "bg-yellow-400/20" : "bg-neutral-200 dark:bg-neutral-800"}`}>
            {topCount}
          </span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3.5 py-2.5 text-[12.5px] font-semibold text-neutral-900 transition-colors hover:bg-white"
        >
          <Download size={14} />
          Export
        </button>

        <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="bg-transparent text-[12.5px] text-neutral-700 focus:outline-none dark:text-neutral-300 [color-scheme:light] dark:[color-scheme:dark]"
          />
          <span className="text-[11.5px] text-neutral-600">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="bg-transparent text-[12.5px] text-neutral-700 focus:outline-none dark:text-neutral-300 [color-scheme:light] dark:[color-scheme:dark]"
          />
          <Calendar size={14} className="shrink-0 text-neutral-500" />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <Search size={15} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Here"
            className="w-40 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>
      </div>
    </div>
  );
}

function EntriesFooter({ pageSize, onPageSizeChange, total }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-[12.5px] text-neutral-500">
      <span>Show</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[12.5px] text-neutral-700 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
      >
        {[10, 25, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span>Entries</span>
      <span className="text-neutral-600">
        ({total === 0 ? 0 : 1}-{total} of {total})
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Quick edit modal — title, merchant, price, value, status, top suggestion
 * ---------------------------------------------------------------------- */

function EditModal({ item, type, onCancel, onSave }) {
  const [form, setForm] = useState(item);
  const meta = TYPE_META[type];

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Edit {type}</h2>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Title</label>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Merchant</label>
            <input
              value={form.merchant}
              onChange={(e) => setField("merchant", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{meta.priceLabel}</label>
              <input
                value={form.priceValue}
                onChange={(e) => setField("priceValue", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{meta.valueLabel}</label>
              <input
                value={form.secondaryValue}
                onChange={(e) => setField("secondaryValue", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">App Visibility</label>
            <div className="flex gap-2">
              {["Active", "Inactive"].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={form.approvalStatus !== "Approved"}
                  onClick={() => setField("status", s)}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    form.status === s
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {form.approvalStatus !== "Approved" && (
              <p className="mt-1.5 text-[11.5px] text-neutral-600">
                Only approved items can be shown in the app.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
              {topSuggestionLabel(type)}
            </label>
            <button
              type="button"
              onClick={() => setField("topSuggestion", !form.topSuggestion)}
              aria-pressed={!!form.topSuggestion}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                form.topSuggestion
                  ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400"
                  : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              <Star size={14} className={form.topSuggestion ? "fill-yellow-400" : ""} />
              {form.topSuggestion
                ? `Featured as ${topSuggestionLabel(type)}`
                : `Mark as ${topSuggestionLabel(type)}`}
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            onClick={onCancel}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Details tabs
 * ---------------------------------------------------------------------- */

function OverviewTab({ item, type }) {
  const meta = TYPE_META[type];
  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="grid grid-cols-2 gap-x-6 divide-y divide-neutral-200 dark:divide-neutral-800">
          <div className="col-span-1">
            <p className="pt-0 pb-1 text-[11px] text-neutral-500">{type} Id :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.itemId}</p>
          </div>
          <div className="col-span-1">
            <p className="pt-0 pb-1 text-[11px] text-neutral-500">Code :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.code}</p>
          </div>

          <div className="col-span-1 pt-3">
            <p className="pb-1 text-[11px] text-neutral-500">{meta.priceLabel} :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.priceValue}</p>
          </div>
          <div className="col-span-1 pt-3">
            <p className="pb-1 text-[11px] text-neutral-500">{meta.valueLabel} :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.secondaryValue}</p>
          </div>

          <div className="col-span-1 pt-3">
            <p className="pb-1 text-[11px] text-neutral-500">Published Date :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.publishedDate}</p>
          </div>
          <div className="col-span-1 pt-3">
            <p className="pb-1 text-[11px] text-neutral-500">Time :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.time}</p>
          </div>

          <div className="col-span-1 pt-3">
            <p className="pb-1 text-[11px] text-neutral-500">Valid From :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.validFrom}</p>
          </div>
          <div className="col-span-1 pt-3">
            <p className="pb-1 text-[11px] text-neutral-500">Valid To :</p>
            <p className="pb-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{item.validTo}</p>
          </div>
        </div>

        <div className="mt-2">
          <p className="mb-2 text-[11px] text-neutral-500">Usage</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
              style={{ width: `${item.usageLimit ? (item.usageCount / item.usageLimit) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-neutral-500">
            {item.usageCount} of {item.usageLimit} used
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

function InfoTab({ item }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Description">
        <p className="text-[13.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">{item.description}</p>
      </SectionCard>

      <SectionCard title="Details">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <InfoRow icon={Tag} label="Category" value={item.category} />
          <InfoRow icon={IndianRupee} label="Min Purchase" value={item.minPurchase} />
          <InfoRow icon={IndianRupee} label="Max Discount" value={item.maxDiscount} />
          <InfoRow icon={Clock} label="Usage Limit" value={item.usageLimit} />
        </div>
      </SectionCard>

      <SectionCard title="Terms & Conditions">
        <ul className="space-y-2">
          {item.terms.map((term, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-600" />
              {term}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function ActivityTab({ item, type }) {
  const meta = TYPE_META[type];
  if (!item.activity?.length)
    return <EmptyState label={`No ${meta.activityLabel.toLowerCase()} yet.`} />;
  return (
    <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
      <table className="w-full text-left text-[13px]">
        <thead className="text-[11.5px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          <tr>
            <th className="px-5 py-4 font-medium">{meta.personLabel}</th>
            <th className="px-5 py-4 font-medium">Date</th>
            <th className="px-5 py-4 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-950">
          {item.activity.map((r, i) => (
            <tr key={i} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
              <td className="px-5 py-4 text-neutral-700 dark:text-neutral-300">{r.name}</td>
              <td className="px-5 py-4 text-neutral-500">{r.date}</td>
              <td className="px-5 py-4 text-right font-medium text-neutral-800 dark:text-neutral-200">{r.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MerchantTab({ item }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Merchant">
        <InfoRow icon={Store} label="Merchant Name" value={item.merchant} />
      </SectionCard>

      <SectionCard title="Contact">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <InfoRow icon={Phone} label="Phone" value={item.merchantContact.phone} />
          <InfoRow icon={Mail} label="Email" value={item.merchantContact.email} />
        </div>
      </SectionCard>

      <SectionCard title="Applicable Outlets">
        {item.outlets?.length ? (
          <div className="space-y-2">
            {item.outlets.map((outlet, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <Store size={14} className="shrink-0 text-neutral-500" />
                <span className="text-[13px] text-neutral-700 dark:text-neutral-300">{outlet}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No outlets linked." />
        )}
      </SectionCard>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Details page — includes the approve / reject workflow and the Top
 * Suggestion toggle up top.
 * ---------------------------------------------------------------------- */

function ItemDetails({ item, type, onBack, onApprove, onReject, onToggleTopSuggestion }) {
  const [tab, setTab] = useState("Overview");
  const tabs = DETAIL_TABS(type);
  const activityLabel = TYPE_META[type].activityLabel;

  const tabContent = {
    Overview: <OverviewTab item={item} type={type} />,
    [`${type} Info`]: <InfoTab item={item} />,
    [activityLabel]: <ActivityTab item={item} type={type} />,
    Merchant: <MerchantTab item={item} />,
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft size={14} />
          Back to {type}s
        </button>

        {/* Pending approval banner */}
        {item.approvalStatus === "Pending" && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13.5px] font-semibold text-amber-600 dark:text-amber-300">Awaiting your approval</p>
              <p className="mt-0.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                This {type.toLowerCase()} was submitted by the vendor and won't appear in the app until approved.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject(item)}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/40 px-3.5 py-2 text-[12.5px] font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
              >
                <X size={14} />
                Reject
              </button>
              <button
                onClick={() => onApprove(item)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
              >
                <Check size={14} />
                Approve
              </button>
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="mb-5 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <TypeIcon type={type} size="lg" />
              <div>
                <p className="text-[12px] font-medium text-neutral-500">{item.itemId}</p>
                <h1 className="mt-0.5 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</h1>
                <p className="mt-1 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">{item.merchant}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                <ApprovalBadge status={item.approvalStatus} />
                {item.topSuggestion && <TopSuggestionBadge type={type} />}
              </div>
              {item.approvalStatus === "Approved" && (
                <StatusBadge status={item.status} activeLabel="Active" />
              )}
            </div>
          </div>

          {/* Top Suggestion toggle — same control across Voucher / Deal Pack / Membership */}
          <div className="mt-4">
            <TopSuggestionToggle item={item} type={type} onToggle={onToggleTopSuggestion} size="lg" />
          </div>

          {/* Tabs */}
          <div className="mt-5 -mb-5 flex gap-5 overflow-x-auto border-t border-neutral-200 pt-3 dark:border-neutral-800">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-3 text-[13px] font-medium transition-colors ${
                  tab === t
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tabContent[tab]}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * CSV export
 * ---------------------------------------------------------------------- */

function exportToCsv(type, items) {
  if (!items.length) return;

  const meta = TYPE_META[type];
  const headers = [
    `${type} Id`,
    "Merchant",
    "Title",
    "Published Date",
    meta.priceLabel,
    meta.valueLabel,
    "Approval Status",
    "Status",
    topSuggestionLabel(type),
    "Time",
  ];

  const rows = items.map((item) => [
    item.itemId,
    item.merchant,
    item.title,
    item.publishedDate,
    item.priceValue,
    item.secondaryValue,
    item.approvalStatus,
    item.status,
    item.topSuggestion ? "Yes" : "No",
    item.time,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type.toLowerCase().replace(/\s+/g, "-")}-export-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Voucher() {
  const [dataByType, setDataByType] = useState(INITIAL_DATA);
  const [activeType, setActiveType] = useState("Voucher");
  const [approvalFilter, setApprovalFilter] = useState("All");
  const [topOnly, setTopOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [openItemId, setOpenItemId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const items = dataByType[activeType];
  const openItem = items.find((i) => i.id === openItemId) || null;

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.itemId.toLowerCase().includes(search.toLowerCase()) ||
      item.merchant.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase());
    const matchesApproval = approvalFilter === "All" || item.approvalStatus === approvalFilter;
    const matchesTop = !topOnly || item.topSuggestion;
    const matchesFrom = !dateFrom || new Date(item.validTo) >= new Date(dateFrom);
    const matchesTo = !dateTo || new Date(item.validFrom) <= new Date(dateTo);
    return matchesSearch && matchesApproval && matchesTop && matchesFrom && matchesTo;
  });

  const mainTabCounts = MAIN_TABS.reduce((acc, t) => {
    acc[t] = dataByType[t].length;
    return acc;
  }, {});

  const approvalCounts = APPROVAL_FILTERS.reduce((acc, tab) => {
    acc[tab] = tab === "All" ? items.length : items.filter((i) => i.approvalStatus === tab).length;
    return acc;
  }, {});

  const topCount = items.filter((i) => i.topSuggestion).length;

  const updateItem = (id, updates) => {
    setDataByType((prev) => ({
      ...prev,
      [activeType]: prev[activeType].map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  };

  const handleApprove = (item) => updateItem(item.id, { approvalStatus: "Approved", status: "Active" });
  const handleReject = (item) => updateItem(item.id, { approvalStatus: "Rejected", status: "Inactive" });

  // Toggles the Top Suggestion flag. Works the same way for every tab —
  // Voucher, Deal Pack and Membership all share this one handler.
  const handleToggleTopSuggestion = (item) => updateItem(item.id, { topSuggestion: !item.topSuggestion });

  const handleDelete = (item) => {
    setDataByType((prev) => ({
      ...prev,
      [activeType]: prev[activeType].filter((i) => i.id !== item.id),
    }));
  };

  const handleEditSave = (form) => {
    updateItem(form.id, form);
    setEditingItem(null);
  };

  const columns = [
    {
      key: "itemId",
      label: `${activeType} Id`,
      render: (row) => (
        <button
          onClick={() => setOpenItemId(row.id)}
          className="font-semibold text-sky-400 transition-colors hover:text-sky-300"
        >
          {row.itemId}
        </button>
      ),
    },
    {
      key: "merchant",
      label: "Merchant",
      render: (row) => <span className="font-medium text-neutral-800 dark:text-neutral-200">{row.merchant}</span>,
    },
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
          {row.title}
          {row.topSuggestion && <TopSuggestionBadge type={activeType} />}
        </span>
      ),
    },
    {
      key: "publishedDate",
      label: "Published Date",
      render: (row) => <span className="text-neutral-500 dark:text-neutral-400">{row.publishedDate}</span>,
    },
    {
      key: "priceValue",
      label: TYPE_META[activeType].priceLabel,
      render: (row) => <span className="font-semibold text-neutral-800 dark:text-neutral-200">{row.priceValue}</span>,
    },
    {
      key: "secondaryValue",
      label: TYPE_META[activeType].valueLabel,
      render: (row) => <span className="text-neutral-700 dark:text-neutral-300">{row.secondaryValue}</span>,
    },
    {
      key: "approvalStatus",
      label: "Approval",
      render: (row) => <ApprovalBadge status={row.approvalStatus} />,
    },
    {
      key: "status",
      label: "App Status",
      render: (row) =>
        row.approvalStatus === "Approved" ? (
          <StatusBadge status={row.status} activeLabel="Active" />
        ) : (
          <span className="text-[11.5px] text-neutral-600">Not live</span>
        ),
    },
    {
      // Same "Top Suggestion" toggle column for Voucher, Deal Pack and
      // Membership — only the label text changes per tab.
      key: "topSuggestion",
      label: topSuggestionLabel(activeType),
      render: (row) => (
        <TopSuggestionToggle item={row} type={activeType} onToggle={handleToggleTopSuggestion} />
      ),
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.approvalStatus === "Pending" && (
            <>
              <button
                onClick={() => handleApprove(row)}
                aria-label={`Approve ${row.title}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-emerald-400/10 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => handleReject(row)}
                aria-label={`Reject ${row.title}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
              >
                <X size={15} />
              </button>
            </>
          )}
          <button
            onClick={() => setOpenItemId(row.id)}
            aria-label={`View ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => setEditingItem(row)}
            aria-label={`Edit ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-emerald-400"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            aria-label={`Delete ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  if (openItem) {
    return (
      <ItemDetails
        item={openItem}
        type={activeType}
        onBack={() => setOpenItemId(null)}
        onApprove={(item) => {
          handleApprove(item);
        }}
        onReject={(item) => {
          handleReject(item);
        }}
        onToggleTopSuggestion={handleToggleTopSuggestion}
      />
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Vendor Submissions
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Vendors submit vouchers, deal packs and memberships here. Approve an item to make it
            live in the app — rejected or pending items stay hidden. Star an item to feature it as
            a Top Suggestion.
          </p>
        </div>

        {/* Voucher / Deal Pack / Membership tabs */}
        <MainTabs
          activeType={activeType}
          onChange={(type) => {
            setActiveType(type);
            setApprovalFilter("All");
            setTopOnly(false);
            setSearch("");
          }}
          counts={mainTabCounts}
        />

        {/* Approval filter + Top Suggestion filter + export + date range + search */}
        <ListHeader
          approvalFilter={approvalFilter}
          onApprovalFilterChange={setApprovalFilter}
          counts={approvalCounts}
          activeType={activeType}
          topOnly={topOnly}
          onTopOnlyChange={setTopOnly}
          topCount={topCount}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          search={search}
          onSearchChange={setSearch}
          onExport={() => exportToCsv(activeType, filtered)}
        />

        {/* Table */}
        <Table columns={columns} data={filtered} emptyMessage={`No ${activeType.toLowerCase()}s found.`} />

        {/* Footer */}
        <EntriesFooter pageSize={pageSize} onPageSizeChange={setPageSize} total={filtered.length} />
      </div>

      {/* Quick edit modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          type={activeType}
          onCancel={() => setEditingItem(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}