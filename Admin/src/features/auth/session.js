/* -------------------------------------------------------------------------
 * Session helpers — keep the admin logged in for as long as the token is
 * actually valid, and send them to the login screen (with a message) the
 * moment it isn't.
 *
 * There's no refresh-token endpoint: the JWT lives for the backend's
 * JWT_EXPIRY, and an expired token gets 401 "Your session has expired.
 * Please log in again." (API doc → Authentication). So:
 *   - isTokenValid / getTokenExpiry read `exp` straight from the JWT,
 *   - attachSessionHandling(api) adds a 401 handler to an axios instance
 *     (every service file creates its own instance, so each one calls it),
 *   - expireSession() logs out once and goes to the login screen.
 * ---------------------------------------------------------------------- */

import { invalidateAfterWrite } from "../../lib/query";

// JWT payload is base64url JSON; returns null for anything unreadable.
function decodeJwtPayload(token) {
  try {
    const part = String(token).split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Expiry time in ms, or null when the token has no readable `exp`. */
export function getTokenExpiry(token) {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

/** A token is valid if present and not past its `exp` (no `exp` → trust it; the server will 401 if not). */
export function isTokenValid(token) {
  if (!token) return false;
  const expiresAt = getTokenExpiry(token);
  return expiresAt === null || expiresAt > Date.now();
}

let expiring = false;

/** Logs out (once) and sends the admin to the login screen with a "session expired" note. */
export async function expireSession() {
  if (expiring) return;
  const { useAuthStore } = await import("./store/authStore");
  const wasLoggedIn = Boolean(useAuthStore.getState().accessToken);
  if (wasLoggedIn) useAuthStore.getState().logout();

  // Already on the login screen (e.g. a 401 from something that loads on
  // every page) — nothing to redirect to; reloading here would loop.
  if (window.location.pathname === "/") return;

  expiring = true;
  const params = new URLSearchParams();
  if (wasLoggedIn) params.set("session", "expired");
  params.set("from", window.location.pathname + window.location.search);
  window.location.replace(`/?${params.toString()}`);
}

/** Adds the shared response handling to one axios instance:
 *  - success on a write (POST/PUT/PATCH/DELETE) → refresh the cached data
 *    it changed, on every screen (lib/query/invalidateAfterWrite.js),
 *  - 401 → logout and back to login. */
export function attachSessionHandling(api) {
  api.interceptors.response.use(
    (response) => {
      invalidateAfterWrite(response.config);
      return response;
    },
    (error) => {
      // 401 = not authenticated / session expired (permission problems are 403).
      if (error?.response?.status === 401) expireSession();
      return Promise.reject(error);
    }
  );
  return api;
}
