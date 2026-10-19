/* -------------------------------------------------------------------------
 * Tab session sharing — "close the tab, log in again".
 *
 * The login lives in sessionStorage (see authStore), which the browser wipes
 * when the tab closes. A newly opened tab starts with an empty
 * sessionStorage, so before the app renders it asks the admin tabs that are
 * still open for their session over a BroadcastChannel:
 *   - an open tab answers  → the new tab is logged in too,
 *   - nobody answers       → no admin tab is open → login screen.
 * Logging out in one tab logs every tab out.
 *
 * BroadcastChannel only reaches tabs of this same origin in this same
 * browser, so this stays inside the Admin panel. It takes the store as an
 * argument instead of importing it, to avoid an import cycle with authStore.
 * ---------------------------------------------------------------------- */
import { isTokenValid } from "./session";

const CHANNEL_NAME = "trydood-admin-auth";
// How long a new tab waits for an open tab to answer before showing login.
const ASK_TIMEOUT_MS = 300;

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

/** Asks the open admin tabs for their session; resolves it, or null if none answers. */
function askOpenTabs() {
  if (!channel) return Promise.resolve(null);
  return new Promise((resolve) => {
    const onMessage = (e) => {
      if (e.data?.type === "SESSION" && isTokenValid(e.data.session?.accessToken)) finish(e.data.session);
    };
    const timer = setTimeout(() => finish(null), ASK_TIMEOUT_MS);
    function finish(session) {
      clearTimeout(timer);
      channel.removeEventListener("message", onMessage);
      resolve(session);
    }
    channel.addEventListener("message", onMessage);
    channel.postMessage({ type: "NEED_SESSION" });
  });
}

/** Before the first render: a tab with no session of its own borrows one from an open tab. */
export async function restoreSessionFromOpenTabs(useAuthStore) {
  if (isTokenValid(useAuthStore.getState().accessToken)) return;
  const session = await askOpenTabs();
  if (session) useAuthStore.getState().restoreSession(session);
}

/** Answers other tabs' session requests and follows a logout from any tab. */
export function startSessionSharing(useAuthStore) {
  if (!channel) return;
  channel.addEventListener("message", (e) => {
    const { user, accessToken, refreshToken } = useAuthStore.getState();
    if (e.data?.type === "NEED_SESSION" && isTokenValid(accessToken)) {
      channel.postMessage({ type: "SESSION", session: { user, accessToken, refreshToken } });
    }
    if (e.data?.type === "LOGOUT" && accessToken) {
      useAuthStore.getState().logout({ fromOtherTab: true });
      if (window.location.pathname !== "/") window.location.replace("/");
    }
  });
}

/** Tells every other open admin tab to log out too. */
export function broadcastLogout() {
  channel?.postMessage({ type: "LOGOUT" });
}
