import { useState } from "react";
import { LogOut, MonitorSmartphone, ShieldAlert } from "lucide-react";
import { Button, Notice } from "../../notification/components/NotificationUi";
import { innerTile } from "../../notification/components/notificationStyles";
import { logoutAllDevices } from "../services/ProfileApi";

/* Sign out everywhere — POST /auth/logout { allDevices: true } (doc #12).
 * Kills every token issued before now, this one included. */
function SessionsPanel({ onSignedOut }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signOutAll = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await logoutAllDevices();
      onSignedOut(res?.message || "Signed out on every device.");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-neutral-200/70 p-3 sm:p-4 dark:border-neutral-800 ${innerTile}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
          <MonitorSmartphone size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-50">Sign out of all devices</p>
          <p className="text-[11.5px] normal-case text-neutral-500">Lost a laptop or phone? This ends every session at once, including this one.</p>
        </div>
        {!confirming && (
          <Button variant="danger" icon={LogOut} onClick={() => setConfirming(true)} className="w-full justify-center border border-red-500/30 text-red-600 sm:w-auto">
            Sign out everywhere
          </Button>
        )}
      </div>
      {confirming && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
          <ShieldAlert size={15} className="shrink-0 text-red-600" />
          <p className="min-w-[12rem] flex-1 text-[12px] normal-case text-red-700 dark:text-red-300">You'll be signed out here too and need to sign in again.</p>
          <Button size="sm" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={signOutAll}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-red-600 disabled:opacity-60"
          >
            <LogOut size={12} /> {busy ? "Signing out…" : "Yes, sign out everywhere"}
          </button>
        </div>
      )}
      {error && (
        <Notice tone="error" className="mt-3">
          {error}
        </Notice>
      )}
    </div>
  );
}

/* Security tab — only "Sign out of all devices"; the password form and the
 * Security card wrapper were removed. */
export default function SecurityCard({ onSignedOut }) {
  return <SessionsPanel onSignedOut={onSignedOut} />;
}
