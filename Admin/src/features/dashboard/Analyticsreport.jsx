import React, { useMemo, useState } from "react";
import {
  Users,
  Tag,
  Sparkles,
  BadgeCheck,
  FileText,
  CreditCard,
  Calendar,
  Landmark,
  TrendingUp,
  TrendingDown,
  Search,
  SlidersHorizontal,
  Check,
  ChevronDown,
  ArrowUpRight,
  Store,
  X,
  BarChart3,
  AlertTriangle,
  Layers,
  Receipt,
  Percent,
  Wallet,
  Gift,
  Repeat,
  Smartphone,
  Building,
  CircleSlash,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useBrands } from "../brand/BrandContext";

/* -------------------------------------------------------------------------
 * Mock data
 *
 * Six months of activity (Feb–Jul 2026) across six live brands. Every number
 * below is hand-set mock data — swap this block out for a real API response
 * and everything downstream (KPIs, charts, tables) keeps working unchanged.
 * ---------------------------------------------------------------------- */

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

// Scaled to the platform's real current size — 24 vendors, 10 active
// customers — so per-brand monthly customer counts stay believable (a
// customer can interact with several brands, but the platform only has 10
// total). Jul figures for Spice Route Kitchen / Jr Unisex Salon / FitZone
// Gym match Dashbaord.jsx's BRAND_GOALS revenue exactly.
const BRAND_ANALYTICS = [
  {
    id: 1,
    name: "Jr Unisex Salon",
    category: "Beauty & Personal Care",
    monthly: [
      { month: "Feb", customers: 4, transactions: 8, vouchers: 2, dealsPack: 1, memberships: 1, revenue: 3200 },
      { month: "Mar", customers: 5, transactions: 9, vouchers: 3, dealsPack: 1, memberships: 1, revenue: 3500 },
      { month: "Apr", customers: 5, transactions: 10, vouchers: 3, dealsPack: 2, memberships: 2, revenue: 3900 },
      { month: "May", customers: 6, transactions: 11, vouchers: 4, dealsPack: 2, memberships: 2, revenue: 4300 },
      { month: "Jun", customers: 7, transactions: 12, vouchers: 4, dealsPack: 2, memberships: 2, revenue: 4800 },
      { month: "Jul", customers: 8, transactions: 14, vouchers: 5, dealsPack: 3, memberships: 3, revenue: 5400 },
    ],
  },
  {
    id: 2,
    name: "Spice Route Kitchen",
    category: "Food & Beverage",
    monthly: [
      { month: "Feb", customers: 6, transactions: 14, vouchers: 4, dealsPack: 2, memberships: 1, revenue: 5200 },
      { month: "Mar", customers: 6, transactions: 15, vouchers: 5, dealsPack: 2, memberships: 1, revenue: 5700 },
      { month: "Apr", customers: 7, transactions: 17, vouchers: 5, dealsPack: 3, memberships: 2, revenue: 6300 },
      { month: "May", customers: 7, transactions: 18, vouchers: 6, dealsPack: 3, memberships: 2, revenue: 6900 },
      { month: "Jun", customers: 8, transactions: 20, vouchers: 7, dealsPack: 3, memberships: 2, revenue: 7500 },
      { month: "Jul", customers: 9, transactions: 22, vouchers: 9, dealsPack: 4, memberships: 3, revenue: 8200 },
    ],
  },
  {
    id: 3,
    name: "GlowUp Cosmetics",
    category: "Beauty & Personal Care",
    monthly: [
      { month: "Feb", customers: 1, transactions: 2, vouchers: 1, dealsPack: 0, memberships: 0, revenue: 900 },
      { month: "Mar", customers: 1, transactions: 3, vouchers: 1, dealsPack: 0, memberships: 0, revenue: 1050 },
      { month: "Apr", customers: 2, transactions: 3, vouchers: 1, dealsPack: 1, memberships: 0, revenue: 1200 },
      { month: "May", customers: 2, transactions: 4, vouchers: 1, dealsPack: 1, memberships: 1, revenue: 1400 },
      { month: "Jun", customers: 3, transactions: 5, vouchers: 2, dealsPack: 1, memberships: 1, revenue: 1600 },
      { month: "Jul", customers: 3, transactions: 6, vouchers: 2, dealsPack: 1, memberships: 1, revenue: 1800 },
    ],
  },
  {
    id: 4,
    name: "TechHub Electronics",
    category: "Electronics",
    monthly: [
      { month: "Feb", customers: 7, transactions: 9, vouchers: 3, dealsPack: 2, memberships: 1, revenue: 2800 },
      { month: "Mar", customers: 6, transactions: 8, vouchers: 3, dealsPack: 1, memberships: 1, revenue: 2600 },
      { month: "Apr", customers: 6, transactions: 7, vouchers: 2, dealsPack: 1, memberships: 1, revenue: 2350 },
      { month: "May", customers: 5, transactions: 6, vouchers: 2, dealsPack: 1, memberships: 1, revenue: 2050 },
      { month: "Jun", customers: 5, transactions: 5, vouchers: 2, dealsPack: 1, memberships: 0, revenue: 1750 },
      { month: "Jul", customers: 4, transactions: 4, vouchers: 1, dealsPack: 0, memberships: 0, revenue: 1400 },
    ],
  },
  {
    id: 5,
    name: "Bloom & Co Florist",
    category: "Retail",
    monthly: [
      { month: "Feb", customers: 3, transactions: 5, vouchers: 2, dealsPack: 1, memberships: 0, revenue: 1300 },
      { month: "Mar", customers: 3, transactions: 6, vouchers: 2, dealsPack: 1, memberships: 1, revenue: 1450 },
      { month: "Apr", customers: 4, transactions: 6, vouchers: 2, dealsPack: 1, memberships: 1, revenue: 1650 },
      { month: "May", customers: 4, transactions: 7, vouchers: 3, dealsPack: 1, memberships: 1, revenue: 1900 },
      { month: "Jun", customers: 5, transactions: 8, vouchers: 3, dealsPack: 2, memberships: 1, revenue: 2200 },
      { month: "Jul", customers: 5, transactions: 9, vouchers: 4, dealsPack: 2, memberships: 1, revenue: 2600 },
    ],
  },
  {
    id: 6,
    name: "FitZone Gym",
    category: "Wellness",
    monthly: [
      { month: "Feb", customers: 3, transactions: 5, vouchers: 1, dealsPack: 1, memberships: 3, revenue: 1500 },
      { month: "Mar", customers: 4, transactions: 6, vouchers: 2, dealsPack: 1, memberships: 3, revenue: 1700 },
      { month: "Apr", customers: 4, transactions: 7, vouchers: 2, dealsPack: 1, memberships: 4, revenue: 1950 },
      { month: "May", customers: 5, transactions: 8, vouchers: 3, dealsPack: 1, memberships: 4, revenue: 2250 },
      { month: "Jun", customers: 5, transactions: 9, vouchers: 3, dealsPack: 2, memberships: 5, revenue: 2650 },
      { month: "Jul", customers: 6, transactions: 11, vouchers: 4, dealsPack: 2, memberships: 6, revenue: 3100 },
    ],
  },
];

/* Raw settlement transactions — the source of truth for the Settlement
   Analytics tab. Grouping by week / month / year happens on the fly. */
