import { useMemo, useState } from "react";
import { Upload, FileText, CheckCircle2, Check, Lock } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, Field, RadioCard, Note, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { recordOfflineDeed, saveBillingAddress, grantPlan } from "../services/onboardingApi";
import { useBillingAddress } from "../queries/onboardingQueries";
import {
  INDIAN_STATES,
  PIN_RE,
  GRANT_PAYMENT_MODES,
  GRANT_RULES,
  DEED_NOTE,
  DOCUMENT_RULES,
  errorText,
} from "../onboardingFlow";
import { usePlans } from "../../plan/queries/planQueries";
import Loader from "../../../components/common/Loader";

const payload = (res) => res?.data ?? res ?? {};

/* ---- PARTNERSHIP_DEED --------------------------------------------- */
// The deed text lives only in the vendor panel (Q6, D57). The admin can't
// accept online for the vendor (accept-partnership is the vendor's); they
// only RECORD the offline signed deed — PUT /brands/admin/:brandId/deed with
// the signed copy as proof + a note (#25g). On PARTNERSHIP_DEED that moves
// the screen; on a later screen it only replaces the admin's own record /
// proof. A deed the VENDOR accepted is never replaced (D102 → 409
// DEED_ALREADY_ACCEPTED). status.deed.requiresDeedConfirmation then asks
// the vendor to confirm on their next login.
function DeedRecord({ deed }) {
  return (
    <Note tone="ok">
      Accepted by {String(deed.acceptedByType || "unknown").toLowerCase()} ({String(deed.mode || "not recorded").toLowerCase()})
      {deed.isLegacy ? " · legacy record" : deed.acceptedAt ? ` on ${new Date(deed.acceptedAt).toLocaleDateString("en-IN")}` : ""}
      {deed.version && !deed.isLegacy ? ` · ${deed.version}` : ""}
      {deed.proofUrl ? (
        <>
          {" · "}
          <a href={deed.proofUrl} target="_blank" rel="noreferrer" className="font-semibold underline">signed copy</a>
        </>
      ) : null}
      {deed.note ? <span className="mt-1 block text-[13px] opacity-90">Note: {deed.note}</span> : null}
    </Note>
  );
}

export function DeedScreen({ brandId, status, eyebrow, onAdvance, onBack }) {
  const deed = status.deed;
  const accepted = Boolean(deed?.accepted);
  // Only an admin's own offline record may be replaced (D102).
  const vendorAccepted = accepted && deed?.acceptedByType !== "ADMIN";
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const { run, busy, error } = useStepAction(onAdvance);
  const fileError =
    file && file.size > DOCUMENT_RULES.maxSizeBytes ? "Max 5 MB." : file && !DOCUMENT_RULES.types.test(file.type) ? "PDF, JPG or PNG only." : "";
  const noteLen = note.trim().length;
  const noteOk = noteLen >= DEED_NOTE.min && noteLen <= DEED_NOTE.max;
  const ready = !vendorAccepted && file && !fileError && noteOk;
  const save = () =>
    run("save", async () => {
      const res = await recordOfflineDeed(brandId, { file, note: note.trim() });
      setFile(null);
      setNote("");
      return res;
    });

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Partnership deed"
      intro={
        vendorAccepted
          ? "The vendor accepted the deed themselves. It can't be replaced."
          : accepted
            ? "An offline deed is already recorded. You can replace the signed copy and note."
            : "Record the deed the vendor signed offline: upload the signed copy and add a note. The deed text itself is only in the vendor panel."
      }
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            vendorAccepted ? null : (
              <PrimaryButton busy={busy === "save"} disabled={!ready} onClick={save}>
                {busy !== "save" && (accepted ? <Upload size={15} /> : <Check size={15} />)}
                {busy === "save" ? "Saving…" : accepted ? "Replace proof" : "Record deed & continue"}
              </PrimaryButton>
            )
          }
        />
      }
    >
      {accepted && <DeedRecord deed={deed} />}
      {vendorAccepted ? (
        <Note tone="muted">
          <Lock size={13} className="mr-1 inline" />
          The vendor's own acceptance is the record of truth — no offline deed is needed.
        </Note>
      ) : (
        <div className="flex flex-col gap-4 rounded-[14px] p-5 ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {accepted ? "Replace the offline record" : "Offline acceptance"}
          </p>
          <Field label="Signed deed copy" hint="PDF or a clear photo of the signed deed — required as proof · max 5 MB" error={fileError}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#CFD1CA] px-4 py-5 hover:border-[#0B6E5A] dark:border-neutral-700">
              {file ? <FileText size={18} className="text-[#0B6E5A]" /> : <Upload size={18} className="text-[#5B616E]" />}
              <span className="min-w-0 flex-1 truncate text-[14px] font-normal">{file ? file.name : "Choose the signed copy"}</span>
              <input type="file" accept={DOCUMENT_RULES.accept} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </Field>
          <Field
            label="Note"
            hint={`Required · ${DEED_NOTE.min}–${DEED_NOTE.max} characters — e.g. who signed, where the original is kept`}
            error={note && !noteOk ? `${DEED_NOTE.min}–${DEED_NOTE.max} characters` : ""}
          >
            <textarea
              className={`${inputCls} h-24 py-2`}
              value={note}
              maxLength={DEED_NOTE.max}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Signed by owner at office visit, original filed"
            />
          </Field>
        </div>
      )}
      {deed?.requiresDeedConfirmation && <Note tone="info">Waiting for the vendor to confirm this offline deed on their next login.</Note>}
    </ScreenShell>
  );
}

