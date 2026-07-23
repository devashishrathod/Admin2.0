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
  Package,
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

/* -------------------------------------------------------------------------
 * Mock data
 *
 * Six months of activity (Feb–Jul 2026) across six live brands. Every number
 * below is hand-set mock data — swap this block out for a real API response
 * and everything downstream (KPIs, charts, tables) keeps working unchanged.
 * ---------------------------------------------------------------------- */

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

const BRAND_ANALYTICS = [
  {
    id: 1,
    name: "Jr Unisex Salon",
    category: "Beauty & Personal Care",
    monthly: [
      { month: "Feb", customers: 210, transactions: 260, vouchers: 40, dealsPack: 22, memberships: 15, revenue: 68000 },
      { month: "Mar", customers: 230, transactions: 275, vouchers: 45, dealsPack: 25, memberships: 18, revenue: 71500 },
      { month: "Apr", customers: 245, transactions: 300, vouchers: 50, dealsPack: 28, memberships: 20, revenue: 79000 },
      { month: "May", customers: 260, transactions: 320, vouchers: 55, dealsPack: 30, memberships: 24, revenue: 84500 },
      { month: "Jun", customers: 275, transactions: 340, vouchers: 60, dealsPack: 33, memberships: 27, revenue: 90000 },
      { month: "Jul", customers: 290, transactions: 365, vouchers: 66, dealsPack: 36, memberships: 31, revenue: 96500 },
    ],
  },
  {
    id: 2,
    name: "Spice Route Kitchen",
    category: "Food & Beverage",
    monthly: [
      { month: "Feb", customers: 540, transactions: 820, vouchers: 120, dealsPack: 60, memberships: 30, revenue: 145000 },
      { month: "Mar", customers: 575, transactions: 880, vouchers: 130, dealsPack: 65, memberships: 34, revenue: 156000 },
      { month: "Apr", customers: 610, transactions: 940, vouchers: 142, dealsPack: 70, memberships: 38, revenue: 168000 },
      { month: "May", customers: 650, transactions: 1005, vouchers: 155, dealsPack: 76, memberships: 43, revenue: 182000 },
      { month: "Jun", customers: 690, transactions: 1075, vouchers: 168, dealsPack: 82, memberships: 48, revenue: 196500 },
      { month: "Jul", customers: 735, transactions: 1150, vouchers: 182, dealsPack: 89, memberships: 54, revenue: 212000 },
    ],
  },
  {
    id: 3,
    name: "GlowUp Cosmetics",
    category: "Beauty & Personal Care",
    monthly: [
      { month: "Feb", customers: 60, transactions: 75, vouchers: 10, dealsPack: 5, memberships: 3, revenue: 18000 },
      { month: "Mar", customers: 68, transactions: 85, vouchers: 12, dealsPack: 6, memberships: 4, revenue: 20500 },
      { month: "Apr", customers: 78, transactions: 98, vouchers: 14, dealsPack: 7, memberships: 5, revenue: 23800 },
      { month: "May", customers: 90, transactions: 112, vouchers: 17, dealsPack: 9, memberships: 6, revenue: 27200 },
      { month: "Jun", customers: 102, transactions: 128, vouchers: 20, dealsPack: 11, memberships: 8, revenue: 31000 },
      { month: "Jul", customers: 115, transactions: 145, vouchers: 23, dealsPack: 13, memberships: 10, revenue: 35200 },
    ],
  },
  {
    id: 4,
    name: "TechHub Electronics",
    category: "Electronics",
    monthly: [
      { month: "Feb", customers: 180, transactions: 140, vouchers: 15, dealsPack: 8, memberships: 10, revenue: 52000 },
      { month: "Mar", customers: 172, transactions: 132, vouchers: 14, dealsPack: 7, memberships: 9, revenue: 49500 },
      { month: "Apr", customers: 160, transactions: 120, vouchers: 12, dealsPack: 6, memberships: 8, revenue: 45000 },
      { month: "May", customers: 145, transactions: 105, vouchers: 10, dealsPack: 5, memberships: 6, revenue: 39500 },
      { month: "Jun", customers: 128, transactions: 90, vouchers: 8, dealsPack: 4, memberships: 5, revenue: 33800 },
      { month: "Jul", customers: 110, transactions: 75, vouchers: 6, dealsPack: 3, memberships: 3, revenue: 28200 },
    ],
  },
  {
    id: 5,
    name: "Bloom & Co Florist",
    category: "Retail",
    monthly: [
      { month: "Feb", customers: 95, transactions: 110, vouchers: 18, dealsPack: 9, memberships: 5, revenue: 26000 },
      { month: "Mar", customers: 105, transactions: 122, vouchers: 20, dealsPack: 10, memberships: 6, revenue: 29000 },
      { month: "Apr", customers: 118, transactions: 138, vouchers: 23, dealsPack: 12, memberships: 7, revenue: 33200 },
      { month: "May", customers: 132, transactions: 155, vouchers: 26, dealsPack: 14, memberships: 9, revenue: 38000 },
      { month: "Jun", customers: 148, transactions: 175, vouchers: 30, dealsPack: 16, memberships: 11, revenue: 43500 },
      { month: "Jul", customers: 165, transactions: 198, vouchers: 34, dealsPack: 19, memberships: 13, revenue: 49800 },
    ],
  },
  {
    id: 6,
    name: "FitZone Gym",
    category: "Wellness",
    monthly: [
      { month: "Feb", customers: 320, transactions: 180, vouchers: 20, dealsPack: 10, memberships: 140, revenue: 58000 },
      { month: "Mar", customers: 340, transactions: 195, vouchers: 22, dealsPack: 11, memberships: 152, revenue: 62500 },
      { month: "Apr", customers: 365, transactions: 212, vouchers: 25, dealsPack: 13, memberships: 166, revenue: 68000 },
      { month: "May", customers: 392, transactions: 232, vouchers: 28, dealsPack: 15, memberships: 182, revenue: 74500 },
      { month: "Jun", customers: 420, transactions: 255, vouchers: 32, dealsPack: 17, memberships: 200, revenue: 81800 },
      { month: "Jul", customers: 452, transactions: 280, vouchers: 36, dealsPack: 20, memberships: 220, revenue: 90000 },
    ],
  },
];

