import React, { useState, useEffect, useCallback } from "react";
import {
  Ticket,
  LayoutGrid,
  SlidersHorizontal,
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
    updatedAt: settings?.updatedAt,
    updatedBy: settings?.updatedBy,
  };
}

// The API only accepts a partial body per section — { isActive } on its
// own, or { vendor: { voucher } } on its own, or { vendor: { showcase } }
// on its own — never all three combined. Each section saves independently.
function buildSavePayload(sectionId, form) {
  if (sectionId === "general") return { isActive: form.isActive };
  if (sectionId === "voucher") return { vendor: { voucher: form.voucher } };
  return { vendor: { showcase: form.showcase } };
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
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">{label}</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-2.5 py-1 text-[11.5px] font-medium text-neutral-300"
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
          className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-[13px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
        />
        <button
          type="button"
          onClick={addTag}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-neutral-800 px-3 text-[12.5px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/60">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-[13.5px] text-neutral-200 focus:outline-none"
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
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">Settings</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Global vendor limits — each section below saves independently.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading settings…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-400">
            Failed to load settings: {loadError}
          </div>
        )}

        {!loading && !loadError && form && (
          <div className="flex flex-col gap-5 lg:flex-row">
            {/* Left: section nav, sidebar-style */}
            <div className="shrink-0 lg:w-60">
              <div className="space-y-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-2 lg:sticky lg:top-6">
                {SECTIONS.map((s) => {
                  const active = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectSection(s.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${
                        active ? "bg-emerald-400 text-neutral-950" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
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
                  <h2 className="text-[15px] font-semibold text-neutral-50">{section.label}</h2>
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
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-400">
                  <AlertTriangle size={14} className="shrink-0" />
                  {saveError}
                </div>
              )}
              {savedSection === activeSection && !saving && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-[12.5px] text-emerald-400">
                  <CheckCircle2 size={14} className="shrink-0" />
                  {section.label} settings saved.
                </div>
              )}

              {/* General */}
              {activeSection === "general" && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                  <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Settings Active</label>
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
                            ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                            : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
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
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
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
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
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
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-neutral-700/40 text-neutral-400"
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

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
