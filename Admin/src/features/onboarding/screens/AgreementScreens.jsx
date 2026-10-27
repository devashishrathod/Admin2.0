import { useMemo, useState } from "react";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, Field, RadioCard, Note, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { recordOfflineDeed, saveBillingAddress, grantPlan } from "../services/onboardingApi";
import { useBillingAddress } from "../queries/onboardingQueries";
import { INDIAN_STATES, PIN_RE, errorText } from "../onboardingFlow";
import { usePlans } from "../../plan/queries/planQueries";
import Loader from "../../../components/common/Loader";

const payload = (res) => res?.data ?? res ?? {};

/* ---- 10 · PARTNERSHIP_DEED (admin: offline) ----------------------- */
// The admin can't accept online for the vendor (accept-partnership is the
// vendor's). PUT /brands/admin/:brandId/deed records an OFFLINE acceptance
// with the signed copy as proof + a note; the vendor confirms in a popup on
// their next login.
export function DeedScreen({ brandId, status, eyebrow, onAdvance, onBack }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const { run, busy, error } = useStepAction(onAdvance);
  const deed = status.deed;

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Partnership agreement"
      intro="Only the vendor can accept the deed online. As admin, record the vendor's signed copy (offline acceptance) — the vendor will also confirm it in a popup on their next login."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            <PrimaryButton busy={busy === "save"} disabled={!file || !note.trim()} onClick={() => run("save", () => recordOfflineDeed(brandId, { file, note: note.trim() }))}>
              Record signed deed & continue
            </PrimaryButton>
          }
        />
      }
    >
      {deed && (deed.acceptedAt || deed.acceptedByType) && (
        <Note tone="ok">
          Deed accepted by {deed.acceptedByType || "Unknown"} ({deed.mode || "Not recorded"}) {deed.acceptedAt ? `on ${new Date(deed.acceptedAt).toLocaleDateString("en-IN")}` : ""}
          {deed.version ? ` · v${deed.version}` : ""}. Recording again replaces the proof.
        </Note>
      )}
      <Field label="Signed deed copy" hint="PDF or a clear photo of the signed deed — required as proof">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#CFD1CA] px-4 py-5 hover:border-[#0B6E5A] dark:border-neutral-700">
          {file ? <FileText size={18} className="text-[#0B6E5A]" /> : <Upload size={18} className="text-[#5B616E]" />}
          <span className="min-w-0 flex-1 truncate text-[14px] font-normal">{file ? file.name : "Choose the signed copy"}</span>
          <input type="file" accept=".pdf,image/jpeg,image/png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </Field>
      <Field label="Note" hint="Required — e.g. who signed, where the original is kept">
        <textarea className={`${inputCls} h-24 py-2`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Signed by owner at office visit, original filed" />
      </Field>
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

function SubscribePlanForm({ brandId, eyebrow, onAdvance, onBack, billing, plans }) {
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
  const grantReady = savedBilling && planId && note.trim() && (!offline || (Number(amount) > 0 && reference.trim()));
  const grant = () =>
    run("grant", () =>
      grantPlan({
        brandId,
        subscriptionId: planId,
        note: note.trim(),
        ...(offline ? { paymentMode: mode, collectedAmount: Number(amount), referenceNumber: reference.trim() } : { paymentMode: "FREE" }),
      })
    );

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Choose the plan"
      intro="First confirm the billing address — it goes on every invoice and statement. Then grant a plan."
      error={error}
      footer={<StepFooter onBack={onBack} primary={<PrimaryButton busy={busy === "grant"} disabled={!grantReady} onClick={grant}>Grant plan & continue</PrimaryButton>} />}
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
              <option value="FREE">Free / complimentary</option>
              <option value="UPI">Offline — UPI</option>
              <option value="BANK_TRANSFER">Offline — Bank transfer</option>
              <option value="CASH">Offline — Cash</option>
              <option value="OTHER">Offline — Other</option>
            </select>
          </Field>
          {offline && (
            <>
              <Field label="Amount collected (₹)"><input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
              <Field label="Reference number"><input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
            </>
          )}
          <div className="sm:col-span-2"><Field label="Note" hint="Recorded with the grant"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Onboarded by sales team, first year free" disabled={!savedBilling} /></Field></div>
        </div>
      </div>
    </ScreenShell>
  );
}
