import React, { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Radio,
  FlaskConical,
  Users,
  ShieldCheck,
  Link2,
  Globe,
  Search,
  X,
  Info,
  Eye,
} from "lucide-react";
import { broadcastNotification } from "./services/NotificationApi";
import { registerDeviceToken, unregisterDeviceToken } from "./services/DeviceTokenApi";
import { getPushToken, getBrowserDeviceId, FCM_TOKEN_STORAGE_KEY } from "../../config/firebaseMessaging";

// Placeholder audience — swap for a real GET /users?search= call once that
// endpoint exists. Same shape as the mock rows in features/customer/Customer.jsx.
const MOCK_USERS = [
  { id: "cus_1001", name: "Rohit Sharma", email: "rohit.sharma@example.com" },
  { id: "cus_1002", name: "Ananya Verma", email: "ananya.verma@example.com" },
  { id: "cus_1003", name: "Karan Mehta", email: "karan.mehta@example.com" },
  { id: "cus_1004", name: "Priya Nair", email: "priya.nair@example.com" },
  { id: "cus_1005", name: "Devansh Gupta", email: "devansh.gupta@example.com" },
];

const inputClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3.5 py-2.5 text-[13px] text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-colors focus:border-emerald-500/50";

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
        {required && <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function StepLabel({ n, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
        {n}
      </span>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Push Setup — registers/unregisters this admin's own browser as a push
 * device via Firebase (config/firebaseMessaging.js) + POST/PUT
 * /deviceTokens/register|unregister. Broadcasts (below) with "Send push"
 * checked reach whatever device is registered here.
 * ---------------------------------------------------------------------- */
const FCM_TOKEN_IS_REAL_KEY = "trydood-admin-fcm-token-is-real";

function BentoFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 p-3.5">
      <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
        <Icon size={14} />
      </span>
      <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}

function PushSetupCard() {
  const [token, setToken] = useState(() => localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || "");
  const [isReal, setIsReal] = useState(() => localStorage.getItem(FCM_TOKEN_IS_REAL_KEY) === "true");
  const [deviceId] = useState(() => getBrowserDeviceId());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const registered = Boolean(token);
  const browserLabel = navigator.userAgent.includes("Chrome")
    ? "Chrome"
    : navigator.userAgent.includes("Firefox")
    ? "Firefox"
    : navigator.userAgent.includes("Safari")
    ? "Safari"
    : "This browser";

  const handleEnable = async () => {
    setBusy(true);
    setError("");
    try {
      // Falls back to a placeholder token (same shape the Vendor Panel
      // uses) when a real FCM token can't be obtained yet — e.g. no
      // VAPID key set — so this still registers a device instead of
      // just erroring out.
      const { token: fcmToken, isReal: real } = await getPushToken();
      console.log(`[Push Setup] Push token (${real ? "real FCM" : "placeholder"}):`, fcmToken);
      const result = await registerDeviceToken({
        token: fcmToken,
        platform: "WEB",
        deviceId: getBrowserDeviceId(),
        deviceName: navigator.userAgent.slice(0, 80),
        appVersion: "1.0.0",
      });
      console.log("[Push Setup] deviceTokens/register response:", result);
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

  const handleDisable = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await unregisterDeviceToken({ token, allDevices: false });
      console.log("[Push Setup] deviceTokens/unregister response:", result);
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
      <div className="col-span-2 row-span-2 rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${registered ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"}`}>
              {registered ? <Bell size={17} /> : <BellOff size={17} />}
            </span>
            <div>
              <p className="text-[14.5px] font-semibold text-neutral-800 dark:text-neutral-100">Push Setup (this browser)</p>
              <p className="mt-0.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                {registered
                  ? isReal
                    ? "This browser is registered and can receive real push."
                    : "Registered with a placeholder token — the device row exists, but it can't receive real push yet."
                  : "Register this browser so broadcasts with push enabled can reach it."}
              </p>
            </div>
          </div>

          <button
            onClick={registered ? handleDisable : handleEnable}
            disabled={busy}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              registered
                ? "border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                : "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
            }`}
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {registered ? "Disable" : "Enable Push"}
          </button>
        </div>

        {registered && !isReal && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-3.5 py-2.5 text-[12.5px] text-amber-600 dark:text-amber-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            No VAPID key set yet, so this registered with a placeholder token (not a real FCM token). The API
            call works and shows up in the backend, but push won't actually deliver here until{" "}
            <code className="rounded bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 text-[11px]">VITE_FIREBASE_VAPID_KEY</code> is
            set and this is re-enabled.
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <BentoFact icon={Radio} label="Status" value={registered ? "Registered" : "Not Registered"} />
      <BentoFact icon={Globe} label="Browser" value={browserLabel} />
      <BentoFact icon={ShieldCheck} label="Token Type" value={registered ? (isReal ? "Real FCM" : "Placeholder") : "—"} />
      <BentoFact icon={Users} label="Device ID" value={deviceId.replace("web_", "").slice(0, 13)} />
    </div>
  );
}

/* Big selectable card used for the audience picker — same "chosen state"
 * language as the Subscription action cards (border + tint when active). */
function AudienceOption({ active, icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-colors ${
        active
          ? "border-emerald-400/60 bg-emerald-400/10"
          : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700"
      }`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"}`}>
        <Icon size={14} />
      </span>
      <div>
        <p className={`text-[12.5px] font-medium ${active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-800 dark:text-neutral-200"}`}>{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{description}</p>
      </div>
    </button>
  );
}

/* Chip input for free-typed role names — Enter or comma commits a chip. */
function RoleChipInput({ roles, onChange }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim().toUpperCase();
    if (v && !roles.includes(v)) onChange([...roles, v]);
    setDraft("");
  };

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 focus-within:border-emerald-500/50">
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => (
          <span key={r} className="flex items-center gap-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300">
            {r}
            <button type="button" onClick={() => onChange(roles.filter((x) => x !== r))} aria-label={`Remove ${r}`} className="text-neutral-500 hover:text-red-600 dark:hover:text-red-400">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(",", ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && roles.length) {
              onChange(roles.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={roles.length ? "" : "e.g. VENDOR, then Enter"}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[13px] text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none"
        />
      </div>
    </div>
  );
}

/* Searchable multi-select over the (placeholder) user list — search, pick
 * from the dropdown, selected users render as removable chips. */
function UserPicker({ selected, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_USERS.filter((u) => !selected.some((s) => s.id === u.id))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, selected]);

  const pick = (user) => {
    onChange([...selected, user]);
    setQuery("");
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u.id} className="flex items-center gap-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300">
              {u.name}
              <button type="button" onClick={() => onChange(selected.filter((s) => s.id !== u.id))} aria-label={`Remove ${u.name}`} className="text-neutral-500 hover:text-red-600 dark:hover:text-red-400">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3.5 py-2.5 focus-within:border-emerald-500/50">
          <Search size={13} className="shrink-0 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Search users by name or email…"
            className="w-full bg-transparent text-[13px] text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none"
          />
        </div>

        {open && results.length > 0 && (
          <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl bg-white dark:bg-neutral-900 shadow-xl dark:shadow-black/40">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(u)}
                className="flex w-full flex-col items-start px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{u.name}</span>
                <span className="text-[11px] text-neutral-500">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-600">Placeholder list — will switch to live user search once that API exists.</p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Broadcast — one form, two audience modes (roles / specific users) and
 * two actions (Dry Run, Send) against the same POST /notifications/broadcast
 * endpoint, matching the three Postman requests in that folder.
 * ---------------------------------------------------------------------- */
function BroadcastSection() {
  const [audienceMode, setAudienceMode] = useState("roles"); // 'roles' | 'users' | 'all'
  const [roles, setRoles] = useState(["VENDOR"]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [confirmAll, setConfirmAll] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("INFO");
  const [deepLink, setDeepLink] = useState("");
  const [push, setPush] = useState(true);

  const [submittingMode, setSubmittingMode] = useState(null); // null | 'dryRun' | 'send'
  const [result, setResult] = useState(null); // { tone, message }

  const audienceReady =
    audienceMode === "all" || (audienceMode === "roles" ? roles.length > 0 : selectedUsers.length > 0);

  const canSubmit = (mode) =>
    Boolean(title.trim() && body.trim() && audienceReady) &&
    (mode !== "send" || audienceMode !== "all" || confirmAll);

  const runBroadcast = async (mode) => {
    if (!canSubmit(mode) || submittingMode) return;
    setSubmittingMode(mode);
    setResult(null);

    const target =
      audienceMode === "roles"
        ? { roles }
        : audienceMode === "users"
        ? { userIds: selectedUsers.map((u) => u.id) }
        : null; // "all users" — omit target entirely

    const payload = {
      title: title.trim(),
      body: body.trim(),
      ...(target ? { target } : {}),
      severity,
      ...(deepLink.trim() ? { deepLink: deepLink.trim() } : {}),
      ...(mode === "dryRun" ? { dryRun: true } : { push, dryRun: false }),
    };

    try {
      const data = await broadcastNotification(payload);
      if (mode === "dryRun") {
        const count = data?.audienceCount ?? data?.count ?? data?.totalRecipients;
        setResult({
          tone: "success",
          message:
            data?.message ||
            (count != null ? `Audience resolved — ${count} recipient(s). Nothing was sent.` : "Audience resolved. Nothing was sent."),
        });
      } else {
        setResult({
          tone: "success",
          message: data?.message || "Broadcast sent.",
        });
      }
    } catch (err) {
      setResult({ tone: "error", message: err.message });
    } finally {
      setSubmittingMode(null);
    }
  };

  const toneStyles = {
    success: "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-600 dark:text-emerald-400",
    error: "border-red-500/30 bg-red-500/[0.06] text-red-600 dark:text-red-400",
  };
  const ToneIcon = result?.tone === "success" ? CheckCircle2 : AlertTriangle;

  // Plain-language summary of the current audience selection — display only,
  // derived from the same state the payload itself is built from.
  const audienceSummary =
    audienceMode === "all"
      ? "All users on the platform"
      : audienceMode === "roles"
      ? roles.length
        ? `Everyone with role: ${roles.join(", ")}`
        : "No roles selected yet"
      : selectedUsers.length
      ? `${selectedUsers.length} selected user${selectedUsers.length > 1 ? "s" : ""}`
      : "No users selected yet";

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-600 dark:text-sky-400">
          <Radio size={17} />
        </span>
        <div>
          <p className="text-[14.5px] font-semibold text-neutral-800 dark:text-neutral-100">Create Notification</p>
          <p className="mt-0.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
            Role-targeted or specific-user push notifications, with a dry run to check the audience first.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* ── Form ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* ── Priority ─────────────────────────────────────────── */}
          <div>
            <StepLabel n={1}>Priority</StepLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AudienceOption
                active={severity === "INFO"}
                icon={Info}
                title="Info"
                description="Standard update — no urgency implied."
                onClick={() => setSeverity("INFO")}
              />
              <AudienceOption
                active={severity === "WARNING"}
                icon={AlertTriangle}
                title="Warning"
                description="Flagged as important — stands out more to the recipient."
                onClick={() => setSeverity("WARNING")}
              />
            </div>
          </div>

          {/* ── Audience ─────────────────────────────────────────── */}
          <div>
            <StepLabel n={2}>Audience</StepLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <AudienceOption
                active={audienceMode === "roles"}
                icon={ShieldCheck}
                title="By Role(s)"
                description="Everyone with the given role, e.g. all vendors."
                onClick={() => setAudienceMode("roles")}
              />
              <AudienceOption
                active={audienceMode === "users"}
                icon={Users}
                title="Specific Users"
                description="Pick individual people from search."
                onClick={() => setAudienceMode("users")}
              />
              <AudienceOption
                active={audienceMode === "all"}
                icon={Globe}
                title="All Users"
                description="Every user on the platform."
                onClick={() => setAudienceMode("all")}
              />
            </div>

            <div className="mt-3">
              {audienceMode === "roles" && (
                <Field label="Roles" required>
                  <RoleChipInput roles={roles} onChange={setRoles} />
                </Field>
              )}
              {audienceMode === "users" && (
                <Field label="Users" required>
                  <UserPicker selected={selectedUsers} onChange={setSelectedUsers} />
                </Field>
              )}
              {audienceMode === "all" && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-3.5 py-3">
                  <div className="flex items-start gap-2 text-[12.5px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    This sends to every user on the platform. Dry run first to check the reach.
                  </div>
                  <label className="mt-2.5 flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={confirmAll}
                      onChange={(e) => setConfirmAll(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 accent-amber-400"
                    />
                    I understand this broadcasts to all users
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* ── Message ──────────────────────────────────────────── */}
          <div>
            <StepLabel n={3}>Message</StepLabel>
            <div className="space-y-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
              <Field label="Title" required>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </Field>

              <Field label="Body" required>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} className={inputClass} />
              </Field>

              <Field label="Deep Link (optional)">
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3.5 py-2.5 focus-within:border-emerald-500/50">
                  <Link2 size={13} className="shrink-0 text-neutral-500" />
                  <input
                    value={deepLink}
                    onChange={(e) => setDeepLink(e.target.value)}
                    placeholder="/subscription/invoices"
                    className="w-full bg-transparent text-[13px] text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none"
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* ── Delivery ─────────────────────────────────────────── */}
          <div>
            <StepLabel n={4}>Delivery</StepLabel>
            <label className="flex items-center gap-2 text-[12.5px] text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={push}
                onChange={(e) => setPush(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 accent-emerald-400"
              />
              Send push (not just in-app) when broadcasting
            </label>
          </div>

          {result && (
            <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] ${toneStyles[result.tone]}`}>
              <ToneIcon size={13} className="mt-0.5 shrink-0" />
              {result.message}
            </div>
          )}

          <div className="flex flex-col justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={() => runBroadcast("dryRun")}
              disabled={!canSubmit("dryRun") || Boolean(submittingMode)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submittingMode === "dryRun" ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
              Dry Run
            </button>
            <button
              type="button"
              onClick={() => runBroadcast("send")}
              disabled={!canSubmit("send") || Boolean(submittingMode)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submittingMode === "send" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send Broadcast
            </button>
          </div>
        </div>

        {/* ── Live Preview ─────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Eye size={13} className="text-neutral-500" />
            <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Live Preview</p>
          </div>

          <div className="lg:sticky lg:top-6">
            <div className="mx-auto w-[220px]">
              <div className="relative rounded-[2rem] border-4 border-neutral-800 bg-neutral-950 p-1.5 shadow-xl shadow-black/40">
                <div className="absolute left-1/2 top-1.5 h-1.5 w-14 -translate-x-1/2 rounded-full bg-neutral-800" />
                <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 px-2.5 pb-4 pt-7">
                  <div className="mb-3 flex items-center justify-between px-0.5 text-[10px] font-medium text-neutral-400">
                    <span>9:41</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                  </div>
                  <div className="rounded-xl border border-neutral-700/60 bg-neutral-900/95 p-2.5 shadow-lg shadow-black/30">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-400">
                        <Bell size={10} />
                      </span>
                      <span className="text-[10px] font-semibold tracking-wide text-neutral-300">TRYDOOD</span>
                      {severity === "WARNING" && (
                        <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[8.5px] font-semibold text-amber-400">
                          !
                        </span>
                      )}
                      <span className="ml-auto text-[9px] text-neutral-500">now</span>
                    </div>
                    <p className="mt-1.5 truncate text-[12px] font-semibold text-neutral-50">
                      {title.trim() || "Your notification title"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-neutral-400">
                      {body.trim() || "Body text appears here as you type."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 p-3 text-[12px] shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
              <p className="font-medium text-neutral-700 dark:text-neutral-300">Going to</p>
              <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{audienceSummary}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Notification() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
            <Bell size={19} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Notifications</h1>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">Push notification setup and broadcast tools.</p>
          </div>
        </div>

        <div className="space-y-4">
          <PushSetupCard />
          <BroadcastSection />
        </div>
      </div>
    </div>
  );
}
