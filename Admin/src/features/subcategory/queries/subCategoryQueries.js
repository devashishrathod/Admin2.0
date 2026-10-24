import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getSubCategories, getSubCategoryById } from "../services/SubCategoryApi";

/* Sub-category reads, cached. Returns the raw API response; `options` goes
 * to useQuery. Writes refresh ["subCategories"] via the shared interceptor. */

export function useSubCategories(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.subCategories.list(params),
    queryFn: () => getSubCategories(params),
    ...options,
  });
}

export function useSubCategory(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.subCategories.detail(id),
    queryFn: () => getSubCategoryById(id),
    enabled: Boolean(id),
    ...options,
  });
}
