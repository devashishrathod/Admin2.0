import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { markNotificationsRead } from "../../features/notification/services/NotificationApi";
import {
  useAdminNotificationsFeed,
  useAdminUnreadCount,
} from "../../features/notification/queries/notificationQueries";
import { queryKeys } from "../../lib/query";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";

/* -------------------------------------------------------------------------
 * Header bell — the admin's own in-app notification feed.
 *   GET /notifications/get-all   (no brandId → admin-audience feed)
 *   PUT /notifications/mark-read ({ notificationIds } or { markAll: true })
 * See super_admin_panel_api_doc #20 / #21.
 * ---------------------------------------------------------------------- */

const PAGE_SIZE = 15;
// Badge count refresh while the panel is closed.
const POLL_MS = 60 * 1000;

const SEVERITY = {
  CRITICAL: { icon: AlertOctagon, tile: "bg-red-500/10 text-red-600 dark:text-red-400" },
  WARNING: { icon: AlertTriangle, tile: "bg-amber-400/15 text-amber-600 dark:text-amber-400" },
  INFO: { icon: Info, tile: "bg-sky-400/15 text-sky-600 dark:text-sky-400" },
};

// Each notification gets its own light background, cycling through these so
// neighbouring items never share a color.
const ITEM_TINTS = [
  "bg-emerald-50 hover:bg-emerald-100/70 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15",
  "bg-sky-50 hover:bg-sky-100/70 dark:bg-sky-500/10 dark:hover:bg-sky-500/15",
  "bg-violet-50 hover:bg-violet-100/70 dark:bg-violet-500/10 dark:hover:bg-violet-500/15",
  "bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-500/10 dark:hover:bg-amber-500/15",
  "bg-rose-50 hover:bg-rose-100/70 dark:bg-rose-500/10 dark:hover:bg-rose-500/15",
  "bg-teal-50 hover:bg-teal-100/70 dark:bg-teal-500/10 dark:hover:bg-teal-500/15",
];

// The API's `deepLink` values (e.g. "/admin/webhooks/…") aren't routes in
// this panel, so each admin-audience type is sent to the page that handles
// it; anything tied to a brand opens that brand.
const TYPE_ROUTES = {
  WEBHOOK_FAILED: "/transaction",
  PAYMENT_DISPUTED: "/transaction",
  BRAND_SUBSCRIPTION_LAPSED: "/subscriptions",
  SUBSCRIPTION_CREDIT_REUSED: "/subscriptions",
  PROMO_LIMIT_EXCEEDED: "/promo-code",
};

function routeFor(n) {
  if (TYPE_ROUTES[n.type]) return TYPE_ROUTES[n.type];
  const brandId = n.brandId || n.meta?.brandId;
  return brandId ? `/brands/${brandId}` : null;
}

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(s)) return "";
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// Cache patchers for the optimistic mark-read updates (raw API shapes).
function withUnreadCount(res, fn) {
  return res ? { ...res, data: { ...res.data, unreadCount: fn(res.data?.unreadCount ?? 0) } } : res;
}
function mapFeedRows(feed, fn) {
  return feed
    ? { ...feed, pages: feed.pages.map((p) => ({ ...p, data: { ...p?.data, data: fn(p?.data?.data ?? []) } })) }
    : feed;
}