/* ---- 11 · SUBSCRIBE_PLAN (billing address, then plan) ------------- */
const EMPTY_ADDRESS = { addressLine1: "", addressLine2: "", landmark: "", city: "", district: "", state: "", zipcode: "", lat: "", lng: "" };

// Billing / suggested / GST address → form values (shapes vary: billing is
// outlet-like, the GST one is { location, district, state, pin }).
function toForm(a) {
  if (!a) return null;
  const [lng, lat] = Array.isArray(a.coordinates) ? a.coordinates : a.geo?.coordinates || [];
  return {
    addressLine1: a.addressLine1 || [a.buildingNumber, a.buildingName, a.street].filter(Boolean).join(", ") || a.location || "",
    addressLine2: a.addressLine2 || (a.addressLine1 ? "" : a.location && a.buildingNumber ? a.location : ""),
    landmark: a.landmark || "",
    city: a.city || a.district || "",
    district: a.district || "",
    state: a.state || "",
    zipcode: a.zipcode || a.pin || "",
    lat: lat ?? "",
    lng: lng ?? "",
  };
}

const planPrice = (p) => p.discountedPrice ?? p.price ?? 0;

// Loads the billing address + plans, then mounts the form. Either load may
// fail without blocking the screen: no prefill / "No active plans found".
export function SubscribePlanScreen(props) {
  const billingQuery = useBillingAddress(props.brandId);
  const plansQuery = usePlans();
  const billing = billingQuery.data ? payload(billingQuery.data) : null;
  const plans = useMemo(() => {
    const p = plansQuery.data;
    const raw = p?.data?.data ?? p?.data?.plans ?? p?.data ?? p ?? [];
    return (Array.isArray(raw) ? raw : []).filter((x) => x.isActive !== false);
  }, [plansQuery.data]);

  if (billingQuery.isPending || plansQuery.isPending) {
    return (
      <ScreenShell eyebrow={props.eyebrow} title="Plan & billing">
        <Loader variant="inline" label="Loading billing address and plans…" />
      </ScreenShell>
    );
  }
  return <SubscribePlanForm {...props} billing={billing} plans={plans} />;
}

