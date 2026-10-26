import { QueryClient } from "@tanstack/react-query";

/* -------------------------------------------------------------------------
 * The ONE QueryClient for the whole admin panel.
 *
 * TanStack Query keeps every server response in a cache, stored under a
 * "query key" (see queryKeys.js). Screens read from that cache with
 * useQuery(); when data changes on the server we "invalidate" its key and
 * every screen showing it refetches on its own (see invalidateAfterWrite.js).
 *
 * It lives in its own module (not inside main.jsx) so non-React code —
 * the axios interceptor in auth/session.js, logout in authStore — can
 * reach the same cache.
 * ---------------------------------------------------------------------- */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data counts as fresh for 30s: moving between pages inside that
      // window shows the cache instantly with no request at all. After it,
      // the cache is still shown at once and refreshed in the background.
      staleTime: 30 * 1000,
      // Refetch stale data when the admin comes back to the tab.
      refetchOnWindowFocus: true,
      // One retry for flaky networks; more just delays a real error.
      retry: 1,
    },
  },
});
