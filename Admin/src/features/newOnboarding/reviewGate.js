import { useMemo } from "react";
import { useOnboardingStatus } from "../onboarding/queries/onboardingQueries";
import { normalizeStatus } from "../onboarding/onboardingFlow";

// rejectionReason / revokeReason / note on PUT …/review (#24): max 1000.
export const REVIEW_TEXT_MAX = 1000;

// Shown before approving a rejected / revoked attempt the vendor hasn't
// resubmitted yet.
export const APPROVE_WITHOUT_RESUBMIT = "The vendor hasn't resubmitted yet. Approve anyway?";

/** Review state that needs only the list row / attempt (no request):
 *  - nothing before the vendor's FIRST submit (onboarding.submittedAt —
 *    the server answers 409 SUBMIT_REQUIRED);
 *  - an already REJECTED attempt can't be rejected again (409); Approve on
 *    a rejected or revoked attempt is allowed (reviewBrandVerification.js,
 *    guide §13) but asks for confirmation first (`approveConfirm`).
 *  Returns { approveBlocked, rejectBlocked, approveConfirm } — null = allowed. */
export function rowReviewState(brand, verification) {
  if (!brand?.submittedAt) {
    const notSubmitted = "The vendor hasn't submitted for review yet.";
    return { approveBlocked: notSubmitted, rejectBlocked: notSubmitted, approveConfirm: null };
  }
  const rejected = brand.waitingChip === "REJECTED" || Boolean(verification?.isRejected);
  const revoked = brand.waitingChip === "REVOKED" || Boolean(verification?.isRevoked);
  return {
    approveBlocked: null,
    rejectBlocked: rejected ? "Already rejected — waiting for the vendor to fix and resubmit." : null,
    approveConfirm: rejected || revoked ? APPROVE_WITHOUT_RESUBMIT : null,
  };
}

/**
 * Review gate for one WAITING brand: rowReviewState, plus Approve needs the
 * partnership deed accepted — GET /brands/onboarding/status?brandId=
 * `deed.accepted` (the vendor's own acceptance, or the admin's offline deed
 * with proof; otherwise 409 DEED_NOT_ACCEPTED). Reject / revoke don't need it.
 * Returns { approveBlocked, rejectBlocked, approveConfirm, deedMissing }.
 */
export function useReviewGate(brand, verification, { enabled = true } = {}) {
  const brandId = brand?.id;
  const statusQuery = useOnboardingStatus(brandId, { enabled: enabled && Boolean(brandId) });
  const status = useMemo(() => (statusQuery.data ? normalizeStatus(statusQuery.data) : null), [statusQuery.data]);

  // The list row carries onboarding.submittedAt; the status payload has it too.
  const row = rowReviewState(brand?.submittedAt ? brand : { ...brand, submittedAt: status?.submittedAt }, verification);
  const deedMissing = Boolean(status) && !status.deed?.accepted;

  let approveBlocked = row.approveBlocked;
  if (!approveBlocked) {
    if (statusQuery.isPending) approveBlocked = "Checking the partnership deed…";
    else if (statusQuery.isError) approveBlocked = "Couldn't check the partnership deed — refresh and try again.";
    else if (deedMissing) approveBlocked = "The partnership deed isn't accepted yet. Record the vendor's signed deed in the onboarding wizard, or ask the vendor to accept it.";
  }
  return { approveBlocked, rejectBlocked: row.rejectBlocked, approveConfirm: row.approveConfirm, deedMissing };
}
