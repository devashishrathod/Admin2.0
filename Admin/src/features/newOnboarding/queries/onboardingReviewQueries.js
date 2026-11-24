import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getBrandVerifications, getVerificationHistory } from "../services/NewOnboardingApi";
import { mapVerification } from "../verificationData";

/* Brand-verification reads. Both endpoints live under /brands, so they're
 * cached under ["brands", …] and refresh whenever any brand write succeeds
 * (e.g. an approve / reject review). `options` goes to useQuery. */

/** One server page of the verification queue (#23) — raw response. */
export function useBrandVerifications(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("verifications", params),
    queryFn: () => getBrandVerifications(params),
    ...options,
  });
}

/**
 * A brand's current verification attempt, mapped (or null before its first
 * submit). The server hides superseded attempts, so the newest row for the
 * brandId is the live one — nothing is picked in the browser.
 */
export function useLatestVerification(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("verification-latest", { brandId }),
    queryFn: async () => {
      try {
        return await getBrandVerifications({ brandId, page: 1, limit: 1, sortBy: "NEWEST", sortOrder: "DESC" });
      } catch (err) {
        // 404 "No any brand verification found" = never submitted.
        if (err?.status === 404) return null;
        throw err;
      }
    },
    select: (res) => {
      const row = res?.data?.data?.[0];
      return row ? mapVerification(row) : null;
    },
    enabled: Boolean(brandId),
    ...options,
  });
}

export function useVerificationHistory(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("verification-history", params),
    queryFn: () => getVerificationHistory(params),
    enabled: Boolean(params.brandId),
    ...options,
  });
}
