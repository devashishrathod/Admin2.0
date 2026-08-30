import React, { useMemo, useState } from "react";
import {
  Tag,
  Crown,
  Store,
  Users,
  Package,
  BadgeCheck,
  Repeat,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Check,
  X,
  Calendar,
  IndianRupee,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Ticket,
  ClipboardList,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * Coupon type configuration
 *
 * Two behavioural modes:
 *  - "crud"   : admin creates coupons directly — full add / edit / delete /
 *               view. Used by Prime, Brand, Vendor and Own coupons.
 *  - "review" : coupons are created by vendors against a transaction, deal
 *               pack, or membership. Admin can only view them and
 *               approve / reject — no add, edit, or delete.
 * ---------------------------------------------------------------------- */

const TYPE_META = {
  "Prime Coupon": {
    icon: Crown,
    mode: "crud",
    tint: "amber",
    origin: "Trydood Prime",
    blurb: "Platform-wide coupons available exclusively to Prime members.",
  },
  "Brand Coupon": {
    icon: Store,
    mode: "crud",
    tint: "sky",
    origin: "Brand",
    blurb: "Coupons scoped to a specific brand, created and managed by admin.",
  },
  "Vendor Coupon": {
    icon: Users,
    mode: "crud",
    tint: "pink",
    origin: "Vendor",
    blurb: "Coupons issued to a specific vendor, created and managed by admin.",
  },
  "Transaction Coupon": {
    icon: Repeat,
    mode: "review",
    tint: "emerald",
    origin: "Vendor submission",
    blurb: "Created by vendors against a transaction. Admin can only review, approve or reject.",
  },
  "Deal Pack Coupon": {
    icon: Package,
    mode: "review",
    tint: "sky",
    origin: "Vendor submission",
    blurb: "Created by vendors for deal packs. Admin can only review, approve or reject.",
  },
  "Membership Coupon": {
    icon: BadgeCheck,
    mode: "review",
    tint: "pink",
    origin: "Vendor submission",
    blurb: "Created by vendors for memberships. Admin can only review, approve or reject.",
  },
  "Own Coupon": {
    icon: Tag,
    mode: "crud",
    tint: "amber",
    origin: "In-house",
    blurb: "Trydood's own in-house coupons for general marketing use.",
  },
};

const MAIN_TABS = Object.keys(TYPE_META);
const CRUD_STATUS_FILTERS = ["All", "Active", "Inactive"];
const REVIEW_STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected"];

const TINTS = {
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  pink: "bg-pink-400/10 text-pink-600 dark:text-pink-400",
};

const emptyForm = () => ({
  code: "",
  title: "",
  description: "",
  discountType: "Percentage",
  discountValue: "",
  minPurchase: "",
  maxDiscount: "",
  validFrom: "",
  validTo: "",
  usageLimit: "",
  status: "Active",
});

/* -------------------------------------------------------------------------
 * Mock data
 * ---------------------------------------------------------------------- */

let nextId = 1000;
const id = () => nextId++;

const INITIAL_DATA = {
  "Prime Coupon": [
    {
      id: id(),
      code: "PRIME20",
      title: "20% off for Prime members",
      description: "Flat 20% off on every order for active Prime subscribers, platform-wide.",
      discountType: "Percentage",
      discountValue: 20,
      minPurchase: 500,
      maxDiscount: 300,
      validFrom: "2026-06-01",
      validTo: "2026-12-31",
      usageLimit: 5000,
      usageCount: 1240,
      status: "Active",
      createdOn: "2026-05-28",
    },
    {
      id: id(),
      code: "PRIMEFEST",
      title: "Prime Festive Cashback",
      description: "Flat ₹150 cashback for Prime members during the festive week.",
      discountType: "Flat",
      discountValue: 150,
      minPurchase: 999,
      maxDiscount: 150,
      validFrom: "2026-08-15",
      validTo: "2026-08-25",
      usageLimit: 2000,
      usageCount: 0,
      status: "Inactive",
      createdOn: "2026-07-20",
    },
  ],
  "Brand Coupon": [
    {
      id: id(),
      code: "ARENT15",
      title: "Arent Resorts – 15% off",
      description: "15% off all bookings at Arent Resorts, capped at ₹1,000.",
      discountType: "Percentage",
      discountValue: 15,
      minPurchase: 2000,
      maxDiscount: 1000,
      validFrom: "2026-07-01",
      validTo: "2026-09-30",
      usageLimit: 800,
      usageCount: 96,
      status: "Active",
      createdOn: "2026-06-25",
    },
    {
      id: id(),
      code: "GLOWUP10",
      title: "GlowUp Cosmetics – ₹100 off",
      description: "Flat ₹100 off orders above ₹499 at GlowUp Cosmetics.",
      discountType: "Flat",
      discountValue: 100,
      minPurchase: 499,
      maxDiscount: 100,
      validFrom: "2026-07-10",
      validTo: "2026-10-10",
      usageLimit: 500,
      usageCount: 34,
      status: "Active",
      createdOn: "2026-07-05",
    },
  ],
  "Vendor Coupon": [
    {
      id: id(),
      code: "SPICE50",
      title: "Spice Route Kitchen – Welcome offer",
      description: "Flat ₹50 off for first-time customers at Spice Route Kitchen.",
      discountType: "Flat",
      discountValue: 50,
      minPurchase: 300,
      maxDiscount: 50,
      validFrom: "2026-07-01",
      validTo: "2026-08-31",
      usageLimit: 1000,
      usageCount: 212,
      status: "Active",
      createdOn: "2026-06-29",
    },
  ],
  "Transaction Coupon": [
    {
      id: id(),
      code: "TXN-JR-0921",
      title: "10% off next visit",
      description: "Vendor-issued coupon rewarding a recent high-value transaction at Jr Unisex Salon.",
      discountType: "Percentage",
      discountValue: 10,
      minPurchase: 500,
      maxDiscount: 200,
      validFrom: "2026-07-20",
      validTo: "2026-09-20",
      usageLimit: 1,
      usageCount: 0,
      submittedBy: "Jr Unisex Salon",
      submittedOn: "2026-07-21",
      approvalStatus: "Pending",
    },
    {
      id: id(),
      code: "TXN-SR-0847",
      title: "₹75 off repeat order",
      description: "Vendor-issued coupon for a repeat customer at Spice Route Kitchen.",
      discountType: "Flat",
      discountValue: 75,
      minPurchase: 400,
      maxDiscount: 75,
      validFrom: "2026-07-10",
      validTo: "2026-08-10",
      usageLimit: 1,
      usageCount: 1,
      submittedBy: "Spice Route Kitchen",
      submittedOn: "2026-07-11",
      approvalStatus: "Approved",
    },
  ],
  "Deal Pack Coupon": [
    {
      id: id(),
      code: "DP-GLOW-04",
      title: "₹200 off Skincare Starter Bundle",
      description: "Vendor-issued coupon promoting the Skincare Starter Bundle deal pack.",
      discountType: "Flat",
      discountValue: 200,
      minPurchase: 1499,
      maxDiscount: 200,
      validFrom: "2026-07-15",
      validTo: "2026-09-15",
      usageLimit: 150,
      usageCount: 0,
      submittedBy: "GlowUp Cosmetics",
      submittedOn: "2026-07-14",
      approvalStatus: "Pending",
    },
  ],
  "Membership Coupon": [
    {
      id: id(),
      code: "MB-SALON-12",
      title: "Gold Membership – Launch discount",
      description: "Vendor-issued coupon for early sign-ups to the Gold Grooming Membership.",
      discountType: "Percentage",
      discountValue: 12,
      minPurchase: 0,
      maxDiscount: 300,
      validFrom: "2026-07-05",
      validTo: "2026-08-05",
      usageLimit: 100,
      usageCount: 18,
      submittedBy: "Jr Unisex Salon",
      submittedOn: "2026-07-04",
      approvalStatus: "Rejected",
    },
  ],
  "Own Coupon": [
    {
      id: id(),
      code: "TRYDOOD25",
      title: "App download offer",
      description: "Flat 25% off first order for new users who install the Trydood app.",
      discountType: "Percentage",
      discountValue: 25,
      minPurchase: 0,
      maxDiscount: 250,
      validFrom: "2026-06-01",
      validTo: "2026-12-31",
      usageLimit: 10000,
      usageCount: 3820,
      status: "Active",
      createdOn: "2026-05-30",
    },
    {
      id: id(),
      code: "WELCOME100",
      title: "Sign-up bonus",
      description: "Flat ₹100 off on any first booking made through Trydood.",
      discountType: "Flat",
      discountValue: 100,
      minPurchase: 300,
      maxDiscount: 100,
      validFrom: "2026-01-01",
      validTo: "2026-06-30",
      usageLimit: 5000,
      usageCount: 5000,
      status: "Inactive",
      createdOn: "2025-12-20",
    },
  ],
};

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

const formatDiscount = (c) => (c.discountType === "Percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`);
const formatRupee = (n) => (n || n === 0 ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

function StatusPill({ status }) {
  const styles = {
    Active: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    Inactive: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    Pending: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
    Approved: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    Rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function TypeIcon({ type, size = "md" }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const sizes = { sm: "h-9 w-9 rounded-lg", md: "h-11 w-11 rounded-xl", lg: "h-13 w-13 rounded-2xl" };
  return (
    <div className={`flex shrink-0 items-center justify-center ${TINTS[meta.tint]} ${sizes[size]}`}>
      <Icon size={size === "lg" ? 20 : size === "sm" ? 15 : 18} />
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

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      {title && <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>}
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

function KpiCard({ icon: Icon, label, value, tint = "emerald" }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2.5 flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TINTS[tint]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-neutral-500">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main type tabs
 * ---------------------------------------------------------------------- */

function MainTabs({ activeType, onChange, counts }) {
  return (
    <div className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
      {MAIN_TABS.map((type) => {
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        const active = activeType === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              active ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <Icon size={14} />
            {type}
            <span className={`rounded-full px-1.5 text-[10.5px] ${active ? "bg-neutral-950/15" : "bg-neutral-200 dark:bg-neutral-800"}`}>
              {counts[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * List header — status/approval filter, search, add button
 * ---------------------------------------------------------------------- */

function ListHeader({ mode, statusFilter, onStatusFilterChange, counts, search, onSearchChange, onAdd }) {
  const filters = mode === "crud" ? CRUD_STATUS_FILTERS : REVIEW_STATUS_FILTERS;
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((tab) => (
          <button
            key={tab}
            onClick={() => onStatusFilterChange(tab)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              statusFilter === tab ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {tab}
            <span className={`rounded-full px-1.5 text-[10.5px] ${statusFilter === tab ? "bg-emerald-400/20" : "bg-neutral-200 dark:bg-neutral-800"}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <Search size={15} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search code or title..."
            className="w-44 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>

        {mode === "crud" && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2.5 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={14} />
            Add Coupon
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Add / Edit modal — CRUD-mode tabs only
 * ---------------------------------------------------------------------- */

function CouponFormModal({ type, initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial ?? emptyForm());
  const isEdit = !!initial;
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const canSave = form.code.trim() && form.title.trim() && form.discountValue !== "" && form.validFrom && form.validTo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
            {isEdit ? "Edit" : "Add"} {type}
          </h2>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Coupon Code</label>
              <input
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Status</label>
              <div className="flex gap-2">
                {["Active", "Inactive"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField("status", s)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                      form.status === s
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Title</label>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. 20% off for new customers"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              placeholder="Short description shown to users"
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Discount Type</label>
              <div className="flex gap-2">
                {["Percentage", "Flat"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setField("discountType", t)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                      form.discountType === t
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
                Discount Value {form.discountType === "Percentage" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setField("discountValue", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Min Purchase (₹)</label>
              <input
                type="number"
                value={form.minPurchase}
                onChange={(e) => setField("minPurchase", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Max Discount (₹)</label>
              <input
                type="number"
                value={form.maxDiscount}
                onChange={(e) => setField("maxDiscount", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Valid From</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => setField("validFrom", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none [color-scheme:light] dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Valid To</label>
              <input
                type="date"
                value={form.validTo}
                onChange={(e) => setField("validTo", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none [color-scheme:light] dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Usage Limit</label>
            <input
              type="number"
              value={form.usageLimit}
              onChange={(e) => setField("usageLimit", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
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
            disabled={!canSave}
            onClick={() => onSave(form)}
            className="rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEdit ? "Save Changes" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * View modal — used by every tab. Shows approve/reject inline for
 * review-mode coupons that are still Pending.
 * ---------------------------------------------------------------------- */

function ViewModal({ coupon, type, onClose, onApprove, onReject }) {
  const meta = TYPE_META[type];
  const isReview = meta.mode === "review";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <TypeIcon type={type} size="lg" />
            <div>
              <p className="text-[12px] font-medium text-neutral-500">{coupon.code}</p>
              <h2 className="mt-0.5 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{coupon.title}</h2>
              {isReview ? (
                <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">Submitted by {coupon.submittedBy}</p>
              ) : (
                <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">{meta.origin}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-1.5">
          <StatusPill status={isReview ? coupon.approvalStatus : coupon.status} />
        </div>

        {isReview && coupon.approvalStatus === "Pending" && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">This coupon is awaiting your review.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject(coupon)}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/40 px-3.5 py-2 text-[12.5px] font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
              >
                <X size={14} />
                Reject
              </button>
              <button
                onClick={() => onApprove(coupon)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
              >
                <Check size={14} />
                Approve
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <SectionCard title="Description">
            <p className="text-[13.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">{coupon.description || "—"}</p>
          </SectionCard>

          <SectionCard title="Discount Details">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <InfoRow icon={Percent} label="Discount" value={formatDiscount(coupon)} />
              <InfoRow icon={IndianRupee} label="Min Purchase" value={formatRupee(coupon.minPurchase)} />
              <InfoRow icon={IndianRupee} label="Max Discount" value={formatRupee(coupon.maxDiscount)} />
              <InfoRow icon={Clock} label="Usage" value={`${coupon.usageCount ?? 0} / ${coupon.usageLimit ?? "∞"}`} />
            </div>
          </SectionCard>

          <SectionCard title="Validity">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <InfoRow icon={Calendar} label="Valid From" value={coupon.validFrom} />
              <InfoRow icon={Calendar} label="Valid To" value={coupon.validTo} />
              {isReview ? (
                <InfoRow icon={ClipboardList} label="Submitted On" value={coupon.submittedOn} />
              ) : (
                <InfoRow icon={ClipboardList} label="Created On" value={coupon.createdOn} />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Table
 * ---------------------------------------------------------------------- */

function CouponTable({ type, rows, onView, onEdit, onDelete, onApprove, onReject }) {
  const meta = TYPE_META[type];
  const isReview = meta.mode === "review";

  if (!rows.length) {
    return <EmptyState label={`No ${type.toLowerCase()}s found.`} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead className="bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-4 py-3 font-medium">Code</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Discount</th>
            {isReview ? (
              <th className="px-4 py-3 font-medium">Submitted By</th>
            ) : (
              <th className="px-4 py-3 font-medium">Usage</th>
            )}
            <th className="px-4 py-3 font-medium">Validity</th>
            <th className="px-4 py-3 font-medium">{isReview ? "Approval" : "Status"}</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900/60">
              <td className="px-4 py-3">
                <button
                  onClick={() => onView(row)}
                  className="font-semibold text-sky-600 transition-colors hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  {row.code}
                </button>
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{row.title}</td>
              <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">{formatDiscount(row)}</td>
              {isReview ? (
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{row.submittedBy}</td>
              ) : (
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                  {row.usageCount ?? 0} / {row.usageLimit ?? "∞"}
                </td>
              )}
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {row.validFrom} → {row.validTo}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={isReview ? row.approvalStatus : row.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  {isReview && row.approvalStatus === "Pending" && (
                    <>
                      <button
                        onClick={() => onApprove(row)}
                        aria-label={`Approve ${row.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-emerald-400/10 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => onReject(row)}
                        aria-label={`Reject ${row.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                      >
                        <X size={15} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onView(row)}
                    aria-label={`View ${row.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  >
                    <Eye size={15} />
                  </button>
                  {!isReview && (
                    <>
                      <button
                        onClick={() => onEdit(row)}
                        aria-label={`Edit ${row.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-emerald-400"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(row)}
                        aria-label={`Delete ${row.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function CouponCode() {
  const [dataByType, setDataByType] = useState(INITIAL_DATA);
  const [activeType, setActiveType] = useState(MAIN_TABS[0]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null); // coupon object, or "new"

  const meta = TYPE_META[activeType];
  const isReview = meta.mode === "review";
  const rows = dataByType[activeType];

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.code.toLowerCase().includes(search.toLowerCase()) || row.title.toLowerCase().includes(search.toLowerCase());
      const rowStatus = isReview ? row.approvalStatus : row.status;
      const matchesStatus = statusFilter === "All" || rowStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter, isReview]);

  const mainTabCounts = MAIN_TABS.reduce((acc, t) => {
    acc[t] = dataByType[t].length;
    return acc;
  }, {});

  const statusFilterOptions = isReview ? REVIEW_STATUS_FILTERS : CRUD_STATUS_FILTERS;
  const statusCounts = statusFilterOptions.reduce((acc, tab) => {
    acc[tab] =
      tab === "All" ? rows.length : rows.filter((r) => (isReview ? r.approvalStatus : r.status) === tab).length;
    return acc;
  }, {});

  const totalActiveOrApproved = MAIN_TABS.reduce((sum, t) => {
    const m = TYPE_META[t];
    return sum + dataByType[t].filter((r) => (m.mode === "review" ? r.approvalStatus === "Approved" : r.status === "Active")).length;
  }, 0);
  const totalPendingReview = MAIN_TABS.filter((t) => TYPE_META[t].mode === "review").reduce(
    (sum, t) => sum + dataByType[t].filter((r) => r.approvalStatus === "Pending").length,
    0
  );
  const totalCoupons = MAIN_TABS.reduce((sum, t) => sum + dataByType[t].length, 0);

  const updateRow = (rowId, updates) => {
    setDataByType((prev) => ({
      ...prev,
      [activeType]: prev[activeType].map((r) => (r.id === rowId ? { ...r, ...updates } : r)),
    }));
  };

  const handleApprove = (row) => {
    updateRow(row.id, { approvalStatus: "Approved" });
    setViewing((v) => (v && v.id === row.id ? { ...v, approvalStatus: "Approved" } : v));
  };
  const handleReject = (row) => {
    updateRow(row.id, { approvalStatus: "Rejected" });
    setViewing((v) => (v && v.id === row.id ? { ...v, approvalStatus: "Rejected" } : v));
  };
  const handleDelete = (row) => {
    setDataByType((prev) => ({
      ...prev,
      [activeType]: prev[activeType].filter((r) => r.id !== row.id),
    }));
  };

  const handleSaveForm = (form) => {
    if (editing && editing !== "new") {
      updateRow(editing.id, {
        ...form,
        discountValue: Number(form.discountValue) || 0,
        minPurchase: Number(form.minPurchase) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        usageLimit: Number(form.usageLimit) || 0,
      });
    } else {
      const newRow = {
        ...form,
        id: id(),
        discountValue: Number(form.discountValue) || 0,
        minPurchase: Number(form.minPurchase) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        usageLimit: Number(form.usageLimit) || 0,
        usageCount: 0,
        createdOn: new Date().toISOString().slice(0, 10),
      };
      setDataByType((prev) => ({ ...prev, [activeType]: [newRow, ...prev[activeType]] }));
    }
    setEditing(null);
  };

  return (
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        {/* Header — matches the Analytics Report page style */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              <Ticket size={20} className="text-emerald-400" />
              Coupon Codes
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Manage Prime, Brand, Vendor and in-house coupons directly. Vendor-submitted coupons against
              transactions, deal packs and memberships can only be reviewed, approved or rejected.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11.5px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <ArrowUpRight size={12} className="text-emerald-400" />
            {totalCoupons} coupons across {MAIN_TABS.length} types
          </span>
        </div>

        {/* Summary KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard icon={ShieldCheck} label="Active / Approved" value={totalActiveOrApproved} tint="emerald" />
          <KpiCard icon={Clock} label="Awaiting Review" value={totalPendingReview} tint="amber" />
          <KpiCard icon={Ticket} label="Total Coupons" value={totalCoupons} tint="sky" />
        </div>

        {/* Coupon type tabs */}
        <MainTabs
          activeType={activeType}
          onChange={(type) => {
            setActiveType(type);
            setStatusFilter("All");
            setSearch("");
          }}
          counts={mainTabCounts}
        />

        {/* Active tab description */}
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-[12.5px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
          <TypeIcon type={activeType} size="sm" />
          {meta.blurb}
        </div>

        {/* Status filter + search + add */}
        <ListHeader
          mode={meta.mode}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          counts={statusCounts}
          search={search}
          onSearchChange={setSearch}
          onAdd={() => setEditing("new")}
        />

        {/* Table */}
        <CouponTable
          type={activeType}
          rows={filtered}
          onView={setViewing}
          onEdit={setEditing}
          onDelete={handleDelete}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>

      {/* Add / edit modal */}
      {editing && (
        <CouponFormModal
          type={activeType}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={handleSaveForm}
        />
      )}

      {/* View modal */}
      {viewing && (
        <ViewModal
          coupon={viewing}
          type={activeType}
          onClose={() => setViewing(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}