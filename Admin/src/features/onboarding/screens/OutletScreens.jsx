import { useEffect, useRef, useState } from "react";
import { Check, Clock, ExternalLink, KeyRound, Lock, MapPin, Pencil, Plus, RefreshCw, Store, Trash2 } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, SecondaryButton, Field, Note, Section, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { useOnboardingOutlets, useOutletLocation } from "../queries/onboardingQueries";
import Loader from "../../../components/common/Loader";
import {
  continueOnboarding,
  addOutlet,
  cancelOutlet,
  addOutletAddress,
  updateOutletAddress,
  saveOutletHours,
} from "../services/onboardingApi";
import { INDIAN_STATES, WEEK_DAYS, WHATSAPP_RE, PIN_RE, errorText } from "../onboardingFlow";
import { verifyOutletOtp, resendOutletOtp, updateOutletWhatsapp } from "../../brand/services/BrandApi";

/* ---- OUTLET_DETAILS ------------------------------------------------
 * Every outlet is one card with three steps, in the server's order:
 *   1 · number verified   signUp-with-whatsapp → the 6-digit code sent to it
 *   2 · address          POST /locations/create · edit PUT /locations/update/:id
 *   3 · opening hours     POST /workHours/upsert
 * 2 and 3 answer 409 OUTLET_NOT_VERIFIED until 1 is done, so they stay
 * locked; each finished step opens the next one.
 * The list is every outlet of the brand (GET /subBrands/get-all), so ones
 * added earlier (by the vendor, or before a reload) can be finished here
 * too. Row state comes from the server (#29 / vendor #35 note 5):
 * verificationState NEVER_VERIFIED · VERIFIED · REVERIFY, holdExpiresAt,
 * locationId and workHoursId (null until saved). continue → 422 missing
 * OUTLET · OUTLET_NOT_VERIFIED:<id> · OUTLET_LOCATION:<id> ·
 * OUTLET_WORK_HOURS:<id>, shown on that outlet's card.
 * ------------------------------------------------------------------- */

const payload = (res) => res?.data ?? res ?? {};

const DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const EMPTY_ADDR = { addressLine1: "", addressLine2: "", landmark: "", city: "", state: "", zipcode: "", coords: "" };
const DEFAULT_HOURS = Object.fromEntries(WEEK_DAYS.map((d) => [d, { isOpen: d !== "sunday", start: "10:00", end: "22:00" }]));

