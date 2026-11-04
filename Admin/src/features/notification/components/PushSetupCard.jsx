import { useState } from "react";
import { BellOff, BellRing, Monitor } from "lucide-react";
import { registerDeviceToken, unregisterDeviceToken } from "../services/DeviceTokenApi";
import { FCM_TOKEN_STORAGE_KEY, getBrowserDeviceId, getPushToken } from "../../../config/firebaseMessaging";
import { Button, Notice, Pill, SectionCard } from "./NotificationUi";
import { innerTile } from "./notificationStyles";

/* -------------------------------------------------------------------------
 * This browser as a push device — lets the admin receive their own test
 * broadcasts. Firebase token (config/firebaseMessaging.js) +
 * POST/PUT /deviceTokens/register|unregister. Same logic the old page had.
 * ---------------------------------------------------------------------- */
const FCM_TOKEN_IS_REAL_KEY = "trydood-admin-fcm-token-is-real";

const browserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "This browser";
};

export default function PushSetupCard() {
  const [token, setToken] = useState(() => localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || "");
  const [isReal, setIsReal] = useState(() => localStorage.getItem(FCM_TOKEN_IS_REAL_KEY) === "true");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const registered = Boolean(token);

  const enable = async () => {
    setBusy(true);
    setError("");
    try {
      // Falls back to a placeholder token when a real FCM token can't be
      // had yet (e.g. no VAPID key) — the device row still registers.
      const { token: fcmToken, isReal: real } = await getPushToken();
      await registerDeviceToken({
        token: fcmToken,
        platform: "WEB",
        deviceId: getBrowserDeviceId(),
        deviceName: navigator.userAgent.slice(0, 80),
        appVersion: "1.0.0",
      });
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
      localStorage.setItem(FCM_TOKEN_IS_REAL_KEY, String(real));
      setToken(fcmToken);
      setIsReal(real);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError("");
    try {
      await unregisterDeviceToken({ token, allDevices: false });
      localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
      localStorage.removeItem(FCM_TOKEN_IS_REAL_KEY);
      setToken("");
      setIsReal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      icon={registered ? BellRing : BellOff}
      title="Push on this browser"
      subtitle="Receive your own sends here to test them"
      right={<Pill tint={registered ? "emerald" : "neutral"}>{registered ? "On" : "Off"}</Pill>}
    >
      <div className={`flex items-center gap-3 rounded-2xl p-3 ${innerTile}`}>
        <Monitor size={16} className="shrink-0 text-neutral-400" />
        <div className="min-w-0 flex-1 text-[11.5px]">
          <p className="font-semibold text-neutral-800 dark:text-neutral-200">{browserName()}</p>
          <p className="truncate text-neutral-500">
            {registered ? (isReal ? "Real FCM token" : "Placeholder token — can't receive real push yet") : "Not registered"}
          </p>
        </div>
        <Button variant={registered ? "ghost" : "primary"} size="sm" loading={busy} onClick={registered ? disable : enable}>
          {registered ? "Disable" : "Enable"}
        </Button>
      </div>
      {error && (
        <Notice tone="error" className="mt-2.5">
          {error}
        </Notice>
      )}
    </SectionCard>
  );
}
