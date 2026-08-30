// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional.
// Values come from .env (VITE_ prefix) rather than being hardcoded, same
// convention as VITE_API_BASE_URL elsewhere in this repo — set them in
// Admin/.env before this is usable.
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
