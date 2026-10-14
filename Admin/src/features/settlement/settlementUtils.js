/* -------------------------------------------------------------------------
 * Shared settlement helpers — used by the Settlements page and by the
 * Settlements tab on a brand's detail page, so both label statuses the same.
 * ---------------------------------------------------------------------- */

// Raw backend status → the display label used across the admin.
// Maps the backend's real status enum onto the labels this UI renders
// (Settlements page, brand Settlements tab), matching the confirmed
// settlement lifecycle exactly:
//
//   PENDING_APPROVAL → APPROVED → PROCESSING → PAID → REVERSED
//           ↓              ↓           ↓
//        ON_HOLD       CANCELLED     FAILED → APPROVED (retry)
//                                       ↓
//                                   ABANDONED
//
// Anything unrecognized falls back to "Processing" rather than crashing
// the badge lookup.
export function mapSettlementStatus(raw) {
  const s = String(raw || "").toUpperCase();
  if (["PAID", "COMPLETED", "DONE", "SETTLED", "SUCCESS", "SETTLEMENT_DONE"].includes(s)) return "Settlement done";
  if (["PENDING_APPROVAL", "PENDING"].includes(s)) return "Pending Approval";
  if (s === "APPROVED") return "Approved";
  if (["ON_HOLD", "HOLD", "ONHOLD"].includes(s)) return "On hold";
  if (["CANCELLED", "CANCELED"].includes(s)) return "Cancelled";
  if (s === "REVERSED") return "Reversed";
  if (s === "FAILED") return "Failed";
  if (s === "ABANDONED") return "Abandoned";
  return "Processing";
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
