import { errorText } from "../../onboarding/onboardingFlow";

/* -------------------------------------------------------------------------
 * Plain helpers for the brand detail's onboarding v2 sections (admin guide
 * §4–§13). They only format what the server sent — nothing is scored or
 * decided in the browser.
 * ---------------------------------------------------------------------- */

// Codes the onboarding wizard's ERROR_HELP doesn't cover (review, badge).
const EXTRA_HELP = {
  SUBMIT_REQUIRED: "The vendor hasn't submitted for review yet.",
  DEED_NOT_ACCEPTED: "The partnership deed isn't accepted yet — record the signed deed with proof first.",
  BADGE_NOT_ELIGIBLE: "The brand doesn't meet the badge rules yet.",
};

/** One readable line for an ApiError — branches on details.code. */
export function v2ErrorText(err) {
  if (!err) return "";
  if (EXTRA_HELP[err.code]) return `${EXTRA_HELP[err.code]} (${err.message})`;
  return errorText(err);
}

export const humanize = (v) =>
  String(v || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtDateTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** The admin's decision, read off status.verification (never the system score). */
export function approvalState(verification = {}) {
  if (verification.isApproved) return { label: "Approved", tone: "emerald" };
  if (verification.isRevoked) return { label: "Revoked", tone: "red" };
  if (verification.isRejected) return { label: "Rejected", tone: "red" };
  if (verification.submittedAt) return { label: verification.attemptNumber > 1 ? "Resubmitted" : "Under review", tone: "amber" };
  return { label: "Not submitted", tone: "neutral" };
}

/**
 * Opens a signed, short-lived link (KYC file, deed proof) in a new tab.
 * The tab is opened synchronously (popup blockers allow only that), then
 * pointed at a FRESH link from `getUrl()` — a link read minutes ago may have
 * expired. The URL is never logged or shown.
 */
export async function openSignedLink(getUrl) {
  const tab = window.open("", "_blank");
  try {
    const url = await getUrl();
    if (!url) throw new Error("No link");
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    }
    return true;
  } catch {
    tab?.close();
    return false;
  }
}
