import { CheckCircle2, Clock3, ShieldCheck, Store, Undo2, XCircle } from "lucide-react";
import { localDateStr } from "../../utils/overviewStats";

/* -------------------------------------------------------------------------
 * Real data for the Dashboard's "Revenue this week" tile and "Recent
 * Activity" feed (they used to be hand-set samples).
 *
 *   payments — normalized GET /voucher-claims/payments rows
 *              (normalizeClaimPayment in transaction/transactionUtils.js)
 *   brands   — BrandContext (approved brands, with joinedDate)
 *   pending  — raw GET /brands/admin/verifications rows awaiting review
 * Plain module (no JSX).
 * ---------------------------------------------------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Last 7 days (oldest → today) of successful-payment revenue, plus this
 *  week vs the 7 days before it and this week's payment success rate. */
export function buildWeekRevenue(payments, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    return { key: localDateStr(d), d: d.toLocaleDateString("en-IN", { weekday: "short" }), revenue: 0, transactions: 0 };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
  const prevStart = weekStart - 7 * DAY_MS;

  let prevRevenue = 0;
  let weekAll = 0;
  let weekSuccess = 0;
  payments.forEach((p) => {
    const t = p.ts ? new Date(p.ts).getTime() : NaN;
    if (Number.isNaN(t)) return;
    const ok = p.status === "Success";
    const day = byKey.get(p.date);
    if (day) {
      weekAll += 1;
      if (ok) {
        weekSuccess += 1;
        day.revenue += p.amount;
        day.transactions += 1;
      }
    } else if (ok && t >= prevStart && t < weekStart) {
      prevRevenue += p.amount;
    }
  });

  const revenue = days.reduce((s, d) => s + d.revenue, 0);
  return {
    days,
    revenue,
    transactions: weekSuccess,
    // null = nothing last week to compare against
    change: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
    successRate: weekAll ? (weekSuccess / weekAll) * 100 : null,
  };
}

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const PAYMENT_EVENT = {
  Success: { icon: CheckCircle2, tint: "emerald", verb: (p) => `${p.customer} paid ${inr(p.amount)}`, sign: "+" },
  Pending: { icon: Clock3, tint: "amber", verb: (p) => `payment of ${inr(p.amount)} is pending`, sign: "" },
  Failed: { icon: XCircle, tint: "red", verb: (p) => `payment of ${inr(p.amount)} failed`, sign: "" },
  Refunded: { icon: Undo2, tint: "neutral", verb: (p) => `${inr(p.amount)} refunded to ${p.customer}`, sign: "−" },
};

/** Newest platform events across payments, new brands and onboarding
 *  submissions, merged and sorted by time. */
export function buildActivity({ payments = [], brands = [], pending = [] }, limit = 5) {
  const events = [];

  payments.forEach((p) => {
    const kind = PAYMENT_EVENT[p.status];
    if (!kind || !p.ts) return;
    events.push({
      id: `pay-${p.id}`,
      icon: kind.icon,
      tint: kind.tint,
      who: p.vendor !== "—" ? p.vendor : "A brand",
      what: kind.verb(p),
      amount: p.status === "Success" || p.status === "Refunded" ? `${kind.sign}${inr(p.amount)}` : null,
      amountTone: p.status === "Refunded" ? "neutral" : "emerald",
      at: p.ts,
      link: p.claimId && p.claimId !== "—" ? `/transaction/${p.claimId}` : "/transaction",
    });
  });

  brands.forEach((b) => {
    if (!b.joinedDate) return;
    events.push({
      id: `brand-${b.id}`,
      icon: Store,
      tint: "sky",
      who: b.brandName,
      what: "joined Trydood as a new brand",
      at: b.joinedDate,
      link: `/brands/${b.id}`,
    });
  });

  pending.forEach((v) => {
    const at = v.updatedAt || v.createdAt || v.submittedAt;
    if (!at) return;
    events.push({
      id: `review-${v._id}`,
      icon: ShieldCheck,
      tint: "amber",
      who: v.brand?.brandName || "A new brand",
      what: "submitted onboarding for review",
      at,
      link: "/brand-waiting",
    });
  });

  return events
    .filter((e) => !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

/** "just now", "6m ago", "3h ago", "2d ago", else "12 Oct". */
export function timeAgo(iso, now = Date.now()) {
  const diff = now - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
