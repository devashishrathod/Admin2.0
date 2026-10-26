// Some backend endpoints return a "not found" error (e.g. "No any
// voucherversion found") instead of an empty array when a list is genuinely
// empty. Treat those as an empty result — show the normal empty-state card,
// not a red error banner — while still surfacing real errors as errors.
export function isNotFoundMessage(message) {
  if (!message) return false;
  return /not found|no .*found/i.test(message);
}

// Seed batch names carry the word "DUMMY" (e.g. "STAGE-DUMMY-2026-10").
// Cut it out for display, along with its joining dash: "STAGE-2026-10".
export function formatBatch(batch) {
  if (!batch) return batch;
  return batch.replace(/[-_\s]*dummy/gi, "").replace(/^[-_\s]+/, "");
}

/* -------------------------------------------------------------------------
 * Missing data → words, never a bare "—".
 * Mappers keep "—" as their "no value" sentinel (lots of logic compares
 * against it), so only the *display* goes through these.
 *
 *   orText(brand.location, MISSING.location)   → "Bengaluru" | "Location not added"
 *   orText(refund.utr)                          → "UTR…"      | "Not available"
 * ---------------------------------------------------------------------- */
export const MISSING = {
  generic: "Not available",
  text: "Not provided",
  name: "No name",
  date: "Not set",
  id: "Not assigned",
  amount: "Not available",
  phone: "No phone",
  email: "No email",
  location: "Location not added",
  reason: "No reason given",
  method: "Not recorded",
  plan: "No plan",
  category: "No category",
  none: "None",
};

// True when a value should be treated as "nothing to show".
export function isMissing(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return Number.isNaN(value);
  const s = String(value).trim();
  return s === "" || s === "—" || s === "-" || s === "–" || s === "null" || s === "undefined" || s === "Invalid Date";
}

// The value itself, or a short phrase saying what's missing.
export function orText(value, fallback = MISSING.generic) {
  return isMissing(value) ? fallback : value;
}
