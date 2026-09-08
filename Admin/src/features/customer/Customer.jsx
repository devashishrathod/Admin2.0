import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  X,
  Smartphone,
  Apple,
  CheckCircle2,
  XCircle,
  Wallet,
  Coins,
  Receipt,
  Crown,
  ChevronRight,
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  Pencil,
  Trash2,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Users,
  UserPlus,
  Star,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Lock,
  Sparkles,
  Loader2,
  AlertTriangle,
  MoreVertical,
  ChevronLeft,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { getAllCustomers, getCustomerById } from "./services/CustomerApi";

/* ------------------------------------------------------------------ */
/*  Static reference data                                              */
/* ------------------------------------------------------------------ */

const MEMBERSHIP_PLANS_SEED = [
  {
    id: "prime-lite",
    name: "Prime Lite",
    tagline: "For occasional shoppers",
    price: 465,
    cycle: "Yearly",
    status: "Active",
    badge: null,
  },
  {
    id: "prime-plus",
    name: "Prime Plus",
    tagline: "For regular customers who want more",
    price: 930,
    cycle: "Yearly",
    status: "Active",
    badge: "Most Popular",
  },
  {
    id: "prime-elite",
    name: "Prime Elite",
    tagline: "For our most valued customers",
    price: 1880,
    cycle: "Yearly",
    status: "Active",
    badge: null,
  },
];


const EMPTY_CUSTOMER_FORM = {
  id: null,
  name: "",
  email: "",
  phone: "",
  avatar: "🧑",
  platform: "Android",
};

const EMPTY_PLAN_FORM = {
  id: null,
  name: "",
  tagline: "",
  price: "",
  cycle: "Yearly",
  status: "Active",
  badge: "",
};

const money = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

const CHART_COLORS = ["#34d399", "#f59e0b", "#38bdf8", "#a78bfa", "#f87171", "#facc15", "#fb923c"];

function formatDateLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRaw(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return "—";
  return String(v);
}

function fmtRawDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtRawMoney(v) {
  if (v === null || v === undefined) return "—";
  return money(Number(v) || 0);
}

// Normalizes one real customer record (GET /customers/admin/get-all or
// /customers/admin/:customerId) into the flat shape this page's cards/detail
// view already expect, and also keeps the full raw payload (`.raw`) so the
// User Info tab can show every field the API returns. A small handful of
// customers may genuinely lack a `fullName` (onboarding not completed), in
// which case the card falls back to the real customerId rather than a
// fabricated name. Fields this endpoint has no per-item source for
// (itemized transactions, reviews, plan history, persona tags) default to
// empty rather than being invented — the `claims`/`refunds` blocks on the
// real response are aggregate counters, not per-item lists.
// "8839999017" -> "+91 88399 99017". The real API returns a bare 10-digit
// WhatsApp number with no country code.
function formatPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 10) return raw || "—";
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

// "ANDROID" / "IOS" -> "Android" / "iOS" so it matches what PlatformBadge
// checks for; anything else (or missing, since `profile.devicePlatforms`
// is often empty) shows as "—" rather than a guessed platform.
function formatPlatform(raw) {
  const p = String(raw || "").toUpperCase();
  if (p === "ANDROID") return "Android";
  if (p === "IOS") return "iOS";
  return "—";
}

function formatAddress(primaryAddress) {
  if (!primaryAddress) return "—";
  if (typeof primaryAddress === "string") return primaryAddress;
  return [primaryAddress.city, primaryAddress.state].filter(Boolean).join(", ") || "—";
}

function normalizeCustomer(raw) {
  const account = raw.account || {};
  const profile = raw.profile || {};
  const isInactive = raw.isAccountActive === false || account.isActive === false;
  return {
    id: raw._id,
    name: raw.fullName || account.name || raw.uniqueId || raw._id || "—",
    avatar: "🧑",
    email: raw.email || account.email || "—",
    phone: formatPhone(raw.whatsappNumber || account.whatsappNumber),
    platform: formatPlatform(profile.devicePlatforms?.[0]),
    status: isInactive ? "Inactive" : "Active",
    joined: formatDateLabel(raw.createdAt),
    lastActive: formatDateLabel(profile.lastSeenAt || raw.updatedAt),
    address: formatAddress(profile.primaryAddress),
    wallet: Number(account.walletBalance) || 0,
    coins: Number(account.tCoinsBalance) || 0,
    followers: Number(account.followerCount) || 0,
    following: Number(account.followingCount) || 0,
    // No real source yet for persona tags, membership plan linkage, or
    // itemized transaction/review lists — `claims`/`refunds` on the real
    // response are aggregate counters, not per-item lists this UI can
    // render, so these stay empty rather than being invented.
    persona: [],
    planId: null,
    planHistory: [],
    transactions: [],
    reviews: [],
    // Full raw payload kept verbatim — the User Info tab dumps every field
    // from here so nothing the real API returns is ever left unshown.
    raw,
  };
}

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                  */
/* ------------------------------------------------------------------ */