/* Raw settlement transactions — the source of truth for the Settlement
   Analytics tab. Grouping by week / month / year happens on the fly. */
const SETTLEMENTS = [
  { id: "STL-9001", brand: "Jr Unisex Salon", date: "2025-12-18", amount: 8200, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9002", brand: "Spice Route Kitchen", date: "2025-12-22", amount: 15400, status: "Paid", method: "UPI" },
  { id: "STL-9010", brand: "Jr Unisex Salon", date: "2026-01-10", amount: 9100, status: "Paid", method: "UPI" },
  { id: "STL-9011", brand: "Spice Route Kitchen", date: "2026-01-14", amount: 16800, status: "Paid", method: "Trydood Account" },
  { id: "STL-9020", brand: "GlowUp Cosmetics", date: "2026-04-02", amount: 4200, status: "Paid", method: "UPI" },
  { id: "STL-9021", brand: "TechHub Electronics", date: "2026-04-05", amount: 3100, status: "Failed", method: "Bank Transfer" },
  { id: "STL-9022", brand: "Bloom & Co Florist", date: "2026-04-09", amount: 5200, status: "Paid", method: "UPI" },
  { id: "STL-9023", brand: "FitZone Gym", date: "2026-04-12", amount: 12800, status: "Paid", method: "Trydood Account" },
  { id: "STL-9030", brand: "Jr Unisex Salon", date: "2026-04-18", amount: 9800, status: "Paid", method: "UPI" },
  { id: "STL-9031", brand: "Spice Route Kitchen", date: "2026-04-22", amount: 17600, status: "Pending", method: "Bank Transfer" },
  { id: "STL-9040", brand: "GlowUp Cosmetics", date: "2026-05-03", amount: 4600, status: "Paid", method: "UPI" },
  { id: "STL-9041", brand: "Bloom & Co Florist", date: "2026-05-07", amount: 5600, status: "Paid", method: "Trydood Account" },
  { id: "STL-9042", brand: "FitZone Gym", date: "2026-05-11", amount: 13500, status: "Paid", method: "UPI" },
  { id: "STL-9043", brand: "Jr Unisex Salon", date: "2026-05-16", amount: 10200, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9044", brand: "Spice Route Kitchen", date: "2026-05-20", amount: 18900, status: "Paid", method: "UPI" },
  { id: "STL-9045", brand: "TechHub Electronics", date: "2026-05-25", amount: 2900, status: "Failed", method: "Other" },
  { id: "STL-9050", brand: "GlowUp Cosmetics", date: "2026-06-02", amount: 4900, status: "Pending", method: "UPI" },
  { id: "STL-9051", brand: "Bloom & Co Florist", date: "2026-06-06", amount: 6100, status: "Paid", method: "UPI" },
  { id: "STL-9052", brand: "FitZone Gym", date: "2026-06-10", amount: 14200, status: "Paid", method: "Trydood Account" },
  { id: "STL-9053", brand: "Jr Unisex Salon", date: "2026-06-14", amount: 10800, status: "Paid", method: "UPI" },
  { id: "STL-9054", brand: "Spice Route Kitchen", date: "2026-06-19", amount: 19700, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9055", brand: "TechHub Electronics", date: "2026-06-24", amount: 3200, status: "Failed", method: "Bank Transfer" },
  { id: "STL-9060", brand: "GlowUp Cosmetics", date: "2026-07-01", amount: 5100, status: "Pending", method: "UPI" },
  { id: "STL-9061", brand: "Bloom & Co Florist", date: "2026-07-04", amount: 6400, status: "Paid", method: "UPI" },
  { id: "STL-9062", brand: "FitZone Gym", date: "2026-07-08", amount: 14800, status: "Paid", method: "Trydood Account" },
  { id: "STL-9063", brand: "Jr Unisex Salon", date: "2026-07-11", amount: 11200, status: "Paid", method: "UPI" },
  { id: "STL-9064", brand: "Spice Route Kitchen", date: "2026-07-14", amount: 20500, status: "Paid", method: "Bank Transfer" },
  { id: "STL-9065", brand: "TechHub Electronics", date: "2026-07-15", amount: 3400, status: "Pending", method: "Other" },
];

const REPORT_TABS = ["Overview", "Brand Analytics","Voucher",  "Deal Pack", "Membership", "Transaction", "Settlements"];
const PERIODS = ["Week", "Month", "Year"];
const GST_RATE = 18; // %

/* Vendor / brand registration snapshot — feeds the Overview KPI row.
   registeredBrands = completed onboarding (live, awaiting approval, or rejected).
   unregisteredBrands = dropped off mid-onboarding (the "Under Listing" bucket). */
const REGISTRATION_STATS = {
  totalVendorsRegistered: 342,
  registeredBrands: 268,
  unregisteredBrands: 74,
  totalPlans: 4,
};

/* Billing overview — the money view behind every transaction: what the
   customer was billed, how much was knocked off by discounts/coupons, how
   much Trydood earned as a platform fee, and how much Trydood itself
   subsidized as a promotional discount. */
const BILLING_OVERVIEW = [
  { month: "Feb", billAmount: 462000, discount: 38000, platformFee: 23100, trydoodDiscount: 12500 },
  { month: "Mar", billAmount: 498500, discount: 41200, platformFee: 24925, trydoodDiscount: 13400 },
  { month: "Apr", billAmount: 542000, discount: 45800, platformFee: 27100, trydoodDiscount: 14800 },
  { month: "May", billAmount: 589000, discount: 50100, platformFee: 29450, trydoodDiscount: 16200 },
  { month: "Jun", billAmount: 638500, discount: 55400, platformFee: 31925, trydoodDiscount: 17900 },
  { month: "Jul", billAmount: 692000, discount: 61200, platformFee: 34600, trydoodDiscount: 19600 },
];

/* Deal Pack redemption history — Jan 2025 through Jul 2026. Each record is a
   bundle of deal-pack items sold; discount + coupon come off the items total
   before 18% GST is calculated on the taxable value. */
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

/* Membership plans — each plan's price, active member count, and how much
   was knocked off by coupons this month, before 18% GST on the net amount. */
const MEMBERSHIP_PLANS = [
  { name: "Basic", price: 1999, activeMembers: 96, couponsApplied: 22, couponValue: 9800 },
  { name: "Advance", price: 2999, activeMembers: 74, couponsApplied: 15, couponValue: 11200 },
  { name: "Pro", price: 3999, activeMembers: 58, couponsApplied: 19, couponValue: 15400 },
  { name: "Pro Lite", price: 4999, activeMembers: 40, couponsApplied: 9, couponValue: 9000 },
];
const PLAN_COLORS = { Basic: "#2FDE8C", Advance: "#38BDF8", Pro: "#FBBF24", "Pro Lite": "#F472B6" };

/* Voucher redemption history — Jan 2025 through Jul 2026 — used by the
   dedicated Voucher tab for both the monthly trend and yearly comparison. */
const VOUCHER_HISTORY = [
  { year: 2025, month: "Jan", count: 140, amount: 25200 },
  { year: 2025, month: "Feb", count: 148, amount: 27000 },
  { year: 2025, month: "Mar", count: 156, amount: 28900 },
  { year: 2025, month: "Apr", count: 165, amount: 31000 },
  { year: 2025, month: "May", count: 174, amount: 33200 },
  { year: 2025, month: "Jun", count: 183, amount: 35400 },
  { year: 2025, month: "Jul", count: 193, amount: 37800 },
  { year: 2025, month: "Aug", count: 203, amount: 40200 },
  { year: 2025, month: "Sep", count: 214, amount: 42800 },
  { year: 2025, month: "Oct", count: 226, amount: 45600 },
  { year: 2025, month: "Nov", count: 239, amount: 48700 },
  { year: 2025, month: "Dec", count: 258, amount: 53200 },
  { year: 2026, month: "Jan", count: 245, amount: 50100 },
  { year: 2026, month: "Feb", count: 258, amount: 53000 },
  { year: 2026, month: "Mar", count: 274, amount: 56800 },
  { year: 2026, month: "Apr", count: 292, amount: 60900 },
  { year: 2026, month: "May", count: 312, amount: 65500 },
  { year: 2026, month: "Jun", count: 334, amount: 70600 },
  { year: 2026, month: "Jul", count: 358, amount: 76200 },
];

/* Transaction history — every checkout across the platform, per month, with
   a payment-method split and a success/failed breakdown. */
const TRANSACTION_HISTORY = [
  { month: "Feb", count: 1985, success: 1902, failed: 83, amount: 1041000 },
  { month: "Mar", count: 2118, success: 2034, failed: 84, amount: 1132500 },
  { month: "Apr", count: 2265, success: 2178, failed: 87, amount: 1234800 },
  { month: "May", count: 2432, success: 2341, failed: 91, amount: 1345600 },
  { month: "Jun", count: 2603, success: 2510, failed: 93, amount: 1462100 },
  { month: "Jul", count: 2790, success: 2694, failed: 96, amount: 1588200 },
];

const PAYMENT_METHOD_SPLIT = [
  { name: "UPI", value: 1520, color: "#2FDE8C" },
  { name: "Card", value: 640, color: "#38BDF8" },
  { name: "Wallet", value: 380, color: "#FBBF24" },
  { name: "Trydood Account", value: 250, color: "#F472B6" },
];

/* -------------------------------------------------------------------------
 * Small pure-logic helpers
 * ---------------------------------------------------------------------- */

const formatCurrency = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const formatNumber = (n) => Math.round(n).toLocaleString("en-IN");
const pctChange = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);
const gstOf = (taxableValue) => taxableValue * (GST_RATE / 100);

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

/* Adds derived taxable/GST/net fields to a raw deal-pack record */
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

/* Adds derived gross/net/GST fields to a membership plan record */
function withMembershipFinancials(plan) {
  const gross = plan.price * plan.activeMembers;
  const net = gross - plan.couponValue;
  const gst = gstOf(net);
  return { ...plan, gross, net, gst, payable: net + gst };
}

/* -------------------------------------------------------------------------
 * Shared bits
 * ---------------------------------------------------------------------- */

function KpiCard({ icon: Icon, label, value, delta, tint = "emerald" }) {
  const tints = {
    emerald: "bg-emerald-400/10 text-emerald-400",
    amber: "bg-amber-400/10 text-amber-400",
    sky: "bg-sky-400/10 text-sky-400",
    pink: "bg-pink-400/10 text-pink-400",
  };
  const positive = delta === undefined || delta >= 0;
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tints[tint]}`}>
          <Icon size={16} />
        </span>
        {delta !== undefined && (
          <span
            className={`flex items-center gap-1 text-[11px] font-bold ${
              positive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[20px] font-bold tracking-tight text-neutral-50">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-neutral-500">{label}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label, currency = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-[11.5px] shadow-xl shadow-black/40">
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
    <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            value === opt ? "bg-emerald-400 text-neutral-950" : "text-neutral-400 hover:text-neutral-200"
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
            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
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
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-300 transition-colors hover:bg-neutral-800"
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
  const latest = MONTHS.length - 1;
  const prev = latest - 1;

  const kpis = [
    {
      icon: Users,
      label: "Active Customers (Jul)",
      value: formatNumber(monthTotal("customers", latest)),
      delta: pctChange(monthTotal("customers", latest), monthTotal("customers", prev)),
      tint: "emerald",
    },
    {
      icon: Tag,
      label: "Vouchers Redeemed (Jul)",
      value: formatNumber(monthTotal("vouchers", latest)),
      delta: pctChange(monthTotal("vouchers", latest), monthTotal("vouchers", prev)),
      tint: "amber",
    },
    {
      icon: Sparkles,
      label: "Deals & Packs Used (Jul)",
      value: formatNumber(monthTotal("dealsPack", latest)),
      delta: pctChange(monthTotal("dealsPack", latest), monthTotal("dealsPack", prev)),
      tint: "sky",
    },
    {
      icon: BadgeCheck,
      label: "Active Memberships (Jul)",
      value: formatNumber(monthTotal("memberships", latest)),
      delta: pctChange(monthTotal("memberships", latest), monthTotal("memberships", prev)),
      tint: "pink",
    },
    {
      icon: FileText,
      label: "Transactions (Jul)",
      value: formatNumber(monthTotal("transactions", latest)),
      delta: pctChange(monthTotal("transactions", latest), monthTotal("transactions", prev)),
      tint: "emerald",
    },
    {
      icon: CreditCard,
      label: "Revenue (Jul)",
      value: formatCurrency(monthTotal("revenue", latest)),
      delta: pctChange(monthTotal("revenue", latest), monthTotal("revenue", prev)),
      tint: "amber",
    },
  ];

  const topBrands = [...BRAND_TOTALS].sort((a, b) => b.revenue - a.revenue).slice(0, 4);

  const registrationKpis = [
    {
      icon: Users,
      label: "Vendors Registered",
      value: formatNumber(REGISTRATION_STATS.totalVendorsRegistered),
      tint: "sky",
    },
    {
      icon: BadgeCheck,
      label: "Registered Brands",
      value: formatNumber(REGISTRATION_STATS.registeredBrands),
      tint: "emerald",
    },
    {
      icon: AlertTriangle,
      label: "Unregistered Brands",
      value: formatNumber(REGISTRATION_STATS.unregisteredBrands),
      tint: "amber",
    },
    {
      icon: Layers,
      label: "Subscription Plans Offered",
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
    {
      icon: Gift,
      label: "Trydood Discount Borne (Jul)",
      value: formatCurrency(billingLatest.trydoodDiscount),
      delta: pctChange(billingLatest.trydoodDiscount, billingPrev.trydoodDiscount),
      tint: "pink",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          Registration Overview
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {registrationKpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
            <Receipt size={15} className="text-emerald-400" /> Bill Amount, Discount &amp; Fees Trend
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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
            <BarChart3 size={15} className="text-emerald-400" /> Revenue &amp; Transactions Trend
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
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#2FDE8C"
              strokeWidth={2.2}
              fill="url(#revFill)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="transactions"
              name="Transactions"
              stroke="#38BDF8"
              strokeWidth={2.2}
              fill="url(#txnFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
            <Store size={15} className="text-emerald-400" /> Top Performing Brands
          </div>
          <span className="text-[12px] text-neutral-500">By July revenue</span>
        </div>
        <div className="space-y-2.5">
          {topBrands.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-neutral-800/80 bg-neutral-950/60 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-800 text-[11.5px] font-bold text-neutral-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-neutral-100">{b.name}</p>
                  <p className="text-[11px] text-neutral-500">{b.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-neutral-100">{formatCurrency(b.revenue)}</p>
                <span
                  className={`flex items-center justify-end gap-1 text-[11px] font-medium ${
                    b.revenueChange >= 0 ? "text-emerald-400" : "text-red-400"
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
      <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-sm">
        <Search size={16} className="shrink-0 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brand or category..."
          className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-neutral-900 text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 text-right font-medium">Customers</th>
              <th className="px-4 py-3 text-right font-medium">Vouchers Used</th>
              <th className="px-4 py-3 text-right font-medium">Deals/Pack Used</th>
              <th className="px-4 py-3 text-right font-medium">Memberships</th>
              <th className="px-4 py-3 text-right font-medium">Transactions</th>
              <th className="px-4 py-3 text-right font-medium">Revenue</th>
              <th className="px-4 py-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-950">
            {rows.map((b) => (
              <React.Fragment key={b.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className={`cursor-pointer transition-colors hover:bg-neutral-900/60 ${
                    expandedId === b.id ? "bg-neutral-900/60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-50">{b.name}</p>
                    <p className="text-[11px] text-neutral-500">{b.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(b.customers)}</td>
                  <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(b.vouchers)}</td>
                  <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(b.dealsPack)}</td>
                  <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(b.memberships)}</td>
                  <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(b.transactions)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-100">
                    {formatCurrency(b.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[11.5px] font-semibold ${
                        b.revenueChange >= 0 ? "text-emerald-400" : "text-red-400"
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
                    <td colSpan={8} className="bg-neutral-950 px-4 pb-5 pt-1">
                      <BrandTrendPanel brand={expandedBrand} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
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
    "Deals/Pack": m.dealsPack,
    Memberships: m.memberships,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 lg:grid-cols-2">
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
            <Area type="monotone" dataKey="customers" name="Customers" stroke="#2FDE8C" strokeWidth={2} fill={`url(#cust-${brand.id})`} />
            <Area type="monotone" dataKey="transactions" name="Transactions" stroke="#38BDF8" strokeWidth={2} fillOpacity={0} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
          Voucher / Deal-Pack / Membership Usage
        </p>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={usageBreakdown} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: "#8C9A91", fontSize: 10.5 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#8C9A91" }} />
            <Bar dataKey="Vouchers" fill="#FBBF24" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Deals/Pack" fill="#38BDF8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Memberships" fill="#F472B6" radius={[3, 3, 0, 0]} />
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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-[12.5px] text-neutral-400">
        <span className="font-semibold text-neutral-200">2026 YTD:</span> {formatCurrency(ytd2026.netAmount)} net
        payable vs <span className="font-semibold text-neutral-200">FY 2025:</span> {formatCurrency(fy2025.netAmount)}{" "}
        <span
          className={`ml-1 font-semibold ${
            pctChange(ytd2026.netAmount, fy2025.netAmount) >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          ({pctChange(ytd2026.netAmount, fy2025.netAmount) >= 0 ? "+" : ""}
          {pctChange(ytd2026.netAmount, fy2025.netAmount).toFixed(1)}%)
        </span>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="bg-neutral-900 text-[11px] uppercase tracking-wide text-neutral-500">
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
          <tbody className="divide-y divide-neutral-800 bg-neutral-950">
            {data.map((row) => (
              <tr key={period === "Month" ? row.label : row.year}>
                <td className="px-4 py-3 text-neutral-200">{period === "Month" ? row.label : row.year}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(row.itemsSold)}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{formatCurrency(row.itemsTotal)}</td>
                <td className="px-4 py-3 text-right text-amber-400">-{formatCurrency(row.discount)}</td>
                <td className="px-4 py-3 text-right text-pink-400">-{formatCurrency(row.coupon)}</td>
                <td className="px-4 py-3 text-right text-sky-400">+{formatCurrency(row.gst)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-100">
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

/* -------------------------------------------------------------------------
 * Membership tab — plan price, active members, coupons applied, and 18%
 * GST breakdown per plan.
 * ---------------------------------------------------------------------- */

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
          <div key={p.name} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
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
            <p className="text-[20px] font-bold tracking-tight text-neutral-50">{formatNumber(p.activeMembers)}</p>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              Active on {p.name} · ₹{p.price.toLocaleString("en-IN")}/yr
            </p>
            <div className="mt-3 space-y-1 border-t border-neutral-800 pt-3 text-[11.5px]">
              <div className="flex justify-between text-neutral-400">
                <span>Coupons Applied</span>
                <span className="text-pink-400">-{formatCurrency(p.couponValue)} ({p.couponsApplied})</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>GST ({GST_RATE}%)</span>
                <span className="text-sky-400">+{formatCurrency(p.gst)}</span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-100">
                <span>Net Payable</span>
                <span>{formatCurrency(p.payable)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full min-w-[780px] text-left text-[13px]">
          <thead className="bg-neutral-900 text-[11px] uppercase tracking-wide text-neutral-500">
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
          <tbody className="divide-y divide-neutral-800 bg-neutral-950">
            {plans.map((p) => (
              <tr key={p.name}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium text-neutral-100">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PLAN_COLORS[p.name] }} />
                    {p.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-neutral-300">₹{p.price.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(p.activeMembers)}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{formatCurrency(p.gross)}</td>
                <td className="px-4 py-3 text-right text-pink-400">
                  -{formatCurrency(p.couponValue)} ({p.couponsApplied})
                </td>
                <td className="px-4 py-3 text-right text-sky-400">+{formatCurrency(p.gst)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-100">{formatCurrency(p.payable)}</td>
              </tr>
            ))}
            <tr className="bg-neutral-900/60">
              <td className="px-4 py-3 font-semibold text-neutral-100">Total</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-semibold text-neutral-100">{formatNumber(totalActive)}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-100">{formatCurrency(totalGross)}</td>
              <td className="px-4 py-3 text-right font-semibold text-pink-400">-{formatCurrency(totalCoupon)}</td>
              <td className="px-4 py-3 text-right font-semibold text-sky-400">+{formatCurrency(totalGst)}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-100">{formatCurrency(totalPayable)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    {
      icon: Gift,
      label: "Trydood Discount Borne (Jul)",
      value: formatCurrency(latest.trydoodDiscount),
      delta: pctChange(latest.trydoodDiscount, prevMonth.trydoodDiscount),
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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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
            <Area type="monotone" dataKey="amount" name="Voucher Amount" stroke="#FBBF24" strokeWidth={2.2} fill="url(#voucherFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead className="bg-neutral-900 text-[11px] uppercase tracking-wide text-neutral-500">
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
          <tbody className="divide-y divide-neutral-800 bg-neutral-950">
            {data.map((row) => (
              <tr key={period === "Month" ? row.label : row.year}>
                <td className="px-4 py-3 text-neutral-200">{period === "Month" ? row.label : row.year}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(row.count)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-100">{formatCurrency(row.amount)}</td>
                <td className="px-4 py-3 text-right text-neutral-400">{formatCurrency(row.amount / row.count)}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{formatCurrency(row.billAmount)}</td>
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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-[12.5px] text-neutral-400">
        <span className="font-semibold text-neutral-200">Avg. ticket size (Jul):</span> {formatCurrency(avgTicketSize)}{" "}
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
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                  {m.name}
                </span>
                <span className="font-medium text-neutral-200">
                  {((m.value / totalMethodCount) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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
            <Area type="monotone" dataKey="amount" name="Transaction Value" stroke="#38BDF8" strokeWidth={2.2} fill="url(#txnValueFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full min-w-[680px] text-left text-[13px]">
          <thead className="bg-neutral-900 text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Success</th>
              <th className="px-4 py-3 text-right font-medium">Failed</th>
              <th className="px-4 py-3 text-right font-medium">Success Rate</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-950">
            {TRANSACTION_HISTORY.map((row) => (
              <tr key={row.month}>
                <td className="px-4 py-3 text-neutral-200">{row.month}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{formatNumber(row.count)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatNumber(row.success)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatNumber(row.failed)}</td>
                <td className="px-4 py-3 text-right text-neutral-400">
                  {((row.success / row.count) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-100">{formatCurrency(row.amount)}</td>
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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
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

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="bg-neutral-900 text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{period}</th>
              <th className="px-4 py-3 text-right font-medium">Paid</th>
              <th className="px-4 py-3 text-right font-medium">Pending</th>
              <th className="px-4 py-3 text-right font-medium">Failed</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Records</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-950">
            {buckets.map((b) => (
              <tr key={b.key}>
                <td className="px-4 py-3 text-neutral-200">{b.label}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(b.paid)}</td>
                <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(b.pending)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatCurrency(b.failed)}</td>
                <td className="px-4 py-3 text-right font-semibold text-neutral-100">{formatCurrency(b.total)}</td>
                <td className="px-4 py-3 text-right text-neutral-400">{b.count}</td>
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
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-neutral-50">
              <BarChart3 size={20} className="text-emerald-400" />
              Analytics Report
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Customer activity, billing breakdown, and settlement performance across brands.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11.5px] text-neutral-400">
            <ArrowUpRight size={12} className="text-emerald-400" />
            Data through Jul 2026
          </span>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 p-1.5">
          {REPORT_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                tab === t ? "bg-emerald-400 text-neutral-950" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab />}
        {tab === "Brand Analytics" && <BrandAnalyticsTab />}
        {tab === "Voucher" && <VouchersTab />}
        {tab === "Deal Pack" && <DealPackTab />}
        {tab === "Membership" && <MembershipTab />}
        
        {tab === "Transaction" && <TransactionTab />}
        {tab === "Settlements" && <SettlementAnalyticsTab />}
      </div>
    </div>
  );
}