/** "19.0596, 72.8295" (Google Maps → right-click → copy) → { lat, lng }, or null. */
function parseCoords(text) {
  const parts = String(text || "").trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const [lat, lng] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const addressText = (a) => (a ? [a.addressLine1, a.addressLine2, a.landmark, a.city, a.state, a.zipcode].filter(Boolean).join(", ") : "");

const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
// The server stores the state lower-cased ("madhya pradesh") — match the select's option.
const stateOption = (s) => INDIAN_STATES.find((x) => x.toLowerCase() === String(s || "").trim().toLowerCase()) || "";

/** A saved location (GET /locations/get/:id) → the address form's values. */
function toAddressForm(loc) {
  if (!loc) return null;
  const [lng, lat] = loc.geo?.coordinates || loc.coordinates || [];
  return {
    addressLine1: loc.addressLine1 || "",
    addressLine2: loc.addressLine2 || "",
    landmark: loc.landmark || "",
    city: titleCase(loc.city),
    state: stateOption(loc.state),
    zipcode: loc.zipcode || "",
    coords: lat != null && lng != null ? `${lat}, ${lng}` : "",
  };
}

/** Saved work hours (when the row carries them) → the hours form's values. */
function hoursFromServer(workHours) {
  if (!workHours || typeof workHours !== "object") return null;
  return Object.fromEntries(
    WEEK_DAYS.map((d) => {
      const day = workHours[d] || {};
      return [d, { isOpen: Boolean(day.isOpen), start: day.start || "10:00", end: day.end || "22:00" }];
    })
  );
}

// continue's 422 `missing` codes → what each outlet still needs.
const MISSING_PART = { OUTLET_NOT_VERIFIED: "verify", OUTLET_LOCATION: "address", OUTLET_WORK_HOURS: "hours" };
const PART_LABEL = { verify: "WhatsApp verification", address: "address", hours: "opening hours" };
function missingByOutlet(missing = []) {
  const out = {};
  missing.forEach((m) => {
    const [code, id] = String(m).split(":");
    if (id && MISSING_PART[code]) (out[id] ||= []).push(MISSING_PART[code]);
  });
  return out;
}

/** { monday: { isOpen, start, end } … } → "Mon–Sat 10:00–22:00 · Sun closed". */
function hoursText(days) {
  if (!days) return "";
  const label = (d) => (days[d]?.isOpen ? `${days[d].start}–${days[d].end}` : "closed");
  const groups = [];
  WEEK_DAYS.forEach((d) => {
    const last = groups[groups.length - 1];
    if (last && last.label === label(d)) last.to = d;
    else groups.push({ from: d, to: d, label: label(d) });
  });
  return groups.map((g) => `${DAY_SHORT[g.from]}${g.to !== g.from ? `–${DAY_SHORT[g.to]}` : ""} ${g.label}`).join(" · ");
}

/* ---- small pieces --------------------------------------------------- */

function LinkButton({ icon: Icon, children, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition ${
        danger
          ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
          : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-400/10"
      }`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/** One numbered step inside an outlet card. `state`: done · active · locked. */
function Step({ n, title, state, summary, action, last, children }) {
  const dot =
    state === "done"
      ? "bg-emerald-700 text-white"
      : state === "active"
        ? "border-2 border-emerald-700 bg-white text-emerald-700 dark:bg-neutral-900 dark:text-emerald-400"
        : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500";
  return (
    <li className="relative flex gap-3">
      {!last && <span aria-hidden="true" className="absolute bottom-0 left-[15px] top-9 w-px bg-neutral-200 dark:bg-neutral-800" />}
      <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${dot}`}>
        {state === "done" ? <Check size={15} /> : state === "locked" ? <Lock size={13} /> : n}
      </span>
      <div className={`flex min-w-0 flex-1 flex-col gap-3 ${last ? "" : "pb-6"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className={`m-0 text-[14.5px] font-semibold ${state === "locked" ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-900 dark:text-neutral-100"}`}>{title}</p>
            {summary && <p className="m-0 mt-0.5 break-words text-[13px] text-neutral-500 dark:text-neutral-400">{summary}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </li>
  );
}

/* ---- step 1 · the WhatsApp code ------------------------------------- */
// POST /auth/verify-otp-whatsapp { role: SUB_VENDOR } marks the outlet's
// login verified. verifyOutletOtp throws that login's token away — the
// admin session is untouched.
// REVERIFY (the number was changed after a verify) only takes the code or a
// resend — fixing the number and removing the outlet are for never-verified
// outlets (409 OUTLET_ALREADY_VERIFIED otherwise).
function CodeVerify({ brandId, outlet, onVerified, onNumberChanged, onRemoved }) {
  const reverify = outlet.verificationState === "REVERIFY";
  const holdUntil = outlet.holdExpiresAt ? new Date(outlet.holdExpiresAt) : null;
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(null); // verify · resend · fix · cancel
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [mode, setMode] = useState(null); // null · fix · cancel
  const [newNumber, setNewNumber] = useState("");
  // Seconds until another code is allowed — only from the server
  // (retryAfterSeconds on the reply or a 429).
  const [cooldown, setCooldown] = useState(0);
  const cooling = cooldown > 0;
  useEffect(() => {
    if (!cooling) return undefined;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooling]);

  const act = async (key, fn) => {
    setBusy(key);
    setError("");
    setInfo("");
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
      if (err?.details?.retryAfterSeconds) setCooldown(err.details.retryAfterSeconds);
    } finally {
      setBusy(null);
    }
  };

  const verify = () =>
    act("verify", async () => {
      await verifyOutletOtp(outlet.whatsappNumber, otp);
      setOtp("");
      onVerified();
    });

  // signUp-with-whatsapp again for an unverified outlet = a new code (no new outlet, no slot).
  const resend = () =>
    act("resend", async () => {
      const res = payload(await resendOutletOtp(brandId, outlet.whatsappNumber));
      if (res?.retryAfterSeconds) setCooldown(res.retryAfterSeconds);
      if (res?.otpSent === false) setError(res?.otpError || "The code couldn't be sent. Try again in a minute.");
      else setInfo(`A new code was sent to +91 ${outlet.whatsappNumber}.`);
    });

  // #28a — only before the number is verified; a code goes to the new number.
  const fixNumber = () =>
    act("fix", async () => {
      const number = newNumber;
      const res = payload(await updateOutletWhatsapp(outlet._id, number));
      onNumberChanged(res?.subBrand?.whatsappNumber || number);
      if (res?.retryAfterSeconds) setCooldown(res.retryAfterSeconds);
      setInfo(
        res?.otpSent === false
          ? `Number changed, but the code couldn't be sent${res?.otpError ? ` (${res.otpError})` : ""}. Use Resend code.`
          : `Number changed. A code was sent to +91 ${number}.`
      );
      setMode(null);
      setNewNumber("");
      setOtp("");
    });

  // #28b — removes the outlet; its plan slot comes back.
  const remove = () =>
    act("cancel", async () => {
      await cancelOutlet(outlet._id);
      onRemoved();
    });

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
      {mode === "fix" ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Correct WhatsApp number" error={newNumber && !WHATSAPP_RE.test(newNumber) ? "10 digits, starts with 6–9" : ""}>
            <input className={`${inputCls} w-52`} type="tel" maxLength={10} value={newNumber} onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, ""))} autoFocus />
          </Field>
          <PrimaryButton busy={busy === "fix"} disabled={!WHATSAPP_RE.test(newNumber) || Boolean(busy)} onClick={fixNumber}>Save & send code</PrimaryButton>
          <SecondaryButton disabled={Boolean(busy)} onClick={() => switchMode(null)}>Cancel</SecondaryButton>
        </div>
      ) : mode === "cancel" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 min-w-[200px] flex-1 text-[13.5px] text-amber-900 dark:text-amber-100">
            Remove this outlet? Its plan slot comes back and the number is free again.
          </p>
          <PrimaryButton tone="dark" busy={busy === "cancel"} disabled={Boolean(busy)} onClick={remove}>Remove outlet</PrimaryButton>
          <SecondaryButton disabled={Boolean(busy)} onClick={() => switchMode(null)}>Keep it</SecondaryButton>
        </div>
      ) : (
        <>
          <p className="m-0 flex items-start gap-2 text-[13.5px] text-amber-900 dark:text-amber-100">
            <KeyRound size={15} className="mt-0.5 shrink-0" />
            <span>
              {reverify
                ? `The WhatsApp number was changed. Enter the code sent to +91 ${outlet.whatsappNumber} to verify it again; customers don't see this outlet until then.`
                : `A 6-digit code was sent on WhatsApp to +91 ${outlet.whatsappNumber}. Enter it here. `}
              {!reverify &&
                (holdUntil && !Number.isNaN(holdUntil.getTime())
                  ? `Not verified by ${holdUntil.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}, the outlet is cancelled automatically.`
                  : "If it isn't verified within the hold time (72 hours by default), the outlet is cancelled automatically.")}
            </span>
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="WhatsApp code">
              <input
                className={`${inputCls} w-40 font-mono tracking-[0.3em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otp.length === 6 && !busy) verify();
                }}
                placeholder="••••••"
              />
            </Field>
            <PrimaryButton busy={busy === "verify"} disabled={otp.length !== 6 || Boolean(busy)} onClick={verify}>Verify</PrimaryButton>
            <SecondaryButton busy={busy === "resend"} disabled={cooling || Boolean(busy)} onClick={resend}>
              <RefreshCw size={14} /> {cooling ? `Resend in ${cooldown}s` : "Resend code"}
            </SecondaryButton>
          </div>
          {!reverify && (
            <div className="-ml-2.5 flex flex-wrap gap-1">
              <LinkButton icon={Pencil} onClick={() => switchMode("fix")}>Wrong number? Fix it</LinkButton>
              <LinkButton icon={Trash2} danger onClick={() => switchMode("cancel")}>Remove outlet</LinkButton>
            </div>
          )}
        </>
      )}
      {error && <Note tone="error">{error}</Note>}
      {info && <Note tone="ok">{info}</Note>}
    </div>
  );
}

/* ---- step 2 · address ----------------------------------------------- */
// `initial` = the saved address (this visit's save, or the fetched location).
function AddressForm({ outlet, initial, onSaved, onCancel }) {
  const [a, setA] = useState(() => initial || EMPTY_ADDR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setA((x) => ({ ...x, [k]: e.target.value }));
  const coords = parseCoords(a.coords);
  const ok = a.addressLine1.trim() && a.city.trim() && a.state && PIN_RE.test(a.zipcode) && coords;
  // A saved address is edited in place (a second create would add another).
  const locationId = typeof outlet.locationId === "string" ? outlet.locationId : null;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const body = {
        addressLine1: a.addressLine1.trim(),
        ...(a.addressLine2.trim() ? { addressLine2: a.addressLine2.trim() } : {}),
        ...(a.landmark.trim() ? { landmark: a.landmark.trim() } : {}),
        city: a.city.trim(),
        state: a.state,
        zipcode: a.zipcode,
        country: "india",
        coordinates: [coords.lng, coords.lat], // [longitude, latitude]
      };
      const res = payload(locationId ? await updateOutletAddress(locationId, body) : await addOutletAddress(outlet._id, body));
      onSaved({ locationId: res?._id || locationId || true, address: { ...a, coords: `${coords.lat}, ${coords.lng}` } });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="sm:col-span-2">
        <Field label="Shop / building and street">
          <input className={inputCls} value={a.addressLine1} onChange={set("addressLine1")} placeholder="e.g. Shop 4, Scheme 54" autoFocus />
        </Field>
      </div>
      <Field label="Area" optional><input className={inputCls} value={a.addressLine2} onChange={set("addressLine2")} placeholder="e.g. Vijay Nagar" /></Field>
      <Field label="Landmark" optional><input className={inputCls} value={a.landmark} onChange={set("landmark")} placeholder="e.g. Near C21 Mall" /></Field>
      <Field label="City"><input className={inputCls} value={a.city} onChange={set("city")} /></Field>
      <Field label="State">
        <select className={inputCls} value={a.state} onChange={set("state")}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="PIN code" error={a.zipcode && !PIN_RE.test(a.zipcode) ? "6 digits" : ""}>
        <input className={inputCls} inputMode="numeric" maxLength={6} value={a.zipcode} onChange={(e) => setA((x) => ({ ...x, zipcode: e.target.value.replace(/\D/g, "") }))} />
      </Field>
      <Field
        label="Map location"
        hint="Google Maps → right-click the outlet → click the numbers to copy → paste here"
        error={a.coords && !coords ? "Paste it as latitude, longitude, e.g. 19.0596, 72.8295" : ""}
      >
        <input className={inputCls} value={a.coords} onChange={set("coords")} placeholder="19.0596, 72.8295" />
      </Field>
      {coords && (
        <div className="sm:col-span-2 -mt-2">
          <a
            href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            <ExternalLink size={13} /> Check this point on Google Maps
          </a>
        </div>
      )}
      <div className="sm:col-span-2">
        <Note tone="muted">Customers only see this outlet's vouchers once it has a map location, so make sure the point is right.</Note>
      </div>
      {error && <div className="sm:col-span-2"><Note tone="error">{error}</Note></div>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <PrimaryButton busy={busy} disabled={!ok} onClick={save}>{locationId || outlet.locationId ? "Save changes" : "Save address"}</PrimaryButton>
        <SecondaryButton disabled={busy} onClick={onCancel}>Cancel</SecondaryButton>
      </div>
    </div>
  );
}

/* ---- step 3 · opening hours ----------------------------------------- */
function HoursForm({ outlet, onSaved, onCancel }) {
  const [days, setDays] = useState(() => outlet.hours || hoursFromServer(outlet.workHours) || DEFAULT_HOURS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setDay = (d, patch) => setDays((x) => ({ ...x, [d]: { ...x[d], ...patch } }));
  const badDay = WEEK_DAYS.find((d) => days[d].isOpen && !(days[d].start < days[d].end));
  const anyOpen = WEEK_DAYS.some((d) => days[d].isOpen);
  const firstOpen = WEEK_DAYS.find((d) => days[d].isOpen);

  // The first open day's times → every open day.
  const copyToAll = () => {
    if (!firstOpen) return;
    const { start, end } = days[firstOpen];
    setDays((x) => Object.fromEntries(WEEK_DAYS.map((d) => [d, x[d].isOpen ? { ...x[d], start, end } : x[d]])));
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(WEEK_DAYS.map((d) => [d, days[d].isOpen ? days[d] : { isOpen: false }]));
      const res = payload(await saveOutletHours(outlet._id, body));
      onSaved({ workHoursId: res?._id || res?.workHours?._id || outlet.workHoursId || true, hours: days });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2 py-1.5">
            <label className="flex w-32 items-center gap-2.5 text-[14px] font-medium capitalize">
              <input type="checkbox" checked={days[d].isOpen} onChange={(e) => setDay(d, { isOpen: e.target.checked })} className="h-4 w-4 accent-emerald-700" />
              {d}
            </label>
            {days[d].isOpen ? (
              <div className="flex flex-wrap items-center gap-2">
                <input type="time" className={`${inputCls} h-10 w-32`} value={days[d].start} onChange={(e) => setDay(d, { start: e.target.value })} aria-label={`${d} opens`} />
                <span className="text-[13px] text-neutral-500">to</span>
                <input type="time" className={`${inputCls} h-10 w-32`} value={days[d].end} onChange={(e) => setDay(d, { end: e.target.value })} aria-label={`${d} closes`} />
                {!(days[d].start < days[d].end) && <span className="text-[12.5px] text-red-600 dark:text-red-400">Closing must be after opening</span>}
              </div>
            ) : (
              <span className="text-[13px] text-neutral-500 dark:text-neutral-400">Closed</span>
            )}
          </div>
        ))}
      </div>
      {firstOpen && (
        <div className="-ml-2.5">
          <LinkButton icon={Clock} onClick={copyToAll}>
            Use {DAY_SHORT[firstOpen]}'s time for every open day
          </LinkButton>
        </div>
      )}
      {!anyOpen && <Note tone="warn">Open the outlet on at least one day.</Note>}
      {error && <Note tone="error">{error}</Note>}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton busy={busy} disabled={Boolean(badDay) || !anyOpen} onClick={save}>{outlet.workHoursId ? "Save changes" : "Save opening hours"}</PrimaryButton>
        <SecondaryButton disabled={busy} onClick={onCancel}>Cancel</SecondaryButton>
      </div>
    </div>
  );
}

/* ---- one outlet ----------------------------------------------------- */
// `missing` = the parts continue said are still needed (verify · address ·
// hours); a part shows as needed only while it really is.
function OutletCard({ brandId, outlet, index, missing = [], scrollIntoView, onChange, onRemove }) {
  const state = outlet.verificationState || "VERIFIED";
  // REVERIFY counts as verified for the address and hours (as in the vendor panel).
  const verified = state !== "NEVER_VERIFIED";
  const needsCode = state === "NEVER_VERIFIED" || state === "REVERIFY";
  const hasAddress = Boolean(outlet.locationId);
  const hasHours = Boolean(outlet.workHoursId);
  const doneCount = [state === "VERIFIED", hasAddress, hasHours].filter(Boolean).length;
  const stillMissing = missing.filter((p) => (p === "verify" ? needsCode : p === "address" ? !hasAddress : !hasHours));
  const cardRef = useRef(null);

  // The saved address: this visit's save, else the stored location.
  const locationQuery = useOutletLocation(!outlet.address && typeof outlet.locationId === "string" ? outlet.locationId : null);
  const savedAddress = outlet.address || toAddressForm(locationQuery.data);
  const savedHours = outlet.hours || hoursFromServer(outlet.workHours);

  // The form that's open. A just-added verified outlet starts on its address;
  // each save opens the next missing step.
  const [open, setOpen] = useState(() => (outlet.justAdded && verified && !hasAddress ? "address" : null));
  const nextAfter = (step) => (step === "verify" && !hasAddress ? "address" : step !== "hours" && !hasHours ? "hours" : null);

  const flagged = stillMissing.length > 0;
  useEffect(() => {
    if (flagged && scrollIntoView) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [flagged, scrollIntoView]);

  const typeLabel = outlet.outletType === "FRANCHISE" ? "Franchise" : "Outlet";

  return (
    <article
      ref={cardRef}
      className={`flex flex-col gap-5 rounded-xl border bg-white p-4 sm:p-5 dark:bg-neutral-900 ${
        flagged ? "border-red-300 shadow-[0_0_0_3px_rgba(239,68,68,0.12)] dark:border-red-500/50" : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Store size={18} />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
              {typeLabel} {index + 1}
              {outlet.storeId && <span className="font-normal text-neutral-500 dark:text-neutral-400"> · {outlet.storeId}</span>}
            </p>
            <p className="m-0 text-[13px] text-neutral-500 dark:text-neutral-400">
              WhatsApp +91 {outlet.whatsappNumber}
              {outlet.isFirst ? " · First outlet" : ""}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
            doneCount === 3
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
          }`}
        >
          {doneCount === 3 ? <><Check size={12} /> Ready</> : `${doneCount} of 3 done`}
        </span>
      </header>

      {flagged && <Note tone="error">Needed before submit: {stillMissing.map((p) => PART_LABEL[p]).join(", ")}.</Note>}

      <ol className="m-0 flex list-none flex-col p-0">
        <Step
          n={1}
          title="WhatsApp verification"
          state={needsCode ? "active" : "done"}
          summary={
            state === "REVERIFY"
              ? `Number changed · waiting for the code on +91 ${outlet.whatsappNumber}`
              : needsCode
                ? "Waiting for the code"
                : `Verified · +91 ${outlet.whatsappNumber}`
          }
        >
          {needsCode && (
            <CodeVerify
              brandId={brandId}
              outlet={outlet}
              onVerified={() => {
                onChange({ verificationState: "VERIFIED", manager: { ...outlet.manager, isWhatsappVerified: true } });
                setOpen(nextAfter("verify"));
              }}
              onNumberChanged={(whatsappNumber) => onChange({ whatsappNumber })}
              onRemoved={onRemove}
            />
          )}
        </Step>

        <Step
          n={2}
          title="Address"
          state={!verified ? "locked" : hasAddress ? "done" : "active"}
          summary={
            !verified
              ? "Opens once the number is verified"
              : hasAddress
                ? addressText(savedAddress) || (locationQuery.isPending ? "Loading the saved address…" : "Saved")
                : "Where customers find this outlet"
          }
          action={
            verified && open !== "address" ? (
              <LinkButton icon={hasAddress ? Pencil : MapPin} onClick={() => setOpen("address")}>{hasAddress ? "Edit" : "Add address"}</LinkButton>
            ) : null
          }
        >
          {verified && open === "address" && (
            <AddressForm
              // Remount once the saved address arrives, so it prefills.
              key={savedAddress ? "saved" : "empty"}
              outlet={outlet}
              initial={savedAddress}
              onSaved={(patch) => {
                onChange(patch);
                setOpen(nextAfter("address"));
              }}
              onCancel={() => setOpen(null)}
            />
          )}
        </Step>

        <Step
          n={3}
          last
          title="Opening hours"
          state={!verified ? "locked" : hasHours ? "done" : "active"}
          summary={!verified ? "Opens once the number is verified" : hasHours ? hoursText(savedHours) || "Saved" : "When customers can walk in"}
          action={
            verified && open !== "hours" ? (
              <LinkButton icon={hasHours ? Pencil : Clock} onClick={() => setOpen("hours")}>{hasHours ? "Edit" : "Add hours"}</LinkButton>
            ) : null
          }
        >
          {verified && open === "hours" && (
            <HoursForm
              outlet={outlet}
              onSaved={(patch) => {
                onChange(patch);
                setOpen(null);
              }}
              onCancel={() => setOpen(null)}
            />
          )}
        </Step>
      </ol>
    </article>
  );
}

/* ---- adding an outlet ----------------------------------------------- */
// POST /subBrands/signUp-with-whatsapp { brandId, whatsappNumber, outletType }.
// A code goes to that number; the same unverified number again is a resend
// (isNewOutlet: false, same _id).
function AddOutletForm({ brandId, isFirstOutlet, onAdded, onClose }) {
  const [number, setNumber] = useState("");
  const [type, setType] = useState("OUTLET");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = WHATSAPP_RE.test(number);

  const add = async () => {
    setBusy(true);
    setError("");
    try {
      const res = payload(await addOutlet({ brandId, whatsappNumber: number, isFirstOutlet, outletType: type }));
      // A number that's already a verified login comes back verified (no code).
      const verified = res?.isVerified === true || res?.user?.isWhatsappVerified === true;
      const sb = res?.subBrand;
      const notice = verified
        ? { tone: "ok", text: "Outlet added and verified. Now add its address and opening hours." }
        : res?.otpSent
          ? { tone: "ok", text: `Code sent to +91 ${number}. Enter it on the outlet card below.` }
          : { tone: "warn", text: `${res?.otpError || "The outlet was added, but the code couldn't be sent."} Use Resend code on the outlet card.` };
      if (sb?._id) {
        onAdded(
          {
            ...sb,
            whatsappNumber: sb.whatsappNumber || number,
            outletType: sb.outletType || type,
            verificationState: verified ? "VERIFIED" : "NEVER_VERIFIED",
            manager: { isWhatsappVerified: verified, isActive: true },
          },
          notice
        );
      }
      setNumber("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title={isFirstOutlet ? "Add the first outlet" : "Add an outlet"}
      description="Enter the outlet's WhatsApp number. A 6-digit code is sent to it to verify the outlet."
      badge={onClose ? <SecondaryButton size="sm" disabled={busy} onClick={onClose}>Close</SecondaryButton> : null}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Outlet's WhatsApp number" hint="10 digits, starts with 6–9" error={number && !valid ? "10 digits, starts with 6–9" : ""}>
          <div className="flex">
            <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-neutral-300/80 bg-neutral-50 px-3 text-[14px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">+91</span>
            <input
              className={`${inputCls} rounded-l-none`}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valid && !busy) add();
              }}
              placeholder="98765 43210"
            />
          </div>
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Type</span>
          <div className="inline-flex h-10 rounded-lg border border-neutral-300/80 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-950" role="radiogroup" aria-label="Outlet type">
            {[
              ["OUTLET", "Outlet"],
              ["FRANCHISE", "Franchise"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={type === value}
                onClick={() => setType(value)}
                className={`rounded-md px-3.5 text-[13px] font-medium transition ${
                  type === value ? "bg-emerald-700 text-white" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-neutral-500 dark:text-neutral-400">Each uses its own plan slots</span>
        </div>
      </div>

      {error && <Note tone="error">{error}</Note>}
      <div>
        <PrimaryButton busy={busy} disabled={!valid} onClick={add}>
          {!busy && <Plus size={14} />} Add outlet & send code
        </PrimaryButton>
      </div>
    </Section>
  );
}

/* ---- the screen ----------------------------------------------------- */
export function OutletsScreen({ brandId, brand, eyebrow, onAdvance, onBack, isCurrent = true }) {
  const outletsQuery = useOnboardingOutlets(brandId);
  // What this visit added / saved, laid over the server rows: the list has no
  // address text or hours, and a fresh add shows before the refetch lands.
  const [added, setAdded] = useState([]);
  const [patches, setPatches] = useState({}); // outletId → saved fields
  const [removed, setRemoved] = useState([]);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text }
  const { run, busy, error, errorInfo } = useStepAction(onAdvance);

  // Verify / address / hours saves aren't all under /subBrands (and the code
  // check is a bare call), so re-read the list after each change.
  const reload = () => outletsQuery.refetch({ cancelRefetch: false });

  const firstId = brand?.firstSubBrand?._id || brand?.firstSubBrandId || null;
  const server = outletsQuery.data ?? [];
  const outlets = [...server, ...added.filter((a) => !server.some((s) => s._id === a._id))]
    .filter((o) => !removed.includes(o._id))
    .map((o) => {
      const p = patches[o._id] || {};
      return {
        ...o,
        ...p,
        // The server's ids win once it has them (a save may only know "saved").
        locationId: (typeof o.locationId === "string" && o.locationId) || p.locationId || null,
        workHoursId: o.workHoursId || p.workHoursId || null,
        verificationState: p.verificationState === "VERIFIED" ? "VERIFIED" : o.verificationState,
        isFirst: o._id === firstId || Boolean(p.isFirst),
      };
    });
  const loaded = outletsQuery.isSuccess || outletsQuery.isError;

  // isFirstOutlet sets brand.firstSubBrandId — only when the brand has none yet.
  const isFirstOutlet = outletsQuery.isSuccess && outlets.length === 0 && !firstId;
  const ready = outlets.filter((o) => o.verificationState === "VERIFIED" && o.locationId && o.workHoursId).length;

  // continue → 422 ONBOARDING_STEP_INCOMPLETE: put each outlet's gaps on its card.
  const missing = errorInfo?.code === "ONBOARDING_STEP_INCOMPLETE" ? missingByOutlet(errorInfo.details?.missing) : {};
  const firstFlagged = outlets.find((o) => missing[o._id])?._id;
  const unknownMissing = Object.keys(missing).filter((id) => !outlets.some((o) => o._id === id));

  const patchOutlet = (id, patch) => {
    setPatches((all) => ({ ...all, [id]: { ...(all[id] || {}), ...patch } }));
    reload();
  };
  const removeOutlet = (id) => {
    setRemoved((ids) => [...ids, id]);
    setNotice({ tone: "ok", text: "Outlet removed. Its plan slot is free again." });
    reload();
  };
  // A resend comes back with the same _id — that card refreshes, no new one.
  const onAdded = (row, msg) => {
    setAdded((list) => (list.some((o) => o._id === row._id) ? list : [...list, row]));
    setPatches((all) => ({ ...all, [row._id]: { ...(all[row._id] || {}), justAdded: true, isFirst: isFirstOutlet } }));
    setNotice(msg);
    setAdding(false);
    reload();
  };

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Add the outlets"
      intro="Every outlet goes through three steps: verify its WhatsApp number, add the address, then the opening hours. Submit needs every outlet to be ready."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            isCurrent ? (
              // The server checks every outlet; a 422 lands on the cards above.
              <PrimaryButton busy={busy === "continue"} onClick={() => run("continue", () => continueOnboarding(brandId))}>Continue to review</PrimaryButton>
            ) : null
          }
        />
      }
    >
      {!loaded ? (
        <Loader variant="inline" label="Loading outlets…" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-800/60">
            <p className="m-0 text-[13.5px] text-neutral-700 dark:text-neutral-200">
              <span className="font-semibold text-neutral-900 dark:text-neutral-50">{outlets.length}</span> outlet{outlets.length === 1 ? "" : "s"}
              {outlets.length > 0 && (
                <>
                  {" · "}
                  <span className={`font-semibold ${ready === outlets.length ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"}`}>{ready} ready</span>
                </>
              )}
            </p>
            <SecondaryButton size="sm" busy={outletsQuery.isFetching} onClick={reload}>
              {!outletsQuery.isFetching && <RefreshCw size={13} />} Refresh
            </SecondaryButton>
          </div>

          {outletsQuery.isError && <Note tone="error">Couldn't load the outlets: {errorText(outletsQuery.error)}</Note>}
          {notice && <Note tone={notice.tone}>{notice.text}</Note>}
          {unknownMissing.length > 0 && (
            <Note tone="warn">
              The server lists an outlet that isn't shown here (…{unknownMissing.map((id) => id.slice(-6)).join(", …")}). Press Refresh to load it.
            </Note>
          )}

          {outlets.map((o, i) => (
            <OutletCard
              key={o._id}
              brandId={brandId}
              outlet={o}
              index={i}
              missing={missing[o._id]}
              scrollIntoView={o._id === firstFlagged}
              onChange={(patch) => patchOutlet(o._id, patch)}
              onRemove={() => removeOutlet(o._id)}
            />
          ))}
        </>
      )}

      {!loaded ? null : adding || outlets.length === 0 ? (
        <AddOutletForm
          brandId={brandId}
          isFirstOutlet={isFirstOutlet}
          onAdded={onAdded}
          onClose={outlets.length ? () => setAdding(false) : undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setNotice(null);
          }}
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-[14px] font-semibold text-emerald-700 transition hover:border-emerald-700 hover:bg-emerald-50/70 dark:border-neutral-700 dark:text-emerald-400 dark:hover:bg-emerald-400/5"
        >
          <Plus size={16} /> Add another outlet
        </button>
      )}
    </ScreenShell>
  );
}
