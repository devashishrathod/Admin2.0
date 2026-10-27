// Approve/Reject (PATCH /refunds/admin/:id/approve | /reject) are only
// valid once the vendor has had its say — the super admin API doc's
// approve table starts from exactly these three states. Before that the
// refund is still the vendor's to decide, and after it the admin has
// already acted. The API's own canDecide flag is vendor-scoped (true while
// the vendor still has to answer), so it is not used for the admin gate.
const ADMIN_DECIDABLE = ["VENDOR_APPROVED", "VENDOR_REJECTED", "VENDOR_TIMEOUT"];

export function canAdminDecide({ isOpen, status }) {
  return isOpen !== false && ADMIN_DECIDABLE.includes(status);
}

// Approving over the vendor's "no" (VENDOR_REJECTED) or silence
// (VENDOR_TIMEOUT) is an override: the API requires `overrideReason` and
// moves the refund to ADMIN_OVERRIDE instead of ADMIN_APPROVED.
export function needsOverrideReason(status) {
  return status === "VENDOR_REJECTED" || status === "VENDOR_TIMEOUT";
}

// Both admin-approved states lead to the same next step (pay).
export function isAdminApproved(status) {
  return status === "ADMIN_APPROVED" || status === "ADMIN_OVERRIDE";
}

// Row patch right after an admin approve/override succeeds — the next
// step depends on the method: gateway → Pay, manual bank → Pay to Bank.
export function approvedPatch(refund, override) {
  const manual = refund.method === "MANUAL_BANK";
  return {
    status: override ? "ADMIN_OVERRIDE" : "ADMIN_APPROVED",
    statusLabel: override ? "Admin Override" : "Admin Approved",
    canDecide: false,
    needsOverride: false,
    canPay: !manual,
    canPayToBank: manual,
    canRequestBankDetails: true,
  };
}

// Refund method → plain words. SOURCE means back to the original payment
// (card / UPI / netbanking) through the gateway.
const METHOD_LABELS = {
  SOURCE: "Original payment (Source)",
  MANUAL_BANK: "Manual bank transfer",
};

export function refundMethodLabel(method) {
  if (!method) return "—";
  return METHOD_LABELS[method] || String(method).charAt(0) + String(method).slice(1).toLowerCase().replace(/_/g, " ");
}

// Bank references: NEFT UTR 16, IMPS/UPI RRN 12, RTGS UTR 22 — letters
// and digits only.
export function isValidUtr(utr) {
  return /^[A-Za-z0-9]{12,22}$/.test(String(utr || "").trim());
}
