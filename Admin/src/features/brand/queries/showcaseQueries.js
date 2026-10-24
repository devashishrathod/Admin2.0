import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getAdminBrandShowcase } from "../services/showcaseApi";

/* -------------------------------------------------------------------------
 * Showcase queries — the pattern every feature follows:
 *
 *   services/xxxApi.js     plain API calls (axios), no React
 *   queries/xxxQueries.js  React hooks that cache those calls (this file)
 *   Component              uses the hook; never fetches by itself
 *
 * Writes need no hook here: the shared interceptor invalidates ["showcase"]
 * after any successful showcase POST/PUT/PATCH/DELETE, and this query
 * refetches by itself (lib/query/invalidateAfterWrite.js).
 * ---------------------------------------------------------------------- */

/** Every album of a brand (visible + hidden), each with its media. */
export function useBrandShowcase(brandId) {
  return useQuery({
    queryKey: queryKeys.showcase.brand(brandId),
    queryFn: () => getAdminBrandShowcase(brandId),
    enabled: Boolean(brandId),
  });
}
