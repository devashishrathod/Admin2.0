import React, { useState, useEffect, useCallback } from "react";
import {
  SlidersHorizontal,
  Loader2,
  Save,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Store,
  Users,
  ShieldCheck,
  Lock,
  Smartphone,
  ChevronDown,
  Scale,
} from "lucide-react";
import { getSettings, updateSettings } from "./services/SettingsApi";
import LegalDocsPanel from "../legal/LegalDocsPanel";

/* -------------------------------------------------------------------------
 * Sidebar tree — confirmed against the real GET /settings/get response.
 * Each top-level group (Vendor/Customer/Security/Admin/App) nests its own
 * real sub-sections; General stays a single top-level leaf like before.
 * ---------------------------------------------------------------------- */
const SECTIONS = [
  { id: "general", label: "General Setting", icon: SlidersHorizontal },
  {
    id: "vendor",
    label: "Vendor Setting",
    icon: Store,
    children: [
      { id: "vendor.voucher", label: "Voucher" },
      { id: "vendor.showcase", label: "Showcase" },
      { id: "vendor.subscription", label: "Subscription" },
      { id: "vendor.notification", label: "Notification" },
    ],
  },
  {
    id: "customer",
    label: "Customer Setting",
    icon: Users,
    children: [
      { id: "customer.convenienceFee", label: "Convenience Fee" },
      { id: "customer.tax", label: "Tax" },
      { id: "customer.promoCode", label: "Promo Code" },
      { id: "customer.claim", label: "Claim" },
      { id: "customer.notification", label: "Notifications" },
      { id: "customer.invoice", label: "Invoice" },
      { id: "customer.settlement", label: "Settlement" },
      { id: "customer.refund", label: "Refund" },
      { id: "customer.chargeback", label: "Chargeback" },
      { id: "customer.search", label: "Search" },
    ],
  },
  {
    id: "security",
    label: "Security Setting",
    icon: Lock,
    children: [{ id: "security.otp", label: "OTP" }],
  },
  {
    id: "admin",
    label: "Admin Setting",
    icon: ShieldCheck,
    children: [{ id: "admin.notification", label: "Notifications" }],
  },
  {
    id: "app",
    label: "App Setting",
    icon: Smartphone,
    children: [
      { id: "app.version", label: "Version & Update" },
      { id: "app.support", label: "Support & Features" },
    ],
  },
  // Legal docs are a separate resource (their own create/update/delete
  // endpoints), not fields on the single settings document — so unlike
  // every other leaf here, these two don't go through handleSave/
  // updateSettings at all. See the isLegalSection branch below.
  {
    id: "legal",
    label: "Legal",
    icon: Scale,
    children: [
      { id: "legal.terms", label: "Terms & Conditions" },
      { id: "legal.privacy", label: "Privacy Policy" },
    ],
  },
];

/* -------------------------------------------------------------------------
 * Empty defaults — one per real sub-object, so nothing crashes on a fresh
 * document that's missing a key, and merged with whatever the API returns.
 * ---------------------------------------------------------------------- */
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
  hsnSacCode: "",
  companyName: "",
  companyGstin: "",
  companyAddress: "",
  companyStateCode: "",
  companyState: "",
  currency: "INR",
  allowVendorUpgrade: true,
  allowVendorDowngrade: false,
  allowVendorRenewal: true,
  allowAdminDowngrade: true,
  allowAdminFreeGrant: true,
  gracePeriodDays: 0,
  pendingOrderReuseMinutes: 15,
  expiryJobIntervalMinutes: 60,
  isPromoCodeEnabled: true,
  expiryReminderDays: [],
  reminderJobIntervalMinutes: 180,
  isEmailNotificationEnabled: true,
  isPushNotificationEnabled: true,
  isWhatsAppNotificationEnabled: false,
  isActive: true,
};

const EMPTY_CONVENIENCE_FEE = { isEnabled: true, slabSize: 0, feePerSlab: 0, maxFee: 0, chargeWhenNoOffer: false };
const EMPTY_TAX = { isGstEnabled: false, gstPercentage: 0, isGstInclusive: true, sacCode: "" };
const EMPTY_PROMO_CODE = { isEnabled: true, allowWhenNoOffer: false, allowForGuestPreview: true };
const EMPTY_CLAIM = {
  isEnabled: true,
  allowWhenNoOffer: true,
  maxBillAmount: 0,
  pendingOrderReuseMinutes: 10,
  quoteTtlMinutes: 30,
  allowWhenVendorPlanExpired: false,
  vendorPlanExpiredGraceDays: 0,
  redemptionWindowHours: 24,
};
const EMPTY_CUSTOMER_NOTIFICATION = {
  isEmailNotificationEnabled: true,
  isPushNotificationEnabled: true,
  isWhatsAppNotificationEnabled: false,
};
const EMPTY_INVOICE = { seriesPrefix: "" };
const EMPTY_RESERVE = {
  isEnabled: false,
  percent: 0,
  holdDays: 0,
  riskChargebackCount: 0,
  riskLookbackDays: 0,
  riskMinPayments: 0,
  riskDisputeRatePercent: 0,
  riskPercent: 0,
  maxPercent: 0,
};
const EMPTY_SETTLEMENT = {
  isEnabled: true,
  delayDays: 0,
  payoutBufferHours: 0,
  cycleType: "DAILY",
  requiresAdminApproval: true,
  minPayoutAmount: 0,
  payoutProvider: "MANUAL_BANK",
  commissionPercent: 0,
  reserve: EMPTY_RESERVE,
  newVendorReserveDays: 0,
  notReceivedAlertHours: 0,
  gatewayFeeBearer: "PLATFORM",
};
const EMPTY_REFUND = {
  method: "SOURCE",
  windowHours: 24,
  vendorApprovalHours: 24,
  adminBufferHours: 12,
  onVendorTimeout: "ESCALATE",
  allowPartial: true,
  releasePromoOnRefund: false,
  authorizedAlertMinutes: 30,
  maxOpenRequests: 1,
  maxRejectedPerWindow: 3,
  requestWindowDays: 30,
  bankDetailsReminderHours: [],
  bankDetailsStaleDays: 30,
};
const EMPTY_CHARGEBACK = { writeOffDays: 90, deadlineAlertHours: [] };
const EMPTY_SEARCH = { isEnabled: true, minQueryLength: 2, sectionLimit: 5, historyLimit: 20, popularQueries: [] };

