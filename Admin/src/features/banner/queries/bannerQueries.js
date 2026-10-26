import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getBannerById, getBanners } from "../services/BannerApi";

/* Banner reads, cached. Each hook returns the raw service response, so
 * callers keep their own unwrapping; `options` goes to useQuery.
 * Writes need no hook — the shared interceptor refreshes ["banners"]. */

export function useBanners(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.banners.list(params),
    queryFn: () => getBanners(params),
    ...options,
  });
}

/** One banner's query options — shared by useBanner and the imperative
 *  queryClient.query in Banner.jsx (edit opened from the details page),
 *  so both read the same cache entry. Data is the banner object or null. */
export function bannerQueryOptions(id) {
  return {
    queryKey: queryKeys.banners.detail(id),
    queryFn: () => getBannerById(id),
  };
}

export function useBanner(id, options = {}) {
  return useQuery({
    ...bannerQueryOptions(id),
    enabled: Boolean(id),
    ...options,
  });
}