// Scaled to the platform's real current size — 24 vendors, 10 active
// customers — instead of settlement amounts sized for a much larger
// live platform.
const SETTLEMENTS = [
  { id: "STL-9001", brand: "Jr Unisex Salon", date: "2025-12-18", amount: 820, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9002", brand: "Spice Route Kitchen", date: "2025-12-22", amount: 1540, status: "Paid", method: "UPI" },
  { id: "STL-9010", brand: "Jr Unisex Salon", date: "2026-01-10", amount: 910, status: "Paid", method: "UPI" },
  { id: "STL-9011", brand: "Spice Route Kitchen", date: "2026-01-14", amount: 1680, status: "Paid", method: "Trydood Account" },
  { id: "STL-9020", brand: "GlowUp Cosmetics", date: "2026-04-02", amount: 420, status: "Paid", method: "UPI" },
  { id: "STL-9021", brand: "TechHub Electronics", date: "2026-04-05", amount: 310, status: "Failed", method: "Bank Transfer" },
  { id: "STL-9022", brand: "Bloom & Co Florist", date: "2026-04-09", amount: 520, status: "Paid", method: "UPI" },
  { id: "STL-9023", brand: "FitZone Gym", date: "2026-04-12", amount: 1280, status: "Paid", method: "Trydood Account" },
  { id: "STL-9030", brand: "Jr Unisex Salon", date: "2026-04-18", amount: 980, status: "Paid", method: "UPI" },
  { id: "STL-9031", brand: "Spice Route Kitchen", date: "2026-04-22", amount: 1760, status: "Pending", method: "Bank Transfer" },
  { id: "STL-9040", brand: "GlowUp Cosmetics", date: "2026-05-03", amount: 460, status: "Paid", method: "UPI" },
  { id: "STL-9041", brand: "Bloom & Co Florist", date: "2026-05-07", amount: 560, status: "Paid", method: "Trydood Account" },
  { id: "STL-9042", brand: "FitZone Gym", date: "2026-05-11", amount: 1350, status: "Paid", method: "UPI" },
  { id: "STL-9043", brand: "Jr Unisex Salon", date: "2026-05-16", amount: 1020, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9044", brand: "Spice Route Kitchen", date: "2026-05-20", amount: 1890, status: "Paid", method: "UPI" },
  { id: "STL-9045", brand: "TechHub Electronics", date: "2026-05-25", amount: 290, status: "Failed", method: "Other" },
  { id: "STL-9050", brand: "GlowUp Cosmetics", date: "2026-06-02", amount: 490, status: "Pending", method: "UPI" },
  { id: "STL-9051", brand: "Bloom & Co Florist", date: "2026-06-06", amount: 610, status: "Paid", method: "UPI" },
  { id: "STL-9052", brand: "FitZone Gym", date: "2026-06-10", amount: 1420, status: "Paid", method: "Trydood Account" },
  { id: "STL-9053", brand: "Jr Unisex Salon", date: "2026-06-14", amount: 1080, status: "Paid", method: "UPI" },
  { id: "STL-9054", brand: "Spice Route Kitchen", date: "2026-06-19", amount: 1970, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9055", brand: "TechHub Electronics", date: "2026-06-24", amount: 320, status: "Failed", method: "Bank Transfer" },
  { id: "STL-9060", brand: "GlowUp Cosmetics", date: "2026-07-01", amount: 510, status: "Pending", method: "UPI" },
  { id: "STL-9061", brand: "Bloom & Co Florist", date: "2026-07-04", amount: 640, status: "Paid", method: "UPI" },
  { id: "STL-9062", brand: "FitZone Gym", date: "2026-07-08", amount: 1480, status: "Paid", method: "Trydood Account" },
  { id: "STL-9063", brand: "Jr Unisex Salon", date: "2026-07-11", amount: 1120, status: "Paid", method: "UPI" },
  { id: "STL-9064", brand: "Spice Route Kitchen", date: "2026-07-14", amount: 2050, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9065", brand: "TechHub Electronics", date: "2026-07-15", amount: 340, status: "Pending", method: "Other" },
];

// const REPORT_TABS = ["Overview", "Brand Analytics","Voucher",  "Deal Pack", "Membership", "Transaction", "Settlements"];
const REPORT_TABS = ["Overview", "Brand", "Voucher", "Transaction", "Settlements"];
const PERIODS = ["Week", "Month", "Year"];
// Only used by the commented-out DealPackTab/MembershipTab fake data below.
// const GST_RATE = 18; // %

/* Vendor / plan snapshot — feeds the Overview KPI row. Brand counts (All /
   Active / Inactive) come from the real BrandContext instead, further down;
   these two are still fake pending a real vendors/plans endpoint. */
const REGISTRATION_STATS = {
  totalVendorsRegistered: 24,
  totalPlans: 4,
};

/* Billing overview — the money view behind every transaction: what the
   customer was billed, how much was knocked off by discounts/coupons, how
   much Trydood earned as a platform fee, and how much Trydood itself
   subsidized as a promotional discount. */
// Scaled to the platform's real current size — 24 vendors, 10 active
// customers — instead of numbers that only made sense for a much larger
// live platform.
const BILLING_OVERVIEW = [
  { month: "Feb", billAmount: 19000, discount: 1650, platformFee: 950, trydoodDiscount: 540 },
  { month: "Mar", billAmount: 20500, discount: 1750, platformFee: 1025, trydoodDiscount: 580 },
  { month: "Apr", billAmount: 22300, discount: 1900, platformFee: 1115, trydoodDiscount: 630 },
  { month: "May", billAmount: 24200, discount: 2050, platformFee: 1210, trydoodDiscount: 680 },
  { month: "Jun", billAmount: 26300, discount: 2250, platformFee: 1315, trydoodDiscount: 740 },
  { month: "Jul", billAmount: 28500, discount: 2500, platformFee: 1425, trydoodDiscount: 810 },
];

/* Fake/demo data — commented out along with DealPackTab/MembershipTab until
   real deal-pack & membership numbers are available.
const DEALPACK_HISTORY = [
  { year: 2025, month: "Jan", itemsSold: 96, itemsTotal: 48000, discount: 4200, coupon: 1800 },
  { year: 2025, month: "Feb", itemsSold: 102, itemsTotal: 51200, discount: 4500, coupon: 1900 },
  { year: 2025, month: "Mar", itemsSold: 110, itemsTotal: 55800, discount: 4900, coupon: 2100 },
  { year: 2025, month: "Apr", itemsSold: 118, itemsTotal: 60100, discount: 5300, coupon: 2300 },
  { year: 2025, month: "May", itemsSold: 126, itemsTotal: 64500, discount: 5700, coupon: 2500 },
  { year: 2025, month: "Jun", itemsSold: 134, itemsTotal: 68900, discount: 6100, coupon: 2700 },
  { year: 2025, month: "Jul", itemsSold: 142, itemsTotal: 73400, discount: 6500, coupon: 2900 },
  { year: 2025, month: "Aug", itemsSold: 150, itemsTotal: 78000, discount: 6900, coupon: 3100 },
  { year: 2025, month: "Sep", itemsSold: 159, itemsTotal: 82900, discount: 7400, coupon: 3300 },
  { year: 2025, month: "Oct", itemsSold: 168, itemsTotal: 88200, discount: 7900, coupon: 3600 },
  { year: 2025, month: "Nov", itemsSold: 178, itemsTotal: 93800, discount: 8400, coupon: 3900 },
  { year: 2025, month: "Dec", itemsSold: 192, itemsTotal: 101500, discount: 9200, coupon: 4300 },
  { year: 2026, month: "Jan", itemsSold: 183, itemsTotal: 97200, discount: 8700, coupon: 4000 },
  { year: 2026, month: "Feb", itemsSold: 196, itemsTotal: 104300, discount: 9300, coupon: 4300 },
  { year: 2026, month: "Mar", itemsSold: 210, itemsTotal: 112400, discount: 10000, coupon: 4700 },
  { year: 2026, month: "Apr", itemsSold: 225, itemsTotal: 121000, discount: 10800, coupon: 5100 },
  { year: 2026, month: "May", itemsSold: 241, itemsTotal: 130400, discount: 11700, coupon: 5500 },
  { year: 2026, month: "Jun", itemsSold: 258, itemsTotal: 140500, discount: 12600, coupon: 6000 },
  { year: 2026, month: "Jul", itemsSold: 277, itemsTotal: 151700, discount: 13700, coupon: 6500 },
];

const MEMBERSHIP_PLANS = [
  { name: "Basic", price: 1999, activeMembers: 96, couponsApplied: 22, couponValue: 9800 },
  { name: "Advance", price: 2999, activeMembers: 74, couponsApplied: 15, couponValue: 11200 },
  { name: "Pro", price: 3999, activeMembers: 58, couponsApplied: 19, couponValue: 15400 },
  { name: "Pro Lite", price: 4999, activeMembers: 40, couponsApplied: 9, couponValue: 9000 },
];
const PLAN_COLORS = { Basic: "#2FDE8C", Advance: "#38BDF8", Pro: "#FBBF24", "Pro Lite": "#F472B6" };
*/

/* Voucher redemption history — Jan 2025 through Jul 2026 — used by the
   dedicated Voucher tab for both the monthly trend and yearly comparison. */
// Scaled to the platform's real current size — 24 vendors, 10 active
// customers — instead of numbers that only made sense for a much larger
// live platform.
const VOUCHER_HISTORY = [
  { year: 2025, month: "Jan", count: 4, amount: 700 },
  { year: 2025, month: "Feb", count: 5, amount: 880 },
  { year: 2025, month: "Mar", count: 5, amount: 900 },
  { year: 2025, month: "Apr", count: 6, amount: 1080 },
  { year: 2025, month: "May", count: 6, amount: 1100 },
  { year: 2025, month: "Jun", count: 7, amount: 1280 },
  { year: 2025, month: "Jul", count: 8, amount: 1480 },
  { year: 2025, month: "Aug", count: 9, amount: 1680 },
  { year: 2025, month: "Sep", count: 10, amount: 1900 },
  { year: 2025, month: "Oct", count: 11, amount: 2100 },
  { year: 2025, month: "Nov", count: 12, amount: 2320 },
  { year: 2025, month: "Dec", count: 14, amount: 2700 },
  { year: 2026, month: "Jan", count: 13, amount: 2500 },
  { year: 2026, month: "Feb", count: 15, amount: 2900 },
  { year: 2026, month: "Mar", count: 17, amount: 3350 },
  { year: 2026, month: "Apr", count: 20, amount: 4000 },
  { year: 2026, month: "May", count: 24, amount: 4850 },
  { year: 2026, month: "Jun", count: 29, amount: 5900 },
  { year: 2026, month: "Jul", count: 38, amount: 7600 },
];

/* Transaction history — every checkout across the platform, per month, with
   a payment-method split and a success/failed breakdown. */
// Scaled to the platform's real current size — 24 vendors, 10 active
// customers — "amount" matches BILLING_OVERVIEW's billAmount for the same
// month, since both represent total gross transaction value.
const TRANSACTION_HISTORY = [
  { month: "Feb", count: 95, success: 91, failed: 4, amount: 19000 },
  { month: "Mar", count: 105, success: 101, failed: 4, amount: 20500 },
  { month: "Apr", count: 118, success: 113, failed: 5, amount: 22300 },
  { month: "May", count: 132, success: 127, failed: 5, amount: 24200 },
  { month: "Jun", count: 148, success: 142, failed: 6, amount: 26300 },
  { month: "Jul", count: 165, success: 159, failed: 6, amount: 28500 },
];

// Splits the latest month's (Jul) transaction count of 165 by payment method,
// keeping the same proportions as before.
const PAYMENT_METHOD_SPLIT = [
  { name: "UPI", value: 90, color: "#2FDE8C" },
  { name: "Card", value: 38, color: "#38BDF8" },
  { name: "Wallet", value: 22, color: "#FBBF24" },
  { name: "Trydood Account", value: 15, color: "#F472B6" },
];

/* -------------------------------------------------------------------------
 * Small pure-logic helpers
 * ---------------------------------------------------------------------- */

const formatCurrency = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const formatNumber = (n) => Math.round(n).toLocaleString("en-IN");
const pctChange = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);
// Only used by the commented-out DealPackTab/MembershipTab fake data below.
// const gstOf = (taxableValue) => taxableValue * (GST_RATE / 100);

/* Sum a metric across every brand for a single month index (0..5) */
function monthTotal(field, monthIndex) {
  return BRAND_ANALYTICS.reduce((sum, b) => sum + b.monthly[monthIndex][field], 0);
}

/* Combined month-by-month series across all brands, used by the Overview trend chart */
const COMBINED_TREND = MONTHS.map((month, i) => ({
  month,
  revenue: monthTotal("revenue", i),
  transactions: monthTotal("transactions", i),
  customers: monthTotal("customers", i),
  vouchers: monthTotal("vouchers", i),
}));

/* Per-brand totals across the whole 6-month window, used by the comparison table */
const BRAND_TOTALS = BRAND_ANALYTICS.map((b) => {
  const latest = b.monthly[b.monthly.length - 1];
  const prev = b.monthly[b.monthly.length - 2];
  const sum = (field) => b.monthly.reduce((s, m) => s + m[field], 0);
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    customers: latest.customers,
    vouchers: latest.vouchers,
    dealsPack: latest.dealsPack,
    memberships: latest.memberships,
    transactions: sum("transactions"),
    revenue: sum("revenue"),
    revenueChange: pctChange(latest.revenue, prev.revenue),
  };
});

/* Bucket a settlement date into a Week / Month / Year key + human label */
function bucketFor(dateStr, period) {
  const d = new Date(dateStr);
  if (period === "Year") {
    const y = d.getFullYear();
    return { key: `${y}`, label: `${y}`, sortKey: y };
  }
  if (period === "Month") {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    return { key, label, sortKey: d.getFullYear() * 12 + d.getMonth() };
  }
  // Week — Monday-start bucket
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const key = monday.toISOString().slice(0, 10);
  const label = `${monday.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString(
    "en-IN",
    { month: "short", day: "numeric" }
  )}`;
  return { key, label, sortKey: monday.getTime() };
}

function aggregateSettlements(records, period, brandFilter) {
  const filtered = brandFilter === "All Brands" ? records : records.filter((r) => r.brand === brandFilter);
  const buckets = new Map();
  filtered.forEach((r) => {
    const { key, label, sortKey } = bucketFor(r.date, period);
    if (!buckets.has(key)) {
      buckets.set(key, { key, label, sortKey, paid: 0, pending: 0, failed: 0, total: 0, count: 0 });
    }
    const b = buckets.get(key);
    b.total += r.amount;
    b.count += 1;
    if (r.status === "Paid") b.paid += r.amount;
    if (r.status === "Pending") b.pending += r.amount;
    if (r.status === "Failed") b.failed += r.amount;
  });
  return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
}

/* Fake/demo data — commented out along with DealPackTab until real deal-pack
   numbers are available.
function withDealPackFinancials(row) {
  const taxable = row.itemsTotal - row.discount - row.coupon;
  const gst = gstOf(taxable);
  return { ...row, taxable, gst, netAmount: taxable + gst };
}

function aggregateDealPacksByYear(history) {
  const byYear = new Map();
  history.forEach((h) => {
    if (!byYear.has(h.year)) byYear.set(h.year, { year: h.year, itemsSold: 0, itemsTotal: 0, discount: 0, coupon: 0 });
    const y = byYear.get(h.year);
    y.itemsSold += h.itemsSold;
    y.itemsTotal += h.itemsTotal;
    y.discount += h.discount;
    y.coupon += h.coupon;
  });
  return Array.from(byYear.values())
    .sort((a, b) => a.year - b.year)
    .map(withDealPackFinancials);
}
*/

/* Adds derived bill amount / platform fee / Trydood-borne discount fields to
   a raw voucher record. billAmount is the underlying order value the
   voucher was redeemed against (avg. order ~3.2x the voucher amount);
   platformFee is Trydood's cut of that bill (5%); trydoodDiscount is the
   slice of the voucher's discount value that Trydood itself subsidizes
   (40%) vs. the merchant absorbing the rest. */
function withVoucherFinancials(row) {
  const billAmount = Math.round(row.amount * 3.2);
  const platformFee = Math.round(billAmount * 0.05);
  const trydoodDiscount = Math.round(row.amount * 0.4);
  return { ...row, billAmount, platformFee, trydoodDiscount };
}

function aggregateVouchersByYear(history) {
  const byYear = new Map();
  history.forEach((h) => {
    if (!byYear.has(h.year)) byYear.set(h.year, { year: h.year, count: 0, amount: 0 });
    const y = byYear.get(h.year);
    y.count += h.count;
    y.amount += h.amount;
  });
  return Array.from(byYear.values())
    .sort((a, b) => a.year - b.year)
    .map(withVoucherFinancials);
}

/* Fake/demo data — commented out along with MembershipTab until real
   membership numbers are available.
function withMembershipFinancials(plan) {
  const gross = plan.price * plan.activeMembers;
  const net = gross - plan.couponValue;
  const gst = gstOf(net);
  return { ...plan, gross, net, gst, payable: net + gst };
}
*/

/* -------------------------------------------------------------------------
 * Shared bits
 * ---------------------------------------------------------------------- */

const KPI_TINT_HEX = { emerald: "#2FDE8C", amber: "#FBBF24", sky: "#38BDF8", pink: "#F472B6" };

function KpiCard({ icon: Icon, label, value, delta, tint = "emerald", trend, dataKey }) {
  const tints = {
    emerald: "bg-emerald-400/10 text-emerald-400",
    amber: "bg-amber-400/10 text-amber-400",
    sky: "bg-sky-400/10 text-sky-400",
    pink: "bg-pink-400/10 text-pink-400",
  };
  const positive = delta === undefined || delta >= 0;
  const sparkColor = KPI_TINT_HEX[tint] || KPI_TINT_HEX.emerald;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="mb-2.5 flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tints[tint]}`}>
          <Icon size={16} />
        </span>
        {delta !== undefined && (
          <span
            className={`flex items-center gap-1 text-[11px] font-bold ${
              positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-neutral-500">{label}</p>
      {trend && trend.length > 1 && (
        <div className="mt-2 h-9">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`kpi-spark-${dataKey}-${tint}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="natural"
                dataKey={dataKey}
                stroke={sparkColor}
                strokeWidth={1.6}
                fill={`url(#kpi-spark-${dataKey}-${tint})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label, currency = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-[11.5px] shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
      <p className="mb-1 text-neutral-500">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {currency ? formatCurrency(p.value) : formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            value === opt ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* Simple dropdown reused for the brand filter on the Settlements tab */
function DropdownFilter({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const active = value !== options[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
          active
            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700"
        }`}
      >
        <SlidersHorizontal size={14} />
        {value === options[0] ? label : value}
        {active && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(options[0]);
            }}
            className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 hover:bg-emerald-400/30"
          >
            <X size={10} />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {opt}
                {value === opt && <Check size={14} className="text-emerald-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Overview tab
 * ---------------------------------------------------------------------- */

function OverviewTab() {
  const { brands } = useBrands();
  const totalBrands = brands.length;
  const activeBrands = brands.filter((b) => b.active).length;
  const inactiveBrands = totalBrands - activeBrands;

  const latest = MONTHS.length - 1;
  const prev = latest - 1;

  const kpis = [
    {
      icon: Users,
      label: "Active Customers (Jul)",
      value: formatNumber(monthTotal("customers", latest)),
      delta: pctChange(monthTotal("customers", latest), monthTotal("customers", prev)),
      tint: "emerald",
      trend: COMBINED_TREND,
      dataKey: "customers",
    },
    {
      icon: Tag,
      label: "Vouchers Redeemed (Jul)",
      value: formatNumber(monthTotal("vouchers", latest)),
      delta: pctChange(monthTotal("vouchers", latest), monthTotal("vouchers", prev)),
      tint: "amber",
      trend: COMBINED_TREND,
      dataKey: "vouchers",
    },
    // {
    //   icon: Sparkles,
    //   label: "Deals & Packs Used (Jul)",
    //   value: formatNumber(monthTotal("dealsPack", latest)),
    //   delta: pctChange(monthTotal("dealsPack", latest), monthTotal("dealsPack", prev)),
    //   tint: "sky",
    // },
    // {
    //   icon: BadgeCheck,
    //   label: "Active Memberships (Jul)",
    //   value: formatNumber(monthTotal("memberships", latest)),
    //   delta: pctChange(monthTotal("memberships", latest), monthTotal("memberships", prev)),
    //   tint: "pink",
    // },
    {
      icon: FileText,
      label: "Transactions (Jul)",
      value: formatNumber(monthTotal("transactions", latest)),
      delta: pctChange(monthTotal("transactions", latest), monthTotal("transactions", prev)),
      tint: "emerald",
      trend: COMBINED_TREND,
      dataKey: "transactions",
    },
    {
      icon: CreditCard,
      label: "Revenue (Jul)",
      value: formatCurrency(monthTotal("revenue", latest)),
      delta: pctChange(monthTotal("revenue", latest), monthTotal("revenue", prev)),
      tint: "amber",
      trend: COMBINED_TREND,
      dataKey: "revenue",
    },
  ];

  const topBrands = [...BRAND_TOTALS].sort((a, b) => b.revenue - a.revenue).slice(0, 4);

  const registrationKpis = [
    {
      icon: Users,
      label: "Brand Onboarded",
      value: formatNumber(REGISTRATION_STATS.totalVendorsRegistered),
      tint: "sky",
    },
    // {
    //   icon: BadgeCheck,
    //   label: "All Brands",
    //   value: formatNumber(totalBrands),
    //   tint: "emerald",
    // },
    {
      icon: Check,
      label: "Active Brands",
      value: formatNumber(activeBrands),
      tint: "emerald",
    },
    {
      icon: AlertTriangle,
      label: "Pending Onboarding",
      value: formatNumber(inactiveBrands),
      tint: "amber",
    },
    {
      icon: Layers,
      label: "Subscription Plans",
      value: formatNumber(REGISTRATION_STATS.totalPlans),
      tint: "pink",
    },
  ];

  const billingLatest = BILLING_OVERVIEW[BILLING_OVERVIEW.length - 1];
  const billingPrev = BILLING_OVERVIEW[BILLING_OVERVIEW.length - 2];

  const billingKpis = [
    {
      icon: Receipt,
      label: "Bill Amount (Jul)",
      value: formatCurrency(billingLatest.billAmount),
      delta: pctChange(billingLatest.billAmount, billingPrev.billAmount),
      tint: "emerald",
    },
    {
      icon: Percent,
      label: "Discount Given (Jul)",
      value: formatCurrency(billingLatest.discount),
      delta: pctChange(billingLatest.discount, billingPrev.discount),
      tint: "amber",
    },
    {
      icon: Wallet,
      label: "Platform Fee Earned (Jul)",
      value: formatCurrency(billingLatest.platformFee),
      delta: pctChange(billingLatest.platformFee, billingPrev.platformFee),
      tint: "sky",
    },
    // {
    //   icon: Gift,
    //   label: "Trydood Discount Borne (Jul)",
    //   value: formatCurrency(billingLatest.trydoodDiscount),
    //   delta: pctChange(billingLatest.trydoodDiscount, billingPrev.trydoodDiscount),
    //   tint: "pink",
    // },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          BRAND ONBOARDING OVERVIEW
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {registrationKpis.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <p className="mb-1 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">Brand Status</p>
            <div className="flex items-center gap-3">
              <div className="relative h-[92px] w-[92px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Active", value: activeBrands },
                        { name: "Inactive", value: inactiveBrands },
                      ].filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={28}
                      outerRadius={44}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      <Cell fill="#2FDE8C" stroke="none" />
                      <Cell fill="#FBBF24" stroke="none" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[14px] font-bold text-neutral-900 dark:text-neutral-50">{totalBrands}</span>
                  <span className="text-[8.5px] text-neutral-500">Brands</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 text-[11.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-neutral-500">Active</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-50">{activeBrands}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <span className="min-w-0 flex-1 truncate text-neutral-500">Inactive</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-50">{inactiveBrands}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          This Month (Jul 2026)
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          Billing Overview
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {billingKpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <Receipt size={15} className="text-emerald-600 dark:text-emerald-400" /> Bill Amount, Discount &amp; Fees Trend
          </div>
          <span className="text-[12px] text-neutral-500">Last 6 months · all brands</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={BILLING_OVERVIEW} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip currency />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8C9A91" }} />
            <Bar dataKey="billAmount" name="Bill Amount" fill="#2FDE8C" radius={[6, 6, 0, 0]} />
            <Bar dataKey="discount" name="Discount" fill="#FBBF24" radius={[6, 6, 0, 0]} />
            <Bar dataKey="platformFee" name="Platform Fee" fill="#38BDF8" radius={[6, 6, 0, 0]} />
            <Bar dataKey="trydoodDiscount" name="Trydood Discount" fill="#F472B6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <BarChart3 size={15} className="text-emerald-600 dark:text-emerald-400" /> Revenue &amp; Transactions Trend
          </div>
          <span className="text-[12px] text-neutral-500">Last 6 months · all brands</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={COMBINED_TREND} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2FDE8C" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#2FDE8C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="txnFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8C9A91" }} />
            <Area
              yAxisId="left"
              type="natural"
              dataKey="revenue"
              name="Revenue"
              stroke="#2FDE8C"
              strokeWidth={2.2}
              fill="url(#revFill)"
            />
            <Area
              yAxisId="right"
              type="natural"
              dataKey="transactions"
              name="Transactions"
              stroke="#38BDF8"
              strokeWidth={2.2}
              fill="url(#txnFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <Store size={15} className="text-emerald-600 dark:text-emerald-400" /> Top Performing Brands
          </div>
          <span className="text-[12px] text-neutral-500">By July revenue</span>
        </div>
        <div className="space-y-2.5">
          {topBrands.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-3.5 py-2.5 dark:border-neutral-800/80 dark:bg-neutral-950/60"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-200 text-[11.5px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{b.name}</p>
                  <p className="text-[11px] text-neutral-500">{b.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(b.revenue)}</p>
                <span
                  className={`flex items-center justify-end gap-1 text-[11px] font-medium ${
                    b.revenueChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {b.revenueChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {Math.abs(b.revenueChange).toFixed(1)}% MoM
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Brand Analytics tab
 * ---------------------------------------------------------------------- */

function BrandAnalyticsTab() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(BRAND_ANALYTICS[0]?.id ?? null);

  const rows = BRAND_TOTALS.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
  );

  const expandedBrand = BRAND_ANALYTICS.find((b) => b.id === expandedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-sm">
        <Search size={16} className="shrink-0 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brand or category..."
          className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
        />
      </div>

      <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 text-right font-medium">Customers</th>
              <th className="px-4 py-3 text-right font-medium">Vouchers Used</th>
              {/* Fake/demo data — commented out until real deal-pack &
                  membership usage numbers are available. Re-add when wired
                  to a real endpoint.
              <th className="px-4 py-3 text-right font-medium">Deals/Pack Used</th>
              <th className="px-4 py-3 text-right font-medium">Memberships</th>
              */}
              <th className="px-4 py-3 text-right font-medium">Transactions</th>
              <th className="px-4 py-3 text-right font-medium">Revenue</th>
              <th className="px-4 py-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="bg-neutral-50 dark:bg-neutral-950">
            {rows.map((b) => (
              <React.Fragment key={b.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className={`cursor-pointer transition-colors hover:bg-white dark:hover:bg-neutral-900/60 ${
                    expandedId === b.id ? "bg-white dark:bg-neutral-900/60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900 dark:text-neutral-50">{b.name}</p>
                    <p className="text-[11px] text-neutral-500">{b.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(b.customers)}</td>
                  <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(b.vouchers)}</td>
                  {/*
                  <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(b.dealsPack)}</td>
                  <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(b.memberships)}</td>
                  */}
                  <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(b.transactions)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
                    {formatCurrency(b.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[11.5px] font-semibold ${
                        b.revenueChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {b.revenueChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(b.revenueChange).toFixed(1)}%
                      <ChevronDown
                        size={13}
                        className={`ml-1 text-neutral-500 transition-transform ${
                          expandedId === b.id ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </td>
                </tr>

                {expandedId === b.id && expandedBrand && (
                  <tr>
                    <td colSpan={6} className="bg-neutral-50 px-4 pb-5 pt-1 dark:bg-neutral-950">
                      <BrandTrendPanel brand={expandedBrand} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  No brands match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrandTrendPanel({ brand }) {
  const usageBreakdown = brand.monthly.map((m) => ({
    month: m.month,
    Vouchers: m.vouchers,
    // Fake/demo data — commented out until real deal-pack & membership
    // usage numbers are available. Re-add when wired to a real endpoint.
    // "Deals/Pack": m.dealsPack,
    // Memberships: m.memberships,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          Customers &amp; Transactions
        </p>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={brand.monthly} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={`cust-${brand.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2FDE8C" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#2FDE8C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fill: "#8C9A91", fontSize: 10.5 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="natural" dataKey="customers" name="Customers" stroke="#2FDE8C" strokeWidth={2} fill={`url(#cust-${brand.id})`} />
            <Area type="natural" dataKey="transactions" name="Transactions" stroke="#38BDF8" strokeWidth={2} fillOpacity={0} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          Voucher Usage
        </p>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={usageBreakdown} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: "#8C9A91", fontSize: 10.5 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#8C9A91" }} />
            <Bar dataKey="Vouchers" fill="#FBBF24" radius={[3, 3, 0, 0]} />
            {/* Fake/demo data — commented out until real deal-pack &
                membership usage numbers are available. Re-add when wired
                to a real endpoint.
            <Bar dataKey="Deals/Pack" fill="#38BDF8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Memberships" fill="#F472B6" radius={[3, 3, 0, 0]} />
            */}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Deal Pack tab — items sold, discount, coupon and 18% GST breakdown,
 * per month or per year.
 * ---------------------------------------------------------------------- */

/* Fake/demo data — commented out until real deal-pack usage numbers are
   available. Re-add (and restore its REPORT_TABS entry + tab-render line)
   once wired to a real endpoint.
function DealPackTab() {
  const [period, setPeriod] = useState("Month");

  const monthly = DEALPACK_HISTORY.map((h) =>
    withDealPackFinancials({ ...h, label: `${h.month} '${String(h.year).slice(2)}` })
  );
  const yearly = aggregateDealPacksByYear(DEALPACK_HISTORY);

  const latest = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];
  const ytd2026 = yearly.find((y) => y.year === 2026);
  const fy2025 = yearly.find((y) => y.year === 2025);

  const kpis = [
    {
      icon: Package,
      label: "Items Sold (Jul)",
      value: formatNumber(latest.itemsSold),
      delta: pctChange(latest.itemsSold, prevMonth.itemsSold),
      tint: "sky",
    },
    {
      icon: Receipt,
      label: "Items Total (Jul)",
      value: formatCurrency(latest.itemsTotal),
      delta: pctChange(latest.itemsTotal, prevMonth.itemsTotal),
      tint: "emerald",
    },
    {
      icon: Percent,
      label: "Discount + Coupon (Jul)",
      value: formatCurrency(latest.discount + latest.coupon),
      delta: pctChange(latest.discount + latest.coupon, prevMonth.discount + prevMonth.coupon),
      tint: "amber",
    },
    {
      icon: Wallet,
      label: `GST Collected (${GST_RATE}%, Jul)`,
      value: formatCurrency(latest.gst),
      delta: pctChange(latest.gst, prevMonth.gst),
      tint: "pink",
    },
  ];

  const data = period === "Month" ? monthly : yearly;
  const xKey = period === "Month" ? "label" : "year";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-[12.5px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">2026 YTD:</span> {formatCurrency(ytd2026.netAmount)} net
        payable vs <span className="font-semibold text-neutral-800 dark:text-neutral-200">FY 2025:</span> {formatCurrency(fy2025.netAmount)}{" "}
        <span
          className={`ml-1 font-semibold ${
            pctChange(ytd2026.netAmount, fy2025.netAmount) >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          ({pctChange(ytd2026.netAmount, fy2025.netAmount) >= 0 ? "+" : ""}
          {pctChange(ytd2026.netAmount, fy2025.netAmount).toFixed(1)}%)
        </span>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <Package size={15} className="text-emerald-400" /> Deal Pack Amount by {period}
          </div>
          <SegmentedControl options={["Month", "Year"]} value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#8C9A91", fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
              interval={period === "Month" ? 1 : 0}
            />
            <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip currency />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8C9A91" }} />
            <Bar dataKey="taxable" name="Taxable Value" stackId="a" fill="#2FDE8C" radius={[0, 0, 0, 0]} />
            <Bar dataKey="discount" name="Discount" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
            <Bar dataKey="coupon" name="Coupon" stackId="a" fill="#F472B6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="gst" name={`GST (${GST_RATE}%)`} stackId="a" fill="#38BDF8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{period === "Month" ? "Month" : "Year"}</th>
              <th className="px-4 py-3 text-right font-medium">Items Sold</th>
              <th className="px-4 py-3 text-right font-medium">Items Total</th>
              <th className="px-4 py-3 text-right font-medium">Discount</th>
              <th className="px-4 py-3 text-right font-medium">Coupon Applied</th>
              <th className="px-4 py-3 text-right font-medium">GST ({GST_RATE}%)</th>
              <th className="px-4 py-3 text-right font-medium">Net Payable</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-950">
            {data.map((row) => (
              <tr key={period === "Month" ? row.label : row.year} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">{period === "Month" ? row.label : row.year}</td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.itemsSold)}</td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatCurrency(row.itemsTotal)}</td>
                <td className="px-4 py-3 text-right text-amber-400">-{formatCurrency(row.discount)}</td>
                <td className="px-4 py-3 text-right text-pink-400">-{formatCurrency(row.coupon)}</td>
                <td className="px-4 py-3 text-right text-sky-400">+{formatCurrency(row.gst)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(row.netAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
*/

/* Fake/demo data — commented out until real membership usage numbers are
   available. Re-add (and restore its REPORT_TABS entry + tab-render line)
   once wired to a real endpoint.
function MembershipTab() {
  const plans = MEMBERSHIP_PLANS.map(withMembershipFinancials);
  const totalActive = plans.reduce((s, p) => s + p.activeMembers, 0);
  const totalGross = plans.reduce((s, p) => s + p.gross, 0);
  const totalCoupon = plans.reduce((s, p) => s + p.couponValue, 0);
  const totalGst = plans.reduce((s, p) => s + p.gst, 0);
  const totalPayable = plans.reduce((s, p) => s + p.payable, 0);

  const pieData = plans.map((p) => ({ name: p.name, value: p.activeMembers }));

  const kpis = [
    { icon: Users, label: "Active Members", value: formatNumber(totalActive), tint: "emerald" },
    { icon: Receipt, label: "Gross Plan Revenue", value: formatCurrency(totalGross), tint: "sky" },
    { icon: Tag, label: "Coupons Applied (Value)", value: formatCurrency(totalCoupon), tint: "amber" },
    { icon: Wallet, label: `GST Collected (${GST_RATE}%)`, value: formatCurrency(totalGst), tint: "pink" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <div key={p.name} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2.5 flex items-center justify-between">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${PLAN_COLORS[p.name]}1A`, color: PLAN_COLORS[p.name] }}
              >
                <Layers size={16} />
              </span>
              <span className="text-[11px] font-semibold text-neutral-500">
                {((p.activeMembers / totalActive) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{formatNumber(p.activeMembers)}</p>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              Active on {p.name} · ₹{p.price.toLocaleString("en-IN")}/yr
            </p>
            <div className="mt-3 space-y-1 border-t border-neutral-200 pt-3 text-[11.5px] dark:border-neutral-800">
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Coupons Applied</span>
                <span className="text-pink-600 dark:text-pink-400">-{formatCurrency(p.couponValue)} ({p.couponsApplied})</span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>GST ({GST_RATE}%)</span>
                <span className="text-sky-600 dark:text-sky-400">+{formatCurrency(p.gst)}</span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-900 dark:text-neutral-100">
                <span>Net Payable</span>
                <span>{formatCurrency(p.payable)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
              <BarChart3 size={15} className="text-emerald-400" /> Active Members per Plan
            </div>
            <span className="text-[12px] text-neutral-500">{formatNumber(totalActive)} total active</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={plans} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="activeMembers" name="Active Members" radius={[6, 6, 0, 0]}>
                {plans.map((p) => (
                  <Cell key={p.name} fill={PLAN_COLORS[p.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <Layers size={15} className="text-emerald-400" /> Plan Distribution
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {pieData.map((p) => (
                  <Cell key={p.name} fill={PLAN_COLORS[p.name]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11.5, color: "#8C9A91" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[780px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 text-right font-medium">Plan Price / Year</th>
              <th className="px-4 py-3 text-right font-medium">Active Members</th>
              <th className="px-4 py-3 text-right font-medium">Gross Revenue</th>
              <th className="px-4 py-3 text-right font-medium">Coupons Applied</th>
              <th className="px-4 py-3 text-right font-medium">GST ({GST_RATE}%)</th>
              <th className="px-4 py-3 text-right font-medium">Net Payable</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-950">
            {plans.map((p) => (
              <tr key={p.name} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PLAN_COLORS[p.name] }} />
                    {p.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">₹{p.price.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(p.activeMembers)}</td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatCurrency(p.gross)}</td>
                <td className="px-4 py-3 text-right text-pink-400">
                  -{formatCurrency(p.couponValue)} ({p.couponsApplied})
                </td>
                <td className="px-4 py-3 text-right text-sky-400">+{formatCurrency(p.gst)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(p.payable)}</td>
              </tr>
            ))}
            <tr className="bg-neutral-900/60">
              <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">Total</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatNumber(totalActive)}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalGross)}</td>
              <td className="px-4 py-3 text-right font-semibold text-pink-400">-{formatCurrency(totalCoupon)}</td>
              <td className="px-4 py-3 text-right font-semibold text-sky-400">+{formatCurrency(totalGst)}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalPayable)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
*/

/* -------------------------------------------------------------------------
 * Voucher tab — redemption value per month and per year
 * ---------------------------------------------------------------------- */

function VouchersTab() {
  const [period, setPeriod] = useState("Month");

  const monthly = VOUCHER_HISTORY.map((h) =>
    withVoucherFinancials({ ...h, label: `${h.month} '${String(h.year).slice(2)}` })
  );
  const yearly = aggregateVouchersByYear(VOUCHER_HISTORY);

  const latest = withVoucherFinancials(VOUCHER_HISTORY[VOUCHER_HISTORY.length - 1]);
  const prevMonth = withVoucherFinancials(VOUCHER_HISTORY[VOUCHER_HISTORY.length - 2]);
  const ytd2026 = yearly.find((y) => y.year === 2026);
  const fy2025 = yearly.find((y) => y.year === 2025);

  const avgDiscount = latest.amount / latest.count;

  const kpis = [
    {
      icon: Tag,
      label: "Vouchers Redeemed (Jul)",
      value: formatNumber(latest.count),
      delta: pctChange(latest.count, prevMonth.count),
      tint: "amber",
    },
    {
      icon: CreditCard,
      label: "Voucher Value (Jul)",
      value: formatCurrency(latest.amount),
      delta: pctChange(latest.amount, prevMonth.amount),
      tint: "emerald",
    },
    {
      icon: Sparkles,
      label: "Avg. Discount / Voucher",
      value: formatCurrency(avgDiscount),
      tint: "sky",
    },
    {
      icon: TrendingUp,
      label: "2026 YTD vs FY 2025",
      value: `${formatCurrency(ytd2026.amount)}`,
      delta: pctChange(ytd2026.amount, fy2025.amount),
      tint: "pink",
    },
  ];

  const billingKpis = [
    {
      icon: Receipt,
      label: "Bill Amount (Jul)",
      value: formatCurrency(latest.billAmount),
      delta: pctChange(latest.billAmount, prevMonth.billAmount),
      tint: "emerald",
    },
    {
      icon: Wallet,
      label: "Platform Fee (Jul)",
      value: formatCurrency(latest.platformFee),
      delta: pctChange(latest.platformFee, prevMonth.platformFee),
      tint: "sky",
    },
    // {
    //   icon: Gift,
    //   label: "Trydood Discount Borne (Jul)",
    //   value: formatCurrency(latest.trydoodDiscount),
    //   delta: pctChange(latest.trydoodDiscount, prevMonth.trydoodDiscount),
    //   tint: "pink",
    // },
  ];

  const data = period === "Month" ? monthly : yearly;
  const xKey = period === "Month" ? "label" : "year";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          Billing Breakdown
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {billingKpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <Tag size={15} className="text-emerald-400" /> Voucher Amount by {period}
          </div>
          <SegmentedControl options={["Month", "Year"]} value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="voucherFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#8C9A91", fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
              interval={period === "Month" ? 1 : 0}
            />
            <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip currency />} />
            <Area type="natural" dataKey="amount" name="Voucher Amount" stroke="#FBBF24" strokeWidth={2.2} fill="url(#voucherFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <Receipt size={15} className="text-emerald-400" /> Bill Amount, Platform Fee &amp; Trydood Discount by {period}
          </div>
          <span className="text-[12px] text-neutral-500">Derived from voucher value</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#8C9A91", fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
              interval={period === "Month" ? 1 : 0}
            />
            <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip currency />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8C9A91" }} />
            <Bar dataKey="billAmount" name="Bill Amount" fill="#2FDE8C" radius={[6, 6, 0, 0]} />
            <Bar dataKey="platformFee" name="Platform Fee" fill="#38BDF8" radius={[6, 6, 0, 0]} />
            <Bar dataKey="trydoodDiscount" name="Trydood Discount" fill="#F472B6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{period === "Month" ? "Month" : "Year"}</th>
              <th className="px-4 py-3 text-right font-medium">Vouchers Used</th>
              <th className="px-4 py-3 text-right font-medium">Voucher Amount</th>
              <th className="px-4 py-3 text-right font-medium">Avg. Discount</th>
              <th className="px-4 py-3 text-right font-medium">Bill Amount</th>
              <th className="px-4 py-3 text-right font-medium">Platform Fee</th>
              <th className="px-4 py-3 text-right font-medium">Trydood Discount</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-950">
            {data.map((row) => (
              <tr key={period === "Month" ? row.label : row.year} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">{period === "Month" ? row.label : row.year}</td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.count)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(row.amount)}</td>
                <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400">{formatCurrency(row.amount / row.count)}</td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatCurrency(row.billAmount)}</td>
                <td className="px-4 py-3 text-right text-sky-400">+{formatCurrency(row.platformFee)}</td>
                <td className="px-4 py-3 text-right text-pink-400">-{formatCurrency(row.trydoodDiscount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Transaction tab — checkout volume, success/failure split, and payment
 * method breakdown across the platform.
 * ---------------------------------------------------------------------- */

function TransactionTab() {
  const latest = TRANSACTION_HISTORY[TRANSACTION_HISTORY.length - 1];
  const prevMonth = TRANSACTION_HISTORY[TRANSACTION_HISTORY.length - 2];

  const successRate = (latest.success / latest.count) * 100;
  const prevSuccessRate = (prevMonth.success / prevMonth.count) * 100;
  const avgTicketSize = latest.amount / latest.count;
  const prevAvgTicketSize = prevMonth.amount / prevMonth.count;

  const kpis = [
    {
      icon: Repeat,
      label: "Total Transactions (Jul)",
      value: formatNumber(latest.count),
      delta: pctChange(latest.count, prevMonth.count),
      tint: "emerald",
    },
    {
      icon: CreditCard,
      label: "Transaction Value (Jul)",
      value: formatCurrency(latest.amount),
      delta: pctChange(latest.amount, prevMonth.amount),
      tint: "sky",
    },
    {
      icon: TrendingUp,
      label: "Success Rate (Jul)",
      value: `${successRate.toFixed(1)}%`,
      delta: successRate - prevSuccessRate,
      tint: "amber",
    },
    {
      icon: CircleSlash,
      label: "Failed Transactions (Jul)",
      value: formatNumber(latest.failed),
      delta: pctChange(latest.failed, prevMonth.failed),
      tint: "pink",
    },
  ];

  const totalMethodCount = PAYMENT_METHOD_SPLIT.reduce((s, m) => s + m.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 text-[12.5px] text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:text-neutral-400 dark:shadow-black/20">
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">Avg. ticket size (Jul):</span> {formatCurrency(avgTicketSize)}{" "}
        <span
          className={`ml-1 font-semibold ${
            pctChange(avgTicketSize, prevAvgTicketSize) >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          ({pctChange(avgTicketSize, prevAvgTicketSize) >= 0 ? "+" : ""}
          {pctChange(avgTicketSize, prevAvgTicketSize).toFixed(1)}% vs Jun)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
              <Repeat size={15} className="text-emerald-400" /> Success vs Failed Transactions
            </div>
            <span className="text-[12px] text-neutral-500">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={TRANSACTION_HISTORY} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#8C9A91" }} />
              <Bar dataKey="success" name="Success" stackId="a" fill="#2FDE8C" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" name="Failed" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className="mb-4 flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <Smartphone size={15} className="text-emerald-400" /> Payment Method Split
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={PAYMENT_METHOD_SPLIT}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {PAYMENT_METHOD_SPLIT.map((m) => (
                  <Cell key={m.name} fill={m.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            {PAYMENT_METHOD_SPLIT.map((m) => (
              <div key={m.name} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                  {m.name}
                </span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {((m.value / totalMethodCount) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
          <BarChart3 size={15} className="text-emerald-400" /> Transaction Value Trend
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={TRANSACTION_HISTORY} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="txnValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip currency />} />
            <Area type="natural" dataKey="amount" name="Transaction Value" stroke="#38BDF8" strokeWidth={2.2} fill="url(#txnValueFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
        <table className="w-full min-w-[680px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Success</th>
              <th className="px-4 py-3 text-right font-medium">Failed</th>
              <th className="px-4 py-3 text-right font-medium">Success Rate</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-950">
            {TRANSACTION_HISTORY.map((row) => (
              <tr key={row.month} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">{row.month}</td>
                <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.count)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatNumber(row.success)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatNumber(row.failed)}</td>
                <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400">
                  {((row.success / row.count) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Settlement Analytics tab
 * ---------------------------------------------------------------------- */

function SettlementAnalyticsTab() {
  const [period, setPeriod] = useState("Month");
  const [brandFilter, setBrandFilter] = useState("All Brands");

  const brandOptions = useMemo(
    () => ["All Brands", ...Array.from(new Set(SETTLEMENTS.map((s) => s.brand)))],
    []
  );

  const buckets = useMemo(
    () => aggregateSettlements(SETTLEMENTS, period, brandFilter),
    [period, brandFilter]
  );

  const filteredRecords =
    brandFilter === "All Brands" ? SETTLEMENTS : SETTLEMENTS.filter((r) => r.brand === brandFilter);

  const totals = filteredRecords.reduce(
    (acc, r) => {
      acc.total += r.amount;
      acc.count += 1;
      if (r.status === "Paid") acc.paid += r.amount;
      if (r.status === "Pending") acc.pending += r.amount;
      if (r.status === "Failed") acc.failed += r.amount;
      return acc;
    },
    { total: 0, paid: 0, pending: 0, failed: 0, count: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />
        <DropdownFilter label="Filter by Brand" value={brandFilter} options={brandOptions} onChange={setBrandFilter} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Landmark} label="Total Settled (Paid)" value={formatCurrency(totals.paid)} tint="emerald" />
        <KpiCard icon={Calendar} label="Pending Settlement" value={formatCurrency(totals.pending)} tint="amber" />
        <KpiCard icon={X} label="Failed Settlement" value={formatCurrency(totals.failed)} tint="pink" />
        <KpiCard icon={FileText} label="Total Settlement Records" value={formatNumber(totals.count)} tint="sky" />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <BarChart3 size={15} className="text-emerald-400" /> Settlement Amount by {period}
          </div>
          <span className="text-[12px] text-neutral-500">{brandFilter}</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={buckets} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232B26" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip currency />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8C9A91" }} />
            <Bar dataKey="paid" name="Paid" stackId="a" fill="#2FDE8C" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pending" name="Pending" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
            <Bar dataKey="failed" name="Failed" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{period}</th>
              <th className="px-4 py-3 text-right font-medium">Paid</th>
              <th className="px-4 py-3 text-right font-medium">Pending</th>
              <th className="px-4 py-3 text-right font-medium">Failed</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Records</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-950">
            {buckets.map((b) => (
              <tr key={b.key} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">{b.label}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(b.paid)}</td>
                <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(b.pending)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatCurrency(b.failed)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(b.total)}</td>
                <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400">{b.count}</td>
              </tr>
            ))}
            {buckets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  No settlements in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function AnalyticsReport() {
  const [tab, setTab] = useState("Overview");

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              <BarChart3 size={20} className="text-emerald-400" />
              Analytics Report
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Customer activity, billing breakdown, and settlement performance across brands.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11.5px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <ArrowUpRight size={12} className="text-emerald-400" />
            Data through Jul 2026
          </span>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
          {REPORT_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                tab === t ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab />}
        {tab === "Brand" && <BrandAnalyticsTab />}
        {tab === "Voucher" && <VouchersTab />}
        {/* Fake/demo data — commented out until real deal-pack & membership
            data is available. REPORT_TABS no longer offers these tabs;
            re-add both once wired to a real endpoint.
        {tab === "Deal Pack" && <DealPackTab />}
        {tab === "Membership" && <MembershipTab />}
        */}
        {tab === "Transaction" && <TransactionTab />}
        {tab === "Settlements" && <SettlementAnalyticsTab />}
      </div>
    </div>
  );
}