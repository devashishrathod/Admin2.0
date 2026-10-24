import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getCategories, getCategoryById } from "../services/CategoryApi";

/* Category reads, cached. Each hook returns the raw API response (same as
 * calling the service directly), so callers keep their own unwrapping.
 * `options` is passed through to useQuery (e.g. { enabled, select }).
 * Writes need no hook — the shared interceptor refreshes ["categories"]. */

export function useCategories(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: () => getCategories(params),
    ...options,
  });
}

export function useCategory(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => getCategoryById(id),
    enabled: Boolean(id),
    ...options,
  });
}
