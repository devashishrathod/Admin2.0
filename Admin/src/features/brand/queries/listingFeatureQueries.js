import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getListingFeatures } from "../services/listingFeaturesApi";

/* Listing-feature reads (URL resource /brandFeatures), cached. Returns the
 * raw service result (the feature array); `options` goes to useQuery.
 * Add / edit / delete refresh ["brandFeatures"] via the shared interceptor. */

export function useListingFeatures(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brandFeatures.list({ brandId }),
    queryFn: () => getListingFeatures(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}
