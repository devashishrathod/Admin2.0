import React, { useState, useMemo } from "react";
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
} from "lucide-react";

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

const INITIAL_CUSTOMERS = [
  {
    id: 1,
    name: "Rohit Sharma",
    avatar: "🧑🏽",
    email: "rohit.sharma@example.com",
    phone: "+91 98765 43210",
    platform: "Android",
    status: "Active",
    joined: "12 Jan 2024",
    lastActive: "2 hours ago",
    address: "Kanpur, Uttar Pradesh",
    wallet: 1240,
    coins: 320,
    followers: 128,
    following: 64,
    persona: ["Frequent Shopper", "Deal Hunter", "Reviewer"],
    planId: "prime-plus",
    planHistory: [
      { id: "h1", label: "Started on Prime Lite", date: "12 Jan 2024", type: "start" },
      { id: "h2", label: "Upgraded to Prime Plus", date: "01 Jul 2026", type: "upgrade" },
    ],
    transactions: [
      { id: "t1", label: "Prime Plus renewal", date: "18 Jul 2026", amount: -930, status: "Success" },
      { id: "t2", label: "Wallet top-up", date: "02 Jul 2026", amount: 2000, status: "Success" },
      { id: "t3", label: "Voucher redeemed · Electronics", date: "27 Jun 2026", amount: -499, status: "Success" },
    ],
    reviews: [
      {
        id: "r1",
        brand: "TechHub Electronics",
        rating: 5,
        comment: "Fast delivery and genuine products, will shop again.",
        date: "28 Jun 2026",
      },
      {
        id: "r2",
        brand: "Prime App",
        rating: 4,
        comment: "Great app overall, wallet top-up could be quicker.",
        date: "05 Jul 2026",
      },
    ],
  },
  {
    id: 2,
    name: "Ananya Verma",
    avatar: "👩🏻",
    email: "ananya.verma@example.com",
    phone: "+91 91234 56780",
    platform: "iOS",
    status: "Active",
    joined: "03 Mar 2024",
    lastActive: "Just now",
    address: "Lucknow, Uttar Pradesh",
    wallet: 3110,
    coins: 860,
    followers: 412,
    following: 96,
    persona: ["Power User", "Brand Loyalist", "Top Reviewer"],
    planId: "prime-elite",
    planHistory: [
      { id: "h1", label: "Started on Prime Plus", date: "03 Mar 2024", type: "start" },
      { id: "h2", label: "Upgraded to Prime Elite", date: "10 Jul 2026", type: "upgrade" },
    ],
    transactions: [
      { id: "t1", label: "Prime Elite renewal", date: "10 Jul 2026", amount: -1880, status: "Success" },
      { id: "t2", label: "Referral bonus", date: "05 Jul 2026", amount: 150, status: "Success" },
      { id: "t3", label: "Voucher redeemed · Fashion", date: "22 Jun 2026", amount: -799, status: "Failed" },
    ],
    reviews: [
      {
        id: "r1",
        brand: "Urban Fashion Co.",
        rating: 2,
        comment: "Order was delayed and the size guide was inaccurate.",
        date: "23 Jun 2026",
      },
      {
        id: "r2",
        brand: "Prime App",
        rating: 5,
        comment: "Elite perks are absolutely worth it, love the priority support.",
        date: "11 Jul 2026",
      },
      {
        id: "r3",
        brand: "Daily Grocers",
        rating: 4,
        comment: "Good freshness on produce, packaging could improve.",
        date: "01 Jul 2026",
      },
    ],
  },
  {
    id: 3,
    name: "Karan Mehta",
    avatar: "🧔🏽",
    email: "karan.mehta@example.com",
    phone: "+91 99887 66554",
    platform: "Android",
    status: "Inactive",
    joined: "21 Aug 2023",
    lastActive: "3 weeks ago",
    address: "Delhi, NCR",
    wallet: 0,
    coins: 40,
    followers: 18,
    following: 12,
    persona: ["Occasional Shopper"],
    planId: "prime-lite",
    planHistory: [
      { id: "h1", label: "Started on Prime Lite", date: "21 Aug 2023", type: "start" },
      { id: "h2", label: "Renewed Prime Lite", date: "05 Jun 2026", type: "renew" },
    ],
    transactions: [
      { id: "t1", label: "Prime Lite renewal", date: "05 Jun 2026", amount: -465, status: "Success" },
      { id: "t2", label: "Wallet withdrawal", date: "01 Jun 2026", amount: -500, status: "Success" },
    ],
    reviews: [
      {
        id: "r1",
        brand: "QuickMart",
        rating: 3,
        comment: "Average experience, delivery took longer than promised.",
        date: "02 Jun 2026",
      },
    ],
  },
  {
    id: 4,
    name: "Priya Nair",
    avatar: "👩🏽",
    email: "priya.nair@example.com",
    phone: "+91 90000 11223",
    platform: "iOS",
    status: "Active",
    joined: "29 Nov 2023",
    lastActive: "1 day ago",
    address: "Kochi, Kerala",
    wallet: 560,
    coins: 210,
    followers: 54,
    following: 30,
    persona: ["Coupon Clipper", "New Explorer"],
    planId: null,
    planHistory: [
      { id: "h1", label: "Tried Prime Lite (trial)", date: "29 Nov 2023", type: "start" },
      { id: "h2", label: "Downgraded to No Plan", date: "15 Jan 2024", type: "downgrade" },
    ],
    transactions: [
      { id: "t1", label: "Wallet top-up", date: "14 Jul 2026", amount: 1000, status: "Success" },
      { id: "t2", label: "Voucher redeemed · Groceries", date: "09 Jul 2026", amount: -320, status: "Pending" },
    ],
    reviews: [
      {
        id: "r1",
        brand: "Daily Grocers",
        rating: 4,
        comment: "Good discounts on the weekend groceries bundle.",
        date: "10 Jul 2026",
      },
    ],
  },
  {
    id: 5,
    name: "Devansh Gupta",
    avatar: "🧑🏻",
    email: "devansh.gupta@example.com",
    phone: "+91 98700 22110",
    platform: "Android",
    status: "Active",
    joined: "07 Feb 2025",
    lastActive: "5 hours ago",
    address: "Kanpur, Uttar Pradesh",
    wallet: 880,
    coins: 95,
    followers: 21,
    following: 8,
    persona: ["New Explorer"],
    planId: "prime-plus",
    planHistory: [
      { id: "h1", label: "Started on Prime Plus", date: "07 Feb 2025", type: "start" },
    ],
    transactions: [
      { id: "t1", label: "Prime Plus renewal", date: "01 Jul 2026", amount: -930, status: "Success" },
    ],
    reviews: [],
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

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                  */
/* ------------------------------------------------------------------ */

function StatusPill({ status }) {
  const active = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        active
          ? "bg-emerald-400/10 text-emerald-400"
          : "bg-neutral-700/40 text-neutral-400"
      }`}
    >
      {active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {status}
    </span>
  );
}

function PlatformBadge({ platform }) {
  const isAndroid = platform === "Android";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isAndroid
          ? "bg-lime-400/10 text-lime-400"
          : "bg-sky-400/10 text-sky-400"
      }`}
    >
      {isAndroid ? <Smartphone size={12} /> : <Apple size={12} />}
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
          className={n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-700"}
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
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-50">Edit Customer</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">Update this customer's details.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Customer Name
            </label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              placeholder="e.g. Rohit Sharma"
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                errors.name
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            />
            {errors.name && <p className="mt-1.5 text-[12px] text-red-400">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Email</label>
            <input
              value={form.email}
              onChange={handleChange("email")}
              placeholder="name@example.com"
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                errors.email
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            />
            {errors.email && <p className="mt-1.5 text-[12px] text-red-400">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Phone</label>
            <input
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="+91 90000 00000"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Platform</label>
            <div className="flex gap-2">
              {["Android", "iOS"].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setForm((prev) => ({ ...prev, platform: p }))}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.platform === p
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
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
              className="flex h-10 items-center rounded-xl border border-neutral-800 px-4 text-[13.5px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
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
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-neutral-50">Edit Membership Plan</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Plan Name</label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 ${
                errors.name
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            />
            {errors.name && <p className="mt-1.5 text-[12px] text-red-400">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Tagline</label>
            <input
              value={form.tagline}
              onChange={handleChange("tagline")}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Price (₹)</label>
              <input
                value={form.price}
                onChange={handleChange("price")}
                inputMode="numeric"
                className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 ${
                  errors.price
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                }`}
              />
              {errors.price && <p className="mt-1.5 text-[12px] text-red-400">{errors.price}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Billing Cycle</label>
              <select
                value={form.cycle}
                onChange={handleChange("cycle")}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
              >
                <option>Yearly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Status</label>
            <div className="flex gap-2">
              {["Active", "Inactive"].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.status === s
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
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
              className="flex h-10 items-center rounded-xl border border-neutral-800 px-4 text-[13.5px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
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

function UserCard({ customer, plan, onOpen, onEdit, onDelete }) {
  return (
    <div
      onClick={() => onOpen(customer)}
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900/80"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-[19px]">
            {customer.avatar}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-neutral-50">{customer.name}</p>
            <p className="truncate text-[12px] text-neutral-500">{customer.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(customer);
            }}
            aria-label={`Edit ${customer.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-emerald-400"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(customer);
            }}
            aria-label={`Delete ${customer.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <PlatformBadge platform={customer.platform} />
        <StatusPill status={customer.status} />
        {plan && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
            <Crown size={12} />
            {plan.name}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
        <div className="flex items-center gap-3 text-[11.5px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Wallet size={12} /> {money(customer.wallet)}
          </span>
          <span className="flex items-center gap-1">
            <Coins size={12} /> {customer.coins}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} /> {customer.followers}
          </span>
        </div>
        <ChevronRight size={15} className="text-neutral-600 transition-transform group-hover:translate-x-0.5" />
      </div>
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

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-[13px] font-medium text-neutral-400 transition-colors hover:text-neutral-100"
      >
        <ArrowLeft size={15} />
        Back to customers
      </button>

      {/* Profile header */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-emerald-500/10 via-neutral-900 to-neutral-900 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-neutral-800 text-[28px]">
              {customer.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-semibold text-neutral-50">{customer.name}</h2>
                {customer.status === "Active" && (
                  <BadgeCheck size={16} className="text-emerald-400" />
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <PlatformBadge platform={customer.platform} />

                {isSuperAdmin ? (
                  <button
                    onClick={() => onToggleStatus(customer)}
                    title="Click to change status (Super Admin)"
                  >
                    <StatusPill status={customer.status} />
                  </button>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 opacity-90"
                    title="Only Super Admin can change status"
                  >
                    <StatusPill status={customer.status} />
                    <Lock size={10} className="text-neutral-600" />
                  </span>
                )}

                {currentPlan && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                    <Crown size={12} />
                    {currentPlan.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                <Wallet size={11} /> My Wallet
              </p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-50">{money(customer.wallet)}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                <Coins size={11} /> Coins
              </p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-50">{customer.coins}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                <Users size={11} /> Followers
              </p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-50">{customer.followers}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                <UserPlus size={11} /> Following
              </p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-50">{customer.following}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
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
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {count !== null && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-emerald-400/20 text-emerald-300" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------- Tab: User Info ---------------- */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h3 className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-neutral-50">
              <ShieldCheck size={15} className="text-neutral-400" />
              Contact & Account
            </h3>
            <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <InfoRow icon={<Mail size={13} />} label="Email" value={customer.email} />
              <InfoRow icon={<Phone size={13} />} label="Phone" value={customer.phone} />
              <InfoRow
                icon={customer.platform === "Android" ? <Smartphone size={13} /> : <Apple size={13} />}
                label="Platform"
                value={customer.platform}
              />
              <InfoRow icon={<CalendarDays size={13} />} label="Joined" value={customer.joined} />
              <InfoRow icon={<Clock size={13} />} label="Last Active" value={customer.lastActive} />
              <InfoRow icon={<ShieldCheck size={13} />} label="Address" value={customer.address} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-neutral-50">
              <Users size={15} className="text-neutral-400" />
              Social & Persona
            </h3>
            <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-950/60 p-3 text-center">
                  <p className="flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                    <Users size={11} /> Followers
                  </p>
                  <p className="mt-1 text-[16px] font-semibold text-neutral-50">{customer.followers}</p>
                </div>
                <div className="rounded-xl bg-neutral-950/60 p-3 text-center">
                  <p className="flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                    <UserPlus size={11} /> Following
                  </p>
                  <p className="mt-1 text-[16px] font-semibold text-neutral-50">{customer.following}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-medium text-neutral-500">
                  <Sparkles size={12} /> Persona Tags
                </p>
                {customer.persona.length === 0 ? (
                  <p className="text-[12.5px] text-neutral-600">No persona data yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {customer.persona.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-neutral-800 bg-neutral-950/60 px-2.5 py-1 text-[11px] font-medium text-neutral-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Tab: Transactions ---------------- */}
      {activeTab === "transactions" && (
        <div>
          <h3 className="mb-3 flex items-center justify-between text-[14.5px] font-semibold text-neutral-50">
            <span className="flex items-center gap-2">
              <Receipt size={15} className="text-neutral-400" />
              Transactions
            </span>
            <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-300">
              {customer.transactions.length} total
            </span>
          </h3>
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
            {customer.transactions.length === 0 ? (
              <p className="p-5 text-[13px] text-neutral-500">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {customer.transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-neutral-200">{tx.label}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-neutral-500">
                        <Clock size={11} /> {tx.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[13.5px] font-semibold ${
                          tx.amount < 0 ? "text-neutral-200" : "text-emerald-400"
                        }`}
                      >
                        {tx.amount < 0 ? "-" : "+"}
                        {money(tx.amount)}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          tx.status === "Success"
                            ? "text-emerald-400"
                            : tx.status === "Failed"
                            ? "text-red-400"
                            : "text-amber-400"
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
          <h3 className="mb-3 flex items-center justify-between text-[14.5px] font-semibold text-neutral-50">
            <span className="flex items-center gap-2">
              <Star size={15} className="text-amber-400" />
              Reviews given to brands
            </span>
            <span className="flex items-center gap-2">
              {avgRating && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                  <Star size={11} className="fill-amber-400" /> {avgRating} avg
                </span>
              )}
              <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-300">
                {customer.reviews.length} total
              </span>
            </span>
          </h3>
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
            {customer.reviews.length === 0 ? (
              <p className="p-5 text-[13px] text-neutral-500">This customer hasn't reviewed any brand yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {customer.reviews.map((rev) => (
                  <li key={rev.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-neutral-100">{rev.brand}</p>
                      <StarRating rating={rev.rating} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-400">{rev.comment}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-600">
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
          <h3 className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-neutral-50">
            <Crown size={15} className="text-amber-400" />
            Membership Plan
          </h3>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === customer.planId;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-4 ${
                    isCurrent
                      ? "border-emerald-400/60 bg-emerald-400/5"
                      : "border-neutral-800 bg-neutral-900"
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
                  <p className="mt-1 text-[14px] font-semibold text-neutral-50">{plan.name}</p>
                  <p className="mt-1 text-[12px] text-neutral-500">{plan.tagline}</p>
                  <div className="mt-3">
                    <StatusPill status={plan.status} />
                  </div>
                  <p className="mt-3 text-[17px] font-semibold text-neutral-50">
                    {money(plan.price)}
                    <span className="text-[12px] font-normal text-neutral-500">/{plan.cycle}</span>
                  </p>
                  <p className="text-[11px] text-neutral-600">+ GST</p>

                  <div className="mt-4 flex items-center gap-2 border-t border-neutral-800 pt-3">
                    <button
                      onClick={() => onEditPlan(plan)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-800 py-1.5 text-[12px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => onDeletePlan(plan)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-800 py-1.5 text-[12px] font-medium text-neutral-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
            <h3 className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-neutral-50">
              <History size={15} className="text-neutral-400" />
              Plan History
            </h3>
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
              {(!customer.planHistory || customer.planHistory.length === 0) ? (
                <p className="p-5 text-[13px] text-neutral-500">No previous plan changes on record.</p>
              ) : (
                <ul className="divide-y divide-neutral-800">
                  {customer.planHistory.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                      {h.type === "upgrade" && (
                        <ArrowUpCircle size={16} className="shrink-0 text-emerald-400" />
                      )}
                      {h.type === "downgrade" && (
                        <ArrowDownCircle size={16} className="shrink-0 text-red-400" />
                      )}
                      {(h.type === "start" || h.type === "renew") && (
                        <Crown size={16} className="shrink-0 text-amber-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-neutral-200">{h.label}</p>
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
    <div className="flex items-center justify-between border-b border-neutral-800/70 pb-3 last:border-0 last:pb-0">
      <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
        {icon}
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-neutral-200">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function Customer() {
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
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
          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
          : "border-neutral-800 text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {label}
      <span className="text-[11px] opacity-70">{count}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {selectedCustomer ? (
          <CustomerDetail
            customer={selectedCustomer}
            plans={plans}
            isSuperAdmin={isSuperAdmin}
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
                <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">Customers</h1>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Manage mobile customers, their membership plans and activity.
                </p>
              </div>

              {/* Super Admin toggle — gates the active/inactive control */}
              <button
                onClick={() => setIsSuperAdmin((v) => !v)}
                className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition-colors ${
                  isSuperAdmin
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200"
                }`}
                title="Toggle Super Admin mode to enable/disable account status changes"
              >
                {isSuperAdmin ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                {isSuperAdmin ? "Super Admin Mode: ON" : "Super Admin Mode: OFF"}
              </button>
            </div>

            {!isSuperAdmin && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-[12px] text-neutral-500">
                <Lock size={13} />
                Only Super Admin can activate or deactivate a customer account. Turn on Super Admin
                Mode above to enable this control.
              </div>
            )}

            {/* Search + filters */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
                <Search size={16} className="shrink-0 text-neutral-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FilterChip label="All" count={counts.all} active={statusFilter === "All" && platformFilter === "All"} onClick={() => { setStatusFilter("All"); setPlatformFilter("All"); }} />
                <FilterChip label="Active" count={counts.active} active={statusFilter === "Active"} onClick={() => setStatusFilter(statusFilter === "Active" ? "All" : "Active")} />
                <FilterChip label="Inactive" count={counts.inactive} active={statusFilter === "Inactive"} onClick={() => setStatusFilter(statusFilter === "Inactive" ? "All" : "Inactive")} />
                <FilterChip label="Android" count={counts.android} active={platformFilter === "Android"} onClick={() => setPlatformFilter(platformFilter === "Android" ? "All" : "Android")} />
                <FilterChip label="iOS" count={counts.ios} active={platformFilter === "iOS"} onClick={() => setPlatformFilter(platformFilter === "iOS" ? "All" : "iOS")} />
              </div>
            </div>

            {/* Cards grid */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 py-16 text-center">
                <p className="text-[13.5px] text-neutral-500">No customers match these filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <UserCard
                    key={c.id}
                    customer={c}
                    plan={plans.find((p) => p.id === c.planId)}
                    onOpen={(cust) => setSelectedId(cust.id)}
                    onEdit={handleEditCustomer}
                    onDelete={handleDeleteCustomer}
                  />
                ))}
              </div>
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