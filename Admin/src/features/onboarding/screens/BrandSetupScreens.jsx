import { useState } from "react";
import { ImagePlus, Plus, MapPin, Clock, Store, CheckCircle2 } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, SecondaryButton, Field, Note, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { useOnboardingFeatures, useOnboardingOutlets } from "../queries/onboardingQueries";
import {
  updateBrandBasics,
  continueOnboarding,
  skipOnboardingScreen,
  addBrandFeature,
  addOutlet,
  addOutletAddress,
  saveOutletHours,
} from "../services/onboardingApi";
import { INDIAN_STATES, WEEK_DAYS, WHATSAPP_RE, PIN_RE, errorText } from "../onboardingFlow";
import { verifyOutletOtp, resendOutletOtp } from "../../brand/services/BrandApi";
import ShowcaseAlbums from "../../brand/ShowcaseAlbums";
import Loader from "../../../components/common/Loader";

const payload = (res) => res?.data ?? res ?? {};
const listOf = (res) => {
  const d = res?.data ?? res;
  const l = d?.data ?? d?.items ?? d;
  return Array.isArray(l) ? l : [];
};

/* ---- 12 · BRAND_BASIC_DETAILS ------------------------------------- */
// PUT /brands/update (logo required, cover / description / email / mobile)
// doesn't move the screen — then continue (422 missing [LOGO] without one).
function ImagePick({ label, current, file, onPick, required, wide }) {
  const preview = file ? URL.createObjectURL(file) : current;
  return (
    <Field label={label} optional={!required}>
      <label className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#CFD1CA] bg-[#F7F7F4] hover:border-[#0B6E5A] dark:border-neutral-700 dark:bg-neutral-950 ${wide ? "aspect-[16/6] w-full" : "h-28 w-28"}`}>
        {preview ? (
          <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[12.5px] font-normal text-[#5B616E]"><ImagePlus size={18} /> Choose</span>
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)} />
      </label>
    </Field>
  );
}

// continue needs LOGO, EMAIL and MOBILE (D83; 422 missing[]). Email / mobile
// are the vendor ACCOUNT's keys: the admin enters them (Q4), they stay
// unverified until the vendor verifies them, so they're sent only when they
// changed. "Use the owner's WhatsApp" sends useWhatsappAsMobile instead of a
// mobile — refused (422 OWNER_NUMBER_NOT_VERIFIED) while the owner has never
// signed in, which is every admin-created vendor until their first login.
// The admin's GET /brands/get carries user.isWhatsappVerified, so the option
// is disabled up front when it's false; the 422 stays as the fallback.
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function BrandBasicsScreen({ brandId, brand, eyebrow, onAdvance, onBack, isCurrent = true }) {
  const savedEmail = brand?.email || "";
  const savedMobile = brand?.mobile || "";
  const savedDescription = brand?.description || "";
  const [logo, setLogo] = useState(null);
  const [cover, setCover] = useState(null);
  const [description, setDescription] = useState(savedDescription);
  const [email, setEmail] = useState(savedEmail);
  const [mobile, setMobile] = useState(savedMobile);
  const [useWa, setUseWa] = useState(false);
  // false = owner never verified their WhatsApp (or the server said so).
  const [waBlocked, setWaBlocked] = useState(() => brand?.user?.isWhatsappVerified === false);
  const { run, busy, error } = useStepAction(onAdvance);

  const hasLogo = Boolean(logo || brand?.logo);
  const emailOk = EMAIL_RE.test(email.trim());
  const mobileOk = useWa || WHATSAPP_RE.test(mobile);
  const descChanged = description.trim() !== savedDescription;
  const emailChanged = email.trim() !== savedEmail;
  const mobileChanged = !useWa && mobile !== savedMobile;
  const changed = Boolean(logo || cover) || descChanged || emailChanged || mobileChanged || useWa;

  const save = () =>
    run("save", async () => {
      let res = null;
      if (changed) {
        try {
          res = await updateBrandBasics(brandId, {
            logo,
            coverImage: cover,
            ...(descChanged ? { description: description.trim() } : {}),
            ...(emailChanged ? { email: email.trim() } : {}),
            ...(useWa ? { useWhatsappAsMobile: true } : mobileChanged ? { mobile } : {}),
          });
        } catch (err) {
          if (err?.code === "OWNER_NUMBER_NOT_VERIFIED") {
            setUseWa(false);
            setWaBlocked(true);
          }
          throw err;
        }
      }
      // continue only moves the vendor's screen from BRAND_BASIC_DETAILS.
      return isCurrent ? continueOnboarding(brandId) : res;
    });

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="How customers will see the brand"
      intro="Logo, business email and a contact number are required. The rest makes the brand page look complete and raises the profile strength."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            <PrimaryButton busy={busy === "save"} disabled={!hasLogo || !emailOk || !mobileOk || (!isCurrent && !changed)} onClick={save}>
              {isCurrent ? "Save & continue" : "Save changes"}
            </PrimaryButton>
          }
        />
      }
    >
      <div className="flex flex-wrap gap-6">
        <ImagePick label="Logo" required current={brand?.logo} file={logo} onPick={setLogo} />
        <div className="min-w-[240px] flex-1"><ImagePick label="Cover image" wide current={brand?.coverImage} file={cover} onPick={setCover} /></div>
      </div>
      <Field label="About the brand" optional hint={`50+ characters counts towards profile strength · ${description.length} characters`}>
        <textarea className={`${inputCls} h-28 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business email" error={email && !emailOk ? "Enter a valid email" : ""}>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contact number" hint={useWa ? "The owner's verified WhatsApp number is used" : "10 digits"} error={!useWa && mobile && !mobileOk ? "10 digits, starts with 6–9" : ""}>
          <input className={inputCls} type="tel" maxLength={10} value={useWa ? "" : mobile} disabled={useWa} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} />
        </Field>
      </div>
      <label className={`flex items-center gap-2 text-[14px] ${waBlocked ? "opacity-60" : ""}`}>
        <input type="checkbox" checked={useWa} disabled={waBlocked} onChange={(e) => setUseWa(e.target.checked)} className="h-4 w-4 accent-[#0B6E5A]" />
        Use the owner's WhatsApp number as the contact number
      </label>
      {waBlocked && <Note tone="warn">The owner hasn't verified their WhatsApp yet (they never signed in). Enter a contact number instead.</Note>}
      <Note tone="muted">The email and number stay unverified until the vendor verifies them from their panel.</Note>
    </ScreenShell>
  );
}

/* ---- 13 · BRAND_PROFESSIONAL_DETAILS (skippable) ------------------ */
export function ProfessionalScreen({ brandId, eyebrow, onAdvance, onBack, isCurrent = true }) {
  // Features added in this session — shown when the list endpoint
  // (optional) fails, so the admin still sees what they added.
  const [added, setAdded] = useState([]);
  const featuresQuery = useOnboardingFeatures(brandId);
  const features = featuresQuery.isSuccess ? listOf(featuresQuery.data) : added;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState(null);
  const [adding, setAdding] = useState(false);
  const [featureError, setFeatureError] = useState("");
  const { run, busy, error } = useStepAction(onAdvance);

  // The list refreshes itself after the add (shared interceptor).
  const add = async () => {
    setAdding(true);
    setFeatureError("");
    try {
      const res = payload(await addBrandFeature(brandId, { title: title.trim(), description: desc.trim(), icon }));
      setAdded((f) => [...f, res?.feature || res || { title: title.trim(), description: desc.trim() }]);
      setTitle("");
      setDesc("");
      setIcon(null);
    } catch (err) {
      setFeatureError(errorText(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Show off the brand"
      intro="Photos and highlights appear on the brand page and in the home carousel. Add them now or later from the brand's profile."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          // Skip / continue move the vendor's screen — only on the current one.
          onSkip={isCurrent ? () => run("skip", () => skipOnboardingScreen(brandId, "BRAND_PROFESSIONAL_DETAILS")) : undefined}
          skipBusy={busy === "skip"}
          primary={isCurrent ? <PrimaryButton busy={busy === "continue"} onClick={() => run("continue", () => continueOnboarding(brandId))}>Continue</PrimaryButton> : null}
        />
      }
    >
      <Note tone="info">Tip: at least 1 showcase collection and 2 features make the page look complete and add 10 points to the profile strength.</Note>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[17px] font-semibold">Showcase collections</h2>
        <ShowcaseAlbums brand={{ id: brandId }} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[17px] font-semibold">Brand features</h2>
        {features.length > 0 && (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={f._id || i} className="flex items-start gap-3 rounded-xl border border-[#E2E3DE] p-3 dark:border-neutral-800">
                {f.icon ? <img src={f.icon} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E3F1EC] text-[13px] font-semibold text-[#08513F]">{(f.title || "?").slice(0, 2)}</span>}
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{f.title}</span>
                  {f.description && <span className="block text-[13px] text-[#5B616E]">{f.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 rounded-xl border border-[#E2E3DE] p-4 sm:grid-cols-[1fr_1fr_auto] dark:border-neutral-800">
          <Field label="Feature title"><input className={inputCls} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Free Wi-Fi" /></Field>
          <Field label="Description" optional><input className={inputCls} value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Fast Wi-Fi for work and study" /></Field>
          <Field label="Icon" optional>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#CFD1CA] px-3 text-[13.5px] font-normal dark:border-neutral-700">
              <ImagePlus size={15} /> <span className="max-w-28 truncate">{icon ? icon.name : "Choose"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setIcon(e.target.files?.[0] || null)} />
            </label>
          </Field>
          <div className="sm:col-span-3">
            <SecondaryButton busy={adding} disabled={title.trim().length < 2} onClick={add}><Plus size={14} /> Add feature</SecondaryButton>
          </div>
        </div>
        {featureError && <Note tone="error">{featureError}</Note>}
      </div>
    </ScreenShell>
  );
}

/* ---- OUTLET_DETAILS ----------------------------------------------- */
// Each outlet: signUp-with-whatsapp → (manager verifies) → locations/create → workHours/upsert.
// continue → 422 missing OUTLET; submit → 422 OUTLET_NOT_VERIFIED:<id> · OUTLET_LOCATION:<id> · OUTLET_WORK_HOURS:<id>.
const EMPTY_ADDR = { addressLine1: "", addressLine2: "", landmark: "", city: "", state: "", zipcode: "", lat: "", lng: "" };
const DEFAULT_HOURS = Object.fromEntries(WEEK_DAYS.map((d) => [d, { isOpen: d !== "sunday", start: "10:00", end: "22:00" }]));

function OutletAddressForm({ subBrandId, onSaved, onCancel }) {
  const [a, setA] = useState(EMPTY_ADDR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setA((x) => ({ ...x, [k]: e.target.value }));
  const lat = Number(a.lat);
  const lng = Number(a.lng);
  const ok = a.addressLine1.trim() && a.city.trim() && a.state && PIN_RE.test(a.zipcode) && a.lat !== "" && a.lng !== "" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await addOutletAddress(subBrandId, {
        addressLine1: a.addressLine1.trim(),
        ...(a.addressLine2.trim() ? { addressLine2: a.addressLine2.trim() } : {}),
        ...(a.landmark.trim() ? { landmark: a.landmark.trim() } : {}),
        city: a.city.trim(),
        state: a.state,
        zipcode: a.zipcode,
        country: "india",
        coordinates: [lng, lat],
      });
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg bg-[#F7F9F8] p-4 sm:grid-cols-2 dark:bg-neutral-950">
      <div className="sm:col-span-2"><Field label="Address line 1"><input className={inputCls} value={a.addressLine1} onChange={set("addressLine1")} /></Field></div>
      <Field label="Area" optional><input className={inputCls} value={a.addressLine2} onChange={set("addressLine2")} /></Field>
      <Field label="Landmark" optional><input className={inputCls} value={a.landmark} onChange={set("landmark")} /></Field>
      <Field label="City"><input className={inputCls} value={a.city} onChange={set("city")} /></Field>
      <Field label="State">
        <select className={inputCls} value={a.state} onChange={set("state")}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="PIN code"><input className={inputCls} inputMode="numeric" maxLength={6} value={a.zipcode} onChange={set("zipcode")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude"><input className={inputCls} value={a.lat} onChange={set("lat")} placeholder="19.0596" /></Field>
        <Field label="Longitude"><input className={inputCls} value={a.lng} onChange={set("lng")} placeholder="72.8295" /></Field>
      </div>
      {error && <div className="sm:col-span-2"><Note tone="error">{error}</Note></div>}
      <div className="flex gap-2 sm:col-span-2">
        <PrimaryButton busy={busy} disabled={!ok} onClick={save}>Save address</PrimaryButton>
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
      </div>
    </div>
  );
}

function OutletHoursForm({ subBrandId, onSaved, onCancel }) {
  const [days, setDays] = useState(DEFAULT_HOURS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setDay = (d, patch) => setDays((x) => ({ ...x, [d]: { ...x[d], ...patch } }));
  const invalid = WEEK_DAYS.some((d) => days[d].isOpen && !(days[d].start < days[d].end));
  const anyOpen = WEEK_DAYS.some((d) => days[d].isOpen);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(WEEK_DAYS.map((d) => [d, days[d].isOpen ? days[d] : { isOpen: false }]));
      await saveOutletHours(subBrandId, body);
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-[#F7F9F8] p-4 dark:bg-neutral-950">
      {WEEK_DAYS.map((d) => (
        <div key={d} className="flex flex-wrap items-center gap-3">
          <label className="flex w-32 items-center gap-2 text-[14px] capitalize">
            <input type="checkbox" checked={days[d].isOpen} onChange={(e) => setDay(d, { isOpen: e.target.checked })} className="h-4 w-4 accent-[#0B6E5A]" /> {d}
          </label>
          {days[d].isOpen ? (
            <>
              <input type="time" className={`${inputCls} h-10 w-32`} value={days[d].start} onChange={(e) => setDay(d, { start: e.target.value })} aria-label={`${d} opens`} />
              <span className="text-[13px] text-[#5B616E]">to</span>
              <input type="time" className={`${inputCls} h-10 w-32`} value={days[d].end} onChange={(e) => setDay(d, { end: e.target.value })} aria-label={`${d} closes`} />
              {!(days[d].start < days[d].end) && <span className="text-[12.5px] text-red-600">Closing must be after opening</span>}
            </>
          ) : (
            <span className="text-[13px] text-[#5B616E]">Closed</span>
          )}
        </div>
      ))}
      {error && <Note tone="error">{error}</Note>}
      <div className="mt-2 flex gap-2">
        <PrimaryButton busy={busy} disabled={invalid || !anyOpen} onClick={save}>Save opening hours</PrimaryButton>
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
      </div>
    </div>
  );
}

// Row state comes from the server (#29 / vendor #35 note 5): verificationState
// NEVER_VERIFIED · VERIFIED · REVERIFY (never the raw flags), locationId and
// workHoursId (null until saved).
const outletState = (o) => o.verificationState || (o.manager?.isWhatsappVerified === false ? "NEVER_VERIFIED" : "VERIFIED");

/** The manager's WhatsApp code, entered by the admin (Q3). The manager reads
 *  the code out; POST /auth/verify-otp-whatsapp { role: SUB_VENDOR } marks
 *  their account verified. That call returns a SUB_VENDOR token —
 *  verifyOutletOtp DISCARDS it (never stored, the admin token is untouched). */
function OutletOtp({ brandId, outlet, onVerified }) {
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const canResend = outlet.manager?.isActive !== false;

  const verify = async () => {
    setBusy("verify");
    setError("");
    setInfo("");
    try {
      await verifyOutletOtp(outlet.whatsappNumber, otp);
      setOtp("");
      await onVerified();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };
  // Repeating signUp-with-whatsapp for an unverified outlet resends the code
  // (no new outlet, no new slot).
  const resend = async () => {
    setBusy("resend");
    setError("");
    setInfo("");
    try {
      const res = payload(await resendOutletOtp(brandId, outlet.whatsappNumber));
      setInfo(res?.otpSent === false ? res?.otpError || "The code couldn't be sent. Try again in a minute." : "A new code was sent to the manager's WhatsApp.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-[#FFF8EC] p-4 dark:bg-amber-500/10">
      <p className="m-0 text-[13.5px]">
        Waiting for the manager's code. Ask them to read out the 6-digit code sent to +91 {outlet.whatsappNumber}.
        {outlet.holdExpiresAt ? ` The outlet is cancelled automatically if not verified by ${new Date(outlet.holdExpiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.` : ""}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Manager's code">
          <input
            className={`${inputCls} w-40 font-mono tracking-widest`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
          />
        </Field>
        <PrimaryButton busy={busy === "verify"} disabled={otp.length !== 6 || Boolean(busy)} onClick={verify}>Verify outlet</PrimaryButton>
        {canResend && (
          <SecondaryButton busy={busy === "resend"} disabled={Boolean(busy)} onClick={resend}>Resend code</SecondaryButton>
        )}
      </div>
      {!canResend && <Note tone="warn">The manager's account is deactivated — reactivate it before sending a new code.</Note>}
      {error && <Note tone="error">{error}</Note>}
      {info && <Note tone="ok">{info}</Note>}
    </div>
  );
}

export function OutletsScreen({ brandId, eyebrow, onAdvance, onBack, isCurrent = true }) {
  // A failed load shows an empty list (no error), as before.
  const outletsQuery = useOnboardingOutlets(brandId);
  const outlets = listOf(outletsQuery.data);
  const loading = outletsQuery.isPending;
  const [open, setOpen] = useState(null); // { id, kind: "address" | "hours" }
  const [newNumber, setNewNumber] = useState("");
  const [useOwner, setUseOwner] = useState(false);
  const [ownerBlocked, setOwnerBlocked] = useState(false);
  const [newType, setNewType] = useState("OUTLET");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addInfo, setAddInfo] = useState("");
  const { run, busy, error } = useStepAction(onAdvance);
  // verify-otp is a bare call (no interceptor) and location / hours saves
  // aren't under /subBrands — re-read the list ourselves.
  const refresh = () => outletsQuery.refetch({ cancelRefetch: false });

  const add = async () => {
    setAdding(true);
    setAddError("");
    setAddInfo("");
    try {
      const res = payload(
        await addOutlet({ brandId, whatsappNumber: newNumber, useOwnerNumber: useOwner, isFirstOutlet: outlets.length === 0, outletType: newType })
      );
      // Owner number → verified at once (verifiedVia OWNER_NUMBER). A manager
      // number gets a WhatsApp code; address and hours open only after the
      // manager's code is verified (409 OUTLET_NOT_VERIFIED).
      const verified = res?.user?.isWhatsappVerified === true || res?.subBrand?.verifiedVia === "OWNER_NUMBER";
      setAddInfo(
        verified
          ? "Outlet added and verified — add its address and opening hours."
          : res?.otpSent
            ? "Code sent to the manager's WhatsApp — enter it on the outlet below."
            : res?.otpError || "Outlet added, but the code couldn't be sent — use Resend code on the outlet."
      );
      setNewNumber("");
      // The next add's isFirstOutlet is read from this list, so keep the
      // button busy until it's fresh. The interceptor already started the
      // refetch (/subBrands write); cancelRefetch: false joins it.
      await refresh();
    } catch (err) {
      if (err?.code === "OWNER_NUMBER_NOT_VERIFIED") {
        setUseOwner(false);
        setOwnerBlocked(true);
      }
      setAddError(errorText(err));
    } finally {
      setAdding(false);
    }
  };

  const saved = async () => {
    setOpen(null);
    await refresh();
  };

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Add the outlets"
      intro="Add at least one outlet. Each outlet needs a verified manager, its address and opening hours before submit. More outlets can be added up to the plan's limit."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            isCurrent ? (
              <PrimaryButton busy={busy === "continue"} disabled={!outlets.length} onClick={() => run("continue", () => continueOnboarding(brandId))}>Continue to review</PrimaryButton>
            ) : null
          }
        />
      }
    >
      {loading ? (
        <Loader variant="inline" label="Loading outlets…" />
      ) : (
        outlets.map((o, i) => {
          const state = outletState(o);
          const verified = state !== "NEVER_VERIFIED";
          const hasAddress = Boolean(o.locationId);
          const hasHours = Boolean(o.workHoursId);
          const complete = verified && hasAddress && hasHours;
          return (
            <div key={o._id} className="flex flex-col gap-3 rounded-xl border border-[#E2E3DE] p-4 dark:border-neutral-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E3F1EC] text-[#08513F]"><Store size={17} /></span>
                  <div>
                    <p className="m-0 text-[15px] font-semibold">Outlet {i + 1}{o.storeId ? ` · ${o.storeId}` : ""}</p>
                    <p className="m-0 text-[13px] text-[#5B616E]">
                      {i === 0 ? "First outlet · " : ""}Manager WhatsApp {o.whatsappNumber ? `+91 ${o.whatsappNumber}` : "not added"} · {o.outletType || "OUTLET"}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${complete ? "bg-[#E3F1EC] text-[#08513F]" : "bg-[#FFF4E0] text-[#7A4800]"}`}>
                  {!verified ? "Manager not verified" : complete ? "Complete" : !hasAddress ? "Address missing" : "Hours missing"}
                </span>
              </div>
              {!verified ? (
                <OutletOtp brandId={brandId} outlet={o} onVerified={refresh} />
              ) : (
                <>
                  {state === "REVERIFY" && <Note tone="warn">The number was changed — the outlet is hidden from customers until the manager verifies the new number.</Note>}
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => setOpen({ id: o._id, kind: "address" })}>
                      {hasAddress ? <CheckCircle2 size={14} className="text-[#0B6E5A]" /> : <MapPin size={14} />} {hasAddress ? "Edit address" : "Add address"}
                    </SecondaryButton>
                    <SecondaryButton onClick={() => setOpen({ id: o._id, kind: "hours" })}>
                      {hasHours ? <CheckCircle2 size={14} className="text-[#0B6E5A]" /> : <Clock size={14} />} {hasHours ? "Edit hours" : "Add opening hours"}
                    </SecondaryButton>
                  </div>
                </>
              )}
              {open?.id === o._id && open.kind === "address" && <OutletAddressForm subBrandId={o._id} onSaved={saved} onCancel={() => setOpen(null)} />}
              {open?.id === o._id && open.kind === "hours" && <OutletHoursForm subBrandId={o._id} onSaved={saved} onCancel={() => setOpen(null)} />}
            </div>
          );
        })
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#CFD1CA] p-4 dark:border-neutral-700">
        <p className="m-0 text-[15px] font-semibold">{outlets.length ? "Add another outlet" : "Add the first outlet"}</p>
        <label className={`flex items-center gap-2 text-[14px] ${ownerBlocked ? "opacity-60" : ""}`}>
          <input type="checkbox" checked={useOwner} disabled={ownerBlocked} onChange={(e) => setUseOwner(e.target.checked)} className="h-4 w-4 accent-[#0B6E5A]" />
          The owner manages this outlet on their own verified WhatsApp number (no code needed)
        </label>
        {ownerBlocked && <Note tone="muted">The owner hasn't signed in yet, so their number isn't verified. Use the manager's number — they'll read the code out to you.</Note>}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Outlet manager's WhatsApp" hint={useOwner ? "Uses the owner's number" : "A login code is sent to this number"} error={!useOwner && newNumber && !WHATSAPP_RE.test(newNumber) ? "10 digits, starts with 6–9" : ""}>
            <input className={inputCls} type="tel" maxLength={10} value={useOwner ? "" : newNumber} disabled={useOwner} onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Type">
            <select className={`${inputCls} w-40`} value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="OUTLET">Outlet</option>
              <option value="FRANCHISE">Franchise</option>
            </select>
          </Field>
          <PrimaryButton busy={adding} disabled={!useOwner && !WHATSAPP_RE.test(newNumber)} onClick={add}><Plus size={15} /> Add outlet</PrimaryButton>
        </div>
        {addError && <Note tone="error">{addError}</Note>}
        {addInfo && <Note tone="ok">{addInfo}</Note>}
      </div>
    </ScreenShell>
  );
}