export default function NotificationBell({ buttonClass }) {
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all"); // "all" | "unread"
  // Mark-all failures show in the list's error state, like load errors.
  const [actionError, setActionError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  // Badge on mount + polling while the panel is closed. On error the last
  // known count stays (the query keeps its previous data).
  const countQuery = useAdminUnreadCount({
    select: (res) => res?.data?.unreadCount ?? 0,
    refetchInterval: open ? false : POLL_MS,
  });
  const unreadCount = countQuery.data ?? 0;
  const countKey = queryKeys.notifications.view("unread-count");

  // The list, fetched only while the panel is open. staleTime 0: (re)load
  // whenever the panel opens or the tab changes, as before.
  const feedParams = { limit: PAGE_SIZE, isRead: tab === "unread" ? false : undefined };
  const feedKey = queryKeys.notifications.view("feed", feedParams);
  const feedQuery = useAdminNotificationsFeed(feedParams, { enabled: open, staleTime: 0 });
  const items = useMemo(
    () => (feedQuery.data?.pages ?? []).flatMap((p) => p?.data?.data ?? []),
    [feedQuery.data]
  );
  const lastPage = feedQuery.data?.pages.at(-1);
  const total = lastPage?.data?.total ?? items.length;
  const loading = feedQuery.isPending;
  const refreshing = feedQuery.isFetching && !feedQuery.isFetchingNextPage;
  const loadingMore = feedQuery.isFetchingNextPage;
  const error = actionError || feedQuery.error?.message || "";

  // Refresh / Try again: back to a fresh page 1 (loader shown), as before.
  const reload = () => {
    setActionError("");
    queryClient.resetQueries({ queryKey: feedKey });
  };

  const togglePanel = () => {
    setOpen((o) => !o);
    setActionError("");
    // Fresh badge count on every open/close, as before.
    countQuery.refetch();
  };

  const selectTab = (key) => {
    setTab(key);
    setActionError("");
  };

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markOneRead = async (n) => {
    if (n.isRead) return;
    // Optimistic — flip it in the cache, then sync the server's count.
    // (The interceptor also refetches ["notifications"] after the write.)
    queryClient.setQueryData(feedKey, (feed) =>
      mapFeedRows(feed, (rows) =>
        tab === "unread" ? rows.filter((x) => x._id !== n._id) : rows.map((x) => (x._id === n._id ? { ...x, isRead: true } : x))
      )
    );
    queryClient.setQueryData(countKey, (res) => withUnreadCount(res, (c) => Math.max(0, c - 1)));
    try {
      const res = await markNotificationsRead({ notificationIds: [n._id] });
      if (res?.data?.unreadCount != null) {
        queryClient.setQueryData(countKey, (old) => withUnreadCount(old, () => res.data.unreadCount));
      }
    } catch {
      // Revert to the server's real state.
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    }
  };

  const handleItemClick = (n) => {
    markOneRead(n);
    const to = routeFor(n);
    if (to) {
      setOpen(false);
      navigate(to);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await markNotificationsRead({ markAll: true });
      // Show it at once; the interceptor's refetch then confirms it.
      queryClient.setQueryData(countKey, (old) => withUnreadCount(old, () => res?.data?.unreadCount ?? 0));
      queryClient.setQueryData(feedKey, (feed) =>
        mapFeedRows(feed, (rows) => (tab === "unread" ? [] : rows.map((x) => ({ ...x, isRead: true }))))
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const hasMore = items.length < total;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={togglePanel}
        className={`${buttonClass} ${open ? "bg-white/80 text-emerald-700 dark:bg-neutral-800 dark:text-neutral-50" : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-neutral-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-40 mt-2.5 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)] backdrop-blur-2xl dark:border-white/5 dark:bg-neutral-900/95 dark:shadow-black/50"
        >
          {/* Head */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 px-4 pb-3 pt-4 text-white">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/25 blur-2xl" />
            <div className="relative flex items-center justify-between gap-2">
              <div>
                <p className="text-[15px] font-bold leading-tight">Notifications</p>
                <p className="text-[11.5px] text-white/85">
                  {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={reload}
                  disabled={refreshing}
                  aria-label="Refresh"
                  title="Refresh"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 disabled:opacity-60"
                >
                  <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={markAllRead}
                  disabled={!unreadCount || markingAll}
                  className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[11.5px] font-semibold text-emerald-700 transition-opacity disabled:opacity-50"
                >
                  {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
                  Mark all read
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="relative mt-3 flex gap-1 rounded-full bg-white/20 p-1">
              {[
                ["all", "All"],
                ["unread", `Unread${unreadCount ? ` · ${unreadCount}` : ""}`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => selectTab(key)}
                  className={`flex-1 rounded-full py-1 text-[11.5px] font-semibold transition-colors ${
                    tab === key ? "bg-white text-emerald-700 shadow-sm" : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
            {loading ? (
              <Loader variant="inline" center className="py-12" label="Loading notifications…" />
            ) : error ? (
              <EmptyState
                variant="compact"
                tone="error"
                icon="error"
                title="Couldn't load notifications"
                description={error}
                action={{ label: "Try again", onClick: reload }}
              />
            ) : items.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={tab === "unread" ? "notification" : BellOff}
                title={tab === "unread" ? "You're all caught up" : "No notifications yet"}
                description={
                  tab === "unread"
                    ? "No unread notifications — new alerts will show up here."
                    : "Webhook failures, disputes and lapsed plans will show up here."
                }
              />
            ) : (
              <div className="space-y-1">
                {/* Only what the API returns — title, body, createdAt. */}
                {items.map((n, i) => {
                  const sev = SEVERITY[n.severity] || SEVERITY.INFO;
                  const Icon = sev.icon;
                  const to = routeFor(n);
                  return (
                    <button
                      key={n._id}
                      onClick={() => handleItemClick(n)}
                      className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-left transition-colors ${
                        ITEM_TINTS[i % ITEM_TINTS.length]
                      }`}
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sev.tile}`}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={`line-clamp-1 text-[12.5px] ${
                              n.isRead ? "font-medium text-neutral-700 dark:text-neutral-300" : "font-bold text-neutral-900 dark:text-neutral-50"
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] text-neutral-400">
                            {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Unread" />}
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                        {(n.body || to) && (
                          <span className="mt-0.5 flex items-end gap-2">
                            {n.body && (
                              <span className="line-clamp-2 block min-w-0 flex-1 text-[11.5px] leading-snug text-neutral-500">{n.body}</span>
                            )}
                            {to && (
                              <ChevronRight
                                size={13}
                                className="ml-auto shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500"
                              />
                            )}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}

                {hasMore && (
                  <button
                    onClick={() => feedQuery.fetchNextPage()}
                    disabled={loadingMore}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                  >
                    {loadingMore && <Loader2 size={13} className="animate-spin" />}
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
