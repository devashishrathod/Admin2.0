import { useBrandDetails } from "../queries/brandQueries";
import { useOnboardingStatus } from "../../onboarding/queries/onboardingQueries";

/* Server reads for the brand detail's onboarding v2 sections (admin guide
 * §4). All live under ["brands", …], so every /brands write (review, badge,
 * deed, documents, billing, legal edits) refreshes them on its own. */

/** GET /brands/get?brandId= — the raw brand (pan, gst, bank, systemVerify,
 *  deed, user = the owner account, onboarding …). */
export const useBrandRaw = (brandId, options = {}) =>
  useBrandDetails(brandId, { select: (res) => res?.data ?? null, ...options });

/** GET /brands/onboarding/status?brandId= — the owner's screen, groups,
 *  items, editMode, verification, deed, systemChecks, profileStrength … */
export const useStatusRaw = (brandId, options = {}) =>
  useOnboardingStatus(brandId, { select: (res) => res?.data ?? null, ...options });
