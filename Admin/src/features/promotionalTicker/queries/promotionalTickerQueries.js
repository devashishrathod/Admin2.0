import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getPromotionalTickerById, getPromotionalTickers } from "../services/PromotionalTickerApi";

/* Promotional ticker reads, cached. Each hook returns the raw service
 * response, so callers keep their own unwrapping; `options` goes to useQuery.
 * Writes need no hook — the shared interceptor refreshes ["promotionalTickers"]. */

export function usePromotionalTickers(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.promotionalTickers.list(params),
    queryFn: () => getPromotionalTickers(params),
    ...options,
  });
}

/** One ticker's query options — shared by usePromotionalTicker and the
 *  imperative queryClient.query in PromotionalTicker.jsx (edit opened
 *  from the details page). Data is the ticker object or null. */
export function promotionalTickerQueryOptions(id) {
  return {
    queryKey: queryKeys.promotionalTickers.detail(id),
    queryFn: () => getPromotionalTickerById(id),
  };
}

export function usePromotionalTicker(id, options = {}) {
  return useQuery({
    ...promotionalTickerQueryOptions(id),
    enabled: Boolean(id),
    ...options,
  });
}
