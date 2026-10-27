import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getBrandVerifications, getVerificationHistory } from "../services/NewOnboardingApi";
import { fetchAllVerifications } from "../verificationData";

/* Brand-verification reads. Both endpoints live under /brands, so they're
 * cached under ["brands", …] and refresh whenever any brand write succeeds
 * (e.g. an approve / reject review). Returns the raw API response;
 * `options` goes to useQuery. */

export function useBrandVerifications(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("verifications", params),
    queryFn: () => getBrandVerifications(params),
    ...options,
  });
}

/** Every verification across all server pages, already mapped (not the raw
 *  response) — the list endpoint can't filter by status, so Brand Waiting
 *  and New Onboarding page / filter it themselves (see verificationData.js). */
export function useAllBrandVerifications(search = "", options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("verifications-all", { search }),
    queryFn: () => fetchAllVerifications(search),
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
