import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getAllBrands, getBrandDetails, getTopBrands } from "../services/BrandApi";
import { isNotFoundMessage } from "../../../utils/helpers";

/* Brand reads, cached. Returns the raw API response; `options` goes to
 * useQuery. Writes to /brands (and /subBrands, /brandFeatures,
 * /subscribeds — see RELATED_RESOURCES) refresh ["brands"] automatically.
 *
 * The full live-brand list used across the app stays in BrandContext,
 * which is itself backed by the cache. */

/** `retry` option for a brand's own records (vouchers, settlements,
 *  payments…): several list endpoints answer "not found" for a brand with
 *  no rows yet — screens show that as empty, so retrying it only delays. */
export const retryUnlessNotFound = (failureCount, error) =>
  failureCount < 1 && !isNotFoundMessage(error?.message);

/** One page of the brand list — for dropdowns / pickers. */
export function useBrandsPage(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.list(params),
    queryFn: () => getAllBrands(params),
    ...options,
  });
}

export function useBrandDetails(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.detail(brandId),
    queryFn: () => getBrandDetails(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

export function useTopBrands(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("top-brands", params),
    queryFn: () => getTopBrands(params),
    ...options,
  });
}
