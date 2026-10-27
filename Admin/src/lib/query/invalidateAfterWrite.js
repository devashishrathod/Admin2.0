import { queryClient } from "./queryClient";

/* -------------------------------------------------------------------------
 * Auto-refresh after every successful write.
 *
 * Called from the shared axios response interceptor (auth/session.js),
 * which every API service file already goes through. So a save, update or
 * delete anywhere in the panel refreshes every screen showing that data —
 * no component has to remember to "reload" after it.
 *
 *   PUT /showcase/section/update/:id  →  200  →  invalidate ["showcase"]
 *   GET anything                      →  nothing (reads never invalidate)
 *   any request that fails            →  nothing (the interceptor's
 *                                         success handler never runs)
 *
 * Invalidating only marks the cache stale: queries currently on screen
 * refetch right away, the rest refetch when next opened.
 * ---------------------------------------------------------------------- */

const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);

// Writes whose URL resource doesn't match the query key they change, or
// that change more than one resource. Key = URL resource, value = query
// key roots to invalidate. Add a line here when such a case comes up.
const RELATED_RESOURCES = {
  // Outlets, features, showcase and plans are shown inside brand screens.
  subBrands: ["brands"],
  brandFeatures: ["brands"],
  subscribeds: ["brands"],
  // Payment-side writes change the transaction rows and their settlement state.
  refunds: ["voucher-claims", "settlements"],
  settlements: ["voucher-claims"],
  transactions: ["voucher-claims", "settlements"],
  // A category's name / image shows on its sub-categories.
  categories: ["subCategories"],
};

// Upload plumbing — never a resource a screen displays.
const IGNORED_RESOURCES = new Set(["uploads"]);

// "/showcase/section/abc/add-media?x=1" → "showcase"
export function resourceFromUrl(url = "") {
  const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  return path.split("/").filter(Boolean)[0] ?? "";
}

/** Invalidates the cache for the resource an axios request just wrote to. */
export function invalidateAfterWrite(axiosConfig) {
  if (!WRITE_METHODS.has(String(axiosConfig?.method).toLowerCase())) return;
  const resource = resourceFromUrl(axiosConfig.url);
  if (!resource || IGNORED_RESOURCES.has(resource)) return;

  const roots = [resource, ...(RELATED_RESOURCES[resource] ?? [])];
  roots.forEach((root) => queryClient.invalidateQueries({ queryKey: [root] }));
}
