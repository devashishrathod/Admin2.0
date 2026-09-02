import React, { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Users,
  Star,
  CreditCard,
  Building2,
  Calendar,
  ShieldCheck,
  BadgeCheck,
  Landmark,
  Tag,
  Globe,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  MessageSquareWarning,
  Briefcase,
  Activity,
  Image as ImageIcon,
  PlayCircle,
  Pencil,
  Store,
  X,
  Sparkles,
  Loader2,
  Home,
  IdCard,
  Ticket,
  HandCoins,
  Repeat,
  UserCog,
} from "lucide-react";
import {
  BUSINESS_STATUSES,
  BUSINESS_TYPES,
  DETAIL_TABS,
  ONBOARDING_STEPS,
} from "./data/BrandData";
import {
  BrandAvatar,
  ToggleSwitch,
  ToggleActiveConfirmModal,
  InfoRow,
  VerificationRow,
  MerchantTokenCard,
  SectionCard,
  CollapsibleSectionCard,
  EmptyState,
  OnboardingBadge,
  ApprovalDropdown,
  Field,
  FileField,
  inputClass,
  StatusBadge,
  StatChip,
  RingStat,
} from "./BrandShared";
import { SubscriptionTab } from "./SubscriptionCenter";
import { getVouchers } from "../voucher/services/VoucherApi";

const STATUS_ACCENTS = {
  Active: "from-emerald-400/25 via-emerald-400/0",
  Pending: "from-amber-400/25 via-amber-400/0",
  Rejected: "from-red-400/25 via-red-400/0",
  Draft: "from-amber-400/25 via-amber-400/0",
};

/* -------------------------------------------------------------------------
 * Edit Brand Details — lets a super admin update the brand-info fields
 * (identity, business details, contact, tags, media) for an existing brand.
 * ---------------------------------------------------------------------- */

