# Firebase Push Setup (Admin → Vendor)

Exactly how Web Push (Firebase Cloud Messaging) is wired into the Admin panel —
config, service worker, login/logout hooks, and the backend endpoints it
calls. Follow this in order to get the same flow running in Vendor.

**Stack assumed:** Vite + React (same as Admin), `firebase ^12.18.0`, same
backend and same Firebase project as Admin.

## Overview

Admin registers each browser as a push device with the backend, which relays
messages through Firebase Cloud Messaging. Two moments matter: **registering**
a token (on login, and from a manual "Enable Push" button) and **receiving**
a push, whether the tab is open or not.

```
register:  Vendor browser --token--> Your backend --stores--> deviceTokens collection
receive:   Your backend --sends--> Firebase Cloud Messaging --delivers--> Vendor browser
```

| File | Purpose |
|---|---|
| `.env` | Firebase web config + VAPID key, read at build time |
| `src/config/firebase.js` | Initializes the Firebase app (+ optional analytics) |
| `src/config/firebaseMessaging.js` | Requests permission, gets the FCM token, listens for foreground pushes, device-id helper |
| `public/firebase-messaging-sw.js` | Handles pushes while the tab is closed or backgrounded — runs outside Vite |
| Auth store (login/logout) | Registers the device on login, unregisters on logout — fire-and-forget |
| `services/DeviceTokenApi.js` | `POST /deviceTokens/register`, `PUT /deviceTokens/unregister` |

---

## 1. Install the SDK

```bash
npm install firebase@^12.18.0
```

## 2. Pull the config from Firebase Console

Vendor uses **the same Firebase project** as Admin — don't create a new one.
Register a second web app under it, or reuse the existing config values if
one is fine for both.

- **Project Settings → General → Your apps** — add/open a web app to get
  `apiKey`, `authDomain`, `projectId`, `storageBucket`,
  `messagingSenderId`, `appId`, `measurementId`.
- **Project Settings → Cloud Messaging → Web Push certificates** — this is
  the `VAPID key`. Admin already has one generated; it can be reused.

> These are the exact same seven values already sitting in `Admin/.env` —
> copy them across rather than re-typing.

## 3. Add the environment variables

Vite exposes anything prefixed `VITE_` via `import.meta.env`. Add these to
Vendor's `.env`:

```env
# same values as Admin/.env — same Firebase project
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=
```

> **Watch out:** if Vendor isn't a Vite app (Create React App, Next.js,
> etc.), the prefix and access pattern differ — `REACT_APP_` +
> `process.env` for CRA, no prefix + server/client split for Next. The
> variable *names* still apply; only the lookup syntax in steps 4–5 changes.

## 4. `src/config/firebase.js`

Copy verbatim — nothing here is Admin-specific.

```js
// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";

// Values come from .env (VITE_ prefix), same convention as VITE_API_BASE_URL
// elsewhere in this repo — set them in Vendor/.env before this is usable.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

// getAnalytics() throws outside a supported browser context (no
// measurementId, private browsing with storage blocked, etc.) — resolve
// lazily instead of calling it eagerly at module load.
export const analyticsPromise = isAnalyticsSupported().then((ok) =>
  ok && firebaseConfig.measurementId ? getAnalytics(firebaseApp) : null
);
```

## 5. `src/config/firebaseMessaging.js`

Requests notification permission, gets the FCM token, and exposes a
device-id helper. The one real change from Admin: the `localStorage` key
names — give Vendor its own so the two apps never collide if they're ever
served from the same origin.