function SubscribePlanForm({ brandId, eyebrow, onAdvance, onBack, billing, plans, isCurrent = true }) {
  // A back-edit (the vendor is already past SUBSCRIBE_PLAN) means a plan is
  // live: only the billing address is editable here; a second grant would
  // stack another plan, so plan changes stay on the Subscriptions page.
  const planDone = !isCurrent;
  // Prefilled once, on mount — a later billing refetch (e.g. after saving
  // it) must not overwrite what the admin has typed.
  const [form, setForm] = useState(() => toForm(billing?.billingAddress) || toForm(billing?.suggestedAddress) || EMPTY_ADDRESS);
  const [sameAsGst, setSameAsGst] = useState(false);
  const [savedBilling, setSavedBilling] = useState(() => Boolean(billing?.billingAddress));
  const [planId, setPlanId] = useState("");
  const [mode, setMode] = useState("FREE");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const { run, busy, error } = useStepAction(onAdvance);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSavedBilling(false);
  };
  const toggleGst = (checked) => {
    setSameAsGst(checked);
    if (checked && billing?.gstAddress) setForm((f) => ({ ...f, ...toForm(billing.gstAddress), lat: f.lat, lng: f.lng }));
    setSavedBilling(false);
  };

  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const coordsOk = form.lat !== "" && form.lng !== "" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const billingValid = form.addressLine1.trim() && form.city.trim() && form.state && PIN_RE.test(form.zipcode) && coordsOk;

  const saveBilling = async () => {
    setBillingBusy(true);
    setBillingError("");
    try {
      await saveBillingAddress(brandId, {
        addressLine1: form.addressLine1.trim(),
        ...(form.addressLine2.trim() ? { addressLine2: form.addressLine2.trim() } : {}),
        ...(form.landmark.trim() ? { landmark: form.landmark.trim() } : {}),
        city: form.city.trim(),
        ...(form.district.trim() ? { district: form.district.trim() } : {}),
        state: form.state,
        zipcode: form.zipcode,
        country: "india",
        coordinates: [lng, lat], // [longitude, latitude]
      });
      setSavedBilling(true);
    } catch (err) {
      setBillingError(errorText(err));
    } finally {
      setBillingBusy(false);
    }
  };

  const offline = mode !== "FREE";
  const noteLen = note.trim().length;
  const noteOk = noteLen >= GRANT_RULES.noteMin && noteLen <= GRANT_RULES.noteMax;
  const amountOk = amount !== "" && Number(amount) >= 0;
  const referenceOk = reference.trim().length <= GRANT_RULES.referenceMax;
  const grantReady = savedBilling && planId && noteOk && (!offline || (amountOk && referenceOk));
  const grant = () =>
    run("grant", () =>
      grantPlan({
        brandId,
        subscriptionId: planId,
        note: note.trim(),
        ...(offline
          ? {
              paymentMode: mode,
              collectedAmount: Number(amount),
              ...(reference.trim() ? { referenceNumber: reference.trim() } : {}),
            }
          : { paymentMode: "FREE" }),
      })
    );

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Choose the plan"
      intro={
        planDone
          ? "A plan is already granted. You can still correct the billing address — it goes on every invoice and statement."
          : "First confirm the billing address — it goes on every invoice and statement. Then grant a plan."
      }
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={planDone ? null : <PrimaryButton busy={busy === "grant"} disabled={!grantReady} onClick={grant}>Grant plan & continue</PrimaryButton>}
        />
      }
    >
      {/* 1 · Billing address */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#E2E3DE] p-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[17px] font-semibold">1 · Billing address</h2>
          {savedBilling ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F1EC] px-2.5 py-1 text-[12px] font-semibold text-[#08513F]"><CheckCircle2 size={12} /> Saved</span>
          ) : (
            <span className="rounded-full bg-[#FFF4E0] px-2.5 py-1 text-[12px] font-semibold text-[#7A4800]">Required before the plan</span>
          )}
        </div>
        {billing?.gstAddress && (
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={sameAsGst} onChange={(e) => toggleGst(e.target.checked)} className="h-4 w-4 accent-[#0B6E5A]" />
            Same as GST address
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Address line 1"><input className={inputCls} value={form.addressLine1} onChange={set("addressLine1")} /></Field></div>
          <Field label="Area / address line 2" optional><input className={inputCls} value={form.addressLine2} onChange={set("addressLine2")} /></Field>
          <Field label="Landmark" optional><input className={inputCls} value={form.landmark} onChange={set("landmark")} /></Field>
          <Field label="City"><input className={inputCls} value={form.city} onChange={set("city")} /></Field>
          <Field label="District" optional><input className={inputCls} value={form.district} onChange={set("district")} /></Field>
          <Field label="State">
            <select className={inputCls} value={form.state} onChange={set("state")}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="PIN code" error={form.zipcode && !PIN_RE.test(form.zipcode) ? "6 digits" : ""}>
            <input className={inputCls} inputMode="numeric" maxLength={6} value={form.zipcode} onChange={set("zipcode")} />
          </Field>
          <Field label="Latitude" hint="From Google Maps (right-click the place → copy coordinates)"><input className={inputCls} value={form.lat} onChange={set("lat")} placeholder="e.g. 19.0596" /></Field>
          <Field label="Longitude" hint="Sent as coordinates [longitude, latitude]"><input className={inputCls} value={form.lng} onChange={set("lng")} placeholder="e.g. 72.8295" /></Field>
        </div>
        {billing?.gstin && (
          <Note tone="info">GSTIN {billing.gstin}{billing.gstStateCode ? ` (state ${billing.gstStateCode})` : ""} — the billing address must be in the same state.</Note>
        )}
        {billingError && <Note tone="error">{billingError}</Note>}
        <div><PrimaryButton tone="dark" busy={billingBusy} disabled={!billingValid || savedBilling} onClick={saveBilling}>{savedBilling ? "Billing address saved" : "Save billing address"}</PrimaryButton></div>
      </div>

      {/* 2 · Plan */}
      {planDone ? (
        <Note tone="ok">The plan is granted. To change or extend it, use the brand's Subscriptions page.</Note>
      ) : (
      <div className={`flex flex-col gap-4 rounded-xl border border-[#E2E3DE] p-5 dark:border-neutral-800 ${savedBilling ? "" : "opacity-60"}`}>
        <h2 className="m-0 text-[17px] font-semibold">2 · Plan</h2>
        {!plans.length ? (
          <p className="m-0 text-[14px] text-[#5B616E]">No active plans found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <RadioCard
                key={p._id || p.id}
                name="plan"
                disabled={!savedBilling}
                checked={planId === (p._id || p.id)}
                onChange={() => setPlanId(p._id || p.id)}
                title={p.name}
                description={`₹${Number(planPrice(p)).toLocaleString("en-IN")}${p.durationLabel ? ` / ${p.durationLabel}` : p.durationValue ? ` / ${p.durationValue} ${String(p.durationUnit || "").toLowerCase()}` : ""}`}
              />
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment">
            <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)} disabled={!savedBilling}>
              {GRANT_PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>
          {offline && (
            <>
              <Field label="Amount collected (₹)" error={amount !== "" && !amountOk ? "₹0 or more" : ""}>
                <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
              <Field label="Reference number" optional hint="UTR, cheque number or receipt" error={!referenceOk ? `Up to ${GRANT_RULES.referenceMax} characters` : ""}>
                <input className={inputCls} value={reference} maxLength={GRANT_RULES.referenceMax} onChange={(e) => setReference(e.target.value)} />
              </Field>
            </>
          )}
          <div className="sm:col-span-2">
            <Field label="Note" hint={`Recorded with the grant · ${GRANT_RULES.noteMin}–${GRANT_RULES.noteMax} characters`} error={note && !noteOk ? `${GRANT_RULES.noteMin}–${GRANT_RULES.noteMax} characters` : ""}>
              <input className={inputCls} value={note} maxLength={GRANT_RULES.noteMax} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Onboarded by sales team, first year free" disabled={!savedBilling} />
            </Field>
          </div>
        </div>
      </div>
      )}
    </ScreenShell>
  );
}
