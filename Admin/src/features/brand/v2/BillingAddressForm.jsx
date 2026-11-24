import { useState } from "react";
import { saveBillingAddress } from "../../onboarding/services/onboardingApi";
import { INDIAN_STATES, PIN_RE } from "../../onboarding/onboardingFlow";
import { Notice } from "../BrandAdminExtras";
import { Field, inputClass } from "../BrandShared";
import { Btn } from "./shared";
import { v2ErrorText } from "./util";

/* -------------------------------------------------------------------------
 * Billing address form (admin guide §8, #25f → vendor doc #32b).
 * PUT /brands/billing-address?brandId= — outlet-address fields +
 * coordinates [lng, lat]. Coordinates are typed by hand for now (Google
 * Places comes in Milestone C). "Same as GST" only prefills from
 * gstAddress. With a GSTIN the state must be the GSTIN's state — the
 * server answers 422 BILLING_STATE_GSTIN_MISMATCH otherwise. There is no
 * delete (409 BILLING_ADDRESS_NOT_DELETABLE).
 * ---------------------------------------------------------------------- */

const LINE1_MAX = 300;

// Match a saved / suggested state ("madhya pradesh") to the list spelling.
const matchState = (s) => INDIAN_STATES.find((x) => x.toLowerCase() === String(s || "").trim().toLowerCase()) || (s ? String(s) : "");

function toForm(a) {
  const c = Array.isArray(a?.coordinates) ? a.coordinates : null;
  return {
    addressLine1: a?.addressLine1 || "",
    addressLine2: a?.addressLine2 || "",
    landmark: a?.landmark || "",
    city: a?.city || "",
    district: a?.district || "",
    state: matchState(a?.state),
    zipcode: a?.zipcode || a?.pin || "",
    lng: c ? String(c[0]) : "",
    lat: c ? String(c[1]) : "",
  };
}

function problems(f) {
  const p = {};
  if (!f.addressLine1.trim()) p.addressLine1 = "Required.";
  else if (f.addressLine1.trim().length > LINE1_MAX) p.addressLine1 = `At most ${LINE1_MAX} characters.`;
  if (!f.city.trim()) p.city = "Required.";
  if (!f.state.trim()) p.state = "Required.";
  if (!PIN_RE.test(f.zipcode.trim())) p.zipcode = "6-digit PIN code.";
  const lng = Number(f.lng);
  const lat = Number(f.lat);
  if (f.lng.trim() === "" || !Number.isFinite(lng) || lng < -180 || lng > 180) p.lng = "Longitude −180 … 180.";
  if (f.lat.trim() === "" || !Number.isFinite(lat) || lat < -90 || lat > 90) p.lat = "Latitude −90 … 90.";
  return p;
}

function toBody(f) {
  const body = {
    addressLine1: f.addressLine1.trim(),
    city: f.city.trim(),
    state: f.state.trim(),
    zipcode: f.zipcode.trim(),
    country: "india",
    coordinates: [Number(f.lng), Number(f.lat)],
  };
  ["addressLine2", "landmark", "district"].forEach((k) => {
    if (f[k].trim()) body[k] = f[k].trim();
  });
  return body;
}

/**
 * @param initial     saved billingAddress, or a suggestedAddress to prefill
 * @param gstAddress  GET billing-address → gstAddress (enables "Same as GST")
 * @param gstin       the brand's GSTIN (state rule hint)
 */
export default function BillingAddressForm({ brandId, initial, gstAddress, gstin, submitLabel = "Save billing address", onCancel, onSaved }) {
  const [form, setForm] = useState(() => toForm(initial));
  const [sameAsGst, setSameAsGst] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const errs = problems(form);
  const invalid = Object.keys(errs).length > 0;
  const gstState = gstAddress?.state ? matchState(gstAddress.state) : "";
  const stateClash = gstState && form.state && gstState.toLowerCase() !== form.state.toLowerCase();
  const stateOptions = form.state && !INDIAN_STATES.includes(form.state) ? [form.state, ...INDIAN_STATES] : INDIAN_STATES;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleSameAsGst = (checked) => {
    setSameAsGst(checked);
    // Prefill only — coordinates stay as typed (the GST address has none).
    if (checked && gstAddress) setForm((f) => ({ ...toForm(gstAddress), lng: f.lng, lat: f.lat }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    setBusy(true);
    setError("");
    try {
      const res = await saveBillingAddress(brandId, toBody(form));
      onSaved?.(res?.data?.billingAddress ?? null);
    } catch (err) {
      if (err.code === "BILLING_STATE_GSTIN_MISMATCH") {
        const d = err.details || {};
        setError(`The state must be the GSTIN's state${d.gstinState ? ` (${d.gstinState})` : ""}${d.billingState ? ` — you picked ${d.billingState}` : ""}.`);
      } else {
        setError(v2ErrorText(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const err = (k) => touched && errs[k] && <span className="mt-1 block text-[11px] text-red-600 dark:text-red-400">{errs[k]}</span>;

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {gstAddress && (
        <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
          <input type="checkbox" checked={sameAsGst} onChange={(e) => toggleSameAsGst(e.target.checked)} className="accent-emerald-500" />
          Same as GST address{gstin ? ` (${gstin})` : ""}
        </label>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Address line 1" required>
            <input value={form.addressLine1} onChange={set("addressLine1")} maxLength={LINE1_MAX} className={inputClass} />
          </Field>
          {err("addressLine1")}
        </div>
        <Field label="Address line 2">
          <input value={form.addressLine2} onChange={set("addressLine2")} className={inputClass} />
        </Field>
        <Field label="Landmark">
          <input value={form.landmark} onChange={set("landmark")} className={inputClass} />
        </Field>
        <div>
          <Field label="City" required>
            <input value={form.city} onChange={set("city")} className={inputClass} />
          </Field>
          {err("city")}
        </div>
        <Field label="District">
          <input value={form.district} onChange={set("district")} className={inputClass} />
        </Field>
        <div>
          <Field label="State" required>
            <select value={form.state} onChange={set("state")} className={inputClass}>
              <option value="">Pick a state</option>
              {stateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          {err("state")}
          {stateClash && <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">The GSTIN is from {gstState} — the server will refuse another state.</span>}
        </div>
        <div>
          <Field label="PIN code" required>
            <input value={form.zipcode} onChange={set("zipcode")} inputMode="numeric" maxLength={6} className={inputClass} />
          </Field>
          {err("zipcode")}
        </div>
        <div>
          <Field label="Longitude" required>
            <input value={form.lng} onChange={set("lng")} inputMode="decimal" placeholder="e.g. 75.8577" className={inputClass} />
          </Field>
          {err("lng")}
        </div>
        <div>
          <Field label="Latitude" required>
            <input value={form.lat} onChange={set("lat")} inputMode="decimal" placeholder="e.g. 22.7196" className={inputClass} />
          </Field>
          {err("lat")}
        </div>
      </div>
      <p className="text-[11.5px] text-neutral-500">Coordinates are typed by hand for now — map search comes later.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Btn onClick={onCancel} disabled={busy}>
            Cancel
          </Btn>
        )}
        <Btn type="submit" tone="primary" busy={busy} disabled={touched && invalid}>
          {submitLabel}
        </Btn>
      </div>
    </form>
  );
}