```js
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { firebaseApp } from "./firebase";

export async function requestFcmToken() {
  if (!(await isSupported())) {
    throw new Error("Push notifications aren't supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error("VITE_FIREBASE_VAPID_KEY is not set — add it to Vendor/.env.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) {
    throw new Error("Could not generate a push token for this browser.");
  }
  return token;
}

function generatePlaceholderToken() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `web-placeholder-${Date.now()}-${rand}`;
}

// Falls back to a placeholder token when a real one can't be obtained (no
// VAPID key yet, permission denied, unsupported browser) — the device still
// registers with the backend instead of the whole flow silently doing nothing.
export async function getPushToken() {
  try {
    return { token: await requestFcmToken(), isReal: true };
  } catch (err) {
    console.warn("[Push] Falling back to a placeholder token:", err.message);
    return { token: generatePlaceholderToken(), isReal: false };
  }
}

export async function onForegroundMessage(callback) {
  if (!(await isSupported())) return () => {};
  const messaging = getMessaging(firebaseApp);
  return onMessage(messaging, callback);
}

export function getBrowserDeviceId() {
  // changed from Admin's "trydood-admin-device-id"
  const key = "trydood-vendor-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `web_${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// changed from Admin's "trydood-admin-fcm-token" — shared by the auth store
// (register on login, unregister on logout) and any "enable push" UI, so both
// read/write the same slot.
export const FCM_TOKEN_STORAGE_KEY = "trydood-vendor-fcm-token";
```

## 6. `public/firebase-messaging-sw.js`

This is what shows a notification when the Vendor tab is closed or
backgrounded. It has to live at `public/firebase-messaging-sw.js` — the
browser fetches it directly at the site root, so it never passes through
Vite and `import.meta.env` doesn't exist inside it. The config values have
to be pasted in literally.

> These aren't secret — they're the same values that end up embedded in
> Admin's public bundle. Copy them straight from
> `Admin/public/firebase-messaging-sw.js`.

```js
// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  // same 6 values as Admin/public/firebase-messaging-sw.js
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(
    // changed from Admin's "TryDood Admin"
    notification.title || data.title || "TryDood Vendor",
    {
      body: notification.body || data.body || "",
      icon: "/vite.svg",
      data,
    }
  );
});
```

## 7. Register on login, unregister on logout

Wire this into wherever Vendor's login/logout actions live (its auth store,
if it has one like Admin's). Both calls are **best-effort** — a denied
permission or a missing VAPID key must never block an actual login or
logout, so every failure is caught and logged, not thrown.

```js
// Lazily imported to avoid a static import cycle with the messaging/device
// modules — same pattern as the axios interceptors elsewhere in this repo.
async function registerDeviceForPush() {
  try {
    const { getPushToken, getBrowserDeviceId, FCM_TOKEN_STORAGE_KEY } = await import("../config/firebaseMessaging");

    // Already registered this browser — don't re-request permission or call
    // register() on every login. logout() clears this key.
    if (window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY)) return;

    const { registerDeviceToken } = await import("../../notification/services/DeviceTokenApi");
    const { token: fcmToken, isReal } = await getPushToken();
    console.log(`[Auth] Push token (${isReal ? "real FCM" : "placeholder"}):`, fcmToken);

    await registerDeviceToken({
      token: fcmToken,
      platform: "WEB",
      deviceId: getBrowserDeviceId(),
      deviceName: navigator.userAgent.slice(0, 80),
      appVersion: "1.0.0",
    });
    window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
  } catch (err) {
    console.warn("[Auth] Could not register this browser for push:", err.message);
  }
}

async function unregisterDeviceForPush() {
  try {
    const { FCM_TOKEN_STORAGE_KEY } = await import("../config/firebaseMessaging");
    const token = window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (!token) return;

    const { unregisterDeviceToken } = await import("../../notification/services/DeviceTokenApi");
    await unregisterDeviceToken({ token, allDevices: false });
    window.localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  } catch (err) {
    console.warn("[Auth] Could not unregister this browser from push:", err.message);
  }
}

// call registerDeviceForPush() right after a successful login, and
// unregisterDeviceForPush() right before clearing the session on logout —
// fire-and-forget, don't await either one in the login/logout flow itself.
```

## 8. Backend endpoints this expects

Same backend as Admin, so these should already exist — Vendor just needs its
own service wrapper calling them.

| Endpoint | Body |
|---|---|
| `POST /deviceTokens/register` | `{ token, platform, deviceId, deviceName, appVersion }` |
| `PUT /deviceTokens/unregister` | `{ token, allDevices }` |
| `POST /deviceTokens/test` *(optional)* | `{ title, body }` — pushes to the logged-in user's own devices, useful for a "send test push" button |
| `POST /notifications/broadcast` *(optional, admin-only in Admin)* | `{ title, body, target, severity, dryRun }` — Vendor likely never calls this one |

## 9. Gotchas

- **No VAPID key yet?** `getPushToken()` silently falls back to a
  placeholder token so registration still succeeds — real push just won't
  be delivered until the key is set.
- **Service worker scope.** `firebase-messaging-sw.js` must be served from
  the site root (`public/` in Vite), not a subfolder — its default scope is
  the directory it's served from.
- **HTTPS or localhost only.** Service workers and the Notification API
  refuse to register over plain HTTP on any other host.
- **One permission prompt per browser.** Once a user denies it,
  `Notification.requestPermission()` won't prompt again — they have to
  re-enable it from the browser's own site settings.
- **Not every browser supports it.** `isSupported()` is checked before
  every messaging call for exactly this reason — Safari and some in-app
  webviews don't.

---

*Mirrors Admin's implementation as of this writing —
`src/config/firebase.js`, `firebaseMessaging.js`,
`public/firebase-messaging-sw.js`, and the auth-store hooks.*
