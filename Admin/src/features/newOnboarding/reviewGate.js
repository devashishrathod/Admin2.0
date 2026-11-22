import { useMemo } from "react";
import { useOnboardingStatus } from "../onboarding/queries/onboardingQueries";
import { normalizeStatus } from "../onboarding/onboardingFlow";

// rejectionReason / revokeReason / note on PUT …/review (#24): max 1000.
export const REVIEW_TEXT_MAX = 1000;

/** Approve / Reject blocked reasons that need only the list row (no request):
 *  - nothing before the vendor's FIRST submit (onboarding.submittedAt —
 *    the server answers 409 SUBMIT_REQUIRED),
 *  - nothing on a rejected / revoked attempt: the vendor must fix and
 *    resubmit first; there is no override approve (#24 "already rejected"). */
export function rowReviewBlock(brand, verification) {
  if (!brand?.submittedAt) return "The vendor hasn't submitted for review yet.";
  const closed =
    brand.waitingChip === "REJECTED" || brand.waitingChip === "REVOKED" || verification?.isRejected || verification?.isRevoked;
  if (closed) return "Sent back — waiting for the vendor to fix and resubmit.";
  return null;
}

/**
 * Review gate for one WAITING brand: rowReviewBlock, plus Approve needs the
 * partnership deed accepted — GET /brands/onboarding/status?brandId=
 * `deed.accepted` (the vendor's own acceptance, or the admin's offline deed
 * with proof; otherwise 409 DEED_NOT_ACCEPTED). Reject / revoke don't need it.
 * Returns { approveBlocked, rejectBlocked, deedMissing } — null = allowed.
 */
export function useReviewGate(brand, verification, { enabled = true } = {}) {
  const brandId = brand?.id;
  const statusQuery = useOnboardingStatus(brandId, { enabled: enabled && Boolean(brandId) });
  const status = useMemo(() => (statusQuery.data ? normalizeStatus(statusQuery.data) : null), [statusQuery.data]);

  // The list row carries onboarding.submittedAt; the status payload has it too.
  const rowBlock = rowReviewBlock(brand?.submittedAt ? brand : { ...brand, submittedAt: status?.submittedAt }, verification);
  const deedMissing = Boolean(status) && !status.deed?.accepted;

  let approveBlocked = rowBlock;
  if (!approveBlocked) {
    if (statusQuery.isPending) approveBlocked = "Checking the partnership deed…";
    else if (statusQuery.isError) approveBlocked = "Couldn't check the partnership deed — refresh and try again.";
    else if (deedMissing) approveBlocked = "The partnership deed isn't accepted yet. Record the vendor's signed deed in the onboarding wizard, or ask the vendor to accept it.";
  }
  return { approveBlocked, rejectBlocked: rowBlock, deedMissing };
}