const EMPTY_OTP = { resendCooldownSeconds: 60, maxPerHour: 5 };

const EMPTY_ADMIN_NOTIFICATION = {
  isEmailNotificationEnabled: true,
  isPushNotificationEnabled: true,
  isWhatsAppNotificationEnabled: false,
  maxRecipientsPerDispatch: 5000,
};

const EMPTY_APP = {
  minVersion: { android: "", ios: "" },
  latestVersion: { android: "", ios: "" },
  forceUpdate: false,
  updateMessage: "",
  storeUrl: { android: "", ios: "" },
  support: { email: "", phone: "", whatsapp: "" },
  features: { promoCodes: true, refunds: true, voucherClaims: true, search: true },
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function apiToForm(settings) {
  const vendor = settings?.vendor || {};
  const customer = settings?.customer || {};
  const security = settings?.security || {};
  const admin = settings?.admin || {};
  const app = settings?.app || {};
  const settlement = { ...EMPTY_SETTLEMENT, ...(customer.settlement || {}) };
  settlement.reserve = { ...EMPTY_RESERVE, ...(customer.settlement?.reserve || {}) };

  return {
    isActive: Boolean(settings?.isActive),
    vendor: {
      voucher: { ...EMPTY_VOUCHER, ...(vendor.voucher || {}) },
      showcase: { ...EMPTY_SHOWCASE, ...(vendor.showcase || {}) },
      subscription: { ...EMPTY_SUBSCRIPTION, ...(vendor.subscription || {}) },
    },
    customer: {
      convenienceFee: { ...EMPTY_CONVENIENCE_FEE, ...(customer.convenienceFee || {}) },
      tax: { ...EMPTY_TAX, ...(customer.tax || {}) },
      promoCode: { ...EMPTY_PROMO_CODE, ...(customer.promoCode || {}) },
      claim: { ...EMPTY_CLAIM, ...(customer.claim || {}) },
      notification: { ...EMPTY_CUSTOMER_NOTIFICATION, ...(customer.notification || {}) },
      invoice: { ...EMPTY_INVOICE, ...(customer.invoice || {}) },
      settlement,
      refund: { ...EMPTY_REFUND, ...(customer.refund || {}) },
      chargeback: { ...EMPTY_CHARGEBACK, ...(customer.chargeback || {}) },
      search: { ...EMPTY_SEARCH, ...(customer.search || {}) },
    },
    security: {
      otp: { ...EMPTY_OTP, ...(security.otp || {}) },
    },
    admin: {
      notification: { ...EMPTY_ADMIN_NOTIFICATION, ...(admin.notification || {}) },
    },
    app: {
      minVersion: { ...EMPTY_APP.minVersion, ...(app.minVersion || {}) },
      latestVersion: { ...EMPTY_APP.latestVersion, ...(app.latestVersion || {}) },
      forceUpdate: Boolean(app.forceUpdate),
      updateMessage: app.updateMessage || "",
      storeUrl: { ...EMPTY_APP.storeUrl, ...(app.storeUrl || {}) },
      support: { ...EMPTY_APP.support, ...(app.support || {}) },
      features: { ...EMPTY_APP.features, ...(app.features || {}) },
    },
    updatedAt: settings?.updatedAt,
    updatedBy: settings?.updatedBy,
  };
}

// Each sidebar leaf maps to exactly one real sub-object path, matching the
// backend's "one partial body per PUT" rule confirmed for vendor.voucher /
// vendor.showcase / vendor.subscription — extended here to every other
// group (customer.*, security.otp, admin.notification) on the same
// assumption. App's two leaves aren't individually confirmed against a
// real PUT yet, so they group App's own real keys defensively; tighten
// this once the actual update contract for `app` is confirmed.
function buildSavePayload(sectionId, form) {
  if (sectionId === "general") return { isActive: form.isActive };

  // These notification fields live inside the real vendor.subscription
  // sub-object (there's no separate vendor.notification path in the API) —
  // shown on their own tab for clarity, but saved as part of subscription.
  if (sectionId === "vendor.notification") return { vendor: { subscription: form.vendor.subscription } };

  const [group, key] = sectionId.split(".");

  if (group === "app") {
    if (key === "version") {
      const { minVersion, latestVersion, forceUpdate, updateMessage, storeUrl } = form.app;
      return { app: { minVersion, latestVersion, forceUpdate, updateMessage, storeUrl } };
    }
    const { support, features } = form.app;
    return { app: { support, features } };
  }

  return { [group]: { [key]: form[group][key] } };
}

/* -------------------------------------------------------------------------
 * A removable-chip list editor for string arrays (mime types, popular
 * search queries, ...).
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
        {values.length === 0 && <span className="text-[12px] text-neutral-600">None set yet.</span>}
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

// Same chip-list editor as above, but for arrays of numbers (reminder
// hour/day offsets) — values are typed as plain numbers, not strings.
function NumberListEditor({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addValue = () => {
    const n = Number(draft);
    if (draft.trim() === "" || Number.isNaN(n) || values.includes(n)) {
      setDraft("");
      return;
    }
    onChange([...values, n]);
    setDraft("");
  };

  const removeValue = (n) => onChange(values.filter((v) => v !== n));

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
              onClick={() => removeValue(v)}
              aria-label={`Remove ${v}`}
              className="text-neutral-500 hover:text-red-400"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-[12px] text-neutral-600">None set yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-[13px] text-neutral-800 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
        />
        <button
          type="button"
          onClick={addValue}
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

// A real sliding switch (track + knob) instead of a static "On"/"Off"
// text pill — click-to-toggle, visually unmistakable as a toggle.
function ToggleField({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-left transition-colors hover:border-emerald-400/40 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <span className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-emerald-400" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function NumberField({ label, value, onChange, suffix, disabled = false, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div
        className={`flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <input
          type="number"
          min={0}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-[13.5px] text-neutral-800 focus:outline-none disabled:cursor-not-allowed dark:text-neutral-200"
        />
        {suffix && <span className="shrink-0 text-[11.5px] text-neutral-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[10.5px] text-neutral-500">{hint}</p>}
    </div>
  );
}

// A real dropdown for fields the backend validator restricts to a fixed
// enum — free text on these would just 422 on save.
function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// Card wrapper — every leaf section is one or more of these stacked.
function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
        {right}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — a nested left-hand section tree + a right content panel;
 * each leaf section saves only its own real sub-object.
 * ---------------------------------------------------------------------- */

export default function Settings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeSection, setActiveSection] = useState("general");
  const [expandedGroup, setExpandedGroup] = useState(null);

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

  const setVendorField = (section, field, value) =>
    setForm((prev) => ({ ...prev, vendor: { ...prev.vendor, [section]: { ...prev.vendor[section], [field]: value } } }));
  const setCustomerField = (section, field, value) =>
    setForm((prev) => ({ ...prev, customer: { ...prev.customer, [section]: { ...prev.customer[section], [field]: value } } }));
  const setReserveField = (field, value) =>
    setForm((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        settlement: { ...prev.customer.settlement, reserve: { ...prev.customer.settlement.reserve, [field]: value } },
      },
    }));
  const setSecurityField = (section, field, value) =>
    setForm((prev) => ({ ...prev, security: { ...prev.security, [section]: { ...prev.security[section], [field]: value } } }));
  const setAdminField = (section, field, value) =>
    setForm((prev) => ({ ...prev, admin: { ...prev.admin, [section]: { ...prev.admin[section], [field]: value } } }));
  const setAppField = (section, field, value) =>
    setForm((prev) => ({ ...prev, app: { ...prev.app, [section]: { ...prev.app[section], [field]: value } } }));
  const setAppTopField = (field, value) => setForm((prev) => ({ ...prev, app: { ...prev.app, [field]: value } }));

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

  // Resolve the active leaf's display label ("Customer Setting — Tax") for
  // the header, and its parent group's icon.
  const activeGroup = SECTIONS.find((s) => s.id === activeSection || s.children?.some((c) => c.id === activeSection));
  const activeChild = activeGroup?.children?.find((c) => c.id === activeSection);
  const headerLabel = activeChild ? `${activeGroup.label} — ${activeChild.label}` : activeGroup?.label || "";
  const isLegalSection = activeSection === "legal.terms" || activeSection === "legal.privacy";

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Settings</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Platform-wide configuration — each section below saves independently.
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
          <div className="flex flex-col gap-5 md:flex-row">
            {/* Left: nested section nav — switches to a side-by-side
                layout starting at the md breakpoint (768px) instead of lg
                (1024px), so typical tablet/laptop widths get the compact
                2-column view instead of the whole nav tree stacking above
                the content and pushing it off-screen. */}
            <div className="shrink-0 md:w-64">
              <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)]">
                {SECTIONS.map((s) => {
                  const hasChildren = Boolean(s.children?.length);
                  const isExpanded = expandedGroup === s.id;
                  const isSelfActive = activeSection === s.id;
                  const isParentActive = hasChildren && s.children.some((c) => c.id === activeSection);

                  return (
                    <div key={s.id}>
                      <button
                        onClick={() => {
                          if (hasChildren) {
                            setExpandedGroup((prev) => (prev === s.id ? null : s.id));
                            if (!isParentActive) selectSection(s.children[0].id);
                          } else {
                            selectSection(s.id);
                          }
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${
                          isSelfActive || isParentActive
                            ? "bg-emerald-400 text-neutral-950"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        }`}
                      >
                        <s.icon size={16} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{s.label}</span>
                        {hasChildren && (
                          <ChevronDown
                            size={14}
                            className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        )}
                      </button>

                      {hasChildren && isExpanded && (
                        <div className="ml-3 mt-1 space-y-0.5 border-l border-neutral-200 pl-3 dark:border-neutral-800">
                          {s.children.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => selectSection(c.id)}
                              className={`block w-full rounded-lg px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
                                activeSection === c.id
                                  ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: active leaf's content */}
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{headerLabel}</h2>
                {/* Legal docs save through their own Add/Edit modal (each
                    document is its own create/update call), not the
                    single settings-document PUT every other leaf here
                    shares — so this page-level Save button doesn't apply. */}
                {!isLegalSection && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? "Saving…" : "Save"}
                  </button>
                )}
              </div>

              {!isLegalSection && saveError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={14} className="shrink-0" />
                  {saveError}
                </div>
              )}
              {!isLegalSection && savedSection === activeSection && !saving && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-[12.5px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} className="shrink-0" />
                  {headerLabel} saved.
                </div>
              )}

              {/* ---------------- Legal ---------------- */}
              {activeSection === "legal.terms" && <LegalDocsPanel kind="terms" />}
              {activeSection === "legal.privacy" && <LegalDocsPanel kind="privacy" />}

              {/* ---------------- General ---------------- */}
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

              {/* ---------------- Vendor > Voucher ---------------- */}
              {activeSection === "vendor.voucher" && (
                <Card title="Vendor Voucher Limits">
                  <NumberField
                    label="Max Offers"
                    value={form.vendor.voucher.maxOffers}
                    onChange={(v) => setVendorField("voucher", "maxOffers", v)}
                    suffix="per voucher"
                  />
                  <NumberField
                    label="Max Images"
                    value={form.vendor.voucher.maxImages}
                    onChange={(v) => setVendorField("voucher", "maxImages", v)}
                    suffix="per voucher"
                  />
                  <NumberField
                    label="Max Distance"
                    value={form.vendor.voucher.maxDistanceKm}
                    onChange={(v) => setVendorField("voucher", "maxDistanceKm", v)}
                    suffix="km"
                  />
                </Card>
              )}

              {/* ---------------- Vendor > Showcase ---------------- */}
              {activeSection === "vendor.showcase" && (
                <div className="space-y-4">
                  <Card
                    title="Vendor Showcase Limits"
                    right={
                      <button
                        type="button"
                        onClick={() => setVendorField("showcase", "isActive", !form.vendor.showcase.isActive)}
                        aria-pressed={form.vendor.showcase.isActive}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                          form.vendor.showcase.isActive
                            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                        }`}
                      >
                        Showcase {form.vendor.showcase.isActive ? "Enabled" : "Disabled"}
                      </button>
                    }
                  >
                    <NumberField
                      label="Max Sections"
                      value={form.vendor.showcase.maxSections}
                      onChange={(v) => setVendorField("showcase", "maxSections", v)}
                    />
                    <NumberField
                      label="Max Items / Section"
                      value={form.vendor.showcase.maxItemsPerSection}
                      onChange={(v) => setVendorField("showcase", "maxItemsPerSection", v)}
                    />
                    <NumberField
                      label="Max Images / Section"
                      value={form.vendor.showcase.maxImagesPerSection}
                      onChange={(v) => setVendorField("showcase", "maxImagesPerSection", v)}
                    />
                    <NumberField
                      label="Max Videos / Section"
                      value={form.vendor.showcase.maxVideosPerSection}
                      onChange={(v) => setVendorField("showcase", "maxVideosPerSection", v)}
                    />
                    <NumberField
                      label="Max Image Size"
                      value={form.vendor.showcase.maxImageSizeMB}
                      onChange={(v) => setVendorField("showcase", "maxImageSizeMB", v)}
                      suffix="MB"
                    />
                    <NumberField
                      label="Max Video Size"
                      value={form.vendor.showcase.maxVideoSizeMB}
                      onChange={(v) => setVendorField("showcase", "maxVideoSizeMB", v)}
                      suffix="MB"
                    />
                  </Card>

                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Allowed Media Types
                    </p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <TagListEditor
                        label="Allowed Images"
                        values={form.vendor.showcase.allowedImages}
                        onChange={(v) => setVendorField("showcase", "allowedImages", v)}
                        placeholder="e.g. image/png"
                      />
                      <TagListEditor
                        label="Allowed Videos"
                        values={form.vendor.showcase.allowedVideos}
                        onChange={(v) => setVendorField("showcase", "allowedVideos", v)}
                        placeholder="e.g. video/mp4"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- Vendor > Subscription ---------------- */}
              {activeSection === "vendor.subscription" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Company &amp; Tax Details
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextField
                        label="Company Name"
                        value={form.vendor.subscription.companyName}
                        onChange={(v) => setVendorField("subscription", "companyName", v)}
                        placeholder="e.g. Trydood Retail Private Limited"
                      />
                      <TextField
                        label="Company GSTIN"
                        value={form.vendor.subscription.companyGstin}
                        onChange={(v) => setVendorField("subscription", "companyGstin", v)}
                        placeholder="e.g. 33AAKCT3750N1ZB"
                      />
                      <TextField
                        label="Company State"
                        value={form.vendor.subscription.companyState}
                        onChange={(v) => setVendorField("subscription", "companyState", v)}
                        placeholder="e.g. Tamil Nadu"
                      />
                      <TextField
                        label="Company State Code"
                        value={form.vendor.subscription.companyStateCode}
                        onChange={(v) => setVendorField("subscription", "companyStateCode", v)}
                        placeholder="e.g. 33"
                      />
                      <TextField
                        label="HSN/SAC Code"
                        value={form.vendor.subscription.hsnSacCode}
                        onChange={(v) => setVendorField("subscription", "hsnSacCode", v)}
                        placeholder="e.g. 998315"
                      />
                      <SelectField
                        label="Currency"
                        value={form.vendor.subscription.currency}
                        options={["INR"]}
                        onChange={(v) => setVendorField("subscription", "currency", v)}
                      />
                      <NumberField
                        label="GST Percentage"
                        value={form.vendor.subscription.gstPercentage}
                        onChange={(v) => setVendorField("subscription", "gstPercentage", v)}
                        suffix="%"
                      />
                    </div>
                    <div className="mt-4">
                      <TextField
                        label="Company Address"
                        value={form.vendor.subscription.companyAddress}
                        onChange={(v) => setVendorField("subscription", "companyAddress", v)}
                        placeholder="Full registered company address"
                        textarea
                      />
                    </div>
                    <div className="mt-4">
                      <ToggleField
                        label="GST Inclusive Pricing"
                        checked={form.vendor.subscription.isGstInclusive}
                        onChange={(v) => setVendorField("subscription", "isGstInclusive", v)}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Permissions
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <ToggleField
                        label="Vendor Can Upgrade"
                        checked={form.vendor.subscription.allowVendorUpgrade}
                        onChange={(v) => setVendorField("subscription", "allowVendorUpgrade", v)}
                      />
                      <ToggleField
                        label="Vendor Can Downgrade"
                        checked={form.vendor.subscription.allowVendorDowngrade}
                        onChange={(v) => setVendorField("subscription", "allowVendorDowngrade", v)}
                      />
                      <ToggleField
                        label="Vendor Can Renew"
                        checked={form.vendor.subscription.allowVendorRenewal}
                        onChange={(v) => setVendorField("subscription", "allowVendorRenewal", v)}
                      />
                      <ToggleField
                        label="Admin Can Downgrade"
                        checked={form.vendor.subscription.allowAdminDowngrade}
                        onChange={(v) => setVendorField("subscription", "allowAdminDowngrade", v)}
                      />
                      <ToggleField
                        label="Admin Can Free-Grant"
                        checked={form.vendor.subscription.allowAdminFreeGrant}
                        onChange={(v) => setVendorField("subscription", "allowAdminFreeGrant", v)}
                      />
                      <ToggleField
                        label="Subscription Module Active"
                        checked={form.vendor.subscription.isActive}
                        onChange={(v) => setVendorField("subscription", "isActive", v)}
                      />
                    </div>
                  </div>

                  <Card title="Lifecycle & Timing">
                    <NumberField
                      label="Grace Period"
                      value={form.vendor.subscription.gracePeriodDays}
                      onChange={(v) => setVendorField("subscription", "gracePeriodDays", v)}
                      suffix="days"
                    />
                    <NumberField
                      label="Pending Order Reuse"
                      value={form.vendor.subscription.pendingOrderReuseMinutes}
                      onChange={(v) => setVendorField("subscription", "pendingOrderReuseMinutes", v)}
                      suffix="minutes"
                    />
                    <NumberField
                      label="Expiry Job Interval"
                      value={form.vendor.subscription.expiryJobIntervalMinutes}
                      onChange={(v) => setVendorField("subscription", "expiryJobIntervalMinutes", v)}
                      suffix="minutes"
                    />
                    <NumberField
                      label="Reminder Job Interval"
                      value={form.vendor.subscription.reminderJobIntervalMinutes}
                      onChange={(v) => setVendorField("subscription", "reminderJobIntervalMinutes", v)}
                      suffix="minutes"
                    />
                    <div className="sm:col-span-3">
                      <ToggleField
                        label="Promo Codes Enabled"
                        checked={form.vendor.subscription.isPromoCodeEnabled}
                        onChange={(v) => setVendorField("subscription", "isPromoCodeEnabled", v)}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <NumberListEditor
                        label="Expiry Reminder Days"
                        values={form.vendor.subscription.expiryReminderDays}
                        onChange={(v) => setVendorField("subscription", "expiryReminderDays", v)}
                        placeholder="e.g. 7"
                      />
                    </div>
                  </Card>
                </div>
              )}

              {/* ---------------- Vendor > Notification ---------------- */}
              {activeSection === "vendor.notification" && (
                <Card title="Notifications">
                  <ToggleField
                    label="Email Notifications"
                    checked={form.vendor.subscription.isEmailNotificationEnabled}
                    onChange={(v) => setVendorField("subscription", "isEmailNotificationEnabled", v)}
                  />
                  <ToggleField
                    label="Push Notifications"
                    checked={form.vendor.subscription.isPushNotificationEnabled}
                    onChange={(v) => setVendorField("subscription", "isPushNotificationEnabled", v)}
                  />
                  <ToggleField
                    label="WhatsApp Notifications"
                    checked={form.vendor.subscription.isWhatsAppNotificationEnabled}
                    onChange={(v) => setVendorField("subscription", "isWhatsAppNotificationEnabled", v)}
                  />
                </Card>
              )}

              {/* ---------------- Customer > Convenience Fee ---------------- */}
              {activeSection === "customer.convenienceFee" && (
                <Card title="Convenience Fee">
                  <ToggleField
                    label="Enabled"
                    checked={form.customer.convenienceFee.isEnabled}
                    onChange={(v) => setCustomerField("convenienceFee", "isEnabled", v)}
                  />
                  <ToggleField
                    label="Charge When No Offer"
                    checked={form.customer.convenienceFee.chargeWhenNoOffer}
                    onChange={(v) => setCustomerField("convenienceFee", "chargeWhenNoOffer", v)}
                  />
                  <div />
                  <NumberField
                    label="Slab Size"
                    value={form.customer.convenienceFee.slabSize}
                    onChange={(v) => setCustomerField("convenienceFee", "slabSize", v)}
                    suffix="₹"
                  />
                  <NumberField
                    label="Fee Per Slab"
                    value={form.customer.convenienceFee.feePerSlab}
                    onChange={(v) => setCustomerField("convenienceFee", "feePerSlab", v)}
                    suffix="₹"
                  />
                  <NumberField
                    label="Max Fee"
                    value={form.customer.convenienceFee.maxFee}
                    onChange={(v) => setCustomerField("convenienceFee", "maxFee", v)}
                    suffix="₹"
                  />
                </Card>
              )}

              {/* ---------------- Customer > Tax ---------------- */}
              {activeSection === "customer.tax" && (
                <Card title="Tax">
                  <ToggleField
                    label="GST Enabled"
                    checked={form.customer.tax.isGstEnabled}
                    onChange={(v) => setCustomerField("tax", "isGstEnabled", v)}
                  />
                  <ToggleField
                    label="GST Inclusive"
                    checked={form.customer.tax.isGstInclusive}
                    onChange={(v) => setCustomerField("tax", "isGstInclusive", v)}
                  />
                  <NumberField
                    label="GST Percentage"
                    value={form.customer.tax.gstPercentage}
                    onChange={(v) => setCustomerField("tax", "gstPercentage", v)}
                    suffix="%"
                  />
                  <TextField
                    label="SAC Code"
                    value={form.customer.tax.sacCode}
                    onChange={(v) => setCustomerField("tax", "sacCode", v)}
                    placeholder="e.g. 998599"
                  />
                </Card>
              )}

              {/* ---------------- Customer > Promo Code ---------------- */}
              {activeSection === "customer.promoCode" && (
                <Card title="Promo Code">
                  <ToggleField
                    label="Enabled"
                    checked={form.customer.promoCode.isEnabled}
                    onChange={(v) => setCustomerField("promoCode", "isEnabled", v)}
                  />
                  <ToggleField
                    label="Allow When No Offer"
                    checked={form.customer.promoCode.allowWhenNoOffer}
                    onChange={(v) => setCustomerField("promoCode", "allowWhenNoOffer", v)}
                  />
                  <ToggleField
                    label="Allow For Guest Preview"
                    checked={form.customer.promoCode.allowForGuestPreview}
                    onChange={(v) => setCustomerField("promoCode", "allowForGuestPreview", v)}
                  />
                </Card>
              )}

              {/* ---------------- Customer > Claim ---------------- */}
              {activeSection === "customer.claim" && (
                <Card title="Claim">
                  <ToggleField
                    label="Enabled"
                    checked={form.customer.claim.isEnabled}
                    onChange={(v) => setCustomerField("claim", "isEnabled", v)}
                  />
                  <ToggleField
                    label="Allow When No Offer"
                    checked={form.customer.claim.allowWhenNoOffer}
                    onChange={(v) => setCustomerField("claim", "allowWhenNoOffer", v)}
                  />
                  <ToggleField
                    label="Allow When Vendor Plan Expired"
                    checked={form.customer.claim.allowWhenVendorPlanExpired}
                    onChange={(v) => setCustomerField("claim", "allowWhenVendorPlanExpired", v)}
                  />
                  <NumberField
                    label="Max Bill Amount"
                    value={form.customer.claim.maxBillAmount}
                    onChange={(v) => setCustomerField("claim", "maxBillAmount", v)}
                    suffix="₹"
                  />
                  <NumberField
                    label="Pending Order Reuse"
                    value={form.customer.claim.pendingOrderReuseMinutes}
                    onChange={(v) => setCustomerField("claim", "pendingOrderReuseMinutes", v)}
                    suffix="minutes"
                  />
                  <NumberField
                    label="Quote TTL"
                    value={form.customer.claim.quoteTtlMinutes}
                    onChange={(v) => setCustomerField("claim", "quoteTtlMinutes", v)}
                    suffix="minutes"
                  />
                  <NumberField
                    label="Vendor Plan Expired Grace"
                    value={form.customer.claim.vendorPlanExpiredGraceDays}
                    onChange={(v) => setCustomerField("claim", "vendorPlanExpiredGraceDays", v)}
                    suffix="days"
                  />
                  <NumberField
                    label="Redemption Window"
                    value={form.customer.claim.redemptionWindowHours}
                    onChange={(v) => setCustomerField("claim", "redemptionWindowHours", v)}
                    suffix="hours"
                  />
                </Card>
              )}

              {/* ---------------- Customer > Notifications ---------------- */}
              {activeSection === "customer.notification" && (
                <Card title="Customer Notifications">
                  <ToggleField
                    label="Email Notifications"
                    checked={form.customer.notification.isEmailNotificationEnabled}
                    onChange={(v) => setCustomerField("notification", "isEmailNotificationEnabled", v)}
                  />
                  <ToggleField
                    label="Push Notifications"
                    checked={form.customer.notification.isPushNotificationEnabled}
                    onChange={(v) => setCustomerField("notification", "isPushNotificationEnabled", v)}
                  />
                  <ToggleField
                    label="WhatsApp Notifications"
                    checked={form.customer.notification.isWhatsAppNotificationEnabled}
                    onChange={(v) => setCustomerField("notification", "isWhatsAppNotificationEnabled", v)}
                  />
                </Card>
              )}

              {/* ---------------- Customer > Invoice ---------------- */}
              {activeSection === "customer.invoice" && (
                <Card title="Invoice">
                  <TextField
                    label="Series Prefix"
                    value={form.customer.invoice.seriesPrefix}
                    onChange={(v) => setCustomerField("invoice", "seriesPrefix", v)}
                    placeholder="e.g. VCH"
                  />
                </Card>
              )}

              {/* ---------------- Customer > Settlement ---------------- */}
              {activeSection === "customer.settlement" && (
                <div className="space-y-4">
                  <Card title="Settlement">
                    <ToggleField
                      label="Enabled"
                      checked={form.customer.settlement.isEnabled}
                      onChange={(v) => setCustomerField("settlement", "isEnabled", v)}
                    />
                    <ToggleField
                      label="Requires Admin Approval"
                      checked={form.customer.settlement.requiresAdminApproval}
                      onChange={(v) => setCustomerField("settlement", "requiresAdminApproval", v)}
                    />
                    <div />
                    <NumberField
                      label="Delay"
                      value={form.customer.settlement.delayDays}
                      onChange={(v) => setCustomerField("settlement", "delayDays", v)}
                      suffix="days"
                    />
                    <NumberField
                      label="Payout Buffer"
                      value={form.customer.settlement.payoutBufferHours}
                      onChange={(v) => setCustomerField("settlement", "payoutBufferHours", v)}
                      suffix="hours"
                    />
                    <NumberField
                      label="Min Payout Amount"
                      value={form.customer.settlement.minPayoutAmount}
                      onChange={(v) => setCustomerField("settlement", "minPayoutAmount", v)}
                      suffix="₹"
                    />
                    <NumberField
                      label="Commission"
                      value={form.customer.settlement.commissionPercent}
                      onChange={(v) => setCustomerField("settlement", "commissionPercent", v)}
                      suffix="%"
                    />
                    <NumberField
                      label="New Vendor Reserve"
                      value={form.customer.settlement.newVendorReserveDays}
                      onChange={(v) => setCustomerField("settlement", "newVendorReserveDays", v)}
                      suffix="days"
                    />
                    <NumberField
                      label="Not-Received Alert"
                      value={form.customer.settlement.notReceivedAlertHours}
                      onChange={(v) => setCustomerField("settlement", "notReceivedAlertHours", v)}
                      suffix="hours"
                    />
                    <SelectField
                      label="Cycle Type"
                      value={form.customer.settlement.cycleType}
                      options={["DAILY", "WEEKLY"]}
                      onChange={(v) => setCustomerField("settlement", "cycleType", v)}
                    />
                    <SelectField
                      label="Payout Provider"
                      value={form.customer.settlement.payoutProvider}
                      options={["MANUAL_BANK", "RAZORPAY_X", "RAZORPAY_ROUTE"]}
                      onChange={(v) => setCustomerField("settlement", "payoutProvider", v)}
                    />
                    <SelectField
                      label="Gateway Fee Bearer"
                      value={form.customer.settlement.gatewayFeeBearer}
                      options={["PLATFORM", "VENDOR", "SHARED"]}
                      onChange={(v) => setCustomerField("settlement", "gatewayFeeBearer", v)}
                    />
                  </Card>

                  <Card
                    title="Reserve"
                    right={
                      <ToggleField
                        label="Enabled"
                        checked={form.customer.settlement.reserve.isEnabled}
                        onChange={(v) => setReserveField("isEnabled", v)}
                      />
                    }
                  >
                    <NumberField
                      label="Reserve Percent"
                      value={form.customer.settlement.reserve.percent}
                      onChange={(v) => setReserveField("percent", v)}
                      suffix="%"
                    />
                    <NumberField
                      label="Hold Days"
                      value={form.customer.settlement.reserve.holdDays}
                      onChange={(v) => setReserveField("holdDays", v)}
                      suffix="days"
                    />
                    <NumberField
                      label="Max Percent"
                      value={form.customer.settlement.reserve.maxPercent}
                      onChange={(v) => setReserveField("maxPercent", v)}
                      suffix="%"
                      disabled
                      hint="Read-only — not accepted by the update API yet."
                    />
                    <NumberField
                      label="Risk Chargeback Count"
                      value={form.customer.settlement.reserve.riskChargebackCount}
                      onChange={(v) => setReserveField("riskChargebackCount", v)}
                    />
                    <NumberField
                      label="Risk Lookback"
                      value={form.customer.settlement.reserve.riskLookbackDays}
                      onChange={(v) => setReserveField("riskLookbackDays", v)}
                      suffix="days"
                      disabled
                      hint="Read-only — not accepted by the update API yet."
                    />
                    <NumberField
                      label="Risk Min Payments"
                      value={form.customer.settlement.reserve.riskMinPayments}
                      onChange={(v) => setReserveField("riskMinPayments", v)}
                      disabled
                      hint="Read-only — not accepted by the update API yet."
                    />
                    <NumberField
                      label="Risk Dispute Rate"
                      value={form.customer.settlement.reserve.riskDisputeRatePercent}
                      onChange={(v) => setReserveField("riskDisputeRatePercent", v)}
                      suffix="%"
                      disabled
                      hint="Read-only — not accepted by the update API yet."
                    />
                    <NumberField
                      label="Risk Percent"
                      value={form.customer.settlement.reserve.riskPercent}
                      onChange={(v) => setReserveField("riskPercent", v)}
                      suffix="%"
                      disabled
                      hint="Read-only — not accepted by the update API yet."
                    />
                  </Card>
                </div>
              )}

              {/* ---------------- Customer > Refund ---------------- */}
              {activeSection === "customer.refund" && (
                <Card title="Refund">
                  <SelectField
                    label="Method"
                    value={form.customer.refund.method}
                    options={["SOURCE", "MANUAL_BANK"]}
                    onChange={(v) => setCustomerField("refund", "method", v)}
                  />
                  <SelectField
                    label="On Vendor Timeout"
                    value={form.customer.refund.onVendorTimeout}
                    options={["ESCALATE", "AUTO_APPROVE"]}
                    onChange={(v) => setCustomerField("refund", "onVendorTimeout", v)}
                  />
                  <div />
                  <ToggleField
                    label="Allow Partial"
                    checked={form.customer.refund.allowPartial}
                    onChange={(v) => setCustomerField("refund", "allowPartial", v)}
                  />
                  <ToggleField
                    label="Release Promo On Refund"
                    checked={form.customer.refund.releasePromoOnRefund}
                    onChange={(v) => setCustomerField("refund", "releasePromoOnRefund", v)}
                  />
                  <div />
                  <NumberField
                    label="Window"
                    value={form.customer.refund.windowHours}
                    onChange={(v) => setCustomerField("refund", "windowHours", v)}
                    suffix="hours"
                  />
                  <NumberField
                    label="Vendor Approval Window"
                    value={form.customer.refund.vendorApprovalHours}
                    onChange={(v) => setCustomerField("refund", "vendorApprovalHours", v)}
                    suffix="hours"
                  />
                  <NumberField
                    label="Admin Buffer"
                    value={form.customer.refund.adminBufferHours}
                    onChange={(v) => setCustomerField("refund", "adminBufferHours", v)}
                    suffix="hours"
                  />
                  <NumberField
                    label="Authorized Alert"
                    value={form.customer.refund.authorizedAlertMinutes}
                    onChange={(v) => setCustomerField("refund", "authorizedAlertMinutes", v)}
                    suffix="minutes"
                  />
                  <NumberField
                    label="Max Open Requests"
                    value={form.customer.refund.maxOpenRequests}
                    onChange={(v) => setCustomerField("refund", "maxOpenRequests", v)}
                  />
                  <NumberField
                    label="Max Rejected / Window"
                    value={form.customer.refund.maxRejectedPerWindow}
                    onChange={(v) => setCustomerField("refund", "maxRejectedPerWindow", v)}
                  />
                  <NumberField
                    label="Request Window"
                    value={form.customer.refund.requestWindowDays}
                    onChange={(v) => setCustomerField("refund", "requestWindowDays", v)}
                    suffix="days"
                  />
                  <NumberField
                    label="Bank Details Stale After"
                    value={form.customer.refund.bankDetailsStaleDays}
                    onChange={(v) => setCustomerField("refund", "bankDetailsStaleDays", v)}
                    suffix="days"
                  />
                  <div className="sm:col-span-3">
                    <NumberListEditor
                      label="Bank Details Reminder Hours"
                      values={form.customer.refund.bankDetailsReminderHours}
                      onChange={(v) => setCustomerField("refund", "bankDetailsReminderHours", v)}
                      placeholder="e.g. 24"
                    />
                  </div>
                </Card>
              )}

              {/* ---------------- Customer > Chargeback ---------------- */}
              {activeSection === "customer.chargeback" && (
                <Card title="Chargeback">
                  <NumberField
                    label="Write-Off After"
                    value={form.customer.chargeback.writeOffDays}
                    onChange={(v) => setCustomerField("chargeback", "writeOffDays", v)}
                    suffix="days"
                  />
                  <div className="sm:col-span-2">
                    <NumberListEditor
                      label="Deadline Alert Hours"
                      values={form.customer.chargeback.deadlineAlertHours}
                      onChange={(v) => setCustomerField("chargeback", "deadlineAlertHours", v)}
                      placeholder="e.g. 72"
                    />
                  </div>
                </Card>
              )}

              {/* ---------------- Customer > Search ---------------- */}
              {activeSection === "customer.search" && (
                <Card title="Search">
                  <ToggleField
                    label="Enabled"
                    checked={form.customer.search.isEnabled}
                    onChange={(v) => setCustomerField("search", "isEnabled", v)}
                  />
                  <NumberField
                    label="Min Query Length"
                    value={form.customer.search.minQueryLength}
                    onChange={(v) => setCustomerField("search", "minQueryLength", v)}
                  />
                  <NumberField
                    label="Section Limit"
                    value={form.customer.search.sectionLimit}
                    onChange={(v) => setCustomerField("search", "sectionLimit", v)}
                  />
                  <NumberField
                    label="History Limit"
                    value={form.customer.search.historyLimit}
                    onChange={(v) => setCustomerField("search", "historyLimit", v)}
                  />
                  <div className="sm:col-span-3">
                    <TagListEditor
                      label="Popular Queries"
                      values={form.customer.search.popularQueries}
                      onChange={(v) => setCustomerField("search", "popularQueries", v)}
                      placeholder="e.g. skincare"
                    />
                  </div>
                </Card>
              )}

              {/* ---------------- Security > OTP ---------------- */}
              {activeSection === "security.otp" && (
                <Card title="OTP">
                  <NumberField
                    label="Resend Cooldown"
                    value={form.security.otp.resendCooldownSeconds}
                    onChange={(v) => setSecurityField("otp", "resendCooldownSeconds", v)}
                    suffix="seconds"
                  />
                  <NumberField
                    label="Max Per Hour"
                    value={form.security.otp.maxPerHour}
                    onChange={(v) => setSecurityField("otp", "maxPerHour", v)}
                  />
                </Card>
              )}

              {/* ---------------- Admin > Notifications ---------------- */}
              {activeSection === "admin.notification" && (
                <Card title="Admin Notifications">
                  <ToggleField
                    label="Email Notifications"
                    checked={form.admin.notification.isEmailNotificationEnabled}
                    onChange={(v) => setAdminField("notification", "isEmailNotificationEnabled", v)}
                  />
                  <ToggleField
                    label="Push Notifications"
                    checked={form.admin.notification.isPushNotificationEnabled}
                    onChange={(v) => setAdminField("notification", "isPushNotificationEnabled", v)}
                  />
                  <ToggleField
                    label="WhatsApp Notifications"
                    checked={form.admin.notification.isWhatsAppNotificationEnabled}
                    onChange={(v) => setAdminField("notification", "isWhatsAppNotificationEnabled", v)}
                  />
                  <NumberField
                    label="Max Recipients / Dispatch"
                    value={form.admin.notification.maxRecipientsPerDispatch}
                    onChange={(v) => setAdminField("notification", "maxRecipientsPerDispatch", v)}
                  />
                </Card>
              )}

              {/* ---------------- App > Version & Update ---------------- */}
              {activeSection === "app.version" && (
                <div className="space-y-4">
                  <Card title="Min Version">
                    <TextField
                      label="Android"
                      value={form.app.minVersion.android}
                      onChange={(v) => setAppField("minVersion", "android", v)}
                      placeholder="e.g. 1.0.0"
                    />
                    <TextField
                      label="iOS"
                      value={form.app.minVersion.ios}
                      onChange={(v) => setAppField("minVersion", "ios", v)}
                      placeholder="e.g. 1.0.0"
                    />
                  </Card>
                  <Card title="Latest Version">
                    <TextField
                      label="Android"
                      value={form.app.latestVersion.android}
                      onChange={(v) => setAppField("latestVersion", "android", v)}
                      placeholder="e.g. 1.0.0"
                    />
                    <TextField
                      label="iOS"
                      value={form.app.latestVersion.ios}
                      onChange={(v) => setAppField("latestVersion", "ios", v)}
                      placeholder="e.g. 1.0.0"
                    />
                  </Card>
                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                    <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                      Force Update
                    </p>
                    <ToggleField
                      label="Force Update Required"
                      checked={form.app.forceUpdate}
                      onChange={(v) => setAppTopField("forceUpdate", v)}
                    />
                    <div className="mt-4">
                      <TextField
                        label="Update Message"
                        value={form.app.updateMessage}
                        onChange={(v) => setAppTopField("updateMessage", v)}
                        placeholder="Shown to users who must update"
                        textarea
                      />
                    </div>
                  </div>
                  <Card title="Store URLs">
                    <TextField
                      label="Android"
                      value={form.app.storeUrl.android}
                      onChange={(v) => setAppField("storeUrl", "android", v)}
                      placeholder="Play Store link"
                    />
                    <TextField
                      label="iOS"
                      value={form.app.storeUrl.ios}
                      onChange={(v) => setAppField("storeUrl", "ios", v)}
                      placeholder="App Store link"
                    />
                  </Card>
                </div>
              )}

              {/* ---------------- App > Support & Features ---------------- */}
              {activeSection === "app.support" && (
                <div className="space-y-4">
                  <Card title="Support">
                    <TextField
                      label="Email"
                      value={form.app.support.email}
                      onChange={(v) => setAppField("support", "email", v)}
                      placeholder="support@trydood.com"
                    />
                    <TextField
                      label="Phone"
                      value={form.app.support.phone}
                      onChange={(v) => setAppField("support", "phone", v)}
                      placeholder="+91 90000 00000"
                    />
                    <TextField
                      label="WhatsApp"
                      value={form.app.support.whatsapp}
                      onChange={(v) => setAppField("support", "whatsapp", v)}
                      placeholder="+91 90000 00000"
                    />
                  </Card>
                  <Card title="Features">
                    <ToggleField
                      label="Promo Codes"
                      checked={form.app.features.promoCodes}
                      onChange={(v) => setAppField("features", "promoCodes", v)}
                    />
                    <ToggleField
                      label="Refunds"
                      checked={form.app.features.refunds}
                      onChange={(v) => setAppField("features", "refunds", v)}
                    />
                    <ToggleField
                      label="Voucher Claims"
                      checked={form.app.features.voucherClaims}
                      onChange={(v) => setAppField("features", "voucherClaims", v)}
                    />
                    <ToggleField
                      label="Search"
                      checked={form.app.features.search}
                      onChange={(v) => setAppField("features", "search", v)}
                    />
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
