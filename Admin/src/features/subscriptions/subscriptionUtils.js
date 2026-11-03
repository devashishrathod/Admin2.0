import { MISSING } from "../../utils/helpers";

/* Helpers shared by the Subscriptions list and the SubscriptionDetails page. */

export function formatDate(iso) {
  if (!iso) return MISSING.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return MISSING.date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso) {
  if (!iso) return MISSING.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return MISSING.date;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatCurrency(amount) {
  if (amount == null) return MISSING.amount;
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// First non-empty value — the list endpoint's field names have shifted
// between backend versions (adminNote → grantNote, merchantId → uniqueId…).
export const pick = (...vals) => vals.find((v) => v != null && v !== "");

// A ref field may come back populated ({ _id, … }) or as a bare id.
export const idOf = (v) => (v && typeof v === "object" ? v._id : v);

// Test/demo subscription — its own flag, or one under a dummy brand.
export const isDummySubscription = (r) => Boolean(r.isDummy ?? r.brand?.isDummy);
