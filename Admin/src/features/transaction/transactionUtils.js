// Shared formatting helpers for the Transactions list + details pages.
// Kept in a plain module (no JSX) so neither page's fast-refresh boundary
// breaks from re-exporting non-component values alongside a component.

export function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso) {
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

// Razorpay-style lowercase payment status → the 3 states this UI renders
// (Success / Pending / Failed).
export function normalizeClaimStatus(raw) {
  const s = String(raw || "").toLowerCase();
  if (["captured", "authorized", "refunded"].includes(s)) return "Success";
  if (["failed"].includes(s)) return "Failed";
  return "Pending";
}

// "netbanking" -> "Net Banking", "upi" -> "UPI", etc. — so the display text
// (and the method filter chips, which use Title Case) line up with the
// real lowercase gateway method string.
export function formatPaymentMethod(raw) {
  const map = {
    upi: "UPI",
    netbanking: "Net Banking",
    card: "Debit Card",
    wallet: "Wallet",
    emi: "EMI",
  };
  const key = String(raw || "").toLowerCase();
  return map[key] || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—");
}

export const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
