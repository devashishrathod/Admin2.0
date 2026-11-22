/* -------------------------------------------------------------------------
 * Onboarding v2 list vocabulary (admin guide §3, API #25a). Labels only —
 * which tab a brand is in, and every chip value, comes from the server.
 * ---------------------------------------------------------------------- */

export const ONBOARDING_STAGES = ["NEW", "WAITING", "LIVE"];

export const STAGE_LABELS = {
  NEW: "New onboardings",
  WAITING: "Waiting brands",
  LIVE: "Live brands",
};

export const STAGE_ROUTES = {
  NEW: "/new-onboarding",
  WAITING: "/brand-waiting",
  LIVE: "/brand",
};

export const KYC_PATH_LABELS = {
  GST: "GST",
  NO_GST: "Registered, no GST",
  UNREGISTERED: "Not registered",
};

// waitingChip priority is the server's (REVOKED > REJECTED > RESUBMITTED > UNDER_REVIEW).
export const WAITING_CHIPS = {
  UNDER_REVIEW: { label: "Under review", tone: "amber" },
  RESUBMITTED: { label: "Resubmitted", tone: "sky" },
  REJECTED: { label: "Rejected", tone: "red" },
  REVOKED: { label: "Revoked", tone: "red" },
};

export const STRENGTH_LEVELS = {
  LOW: { label: "Low", tone: "red" },
  MEDIUM: { label: "Medium", tone: "amber" },
  STRONG: { label: "Strong", tone: "emerald" },
};

export const EMPTY_STAGE_COUNTS = { NEW: 0, WAITING: 0, LIVE: 0 };

/** "PAN_VERIFICATION" → "Pan verification" */
export const formatScreenLabel = (screen) => {
  if (!screen) return "";
  const text = String(screen).replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
