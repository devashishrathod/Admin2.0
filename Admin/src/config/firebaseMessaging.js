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
    throw new Error("VITE_FIREBASE_VAPID_KEY is not set — add it to Admin/.env (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates).");
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
  const key = "trydood-admin-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `web_${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// Shared across authStore.js (register on login, unregister on logout) and
// Notification.jsx's Push Setup card, so both read/write the same slot.
export const FCM_TOKEN_STORAGE_KEY = "trydood-admin-fcm-token";