function StatusPill({ status }) {
  const active = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        active
          ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
      }`}
    >
      {active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {status}
    </span>
  );
}

function PlatformBadge({ platform }) {
  const isAndroid = platform === "Android";
  const isIos = platform === "iOS";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isAndroid
          ? "bg-lime-400/10 text-lime-600 dark:text-lime-400"
          : isIos
          ? "bg-sky-400/10 text-sky-600 dark:text-sky-400"
          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
      }`}
    >
      {isAndroid ? <Smartphone size={12} /> : isIos ? <Apple size={12} /> : null}
      {platform}
    </span>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-700"}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer edit modal (name / contact / platform only —              */
/*  status changes are Super Admin only, handled in detail view)       */
/* ------------------------------------------------------------------ */

function CustomerFormModal({ open, initialData, onClose, onSave }) {
  const [form, setForm] = useState(initialData || EMPTY_CUSTOMER_FORM);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (open) {
      setForm(initialData || EMPTY_CUSTOMER_FORM);
      setErrors({});
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Customer name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Edit Customer</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">Update this customer's details.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Customer Name
            </label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              placeholder="e.g. Rohit Sharma"
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                errors.name
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
            {errors.name && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Email</label>
            <input
              value={form.email}
              onChange={handleChange("email")}
              placeholder="name@example.com"
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                errors.email
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
            {errors.email && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Phone</label>
            <input
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="+91 90000 00000"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Platform</label>
            <div className="flex gap-2">
              {["Android", "iOS"].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setForm((prev) => ({ ...prev, platform: p }))}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.platform === p
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Membership plan edit modal                                         */
/* ------------------------------------------------------------------ */

function PlanFormModal({ open, initialData, onClose, onSave }) {
  const [form, setForm] = useState(initialData || EMPTY_PLAN_FORM);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (open) {
      setForm(initialData || EMPTY_PLAN_FORM);
      setErrors({});
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Plan name is required";
    if (!form.price || Number(form.price) <= 0) nextErrors.price = "Enter a valid price";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave({ ...form, price: Number(form.price) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Edit Membership Plan</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Plan Name</label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 ${
                errors.name
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
            {errors.name && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Tagline</label>
            <input
              value={form.tagline}
              onChange={handleChange("tagline")}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Price (₹)</label>
              <input
                value={form.price}
                onChange={handleChange("price")}
                inputMode="numeric"
                className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 ${
                  errors.price
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                }`}
              />
              {errors.price && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.price}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Billing Cycle</label>
              <select
                value={form.cycle}
                onChange={handleChange("cycle")}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              >
                <option>Yearly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Status</label>
            <div className="flex gap-2">
              {["Active", "Inactive"].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
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

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer card (list view)                                          */
/* ------------------------------------------------------------------ */

// Card accent follows the platform — Android green, iOS blue — so the two
// look visibly different at a glance, matching PlatformBadge's own colors.
const CUSTOMER_PLATFORM_ACCENTS = {
  Android: "from-lime-400/25 via-lime-400/0",
  iOS: "from-sky-400/25 via-sky-400/0",
};

function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-neutral-50/60 px-2.5 py-1.5 dark:bg-neutral-950/60">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon size={12} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">{value}</p>
        <p className="truncate text-[9px] uppercase tracking-wide text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function UserCard({ customer, plan, onOpen, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accent = CUSTOMER_PLATFORM_ACCENTS[customer.platform] || "from-neutral-400/20 via-neutral-400/0";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:bg-neutral-900 dark:shadow-black/20 dark:hover:shadow-black/30">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accent} opacity-70`} />

      <div className="absolute right-3 top-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          aria-label={`More actions for ${customer.name}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50/80 text-neutral-500 backdrop-blur transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/80 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
        >
          <MoreVertical size={14} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1.5 w-36 overflow-hidden rounded-xl bg-white shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(customer);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Pencil size={13} />
                Edit
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(customer);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-red-600 transition-colors hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      <button onClick={() => onOpen(customer)} className="relative flex flex-col p-4 text-left">
        <div className="mb-3 flex items-center gap-2.5 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-200 text-[19px] ring-2 ring-neutral-50 dark:bg-neutral-800 dark:ring-neutral-950">
            {customer.avatar}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
              {customer.name}
            </p>
            <p className="truncate text-[11.5px] text-neutral-500">{customer.email}</p>
          </div>
        </div>

        <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
          <StatusPill status={customer.status} />
          <PlatformBadge platform={customer.platform} />
          {plan && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <Crown size={12} />
              {plan.name}
            </span>
          )}
        </div>

        <div className="mb-3.5 grid grid-cols-3 gap-2">
          <StatChip icon={Wallet} value={money(customer.wallet)} label="Wallet" />
          <StatChip icon={Coins} value={customer.coins} label="Coins" />
          <StatChip icon={Users} value={customer.followers} label="Followers" />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-950/60">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-neutral-500">
            <CalendarDays size={12} className="shrink-0" />
            Joined {customer.joined}
          </span>
          <ChevronRight size={15} className="shrink-0 text-neutral-500 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer detail — tabbed view                                      */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "info", label: "User Info", icon: ShieldCheck },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "plans", label: "Plans", icon: Crown },
];

function CustomerDetail({
  customer,
  plans,
  isSuperAdmin,
  detailLoading,
  onBack,
  onEditPlan,
  onDeletePlan,
  onToggleStatus,
}) {
  const [activeTab, setActiveTab] = useState("info");
  const currentPlan = plans.find((p) => p.id === customer.planId) || null;

  const avgRating = customer.reviews.length
    ? (customer.reviews.reduce((sum, r) => sum + r.rating, 0) / customer.reviews.length).toFixed(1)
    : null;

  // Real chart data — built only from the raw API's claims/refunds counters,
  // shown only when the customer actually has that activity (never a chart
  // full of fabricated zeros).
  const claims = customer.raw?.claims;
  const claimsBreakdown = claims
    ? [
        { name: "Redeemed", value: Number(claims.redeemedClaims) || 0 },
        { name: "Paid", value: Number(claims.paidClaims) || 0 },
        { name: "Pending", value: Number(claims.pendingClaims) || 0 },
        { name: "Failed", value: Number(claims.failedClaims) || 0 },
        { name: "Cancelled", value: Number(claims.cancelledClaims) || 0 },
        { name: "Expired", value: Number(claims.expiredClaims) || 0 },
        { name: "Refunded", value: Number(claims.refundedClaims) || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const spendOverview = claims
    ? [
        { name: "Gross Spend", value: Number(claims.grossSpend) || 0 },
        { name: "Net Spend", value: Number(claims.netSpend) || 0 },
        { name: "Total Saved", value: Number(claims.totalSaved) || 0 },
        { name: "Total Billed", value: Number(claims.totalBilled) || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const refunds = customer.raw?.refunds;
  const refundsBreakdown = refunds
    ? [
        { name: "Completed", value: Number(refunds.completedRequests) || 0 },
        { name: "Open", value: Number(refunds.openRequests) || 0 },
        { name: "Refused", value: Number(refunds.refusedRequests) || 0 },
        { name: "Failed", value: Number(refunds.failedRequests) || 0 },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ArrowLeft size={15} />
          Back to customers
        </button>
        {detailLoading && (
          <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            <Loader2 size={13} className="animate-spin" />
            Refreshing…
          </span>
        )}
      </div>

      {/* Identity strip — avatar, name, status, platform, plan only; every
          other real field lives in the bento tiles below (nothing repeated,
          nothing skipped). */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:via-neutral-900 dark:to-neutral-900 dark:shadow-black/20">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-200 text-[26px] dark:bg-neutral-800">
          {customer.avatar}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">{customer.name}</h2>
            {customer.status === "Active" && <BadgeCheck size={16} className="shrink-0 text-emerald-400" />}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={customer.platform} />
            {isSuperAdmin ? (
              <button onClick={() => onToggleStatus(customer)} title="Click to change status (Super Admin)">
                <StatusPill status={customer.status} />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 opacity-90" title="Only Super Admin can change status">
                <StatusPill status={customer.status} />
                <Lock size={10} className="text-neutral-500 dark:text-neutral-600" />
              </span>
            )}
            {currentPlan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Crown size={12} />
                {currentPlan.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          let count = null;
          if (tab.key === "transactions") count = customer.transactions.length;
          if (tab.key === "reviews") count = customer.reviews.length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                isActive
                  ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {count !== null && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-emerald-400/20 text-emerald-700 dark:text-emerald-300" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------- Tab: User Info — one bento grid, nothing skipped ---------------- */}
      {activeTab === "info" && (
        <div className="space-y-4">
          {/* Hero (contact) + quick-glance stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 row-span-2 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-neutral-900 dark:text-neutral-50">
                <ShieldCheck size={15} className="text-neutral-500 dark:text-neutral-400" />
                Contact & Account
              </h3>
              <div className="space-y-2.5">
                <InfoRow icon={<Mail size={13} />} label="Email" value={customer.email} />
                <InfoRow icon={<Phone size={13} />} label="Phone" value={customer.phone} />
                <InfoRow
                  icon={customer.platform === "Android" ? <Smartphone size={13} /> : customer.platform === "iOS" ? <Apple size={13} /> : <ShieldCheck size={13} />}
                  label="Platform"
                  value={customer.platform}
                />
                <InfoRow icon={<CalendarDays size={13} />} label="Joined" value={customer.joined} />
                <InfoRow icon={<Clock size={13} />} label="Last Active" value={customer.lastActive} />
                <InfoRow icon={<ShieldCheck size={13} />} label="Address" value={customer.address} />
              </div>
            </div>

            <DetailTile icon={<Wallet size={12} />} label="Wallet" value={money(customer.wallet)} />
            <DetailTile icon={<Coins size={12} />} label="Coins" value={customer.coins} />
            <DetailTile icon={<Users size={12} />} label="Followers" value={customer.followers} />
            <DetailTile icon={<UserPlus size={12} />} label="Following" value={customer.following} />
            <DetailTile icon={<Star size={12} />} label="Review Count" value={fmtRaw(customer.raw?.account?.reviewCount)} />
            <DetailTile icon={<BadgeCheck size={12} />} label="Referral Code" value={fmtRaw(customer.raw?.account?.referralCode)} />
            <DetailTile icon={<UserPlus size={12} />} label="Referral Count" value={fmtRaw(customer.raw?.account?.referralCount)} />
            <DetailTile icon={<CalendarDays size={12} />} label="Date of Birth" value={fmtRawDate(customer.raw?.dob)} />
          </div>

          {/* Persona tags */}
          <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-medium text-neutral-500">
              <Sparkles size={12} /> Persona Tags
            </p>
            {customer.persona.length === 0 ? (
              <p className="text-[12.5px] text-neutral-500 dark:text-neutral-600">No persona data yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {customer.persona.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {customer.raw && (
            <>
              <BentoSection icon={<BadgeCheck size={15} />} title="Account & Identity">
                <DetailTile label="Unique ID" value={fmtRaw(customer.raw.uniqueId)} />
                <DetailTile label="Account ID" value={fmtRaw(customer.raw.account?.uniqueId)} />
                <DetailTile label="Role" value={fmtRaw(customer.raw.account?.role)} />
                <DetailTile label="Login Type" value={fmtRaw(customer.raw.account?.loginType)} />
                <DetailTile label="Signup Completed" value={fmtRaw(customer.raw.isSignUpCompleted)} />
                <DetailTile label="Onboarding Completed" value={fmtRaw(customer.raw.account?.isOnBoardingCompleted)} />
                <DetailTile label="Email Verified" value={fmtRaw(customer.raw.account?.isEmailVerified)} />
                <DetailTile label="Mobile Verified" value={fmtRaw(customer.raw.account?.isMobileVerified)} />
                <DetailTile label="Logged In" value={fmtRaw(customer.raw.account?.isLoggedIn)} />
                <DetailTile label="Account Active" value={fmtRaw(customer.raw.isAccountActive)} />
                <DetailTile label="Profile Active" value={fmtRaw(customer.raw.isProfileActive)} />
                <DetailTile label="Created At" value={fmtRawDate(customer.raw.createdAt)} />
                <DetailTile label="Updated At" value={fmtRawDate(customer.raw.updatedAt)} />
              </BentoSection>

              <BentoSection icon={<Receipt size={15} />} title="Claims Summary">
                {claimsBreakdown.length > 0 && (
                  <div className="col-span-2 row-span-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <p className="mb-1 text-[11px] font-medium text-neutral-500">Claims Breakdown</p>
                    <div className="relative h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={claimsBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3}>
                            {claimsBreakdown.map((d, i) => (
                              <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">
                          {customer.raw.claims.totalClaims}
                        </span>
                        <span className="text-[9px] text-neutral-500">Total Claims</span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                      {claimsBreakdown.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-500">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {d.name} ({d.value})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {spendOverview.length > 0 && (
                  <div className="col-span-2 row-span-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <p className="mb-1 text-[11px] font-medium text-neutral-500">Spend Overview</p>
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={spendOverview} layout="vertical" margin={{ left: 8, right: 12 }}>
                          <XAxis type="number" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10.5, fill: "#737373" }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => [money(v), "Amount"]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                          <Bar dataKey="value" fill="#34d399" radius={[0, 6, 6, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <DetailTile label="Total Claims" value={fmtRaw(customer.raw.claims?.totalClaims)} />
                <DetailTile label="Redeemed" value={fmtRaw(customer.raw.claims?.redeemedClaims)} />
                <DetailTile label="Paid" value={fmtRaw(customer.raw.claims?.paidClaims)} />
                <DetailTile label="Pending" value={fmtRaw(customer.raw.claims?.pendingClaims)} />
                <DetailTile label="Failed" value={fmtRaw(customer.raw.claims?.failedClaims)} />
                <DetailTile label="Cancelled" value={fmtRaw(customer.raw.claims?.cancelledClaims)} />
                <DetailTile label="Expired" value={fmtRaw(customer.raw.claims?.expiredClaims)} />
                <DetailTile label="Refunded" value={fmtRaw(customer.raw.claims?.refundedClaims)} />
                <DetailTile label="Total Billed" value={fmtRawMoney(customer.raw.claims?.totalBilled)} />
                <DetailTile label="Gross Spend" value={fmtRawMoney(customer.raw.claims?.grossSpend)} />
                <DetailTile label="Total Saved" value={fmtRawMoney(customer.raw.claims?.totalSaved)} />
                <DetailTile label="Net Spend" value={fmtRawMoney(customer.raw.claims?.netSpend)} />
                <DetailTile label="Avg. Claim Value" value={fmtRawMoney(customer.raw.claims?.averageClaimValue)} />
                <DetailTile label="First Claim At" value={fmtRawDate(customer.raw.claims?.firstClaimAt)} />
                <DetailTile label="Last Claim At" value={fmtRawDate(customer.raw.claims?.lastClaimAt)} />
                <DetailTile label="Last Paid At" value={fmtRawDate(customer.raw.claims?.lastPaidAt)} />
              </BentoSection>

              <BentoSection icon={<ArrowDownCircle size={15} />} title="Refunds Summary">
                {refundsBreakdown.length > 0 && (
                  <div className="col-span-2 row-span-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <p className="mb-1 text-[11px] font-medium text-neutral-500">Refunds Breakdown</p>
                    <div className="relative h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={refundsBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3}>
                            {refundsBreakdown.map((d, i) => (
                              <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">
                          {customer.raw.refunds.totalRequests}
                        </span>
                        <span className="text-[9px] text-neutral-500">Requests</span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                      {refundsBreakdown.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-500">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {d.name} ({d.value})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <DetailTile label="Total Requests" value={fmtRaw(customer.raw.refunds?.totalRequests)} />
                <DetailTile label="Open" value={fmtRaw(customer.raw.refunds?.openRequests)} />
                <DetailTile label="Completed" value={fmtRaw(customer.raw.refunds?.completedRequests)} />
                <DetailTile label="Refused" value={fmtRaw(customer.raw.refunds?.refusedRequests)} />
                <DetailTile label="Failed" value={fmtRaw(customer.raw.refunds?.failedRequests)} />
                <DetailTile label="Awaiting Bank Details" value={fmtRaw(customer.raw.refunds?.awaitingBankDetails)} />
                <DetailTile label="Refunded Amount" value={fmtRawMoney(customer.raw.refunds?.refundedAmount)} />
                <DetailTile label="Last Request At" value={fmtRawDate(customer.raw.refunds?.lastRequestAt)} />
              </BentoSection>

              <BentoSection icon={<ShieldAlert size={15} />} title="Disputes">
                <DetailTile label="Disputed Payments" value={fmtRaw(customer.raw.disputes?.disputedPayments)} />
                <DetailTile label="Disputed Amount" value={fmtRawMoney(customer.raw.disputes?.disputedAmount)} />
                <DetailTile label="Last Disputed At" value={fmtRawDate(customer.raw.disputes?.lastDisputedAt)} />
              </BentoSection>

              <BentoSection icon={<Sparkles size={15} />} title="Engagement">
                <DetailTile label="Following Count" value={fmtRaw(customer.raw.engagement?.followingCount)} />
                <DetailTile label="Avoided Brands" value={fmtRaw(customer.raw.engagement?.avoidedBrandsCount)} />
                <DetailTile label="Promo Redemptions" value={fmtRaw(customer.raw.engagement?.promoRedemptions)} />
                <DetailTile label="Promo Discount Availed" value={fmtRawMoney(customer.raw.engagement?.promoDiscountAvailed)} />
                <DetailTile label="Open Promo Reservations" value={fmtRaw(customer.raw.engagement?.promoReservationsOpen)} />
              </BentoSection>

              <BentoSection icon={<Smartphone size={15} />} title="Profile & Devices">
                <DetailTile label="Address Count" value={fmtRaw(customer.raw.profile?.addressCount)} />
                <DetailTile label="Primary Address" value={fmtRaw(customer.raw.profile?.primaryAddress)} />
                <DetailTile label="Bank Accounts" value={fmtRaw(customer.raw.profile?.bankAccountCount)} />
                <DetailTile label="Verified Bank Account" value={fmtRaw(customer.raw.profile?.hasVerifiedBankAccount)} />
                <DetailTile label="Active Devices" value={fmtRaw(customer.raw.profile?.activeDeviceCount)} />
                <DetailTile label="Device Platforms" value={fmtRaw(customer.raw.profile?.devicePlatforms)} />
                <DetailTile label="Last Seen At" value={fmtRawDate(customer.raw.profile?.lastSeenAt)} />
              </BentoSection>
            </>
          )}
        </div>
      )}

      {/* ---------------- Tab: Transactions ---------------- */}
      {activeTab === "transactions" && (
        <div>
          <h3 className="mb-3 flex items-center justify-between text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
            <span className="flex items-center gap-2">
              <Receipt size={15} className="text-neutral-500 dark:text-neutral-400" />
              Transactions
            </span>
            <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {customer.transactions.length} total
            </span>
          </h3>
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            {customer.transactions.length === 0 ? (
              <p className="p-5 text-[13px] text-neutral-500">No transactions yet.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                {customer.transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <div>
                      <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{tx.label}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-neutral-500">
                        <Clock size={11} /> {tx.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[13.5px] font-semibold ${
                          tx.amount < 0 ? "text-neutral-800 dark:text-neutral-200" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {tx.amount < 0 ? "-" : "+"}
                        {money(tx.amount)}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          tx.status === "Success"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : tx.status === "Failed"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {tx.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Tab: Reviews ---------------- */}
      {activeTab === "reviews" && (
        <div>
          <h3 className="mb-3 flex items-center justify-between text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
            <span className="flex items-center gap-2">
              <Star size={15} className="text-amber-400" />
              Reviews given to brands
            </span>
            <span className="flex items-center gap-2">
              {avgRating && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <Star size={11} className="fill-amber-400" /> {avgRating} avg
                </span>
              )}
              <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {customer.reviews.length} total
              </span>
            </span>
          </h3>
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            {customer.reviews.length === 0 ? (
              <p className="p-5 text-[13px] text-neutral-500">This customer hasn't reviewed any brand yet.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 p-3">
                {customer.reviews.map((rev) => (
                  <li key={rev.id} className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{rev.brand}</p>
                      <StarRating rating={rev.rating} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-600 dark:text-neutral-400">{rev.comment}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-600">
                      <Clock size={11} /> {rev.date}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Tab: Plans ---------------- */}
      {activeTab === "plans" && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
            <Crown size={15} className="text-amber-400" />
            Membership Plan
          </h3>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === customer.planId;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl p-4 ${
                    isCurrent
                      ? "border border-emerald-400/60 bg-emerald-400/5"
                      : "bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-neutral-950">
                      {plan.badge}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-neutral-950">
                      Current Plan
                    </span>
                  )}
                  <p className="mt-1 text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{plan.name}</p>
                  <p className="mt-1 text-[12px] text-neutral-500">{plan.tagline}</p>
                  <div className="mt-3">
                    <StatusPill status={plan.status} />
                  </div>
                  <p className="mt-3 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">
                    {money(plan.price)}
                    <span className="text-[12px] font-normal text-neutral-500">/{plan.cycle}</span>
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-600">+ GST</p>

                  <div className="mt-4 flex items-center gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                    <button
                      onClick={() => onEditPlan(plan)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => onDeletePlan(plan)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-red-400"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plan history — shows upgrades / downgrades over time */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
              <History size={15} className="text-neutral-500 dark:text-neutral-400" />
              Plan History
            </h3>
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              {(!customer.planHistory || customer.planHistory.length === 0) ? (
                <p className="p-5 text-[13px] text-neutral-500">No previous plan changes on record.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                  {customer.planHistory.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                      {h.type === "upgrade" && (
                        <ArrowUpCircle size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {h.type === "downgrade" && (
                        <ArrowDownCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
                      )}
                      {(h.type === "start" || h.type === "renew") && (
                        <Crown size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{h.label}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-neutral-500">
                          <Clock size={11} /> {h.date}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200/70 pb-3 last:border-0 last:pb-0 dark:border-neutral-800/70">
      <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
        {icon}
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

// Card wrapper for one section of the User Info tab's full raw-API dump.
// Card wrapper for one bento section of the User Info tab — a titled card
// whose children (DetailTile tiles, and occasionally a chart tile) lay out
// in a responsive tile grid.
function BentoSection({ icon, title, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  );
}

// One bento tile — label on top, value below. Used for every raw-API field
// so nothing from the response is ever left undisplayed.
function DetailTile({ icon, label, value }) {
  return (
    <div className="flex flex-col justify-between gap-1.5 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
      <span className="flex items-center gap-1 text-[10px] text-neutral-500">
        {icon}
        {label}
      </span>
      <span
        className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-50"
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [plans, setPlans] = useState(MEMBERSHIP_PLANS_SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");

  const [selectedId, setSelectedId] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getAllCustomers({ page: 1, limit: 100 });
      const rows = (res?.data?.data ?? res?.data ?? []).map(normalizeCustomer);
      setCustomers(rows);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // List rows are lightweight — pull the fully-populated customer once the
  // detail view opens, same pattern as BrandDetailsPage's refreshBrandDetail.
  const handleOpenCustomer = useCallback(async (customer) => {
    setSelectedId(customer.id);
    setDetailLoading(true);
    try {
      const res = await getCustomerById(customer.id);
      const raw = res?.data?.customer ?? res?.data ?? res;
      if (raw) {
        const detailed = normalizeCustomer(raw);
        setCustomers((prev) => prev.map((c) => (c.id === detailed.id ? { ...c, ...detailed } : c)));
      }
    } catch {
      // Keep showing the lightweight list row if the detail fetch fails.
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesPlatform = platformFilter === "All" || c.platform === platformFilter;
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [customers, search, statusFilter, platformFilter]);

  const PAGE_SIZE = 9;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedCustomer = customers.find((c) => c.id === selectedId) || null;

  const counts = useMemo(
    () => ({
      all: customers.length,
      active: customers.filter((c) => c.status === "Active").length,
      inactive: customers.filter((c) => c.status === "Inactive").length,
      android: customers.filter((c) => c.platform === "Android").length,
      ios: customers.filter((c) => c.platform === "iOS").length,
    }),
    [customers]
  );

  /* ---- customer actions ---- */

  const handleEditCustomer = (c) => {
    setEditingCustomer(c);
    setCustomerModalOpen(true);
  };

  const handleDeleteCustomer = (c) => {
    setCustomers((prev) => prev.filter((x) => x.id !== c.id));
    if (selectedId === c.id) setSelectedId(null);
  };

  const handleSaveCustomer = (formValues) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === formValues.id
          ? { ...c, ...formValues, name: formValues.name.trim(), email: formValues.email.trim() }
          : c
      )
    );
    setCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleToggleStatus = (c) => {
    if (!isSuperAdmin) return; // guarded again here in case of stray calls
    setCustomers((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x
      )
    );
  };

  /* ---- plan actions ---- */

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanModalOpen(true);
  };

  const handleDeletePlan = (plan) => {
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    setCustomers((prev) =>
      prev.map((c) => (c.planId === plan.id ? { ...c, planId: null } : c))
    );
  };

  const handleSavePlan = (formValues) => {
    setPlans((prev) => prev.map((p) => (p.id === formValues.id ? { ...p, ...formValues } : p)));
    setPlanModalOpen(false);
    setEditingPlan(null);
  };

  const FilterChip = ({ label, active, onClick, count }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
        active
          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          : "border-neutral-200 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      }`}
    >
      {label}
      <span className="text-[11px] opacity-70">{count}</span>
    </button>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {selectedCustomer ? (
          <CustomerDetail
            customer={selectedCustomer}
            plans={plans}
            isSuperAdmin={isSuperAdmin}
            detailLoading={detailLoading}
            onBack={() => setSelectedId(null)}
            onEditPlan={handleEditPlan}
            onDeletePlan={handleDeletePlan}
            onToggleStatus={handleToggleStatus}
          />
        ) : (
          <>
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Customers</h1>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Manage mobile customers, their membership plans and activity.
                </p>
              </div>

             
            </div>

            {!isSuperAdmin && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-neutral-50/60 px-4 py-2.5 text-[12px] text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900/60 dark:shadow-black/20">
                <Lock size={13} />
                Only Super Admin can activate or deactivate a customer account. Turn on Super Admin
                Mode above to enable this control.
              </div>
            )}

            {/* Search + filters */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:max-w-xs dark:border-neutral-800 dark:bg-neutral-900">
                <Search size={16} className="shrink-0 text-neutral-500" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search customer..."
                  className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FilterChip label="All" count={counts.all} active={statusFilter === "All" && platformFilter === "All"} onClick={() => { setStatusFilter("All"); setPlatformFilter("All"); setPage(1); }} />
                <FilterChip label="Active" count={counts.active} active={statusFilter === "Active"} onClick={() => { setStatusFilter(statusFilter === "Active" ? "All" : "Active"); setPage(1); }} />
                <FilterChip label="Inactive" count={counts.inactive} active={statusFilter === "Inactive"} onClick={() => { setStatusFilter(statusFilter === "Inactive" ? "All" : "Inactive"); setPage(1); }} />
                <FilterChip label="Android" count={counts.android} active={platformFilter === "Android"} onClick={() => { setPlatformFilter(platformFilter === "Android" ? "All" : "Android"); setPage(1); }} />
                <FilterChip label="iOS" count={counts.ios} active={platformFilter === "iOS"} onClick={() => { setPlatformFilter(platformFilter === "iOS" ? "All" : "iOS"); setPage(1); }} />
              </div>
            </div>

            {/* Cards grid */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-16 text-[13px] text-neutral-500 dark:border-neutral-800">
                <Loader2 size={16} className="animate-spin" />
                Loading customers…
              </div>
            ) : loadError ? (
              <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
                <AlertTriangle size={14} className="shrink-0" />
                Failed to load customers: {loadError}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
                <p className="text-[13.5px] text-neutral-500">No customers match these filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pageRows.map((c) => (
                    <UserCard
                      key={c.id}
                      customer={c}
                      plan={plans.find((p) => p.id === c.planId)}
                      onOpen={handleOpenCustomer}
                      onEdit={handleEditCustomer}
                      onDelete={handleDeleteCustomer}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-[12.5px] text-neutral-500">
                      Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                      {filtered.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        aria-label="Previous page"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
                            n === safePage
                              ? "bg-emerald-400 text-neutral-950"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        aria-label="Next page"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <CustomerFormModal
        open={customerModalOpen}
        initialData={editingCustomer}
        onClose={() => {
          setCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
      />

      <PlanFormModal
        open={planModalOpen}
        initialData={editingPlan}
        onClose={() => {
          setPlanModalOpen(false);
          setEditingPlan(null);
        }}
        onSave={handleSavePlan}
      />
    </div>
  );
}