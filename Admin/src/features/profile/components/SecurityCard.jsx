import { useState } from "react";
import { Check, Circle, Eye, EyeOff, KeyRound, LogOut, MonitorSmartphone, ShieldAlert } from "lucide-react";
import { Button, Field, Notice, SectionCard } from "../../notification/components/NotificationUi";
import { inputClass, innerTile } from "../../notification/components/notificationStyles";
import { logoutAllDevices, setPassword } from "../services/ProfileApi";
import { refreshMyProfile } from "../queries/profileQueries";
import { PASSWORD_RULES, formatDate, passwordScore } from "../profileUtils";

const METER = [
  { label: "Too weak", bar: "bg-red-500", text: "text-red-500" },
  { label: "Weak", bar: "bg-red-500", text: "text-red-500" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-amber-400", text: "text-amber-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Very strong", bar: "bg-emerald-600", text: "text-emerald-600" },
];

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <KeyRound size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} pl-9 pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

/* Set or change the password — POST /auth/set-password (doc #9). The
 * current password is asked for only when the account already has one. */
function PasswordForm({ profile }) {
  const hasPassword = Boolean(profile.passwordSetAt);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const rules = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(next) }));
  const score = passwordScore(next);
  const meter = METER[score];
  const mismatch = confirm && confirm !== next;
  const sameAsOld = hasPassword && current && next && current === next;
  const ready = rules.every((r) => r.ok) && next === confirm && (!hasPassword || current) && !sameAsOld;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await setPassword({ currentPassword: hasPassword ? current : undefined, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setStatus({ tone: "success", text: res?.message || "Password saved." });
      refreshMyProfile();
    } catch (err) {
      setStatus({ tone: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <p className="text-[11.5px] normal-case text-neutral-500">
        {hasPassword
          ? `Last changed ${formatDate(profile.passwordSetAt, true)}.`
          : "You sign in with a WhatsApp code today. Set a password to sign in with it too."}
      </p>

      {hasPassword && (
        <Field label="Current password">
          <PasswordInput value={current} onChange={setCurrent} placeholder="Your current password" autoComplete="current-password" />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="New password">
          <PasswordInput value={next} onChange={setNext} placeholder="New password" autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" hint={mismatch ? "Doesn't match the new password." : ""}>
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Type it again" autoComplete="new-password" />
        </Field>
      </div>

      {/* Strength + rules */}
      <div className={`rounded-2xl p-3 ${innerTile}`}>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? meter.bar : "bg-neutral-200 dark:bg-neutral-800"}`} />
            ))}
          </div>
          <span className={`w-20 text-right text-[11px] font-semibold ${next ? meter.text : "text-neutral-400"}`}>{next ? meter.label : "—"}</span>
        </div>
        <ul className="grid grid-cols-2 gap-1">
          {rules.map((r) => (
            <li key={r.key} className={`flex items-center gap-1.5 text-[11.5px] normal-case ${r.ok ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-400"}`}>
              {r.ok ? <Check size={12} strokeWidth={3} /> : <Circle size={11} />} {r.label}
            </li>
          ))}
        </ul>
        {sameAsOld && <p className="mt-1.5 text-[11px] normal-case text-red-500">The new password must be different from the current one.</p>}
      </div>

      {status && <Notice tone={status.tone}>{status.text}</Notice>}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" icon={KeyRound} loading={saving} disabled={!ready}>
          {hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}

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

export default function SecurityCard({ profile, onSignedOut }) {
  return (
    <SectionCard icon={KeyRound} title="Security" subtitle="Password and active sessions">
      <PasswordForm profile={profile} />
      <div className="mt-5 border-t border-neutral-200/70 pt-5 dark:border-neutral-800">
        <SessionsPanel onSignedOut={onSignedOut} />
      </div>
    </SectionCard>
  );
}
