import React, { useState, useEffect, useCallback } from "react";
import {
  Ticket,
  LayoutGrid,
  SlidersHorizontal,
  CreditCard,
  Loader2,
  Save,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { getSettings, updateSettings } from "./services/SettingsApi";

const SECTIONS = [
  {
    id: "general",
    label: "General",
    icon: SlidersHorizontal,
    description: "Overall on/off switch for the settings document.",
  },
  {
    id: "voucher",
    label: "Voucher",
    icon: Ticket,
    description: "Limits applied to vendor-submitted vouchers.",
  },
  {
    id: "showcase",
    label: "Showcase",
    icon: LayoutGrid,
    description: "Limits applied to a vendor's showcase sections and media.",
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: CreditCard,
    description: "Billing company/tax details and subscription lifecycle rules.",
  },
];

const EMPTY_VOUCHER = { maxOffers: 0, maxImages: 0, maxDistanceKm: 0 };
const EMPTY_SHOWCASE = {
  maxSections: 0,
  maxItemsPerSection: 0,
  maxImagesPerSection: 0,
  maxVideosPerSection: 0,
  maxImageSizeMB: 0,
  maxVideoSizeMB: 0,
  allowedImages: [],
  allowedVideos: [],
  isActive: true,
};
const EMPTY_SUBSCRIPTION = {
  gstPercentage: 18,
  isGstInclusive: false,
  companyName: "",
  companyGstin: "",
  companyAddress: "",
  companyStateCode: "",
  companyState: "",
  hsnSacCode: "",
  allowVendorDowngrade: false,
  allowAdminDowngrade: true,
  allowAdminFreeGrant: true,
  gracePeriodDays: 0,
  expiryJobIntervalMinutes: 60,
  isEmailNotificationEnabled: true,
  isPushNotificationEnabled: true,
  isWhatsAppNotificationEnabled: false,
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function apiToForm(settings) {
  const vendor = settings?.vendor || {};
  return {
    isActive: Boolean(settings?.isActive),
    voucher: { ...EMPTY_VOUCHER, ...(vendor.voucher || {}) },
    showcase: { ...EMPTY_SHOWCASE, ...(vendor.showcase || {}) },
    subscription: { ...EMPTY_SUBSCRIPTION, ...(vendor.subscription || {}) },
    updatedAt: settings?.updatedAt,
    updatedBy: settings?.updatedBy,
  };
}

// The API only accepts a partial body per section — { isActive } on its
// own, or { vendor: { voucher } } on its own, or { vendor: { showcase } } on
// its own, or { vendor: { subscription } } on its own — never combined.
// Each section saves independently.
function buildSavePayload(sectionId, form) {
  if (sectionId === "general") return { isActive: form.isActive };
  if (sectionId === "voucher") return { vendor: { voucher: form.voucher } };
  if (sectionId === "showcase") return { vendor: { showcase: form.showcase } };
  return { vendor: { subscription: form.subscription } };
}

/* -------------------------------------------------------------------------
 * A removable-chip list editor for the showcase's allowed mime-type arrays.
 * ---------------------------------------------------------------------- */
function TagListEditor({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  const removeTag = (v) => onChange(values.filter((t) => t !== v));

  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 rounded-full bg-neutral-200 px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {v}
            <button
              type="button"
              onClick={() => removeTag(v)}
              aria-label={`Remove ${v}`}
              className="text-neutral-500 hover:text-red-400"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-[12px] text-neutral-600">None allowed yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-[13px] text-neutral-800 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
        />
        <button
          type="button"
          onClick={addTag}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-[12.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, textarea = false }) {
  const sharedClass =
    "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200";
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className={`resize-none ${sharedClass}`}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={sharedClass} />
      )}
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-left dark:border-neutral-800 dark:bg-neutral-950"
    >
      <span className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          checked
            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
        }`}
      >
        {checked ? "On" : "Off"}
      </span>
    </button>
  );
}

function NumberField({ label, value, onChange, suffix }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-[13.5px] text-neutral-800 focus:outline-none dark:text-neutral-200"
        />
        {suffix && <span className="shrink-0 text-[11.5px] text-neutral-500">{suffix}</span>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — a left-hand section nav (like the app sidebar) + a right
 * content panel, each section saving only its own slice of the settings.
 * ---------------------------------------------------------------------- */

export default function Settings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeSection, setActiveSection] = useState("general");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedSection, setSavedSection] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getSettings();
      setForm(apiToForm(res?.data ?? res));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const setVoucherField = (field, value) =>
    setForm((prev) => ({ ...prev, voucher: { ...prev.voucher, [field]: value } }));
  const setShowcaseField = (field, value) =>
    setForm((prev) => ({ ...prev, showcase: { ...prev.showcase, [field]: value } }));
  const setSubscriptionField = (field, value) =>
    setForm((prev) => ({ ...prev, subscription: { ...prev.subscription, [field]: value } }));

  const selectSection = (id) => {
    setActiveSection(id);
    setSaveError("");
    setSavedSection("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSavedSection("");
    try {
      await updateSettings(buildSavePayload(activeSection, form));
      setSavedSection(activeSection);
      fetchSettings();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const section = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Settings</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Global vendor limits — each section below saves independently.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading settings…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load settings: {loadError}
          </div>
        )}

        {!loading && !loadError && form && (
          <div className="flex flex-col gap-5 lg:flex-row">
            {/* Left: section nav, sidebar-style */}
            <div className="shrink-0 lg:w-60">
              <div className="space-y-1 rounded-2xl bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:sticky lg:top-6">
                {SECTIONS.map((s) => {
                  const active = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectSection(s.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${
                        active ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      }`}
                    >
                      <s.icon size={16} className="shrink-0" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: active section's content */}
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{section.label}</h2>
                  <p className="text-[12.5px] text-neutral-500">{section.description}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={14} className="shrink-0" />
                  {saveError}
                </div>
              )}
              {savedSection === activeSection && !saving && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-[12.5px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} className="shrink-0" />
                  {section.label} settings saved.
                </div>
              )}

              {/* General */}
              {activeSection === "general" && (
                <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                  <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Settings Active</label>
                  <div className="flex gap-2">
                    {[
                      { label: "Active", value: true },
                      { label: "Inactive", value: false },
                    ].map((s) => (
                      <button
                        type="button"
                        key={s.label}
                        onClick={() => setForm((prev) => ({ ...prev, isActive: s.value }))}
                        className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors sm:flex-none sm:px-6 ${
                          form.isActive === s.value
                            ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                            : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[11.5px] text-neutral-600">
                    Last updated {formatDateTime(form.updatedAt)}
                    {form.updatedBy ? ` by ${form.updatedBy}` : ""}
                  </p>
                </div>
              )}

              {/* Voucher */}
              {activeSection === "voucher" && (
                <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                  <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                    Vendor Voucher Limits
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <NumberField
                      label="Max Offers"
                      value={form.voucher.maxOffers}
                      onChange={(v) => setVoucherField("maxOffers", v)}
                      suffix="per voucher"
                    />
                    <NumberField
                      label="Max Images"
                      value={form.voucher.maxImages}
                      onChange={(v) => setVoucherField("maxImages", v)}
                      suffix="per voucher"
                    />
                    <NumberField
                      label="Max Distance"
                      value={form.voucher.maxDistanceKm}
                      onChange={(v) => setVoucherField("maxDistanceKm", v)}
                      suffix="km"
                    />
                  </div>
                </div>
              )}

              {/* Showcase */}
              {activeSection === "showcase" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                        Vendor Showcase Limits
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowcaseField("isActive", !form.showcase.isActive)}
                        aria-pressed={form.showcase.isActive}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                          form.showcase.isActive
                            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                        }`}
                      >
                        Showcase {form.showcase.isActive ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <NumberField
                        label="Max Sections"
                        value={form.showcase.maxSections}
                        onChange={(v) => setShowcaseField("maxSections", v)}
                      />
                      <NumberField
                        label="Max Items / Section"
                        value={form.showcase.maxItemsPerSection}
                        onChange={(v) => setShowcaseField("maxItemsPerSection", v)}
                      />
                      <NumberField
                        label="Max Images / Section"
                        value={form.showcase.maxImagesPerSection}
                        onChange={(v) => setShowcaseField("maxImagesPerSection", v)}
                      />
                      <NumberField
                        label="Max Videos / Section"
                        value={form.showcase.maxVideosPerSection}
                        onChange={(v) => setShowcaseField("maxVideosPerSection", v)}
                      />
                      <NumberField
                        label="Max Image Size"
                        value={form.showcase.maxImageSizeMB}
                        onChange={(v) => setShowcaseField("maxImageSizeMB", v)}
                        suffix="MB"
                      />
                      <NumberField
                        label="Max Video Size"
                        value={form.showcase.maxVideoSizeMB}
                        onChange={(v) => setShowcaseField("maxVideoSizeMB", v)}
                        suffix="MB"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Allowed Media Types
                    </p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <TagListEditor
                        label="Allowed Images"
                        values={form.showcase.allowedImages}
                        onChange={(v) => setShowcaseField("allowedImages", v)}
                        placeholder="e.g. image/png"
                      />
                      <TagListEditor
                        label="Allowed Videos"
                        values={form.showcase.allowedVideos}
                        onChange={(v) => setShowcaseField("allowedVideos", v)}
                        placeholder="e.g. video/mp4"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription */}
              {activeSection === "subscription" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Company &amp; Tax Details
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextField
                        label="Company Name"
                        value={form.subscription.companyName}
                        onChange={(v) => setSubscriptionField("companyName", v)}
                        placeholder="e.g. Trydood Retail Private Limited"
                      />
                      <TextField
                        label="Company GSTIN"
                        value={form.subscription.companyGstin}
                        onChange={(v) => setSubscriptionField("companyGstin", v)}
                        placeholder="e.g. 33AAKCT3750N1ZB"
                      />
                      <TextField
                        label="Company State"
                        value={form.subscription.companyState}
                        onChange={(v) => setSubscriptionField("companyState", v)}
                        placeholder="e.g. Tamil Nadu"
                      />
                      <TextField
                        label="Company State Code"
                        value={form.subscription.companyStateCode}
                        onChange={(v) => setSubscriptionField("companyStateCode", v)}
                        placeholder="e.g. 33"
                      />
                      <TextField
                        label="HSN/SAC Code"
                        value={form.subscription.hsnSacCode}
                        onChange={(v) => setSubscriptionField("hsnSacCode", v)}
                        placeholder="e.g. 998315"
                      />
                      <NumberField
                        label="GST Percentage"
                        value={form.subscription.gstPercentage}
                        onChange={(v) => setSubscriptionField("gstPercentage", v)}
                        suffix="%"
                      />
                    </div>
                    <div className="mt-4">
                      <TextField
                        label="Company Address"
                        value={form.subscription.companyAddress}
                        onChange={(v) => setSubscriptionField("companyAddress", v)}
                        placeholder="Full registered company address"
                        textarea
                      />
                    </div>
                    <div className="mt-4">
                      <ToggleField
                        label="GST Inclusive Pricing"
                        checked={form.subscription.isGstInclusive}
                        onChange={(v) => setSubscriptionField("isGstInclusive", v)}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Lifecycle Rules
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <NumberField
                        label="Grace Period"
                        value={form.subscription.gracePeriodDays}
                        onChange={(v) => setSubscriptionField("gracePeriodDays", v)}
                        suffix="days"
                      />
                      <NumberField
                        label="Expiry Job Interval"
                        value={form.subscription.expiryJobIntervalMinutes}
                        onChange={(v) => setSubscriptionField("expiryJobIntervalMinutes", v)}
                        suffix="minutes"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <ToggleField
                        label="Vendor Can Downgrade"
                        checked={form.subscription.allowVendorDowngrade}
                        onChange={(v) => setSubscriptionField("allowVendorDowngrade", v)}
                      />
                      <ToggleField
                        label="Admin Can Downgrade"
                        checked={form.subscription.allowAdminDowngrade}
                        onChange={(v) => setSubscriptionField("allowAdminDowngrade", v)}
                      />
                      <ToggleField
                        label="Admin Can Free-Grant"
                        checked={form.subscription.allowAdminFreeGrant}
                        onChange={(v) => setSubscriptionField("allowAdminFreeGrant", v)}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Notifications
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <ToggleField
                        label="Email Notifications"
                        checked={form.subscription.isEmailNotificationEnabled}
                        onChange={(v) => setSubscriptionField("isEmailNotificationEnabled", v)}
                      />
                      <ToggleField
                        label="Push Notifications"
                        checked={form.subscription.isPushNotificationEnabled}
                        onChange={(v) => setSubscriptionField("isPushNotificationEnabled", v)}
                      />
                      <ToggleField
                        label="WhatsApp Notifications"
                        checked={form.subscription.isWhatsAppNotificationEnabled}
                        onChange={(v) => setSubscriptionField("isWhatsAppNotificationEnabled", v)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
