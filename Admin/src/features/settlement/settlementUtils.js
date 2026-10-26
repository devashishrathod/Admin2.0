/* -------------------------------------------------------------------------
 * Shared settlement helpers — used by the Settlements page and by the
 * Settlements tab on a brand's detail page, so both label statuses the same.
 * ---------------------------------------------------------------------- */

// Raw backend status → the display label used across the admin.
// Maps the backend's real status enum onto the labels this UI renders
// (Settlements page, brand Settlements tab), matching the confirmed
// settlement lifecycle exactly:
//
//   DRAFT → PENDING_APPROVAL → APPROVED → PROCESSING → PAID → REVERSED
//                 ↓               ↓           ↓
//              ON_HOLD ──→ CANCELLED       FAILED → APPROVED (retry)
//                 ↓                           ↓
//          rebuild → CARRIED_FORWARD      ABANDONED
//
// An unrecognized status shows as itself (humanized) — never guessed as
// "Processing", which would read as "money on its way".
export function mapSettlementStatus(raw) {
  const s = String(raw || "").toUpperCase();
  if (["PAID", "COMPLETED", "DONE", "SETTLED", "SUCCESS", "SETTLEMENT_DONE"].includes(s)) return "Settlement done";
  if (["PENDING_APPROVAL", "PENDING"].includes(s)) return "Pending Approval";
  if (s === "APPROVED") return "Approved";
  if (s === "PROCESSING") return "Processing";
  if (["ON_HOLD", "HOLD", "ONHOLD"].includes(s)) return "On hold";
  if (["CANCELLED", "CANCELED"].includes(s)) return "Cancelled";
  if (s === "REVERSED") return "Reversed";
  if (s === "FAILED") return "Failed";
  if (s === "ABANDONED") return "Abandoned";
  if (s === "CARRIED_FORWARD") return "Carried forward";
  if (s === "DRAFT") return "Draft";
  if (!s) return "—";
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

// Display label → pill colour for the shared StatusStepButton.
export const SETTLEMENT_TONES = {
  "Pending Approval": "amber",
  Approved: "sky",
  Processing: "violet",
  Failed: "red",
  "Settlement done": "emerald",
  "On hold": "orange",
  Reversed: "fuchsia",
};

// The admin worklist (`needsAttention=true` in the API): flagged for
// revalidation, FAILED or ON_HOLD.
export function settlementNeedsAttention(s) {
  return Boolean(s.needsRevalidation) || s.status === "Failed" || s.status === "On hold";
}
