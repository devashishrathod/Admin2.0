// Approve/Reject (PATCH /refunds/admin/:id/approve | /reject) are only
// valid while the refund is still awaiting an admin decision. The API's
// canDecide flag is vendor-scoped (it's false once the vendor has
// approved, e.g. VENDOR_APPROVED) — but that's exactly when the admin
// still has to approve/reject. So the admin can decide any open refund
// that hasn't already reached an admin decision, payout or terminal state.
const NOT_ADMIN_DECIDABLE = [
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "PROCESSING",
  "AWAITING_BANK_DETAILS",
  "COMPLETED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
  "WITHDRAWN",
];

export function canAdminDecide({ canDecide, isOpen, status }) {
  if (canDecide === true) return true;
  return isOpen !== false && !NOT_ADMIN_DECIDABLE.includes(status);
}