function EditBrandModal({ brand, onClose, onSave }) {
  const [form, setForm] = useState({
    brandName: brand.brandName || "",
    shortName: brand.shortName || "",
    tagline: brand.tagline || "",
    about: brand.about || "",
    category: brand.category || "",
    businessType: brand.businessType || BUSINESS_TYPES[0],
    businessStatus: brand.businessStatus || BUSINESS_STATUSES[0],
    location: brand.location || "",
    website: brand.website || "",
    contactPhone: brand.contactPhone || "",
    contactEmail: brand.contactEmail || "",
    ownerName: brand.ownerName || "",
    gstNumber: brand.gstNumber || "",
    panNumber: brand.panNumber || "",
    bankName: brand.bankName || "",
    accountHolder: brand.accountHolder || "",
    tags: (brand.tags || []).join(", "),
  });
  const [logoFile, setLogoFile] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.brandName.trim()) return;

    const updates = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (logoFile) updates.logo = URL.createObjectURL(logoFile);

    onSave(brand.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">Edit Brand Details</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Update {brand.brandName}'s brand info. Changes are reflected immediately.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Brand Identity
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Brand Name" required>
                <input value={form.brandName} onChange={update("brandName")} required className={inputClass} />
              </Field>
              <Field label="Short Name">
                <input value={form.shortName} onChange={update("shortName")} className={inputClass} />
              </Field>
              <Field label="Tagline">
                <input value={form.tagline} onChange={update("tagline")} className={inputClass} />
              </Field>
              <Field label="Category">
                <input value={form.category} onChange={update("category")} className={inputClass} />
              </Field>
              <Field label="Live Location">
                <input value={form.location} onChange={update("location")} className={inputClass} />
              </Field>
              <Field label="Website">
                <input value={form.website} onChange={update("website")} className={inputClass} />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Business Details
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Business Type">
                <select value={form.businessType} onChange={update("businessType")} className={inputClass}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Business Status">
                <select value={form.businessStatus} onChange={update("businessStatus")} className={inputClass}>
                  {BUSINESS_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Contact &amp; Ownership
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Owner Name">
                <input value={form.ownerName} onChange={update("ownerName")} className={inputClass} />
              </Field>
              <Field label="Contact Phone">
                <input value={form.contactPhone} onChange={update("contactPhone")} className={inputClass} />
              </Field>
              <Field label="Contact Email">
                <input value={form.contactEmail} onChange={update("contactEmail")} className={inputClass} />
              </Field>
              <Field label="Bank Name">
                <input value={form.bankName} onChange={update("bankName")} className={inputClass} />
              </Field>
              <Field label="Account Holder">
                <input value={form.accountHolder} onChange={update("accountHolder")} className={inputClass} />
              </Field>
              <Field label="GST Number">
                <input value={form.gstNumber} onChange={update("gstNumber")} className={inputClass} />
              </Field>
              <Field label="PAN Number">
                <input value={form.panNumber} onChange={update("panNumber")} className={inputClass} />
              </Field>
            </div>
          </div>

          <Field label="About">
            <textarea value={form.about} onChange={update("about")} rows={3} className={inputClass} />
          </Field>

          <Field label="Tags (comma separated)">
            <input
              value={form.tags}
              onChange={update("tags")}
              placeholder="e.g. Salon, Grooming, Premium"
              className={inputClass}
            />
          </Field>

          <FileField
            label="Replace Brand Logo"
            accept="image/*"
            files={logoFile ? [logoFile] : []}
            onChange={(files) => setLogoFile(files[0] || null)}
          />

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Top Brand Modal
 * Lets a super admin mark/unmark a brand as a "Top Brand" and set its
 * display order. Calls PUT /brands/admin/top-brands/:brandId with body
 * { brandId, isTopBrand, topOrder } via the onSetTopBrand(brand, payload)
 * handler passed down from BrandContext.
 * ---------------------------------------------------------------------- */

function TopBrandModal({ brand, onClose, onSubmit }) {
  const [isTopBrand, setIsTopBrand] = useState(Boolean(brand.isTopBrand));
  const [topOrder, setTopOrder] = useState(brand.topOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit(brand, {
        isTopBrand,
        topOrder: isTopBrand ? Number(topOrder) || 0 : 0,
      });
      onClose();
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Top Brand Placement</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">
                Feature <span className="text-neutral-700 dark:text-neutral-300">{brand.brandName}</span> in the
                top-brands section shown to customers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
            <div>
              <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Mark as Top Brand</p>
              <p className="mt-0.5 text-[11.5px] text-neutral-500">Toggle off to remove it from the top-brands list.</p>
            </div>
            <ToggleSwitch
              checked={isTopBrand}
              onChange={() => setIsTopBrand((v) => !v)}
              title={isTopBrand ? "Unmark as Top Brand" : "Mark as Top Brand"}
            />
          </div>

          {isTopBrand && (
            <Field label="Display Order" required>
              <input
                type="number"
                min="0"
                step="1"
                value={topOrder}
                onChange={(e) => setTopOrder(e.target.value)}
                placeholder="e.g. 1"
                required
                className={inputClass}
              />
              <p className="mt-1.5 text-[11.5px] text-neutral-500">
                Lower numbers show first. Brands sharing an order fall back to most-recently-added first.
              </p>
            </Field>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isTopBrand && topOrder === "")}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Tabs
 * ---------------------------------------------------------------------- */

function OverviewTab({ brand }) {
  const incomplete = brand.onboardingComplete === false;

  return (
    <div className="space-y-4">
      {brand.status === "Rejected" && brand.rejectionReason && (
        <SectionCard className="border border-red-500/30 bg-red-500/[0.04]">
          <div className="flex items-start gap-3">
            <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-[13.5px] font-semibold text-red-600 dark:text-red-400">Listing Rejected</p>
              <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">{brand.rejectionReason}</p>
            </div>
          </div>
        </SectionCard>
      )}

      {incomplete && (
        <SectionCard className="border border-amber-400/30 bg-amber-400/[0.04]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold text-amber-600 dark:text-amber-400">
                Onboarding not completed
              </p>
              <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                This brand dropped off at{" "}
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{brand.onboardingStep}</span>{" "}
                (step {brand.onboardingStepIndex} of {brand.onboardingTotalSteps}) on{" "}
                {brand.lastActiveOn}. It will not go live until the owner returns to finish
                onboarding.
              </p>
              <div className="mt-3 space-y-1.5">
                {ONBOARDING_STEPS.map((step, i) => {
                  const stepNum = i + 1;
                  const done = stepNum <= brand.onboardingStepIndex;
                  return (
                    <div key={step} className="flex items-center gap-2 text-[12px]">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${done ? "bg-emerald-400 text-neutral-950" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"
                          }`}
                      >
                        {stepNum}
                      </span>
                      <span className={done ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-600"}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Quick stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewStat icon={Tag} label="Brand Id" value={brand.brandId} />
        <OverviewStat icon={Store} label="Sub Brand" value={`${brand.subBrandCount} Outlets`} />
        <OverviewStat
          icon={CreditCard}
          label="Plan Price"
          value={brand.planPrice}
          strike={!incomplete}
        />
        <OverviewStat icon={Building2} label="Plan Type" value={brand.planType} />
        <OverviewStat icon={Tag} label="Category" value={brand.category} />
        <OverviewStat icon={BadgeCheck} label="Plan" value={brand.subscriptionPlan} />
        <OverviewStat icon={Calendar} label="Term" value={brand.subscriptionTerm} />
        <OverviewStat
          icon={Calendar}
          label="Expiry"
          value={`${brand.expiredInDays} days to go`}
        />
      </div>

      <SectionCard title="Contact">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-neutral-700 dark:text-neutral-300">{brand.contactPhone}</p>
            <p className="mt-0.5 text-[13px] text-neutral-700 dark:text-neutral-300">{brand.contactEmail}</p>
          </div>
          <div className="flex items-center gap-2">
<a
            href={`tel:${brand.contactPhone}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-600 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
            aria-label="Call brand"
            >
            <Phone size={14} />
          </a>
<a
          href={`mailto:${brand.contactEmail}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-600 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
          aria-label="Email brand"
            >
          <Mail size={14} />
        </a>
    </div>
        </div >
      </SectionCard >

    {!incomplete && (
      <SectionCard>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-neutral-500">Renewal Window</p>
          <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
            {brand.remainderPercent}%
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
            style={{ width: `${brand.remainderPercent}%` }}
          />
        </div>
      </SectionCard>
    )
}

{
  brand.isTopBrand && (
    <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3">
      <Sparkles size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-[12.5px] text-amber-700 dark:text-amber-400">
        Featured as a <span className="font-semibold">Top Brand</span> — display order {brand.topOrder}.
      </p>
    </div>
  )
}

<div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
  <span className="flex items-center overflow-hidden rounded-lg text-[13px] font-extrabold tracking-tight">
    <span className="bg-pink-500 px-1.5 py-0.5 text-white">S</span>
    <span className="bg-purple-500 px-1.5 py-0.5 text-white">M</span>
    <span className="bg-blue-500 px-1.5 py-0.5 text-white">A</span>
    <span className="bg-amber-500 px-1.5 py-0.5 text-white">R</span>
    <span className="bg-emerald-500 px-1.5 py-0.5 text-white">T</span>
  </span>
  <span className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">1K</span>
</div>
    </div >
  );
}

function OverviewStat({ icon: Icon, label, value, strike = false }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon size={14} />
      </span>
      <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100 ${strike ? "line-through decoration-neutral-400 dark:decoration-neutral-600" : ""
          }`}
      >
        {value}
      </p>
    </div>
  );
}

/* Brand Info tab — full brand-identity, business, verification & media view */
function BrandInfoTab({ brand }) {
  return (
    <div className="space-y-4">
      <SectionCard title="About">
        <p className="text-[13.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">{brand.about || "No description added yet."}</p>
      </SectionCard>

      <SectionCard title="Brand Identity">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <InfoRow icon={Tag} label="Business Name" value={brand.ownerName} />
          <InfoRow icon={Tag} label="Short Name" value={brand.shortName || "—"} />
          <InfoRow icon={Building2} label="Category" value={brand.category} />
          {brand.subCategory && brand.subCategory !== "—" && (
            <InfoRow icon={Tag} label="Sub Category" value={brand.subCategory} />
          )}
          <InfoRow icon={Calendar} label="Live Since" value={brand.liveSince} />
          <InfoRow icon={Globe} label="Website" value={brand.website} />
          <InfoRow icon={MapPin} label="Location" value={brand.location} />
        </div>
      </SectionCard>

      <SectionCard title="Business Details">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <InfoRow icon={Briefcase} label="Business Type" value={brand.businessType || "—"} />
          <InfoRow icon={Activity} label="Business Status" value={brand.businessStatus || "—"} />
          {brand.legalBusinessName && brand.legalBusinessName !== "—" && (
            <InfoRow icon={Building2} label="Legal Business Name" value={brand.legalBusinessName} />
          )}
          {"hasAcceptedPartnershipDeed" in brand && (
            <InfoRow
              icon={ShieldCheck}
              label="Partnership Deed Accepted"
              value={brand.hasAcceptedPartnershipDeed ? "Yes" : "No"}
            />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Tax & Bank Verification">
        <div className="space-y-2">
          <VerificationRow
            icon={ShieldCheck}
            label="GST Number"
            value={brand.gstNumber}
            verified={brand.gstVerified}
          />
          <VerificationRow
            icon={BadgeCheck}
            label="PAN Number"
            value={brand.panNumber}
            verified={brand.panVerified}
          />
          <VerificationRow
            icon={Landmark}
            label={`Bank Account · ${brand.bankName}`}
            value={brand.accountHolder}
            verified={brand.bankVerified}
          />
        </div>
      </SectionCard>

      <MerchantTokenCard token={brand.merchantToken} />

      <SectionCard title="Brand Photo / Logo">
        <div className="flex items-center gap-4">
          <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-neutral-200 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-800">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-500">
                <ImageIcon size={20} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Primary logo</p>
            <p className="text-[11.5px] text-neutral-500">Shown on cards, invoices and the brand header.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Tags">
        {brand.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {brand.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-neutral-200 px-3 py-1 text-[12px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <Tag size={11} />
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-neutral-500">No tags added yet.</p>
        )}
      </SectionCard>
    </div>
  );
}

/* Ambience tab — photos + video, split out of Brand Info into its own tab
   so the media gallery has room to breathe. */
function AmbienceTab({ brand }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Ambience Photos">
        {brand.ambiencePhotos?.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {brand.ambiencePhotos.map((src, i) => (
              <div
                key={i}
                className="group aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200 shadow-sm ring-1 ring-neutral-200 transition-shadow hover:shadow-md dark:bg-neutral-800 dark:ring-neutral-800"
              >
                <img
                  src={src}
                  alt={`${brand.brandName} ambience ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 py-8 text-center dark:border-neutral-800">
            <ImageIcon size={20} className="text-neutral-400 dark:text-neutral-600" />
            <p className="text-[12.5px] text-neutral-500">No ambience photos uploaded yet.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Ambience Video">
        {brand.ambienceVideo ? (
          <video
            src={brand.ambienceVideo}
            controls
            className="w-full rounded-2xl bg-neutral-100 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 py-8 text-center dark:border-neutral-800">
            <PlayCircle size={20} className="text-neutral-400 dark:text-neutral-600" />
            <p className="text-[12.5px] text-neutral-500">No ambience video uploaded yet.</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SubBrandTab({ brand }) {
  if (!brand.outlets?.length) return <EmptyState label="No outlets added yet." />;
  return (
    <div className="space-y-3">
      {brand.outlets.map((outlet, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
        >
          <div className="flex flex-wrap items-start justify-between capitalize gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Store size={16} className="mt-0.5 shrink-0 text-neutral-500" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-neutral-800 capitalize dark:text-neutral-200">{outlet.name}</p>
                <p className="mt-0.5 text-[12px] text-neutral-500">{outlet.address}</p>
                {outlet.landmark && outlet.landmark !== "—" && (
                  <p className="mt-0.5 text-[11.5px] text-neutral-400">Landmark: {outlet.landmark}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {outlet.uniqueId && outlet.uniqueId !== "—" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500 dark:bg-neutral-800">
                      {outlet.uniqueId}
                    </span>
                  )}
                  {outlet.storeId && outlet.storeId !== "—" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500 dark:bg-neutral-800">
                      Store ID: {outlet.storeId}
                    </span>
                  )}
                  {outlet.outletType && outlet.outletType !== "—" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500 dark:bg-neutral-800">
                      {outlet.outletType}
                    </span>
                  )}
                  {outlet.whatsappNumber && outlet.whatsappNumber !== "—" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500 dark:bg-neutral-800">
                      +91 {outlet.whatsappNumber}
                    </span>
                  )}
                  {outlet.joinedDate && outlet.joinedDate !== "—" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500 dark:bg-neutral-800">
                      Joined {outlet.joinedDate}
                    </span>
                  )}
                  {outlet.isDeleted && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-medium text-red-600 dark:text-red-400">
                      Deleted
                    </span>
                  )}
                </div>
              </div>
            </div>
            <StatusBadge status={outlet.status} activeLabel="Active" />
          </div>

          {/* Full address details */}
          {outlet.location && (
            <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Address
              </p>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <InfoRow icon={MapPin} label="Address Line 1" value={outlet.location.addressLine1} />
                <InfoRow icon={MapPin} label="Address Line 2" value={outlet.location.addressLine2} />
                <InfoRow icon={Tag} label="Address Type" value={outlet.location.addressType} />
                <InfoRow icon={MapPin} label="City" value={outlet.location.city} />
                <InfoRow icon={MapPin} label="District" value={outlet.location.district} />
                <InfoRow icon={MapPin} label="State" value={outlet.location.state} />
                <InfoRow icon={Globe} label="Country" value={outlet.location.country} />
                <InfoRow icon={MapPin} label="Zipcode" value={outlet.location.zipcode} />
                {outlet.geo && outlet.geo !== "—" && <InfoRow icon={MapPin} label="Coordinates" value={outlet.geo} />}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {outlet.location.isDefault && (
                  <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">
                    Default Address
                  </span>
                )}
                {outlet.location.isBrandAddress && (
                  <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10.5px] font-medium text-sky-600 dark:text-sky-400">
                    Brand Address
                  </span>
                )}
                {outlet.location.isSubBrandAddress && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500 dark:bg-neutral-800">
                    Sub-Brand Address
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sub-brand user account */}
          {/* {outlet.user && (
            <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Sub-Brand User
              </p>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <InfoRow icon={Tag} label="Unique ID" value={outlet.user.uniqueId} />
                <InfoRow icon={ShieldCheck} label="Role" value={outlet.user.role} />
                <InfoRow icon={Phone} label="Login Type" value={outlet.user.loginType} />
                <InfoRow icon={Phone} label="WhatsApp" value={outlet.user.whatsappNumber} />
                <InfoRow icon={Tag} label="Referral Code" value={outlet.user.referralCode} />
                <InfoRow icon={CreditCard} label="Wallet Balance" value={outlet.user.walletBalance} />
                <InfoRow icon={CreditCard} label="tCoins Balance" value={outlet.user.tCoinsBalance} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    outlet.user.isMobileVerified
                      ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {outlet.user.isMobileVerified ? "Mobile Verified" : "Mobile Not Verified"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    outlet.user.isEmailVerified
                      ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {outlet.user.isEmailVerified ? "Email Verified" : "Email Not Verified"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    outlet.user.isOnBoardingCompleted
                      ? "bg-sky-400/10 text-sky-600 dark:text-sky-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {outlet.user.isOnBoardingCompleted ? "Onboarding Complete" : "Onboarding Incomplete"}
                </span>
              </div>
            </div>
          )} */}

          {outlet.workHours && (
            <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Work Hours
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {outlet.workHours.map((d) => (
                  <div
                    key={d.day}
                    className={`rounded-lg px-2.5 py-2 text-[11px] ${d.isOpen
                      ? "bg-emerald-400/5 text-neutral-700 dark:text-neutral-300"
                      : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
                      }`}
                  >
                    <p className="font-medium">{d.day}</p>
                    <p>{d.hours}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const VOUCHER_STATUS_STYLES = {
  DRAFT: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
  UNDER_REVIEW: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  PUBLISHED: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  EXPIRED: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
  PAUSED: "bg-orange-400/10 text-orange-600 dark:text-orange-400",
  ARCHIVED: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

function VoucherStatusPill({ status }) {
  const cls = VOUCHER_STATUS_STYLES[status] || VOUCHER_STATUS_STYLES.DRAFT;
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {status ? status.replace(/_/g, " ") : "—"}
    </span>
  );
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* Listings tab — shows the real vouchers this brand has created, pulled
   live from GET /vouchers/versions/get-all?brandId=... rather than the
   unused `brand.listings` mock field (no listings endpoint exists yet). */
function ListingsTab({ brand }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getVouchers({ brandId: brand.id, page: 1, limit: 50 });
        if (!cancelled) setVouchers(res?.data?.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
        <Loader2 size={16} className="animate-spin" />
        Loading vouchers…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
        <AlertTriangle size={14} className="shrink-0" />
        Failed to load vouchers: {error}
      </div>
    );
  }

  if (!vouchers.length) return <EmptyState label="No vouchers created by this brand yet." />;

  return (
    <div className="space-y-3">
      {vouchers.map((v) => {
        const primaryOffer = v.offers?.[0];
        return (
          <div
            key={v._id}
            className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{v.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-neutral-500">
                  <Tag size={10} /> {v.versionCode || "—"}
                </p>
              </div>
              <VoucherStatusPill status={v.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-neutral-500">
              {primaryOffer && (
                <span className="flex items-center gap-1">
                  <BadgeCheck size={11} />
                  {primaryOffer.discountType === "PERCENTAGE"
                    ? `${primaryOffer.discountValue}% off`
                    : `₹${primaryOffer.discountValue} off`}
                  {v.offers.length > 1 && ` (+${v.offers.length - 1} more)`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formatShortDate(v.startAt)} → {formatShortDate(v.endAt)}
              </span>
              {v.category?.name && (
                <span className="flex items-center gap-1">
                  <Store size={11} />
                  {v.category.name}
                  {v.subCategory?.name ? ` · ${v.subCategory.name}` : ""}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettlementsTab({ brand }) {
  if (!brand.settlements?.length) return <EmptyState label="No settlements recorded." />;
  return (
    <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
      <table className="w-full text-left text-[13px]">
        <thead className="text-[11.5px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          <tr>
            <th className="px-5 py-4 font-medium">Settlement ID</th>
            <th className="px-5 py-4 font-medium">Date</th>
            <th className="px-5 py-4 font-medium">Amount</th>
            <th className="px-5 py-4 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-950">
          {brand.settlements.map((s) => (
            <tr key={s.id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
              <td className="px-5 py-4 text-neutral-700 dark:text-neutral-300">{s.id}</td>
              <td className="px-5 py-4 text-neutral-500">{s.date}</td>
              <td className="px-5 py-4 font-medium text-neutral-800 dark:text-neutral-200">{s.amount}</td>
              <td className="px-5 py-4 text-right">
                <StatusBadge status={s.status} activeLabel="Paid" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewTab({ brand }) {
  if (!brand.reviews?.length) return <EmptyState label="No reviews yet." />;
  return (
    <div className="space-y-3">
      {brand.reviews.map((r, i) => (
        <div key={i} className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{r.author}</p>
            <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={12} fill={s < r.rating ? "currentColor" : "none"} />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">{r.comment}</p>
          <p className="mt-1.5 text-[11.5px] text-neutral-400 dark:text-neutral-600">{r.date}</p>
        </div>
      ))}
    </div>
  );
}

function AccountDetailsTab({ brand }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Brand">
        <InfoRow icon={Users} label="Legal Name" value={brand.ownerName} />
      </SectionCard>

      <SectionCard title="Business Verification">
        <div className="space-y-2">
          <VerificationRow
            icon={ShieldCheck}
            label="GST Number"
            value={brand.gstNumber}
            verified={brand.gstVerified}
          />
          <VerificationRow
            icon={BadgeCheck}
            label="PAN Number"
            value={brand.panNumber}
            verified={brand.panVerified}
          />
          <VerificationRow
            icon={Landmark}
            label={`Bank Account · ${brand.bankName}`}
            value={brand.accountHolder}
            verified={brand.bankVerified}
          />
        </div>
      </SectionCard>

      {brand.panNumber && brand.panNumber !== "—" && (
        <CollapsibleSectionCard title="PAN Details" defaultOpen={false}>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <InfoRow icon={BadgeCheck} label="PAN Number" value={brand.panNumber} />
            <InfoRow icon={Tag} label="PAN Type" value={brand.panType} />
            <InfoRow icon={Users} label="Full Name" value={brand.panFullName} />
            <InfoRow icon={Globe} label="Country" value={brand.panCountry} />
            <InfoRow icon={ShieldCheck} label="Verification Message" value={brand.panVerificationMessage} />
            <InfoRow icon={ShieldCheck} label="Verification Provider" value={brand.panVerificationProvider} />
            <InfoRow icon={Calendar} label="Verified At" value={brand.panVerifiedAtDisplay} />
          </div>
        </CollapsibleSectionCard>
      )}

      {brand.gstNumber && brand.gstNumber !== "—" && (
        <CollapsibleSectionCard title="GST Details" defaultOpen={false}>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <InfoRow icon={ShieldCheck} label="GST Number" value={brand.gstNumber} />
            <InfoRow icon={Tag} label="Legal Name" value={brand.gstLegalName} />
            <InfoRow icon={Tag} label="Trade Name" value={brand.gstTradeName} />
            <InfoRow icon={Briefcase} label="Constitution" value={brand.gstConstitution} />
            <InfoRow icon={Activity} label="Taxpayer Type" value={brand.gstTaxpayerType} />
            <InfoRow
              icon={Calendar}
              label="Registration Date"
              value={brand.gstRegistrationDate ? new Date(brand.gstRegistrationDate).toLocaleDateString("en-IN") : "—"}
            />
            <InfoRow icon={ShieldCheck} label="Registration Status" value={brand.gstRegistrationStatus} />
            {brand.gstNatureOfBusiness?.length > 0 && (
              <InfoRow icon={Briefcase} label="Nature of Business" value={brand.gstNatureOfBusiness.join(", ")} />
            )}
            <InfoRow icon={Landmark} label="Jurisdiction" value={brand.gstStateJurisdiction} />
            <InfoRow icon={MapPin} label="Registered Address" value={brand.gstAddress} />
            <InfoRow icon={ShieldCheck} label="Verification Message" value={brand.gstVerificationMessage} />
            <InfoRow icon={ShieldCheck} label="Verification Provider" value={brand.gstVerificationProvider} />
            <InfoRow icon={Calendar} label="Verified At" value={brand.gstVerifiedAtDisplay} />
          </div>
        </CollapsibleSectionCard>
      )}

      {brand.bankName && brand.bankName !== "—" && (
        <CollapsibleSectionCard title="Bank Details" defaultOpen={false}>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <InfoRow icon={Landmark} label="Bank Name" value={brand.bankName} />
            <InfoRow icon={Users} label="Account Holder" value={brand.accountHolder} />
            <InfoRow icon={Landmark} label="Branch" value={brand.bankBranch} />
            <InfoRow icon={CreditCard} label="Account Number" value={brand.maskedAccountNumber} />
            <InfoRow icon={CreditCard} label="IFSC Code" value={brand.ifscCode} />
            <InfoRow icon={CreditCard} label="Account Type" value={brand.accountType} />
            <InfoRow icon={MapPin} label="Bank Address" value={brand.bankAddress} />
            <InfoRow icon={Activity} label="Payment Mode" value={brand.bankPaymentMode} />
            <InfoRow icon={ShieldCheck} label="Recommended Action" value={brand.bankRecommendedAction} />
            <InfoRow icon={ShieldCheck} label="Verification Message" value={brand.bankVerificationMessage} />
            <InfoRow icon={ShieldCheck} label="Verification Provider" value={brand.bankVerificationProvider} />
            <InfoRow icon={Calendar} label="Verified At" value={brand.bankVerifiedAtDisplay} />
          </div>
        </CollapsibleSectionCard>
      )}

      <SectionCard title="Contact">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <InfoRow icon={Phone} label="Phone" value={brand.contactPhone} />
          <InfoRow icon={Mail} label="Email" value={brand.contactEmail} />
        </div>
      </SectionCard>
    </div>
  );
}

function SystemVerificationTab({ brand }) {
  const sv = brand.systemVerify;
  if (!sv) return <EmptyState label="No system verification record yet." />;

  return (
    <div className="space-y-4">
      <SectionCard title="Trust Score">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12.5px] text-neutral-500">Attempt #{sv.attemptNumber}</span>
          <span className="text-[16px] font-bold text-neutral-800 dark:text-neutral-200">
            {sv.score != null ? `${sv.score}/100` : "—"}
          </span>
        </div>
        {sv.score != null && (
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full ${
                sv.score >= 80 ? "bg-emerald-400" : sv.score >= 50 ? "bg-amber-400" : "bg-red-400"
              }`}
              style={{ width: `${sv.score}%` }}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {sv.status?.replace(/_/g, " ")}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              sv.isAdminApproved
                ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
            }`}
          >
            {sv.isAdminApproved ? "Admin Approved" : "Not Admin Approved"}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              sv.isReviewed
                ? "bg-sky-400/10 text-sky-600 dark:text-sky-400"
                : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
            }`}
          >
            {sv.isReviewed ? "Reviewed" : "Not Reviewed"}
          </span>
          {sv.isRejected && (
            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              Rejected
            </span>
          )}
          {sv.isRevoked && (
            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              Revoked
            </span>
          )}
          {sv.isSuperseded && (
            <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Superseded
            </span>
          )}
        </div>
      </SectionCard>

      {sv.nameMatch && (
        <SectionCard title="Name Match Scores">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">PAN ↔ GST</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.panGstScore}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">PAN ↔ Brand</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.panBrandScore}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">GST ↔ Brand</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.gstBrandScore}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">Average</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.averageScore}%</p>
            </div>
          </div>
        </SectionCard>
      )}

      {sv.bankNameMatch && (
        <SectionCard title="Bank Name Match Scores">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">Bank ↔ PAN</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.bankPanScore}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">Bank ↔ GST</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.bankGstScore}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">Bank ↔ Brand</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.bankBrandScore}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[10.5px] text-neutral-500">Highest</p>
              <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.highestScore}%</p>
            </div>
          </div>
        </SectionCard>
      )}

      {sv.entityMatch && (
        <SectionCard title="Business Entity Match">
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <InfoRow icon={Briefcase} label="GST Constitution" value={sv.entityMatch.gstConstitution} />
            <InfoRow icon={Building2} label="Brand Entity Type" value={sv.entityMatch.brandEntityType} />
            <InfoRow
              icon={ShieldCheck}
              label="Matched"
              value={sv.entityMatch.matched ? "Yes" : "No"}
            />
          </div>
        </SectionCard>
      )}

      {sv.remarks?.length > 0 && (
        <SectionCard title="Remarks">
          <div className="space-y-1.5">
            {sv.remarks.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.04] px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Duplicate Checks">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["Duplicate WhatsApp", sv.flags?.duplicateWhatsapp],
            ["Duplicate Email", sv.flags?.duplicateEmail],
            ["Duplicate PAN", sv.flags?.duplicatePAN],
            ["Duplicate GST", sv.flags?.duplicateGST],
            ["Duplicate Bank", sv.flags?.duplicateBank],
          ].map(([label, flagged]) => (
            <div
              key={label}
              className={`rounded-lg px-2.5 py-2 text-center text-[10.5px] font-medium ${
                flagged
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {label}
              <br />
              {flagged ? "Flagged" : "Clear"}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Verification Flags">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["PAN Verified", sv.flags?.panVerified],
            ["GST Verified", sv.flags?.gstVerified],
            ["Bank Verified", sv.flags?.bankVerified],
            ["PAN ↔ GST Match", sv.flags?.panMatchedWithGST],
            ["PAN ↔ Brand Match", sv.flags?.panMatchedWithBrand],
            ["GST ↔ Brand Match", sv.flags?.gstMatchedWithBrand],
            ["Bank Matched", sv.flags?.bankMatched],
            ["Entity Type Matched", sv.flags?.businessEntityMatched],
            ["GST Active", sv.flags?.gstActive],
          ].map(([label, ok]) => (
            <div
              key={label}
              className={`rounded-lg px-2.5 py-2 text-center text-[10.5px] font-medium ${
                ok
                  ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {label}
              <br />
              {ok ? "Yes" : "No"}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Review Trail">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <InfoRow icon={ShieldCheck} label="Verified By" value={sv.verifiedBy} />
          <InfoRow icon={Calendar} label="Verified At" value={sv.verifiedAtDisplay} />
          {sv.reviewedAtDisplay && <InfoRow icon={Calendar} label="Reviewed At" value={sv.reviewedAtDisplay} />}
          {sv.adminApprovedAtDisplay && (
            <InfoRow icon={Calendar} label="Admin Approved At" value={sv.adminApprovedAtDisplay} />
          )}
          {sv.rejectedAtDisplay && <InfoRow icon={Calendar} label="Rejected At" value={sv.rejectedAtDisplay} />}
          {sv.rejectionReason && <InfoRow icon={AlertTriangle} label="Rejection Reason" value={sv.rejectionReason} />}
          {sv.revokedAtDisplay && <InfoRow icon={Calendar} label="Revoked At" value={sv.revokedAtDisplay} />}
          {sv.revokeReason && <InfoRow icon={AlertTriangle} label="Revoke Reason" value={sv.revokeReason} />}
          <InfoRow icon={Calendar} label="Created" value={sv.createdAtDisplay} />
          <InfoRow icon={Calendar} label="Last Updated" value={sv.updatedAtDisplay} />
        </div>
      </SectionCard>
    </div>
  );
}

// Small leading icon per tab, purely visual — matches each tab's content.
const TAB_ICONS = {
  Overview: Home,
  "Brand Info": IdCard,
  Ambience: ImageIcon,
  "Sub-Brand": Store,
  Listings: Ticket,
  Settlements: HandCoins,
  Review: Star,
  Subscription: Repeat,
  "System Verification": ShieldCheck,
  "Account Details": UserCog,
};

/* -------------------------------------------------------------------------
 * BrandDetails — full page with tab navigation
 *
 * Props:
 *  - brand           : the brand object to display
 *  - onBack()         : go back to the list page
 *  - onToggleActive(brand)
 *        → calls BrandContext.toggleActive(brand), which sends
 *          { status, isActive, hideFromCustomers: false } to the backend
 *  - onDelete(brand)
 *  - onUpdate(id, updates)               : save edits from "Edit Brand Details"
 *  - onDecision(brand, status, reason)   : approve/reject a Pending brand
 *  - onSetTopBrand(brand, { isTopBrand, topOrder })
 *        : PUT /brands/admin/top-brands/:brandId
 *          body -> { brandId, isTopBrand, topOrder }
 * ---------------------------------------------------------------------- */

export default function BrandDetails({
  brand,
  onBack,
  onToggleActive,
  onDelete,
  onUpdate,
  onDecision,
  onSetTopBrand,
}) {
  const [tab, setTab] = useState("Overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [showTopBrandModal, setShowTopBrandModal] = useState(false);

  const tabContent = {
    Overview: <OverviewTab brand={brand} />,
    "Brand Info": <BrandInfoTab brand={brand} />,
    Ambience: <AmbienceTab brand={brand} />,
    "Sub-Brand": <SubBrandTab brand={brand} />,
    Listings: <ListingsTab brand={brand} />,
    Settlements: <SettlementsTab brand={brand} />,
    Review: <ReviewTab brand={brand} />,
    Subscription: <SubscriptionTab brand={brand} onUpdate={onUpdate} />,
    "System Verification": <SystemVerificationTab brand={brand} />,
    "Account Details": <AccountDetailsTab brand={brand} />,
  };

  const incomplete = brand.onboardingComplete === false;
  const accent = STATUS_ACCENTS[brand.status] || "from-neutral-500/20 via-neutral-500/0";

  const [outletsUsedStr, outletsLimitStr] = String(brand.subBrandCount || "0/0").split("/");
  const outletsUsed = Number(outletsUsedStr) || 0;
  const outletsLimit = Number(outletsLimitStr);
  const outletUsagePct = Number.isFinite(outletsLimit) && outletsLimit > 0 ? (outletsUsed / outletsLimit) * 100 : 100;

  const handleSetTopBrand = async (brandArg, payload) => {
    if (!onSetTopBrand) return;
    await onSetTopBrand(brandArg, payload);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <ArrowLeft size={13} />
            Back to Brands
          </button>

          <div className="flex items-center gap-2">
            {onSetTopBrand && (
              <button
                onClick={() => setShowTopBrandModal(true)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${brand.isTopBrand
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-amber-400/40 hover:text-amber-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-amber-400"
                  }`}
              >
                <Sparkles size={13} />
                {brand.isTopBrand ? `Top Brand · #${brand.topOrder}` : "Mark as Top Brand"}
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-emerald-400"
            >
              <Pencil size={13} />
              Edit Brand Details
            </button>
            <button
              onClick={() => onDelete(brand)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Trash2 size={13} />
              Delete Brand
            </button>
          </div>
        </div>

        {/* Header card */}
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accent} opacity-70`}
          />

          <div className="relative flex items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="rounded-2xl shadow-sm ring-4 ring-neutral-50 dark:ring-neutral-950">
                <BrandAvatar brand={brand} size="xl" className="shadow-inner" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[19px] font-semibold text-neutral-900 dark:text-neutral-50 capitalize">{brand.brandName}</h1>
                  {brand.isTopBrand && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                      <Sparkles size={10} />
                      Top #{brand.topOrder}
                    </span>
                  )}
                  {incomplete ? (
                    <OnboardingBadge brand={brand} />
                  ) : brand.status === "Pending" && onDecision ? (
                    <ApprovalDropdown brand={brand} onDecision={onDecision} size="sm" />
                  ) : (
                    <StatusBadge status={brand.status} activeLabel="Active" />
                  )}
                </div>
                <p className="mt-1 text-[13px] text-neutral-500">{brand.tagline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-neutral-500">
                  <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-950/60">
                    <MapPin size={11} />
                    {brand.location}
                  </span>
                  {!incomplete && (
                    <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-emerald-600 dark:bg-neutral-950/60 dark:text-emerald-400">
                      <Users size={11} />
                      {brand.followers} followers
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-950/60">
                    <Tag size={11} />
                    {brand.brandId}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5">
              {!incomplete && (
                <>
                  <RingStat
                    pct={brand.remainderPercent}
                    label="Plan Active"
                    caption={`${brand.expiredInDays}d left`}
                    tint="emerald"
                  />
                  <RingStat
                    pct={outletUsagePct}
                    label="Outlets"
                    caption={brand.subBrandCount}
                    tint="sky"
                  />
                </>
              )}
              <ToggleSwitch
                checked={brand.active}
                onChange={() => setShowToggleConfirm(true)}
                title={brand.active ? "Deactivate" : "Activate"}
              />
            </div>
          </div>

          {/* Quick-glance stat strip — visible no matter which tab is open */}
          {!incomplete && (
            <div className="relative flex flex-wrap gap-2 border-t border-neutral-200/80 px-6 py-3 dark:border-neutral-800/80">
              <StatChip icon={BadgeCheck} value={brand.subscriptionPlan} label="Plan" tint="emerald" />
              <StatChip icon={CreditCard} value={brand.planPrice} label="Price" tint="violet" />
              <StatChip icon={Calendar} value={`${brand.expiredInDays}d`} label="Expiry" tint="sky" />
              <StatChip icon={Store} value={brand.subBrandCount} label="Sub-Brand" tint="amber" />
            </div>
          )}

          {/* Segmented pill tabs — fades on both edges hint that the strip
              scrolls instead of the last tab looking cut off against the
              card border. */}
          <div className="relative border-t border-neutral-200/80 px-4 py-2.5 dark:border-neutral-800/80">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent dark:from-neutral-900" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent dark:from-neutral-900" />
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {DETAIL_TABS.map((t) => {
                const TabIcon = TAB_ICONS[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${tab === t
                      ? "bg-emerald-400 text-neutral-950"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      }`}
                  >
                    {TabIcon && <TabIcon size={12} />}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {tabContent[tab]}
      </div>

      {showEditModal && (
        <EditBrandModal
          brand={brand}
          onClose={() => setShowEditModal(false)}
          onSave={onUpdate}
        />
      )}

      {showToggleConfirm && (
        <ToggleActiveConfirmModal
          brand={brand}
          willActivate={!brand.active}
          onClose={() => setShowToggleConfirm(false)}
          onConfirm={() => {
            onToggleActive(brand);
            setShowToggleConfirm(false);
          }}
        />
      )}

      {showTopBrandModal && (
        <TopBrandModal
          brand={brand}
          onClose={() => setShowTopBrandModal(false)}
          onSubmit={handleSetTopBrand}
        />
      )}
    </div>
  );
}