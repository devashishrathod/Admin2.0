// Shared formatting helpers for the Transactions list + details pages.
// Kept in a plain module (no JSX) so neither page's fast-refresh boundary
// breaks from re-exporting non-component values alongside a component.

import { localDateStr } from "../../utils/overviewStats";

export function todayStr() {
  return localDateStr(new Date());
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Razorpay-style lowercase payment status → the 4 states this UI renders
// (Success / Refunded / Pending / Failed).
export function normalizeClaimStatus(raw) {
  const s = String(raw || "").toLowerCase();
  if (["captured", "authorized"].includes(s)) return "Success";
  if (s === "refunded") return "Refunded";
  if (["failed"].includes(s)) return "Failed";
  return "Pending";
}

// "netbanking" -> "Net Banking", "upi" -> "UPI", etc. — so the display text
// (and the method filter chips, which use Title Case) line up with the
// real lowercase gateway method string. The gateway sends plain "card"
// with no debit/credit split, so it stays "Card".
export function formatPaymentMethod(raw) {
  const map = {
    upi: "UPI",
    netbanking: "Net Banking",
    card: "Card",
    wallet: "Wallet",
    emi: "EMI",
  };
  const key = String(raw || "").toLowerCase();
  return map[key] || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—");
}

// Always exactly 2 decimals (an average like 11143 / 3 used to print ₹3,714.333).
export const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
