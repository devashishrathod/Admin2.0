import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getPromoCodes, getPromoCodeById, getPromoCodeReports } from "../services/PromoCodeApi";

/* Promo-code reads, cached. Returns the raw API response; `options` goes to
 * useQuery. Writes refresh ["promoCodes"] via the shared interceptor. */

/** One page of promo codes, filtered by `params`. */
export function usePromoCodes(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.promoCodes.list(params),
    queryFn: () => getPromoCodes(params),
    ...options,
  });
}

/** One code with its usage summary and recent redemptions. */
export function usePromoCode(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.promoCodes.detail(id),
    queryFn: () => getPromoCodeById(id),
    enabled: Boolean(id),
    ...options,
  });
}

/** Campaign report for the given code / period / audience. */
export function usePromoCodeReport(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.promoCodes.view("reports", params),
    queryFn: () => getPromoCodeReports(params),
    ...options,
  });
}
