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

// Normalizes one real voucher-claim payment record (GET
// /voucher-claims/payments) into the flat row shape this page's table/
// stats expect.
//
// The sibling detail endpoint (GET /voucher-claims/:claimId, confirmed real
// — see TransactionDetails.jsx) returns each record wrapped as
// { payment, claim, brand, outlet, timeline } rather than one flat object,
// so each list row is defensively unwrapped the same way here: read every
// payment field off `item.payment` when present, falling back to the item
// itself for a flatter shape. This is what was making most cells show "—"
// — the old code only ever read straight off the list item.
//
// On an admin token every row carries a `customer` block (fullName,
// uniqueId, email, mobile, whatsappNumber). Unset keys are omitted, not
// null, so "Customer" falls back to the raw `customerId` when there's no name.
// Shared with the Dashboard (revenue + recent activity). `ts` is the raw
// timestamp, for sorting by recency.
export function normalizeClaimPayment(item) {
  const payment = item?.payment ?? item ?? {};
  const claim = item?.claim ?? {};
  const brand = item?.brand ?? payment?.brand ?? {};
  const customerInfo = item?.customer ?? payment?.customer ?? {};
  const customerId = payment.customerId || claim.customerId || "—";

  // No usable timestamp → no date (shown as "—"), never "today".
  const ts = payment.createdAt || payment.verifiedAt || null;
  const dateStr = localDateStr(ts);

  const status = normalizeClaimStatus(payment.status);

  // Trydood → vendor payout state, from the row's settlement fields
  // (paidToVendorAt / settlementHold — the hold may be a flag or { isHeld }).
  const hold = payment.settlementHold ?? item?.settlementHold;
  const isHeld = hold && typeof hold === "object" ? Boolean(hold.isHeld) : Boolean(hold);
  const paidToVendorAt = payment.paidToVendorAt || item?.paidToVendorAt || null;
  const payoutState = paidToVendorAt ? "paid" : isHeld ? "held" : "awaiting";

  return {
    id: payment._id || item?._id || "—",
    claimId: claim._id || payment.claimId || item?.voucher?.claimId || item?._id || payment._id || "—",
    razorpayPaymentId: payment.razorpayPaymentId || "—",
    vendor: brand.brandName || "—",
    customer: customerInfo.fullName || customerId,
    customerId,
    customerUniqueId: customerInfo.uniqueId || "—",
    customerPhone: customerInfo.mobile || customerInfo.whatsappNumber || "—",
    // v1.12 — purged account: name / contact above come from the sale
    // snapshot; the row shows a "Deleted" badge. Money fields are unchanged.
    customerIsDeleted: customerInfo.isDeleted === true,
    date: dateStr,
    time: dateStr ? fmtTime(ts) : "—",
    amount: Number(payment.amount) || 0,
    method: formatPaymentMethod(payment.paymentMethod),
    status,
    isToday: dateStr === todayStr(),
    reference: payment.invoiceId || "—",
    failureReason: status === "Failed" ? payment.errorDescription || payment.failureReason || "Payment failed." : null,
    brandLogo: brand.logo || null,
    versionCode: item?.voucherVersion?.versionCode || null,
    payoutState,
    paidToVendorAt,
    isHeld,
    ts,
  };
}
