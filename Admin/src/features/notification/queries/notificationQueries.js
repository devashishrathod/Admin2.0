import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { broadcastNotification, getAdminNotifications, getAllOutlets } from "../services/NotificationApi";
import { isNotFoundMessage } from "../../../utils/helpers";
import { countFromDryRun } from "../utils/notificationUtils";

/* Admin in-app notification reads (header bell), cached. Hooks return the
 * raw API response (per page for the feed); `options` goes to useQuery.
 * PUT /notifications/mark-read refreshes ["notifications"] via the shared
 * interceptor, so the badge and the list resync after every mark-read. */

/** Badge only — one tiny request whose response carries `unreadCount`. */
export function useAdminUnreadCount(options = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.view("unread-count"),
    queryFn: () => getAdminNotifications({ page: 1, limit: 1 }),
    ...options,
  });
}

/** The bell's list, one page per "Load more". `params` = { limit, isRead }. */
export function useAdminNotificationsFeed(params = {}, options = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.view("feed", params),
    queryFn: ({ pageParam }) => getAdminNotifications({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + (p?.data?.data?.length ?? 0), 0);
      const total = lastPage?.data?.total ?? loaded;
      return loaded < total ? allPages.length + 1 : undefined;
    },
    ...options,
  });
}

/* ---- Broadcast composer ------------------------------------------------- */

// Dry run = POST /notifications/broadcast with dryRun: true. It resolves the
// audience and sends nothing; title/body are required by the validator, so a
// neutral placeholder goes along.
const dryRun = async (target) => {
  const res = await broadcastNotification({ title: "Audience check", body: "Audience check", target, dryRun: true });
  // Kept on purpose: shows the live response shape if the count ever
  // reads as unknown again.
  console.debug("[Notifications] dry run", target, res);
  return res;
};

const reachOf = (res) => countFromDryRun(res);

/** Real recipient count for `target` (null target = disabled). Pass an
 *  already-debounced target so typing doesn't fire a POST per keystroke. */
export function useBroadcastReach(target, options = {}) {
  return useQuery({
    queryKey: queryKeys.notificationReach.view("dry-run", target ?? {}),
    queryFn: () => dryRun(target),
    select: reachOf,
    enabled: Boolean(target),
    staleTime: 60_000,
    retry: false,
    ...options,
  });
}

/** One dry run per role → the count badge on each role card. */
export function useRoleReach(roles) {
  return useQueries({
    queries: roles.map((role) => ({
      queryKey: queryKeys.notificationReach.view("role", { role }),
      queryFn: () => dryRun({ roles: [role] }),
      select: reachOf,
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
}

/** Platform-wide outlets for the "Outlet managers" picker. "No any subbrand
 *  found" (404) is an empty platform, so it isn't retried. */
export function useAllOutlets(params = { page: 1, limit: 100 }, options = {}) {
  return useQuery({
    queryKey: queryKeys.subBrands.list({ ...params, scope: "notification-audience" }),
    queryFn: () => getAllOutlets(params),
    retry: (count, error) => count < 1 && !isNotFoundMessage(error?.message),
    ...options,
  });
}
