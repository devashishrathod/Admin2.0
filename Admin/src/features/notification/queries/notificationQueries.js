import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getAdminNotifications } from "../services/NotificationApi";

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
