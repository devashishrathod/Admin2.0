import React, { useCallback, useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import {
  MapPin,
  Phone,
  Mail,
  Users,
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
  Plus,
  Upload,
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
  DetailTile,
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
import { isNotFoundMessage } from "../../utils/helpers";
import {
  getBrandShowcase,
  createShowcaseSection,
  deleteShowcaseSection,
  addShowcaseMedia,
  deleteShowcaseMedia,
} from "./services/showcaseApi";

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

      {/* Bento grid — one big snapshot tile + small stat tiles, matching
          the card-grid pattern from New Onboarding's VerificationDetails. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
        <div className="col-span-2 row-span-2 flex flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {brand.category}
              </span>
              {brand.isTopBrand && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles size={10} /> Top #{brand.topOrder}
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-[11.5px] text-neutral-500">
              <Tag size={11} /> {brand.brandId}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              {brand.about || brand.tagline || "No description added yet."}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
            <Store size={14} className="shrink-0 text-neutral-500" />
            <span className="text-[12.5px] text-neutral-700 dark:text-neutral-300">{brand.subBrandCount} outlets</span>
          </div>
        </div>

        <OverviewStat icon={CreditCard} label="Plan Price" value={brand.planPrice} strike={!incomplete} />
        <OverviewStat icon={BadgeCheck} label="Plan" value={brand.subscriptionPlan} />
        <OverviewStat icon={Building2} label="Plan Type" value={brand.planType} />
        <OverviewStat icon={Calendar} label="Term" value={brand.subscriptionTerm} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OverviewStat icon={Calendar} label="Expiry" value={`${brand.expiredInDays} days to go`} />

        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">Contact</p>
              <p className="mt-1 text-[13px] text-neutral-700 dark:text-neutral-300">{brand.contactPhone}</p>
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
          </div>
        </div>
      </div>

      {!incomplete && (
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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
        </div>
      )}
    </div>
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
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <SectionCard title="About">
            <p className="text-[13.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">{brand.about || "No description added yet."}</p>
          </SectionCard>
        </div>
        <SectionCard title="Brand Photo / Logo">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-500">
                  <ImageIcon size={18} />
                </div>
              )}
            </div>
            <p className="text-[11.5px] text-neutral-500">Shown on cards, invoices and the brand header.</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Brand Identity">
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SectionCard title="Business Details">
          <div className="space-y-0">
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
      </div>

      <MerchantTokenCard token={brand.merchantToken} />

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
/* One media item (photo or video) inside a Showcase section — field names
 * defensively normalized since the exact GET response shape wasn't in the
 * Postman screenshots the API was built from. */
function normalizeShowcaseMediaItem(item) {
  return {
    id: item?._id ?? item?.id,
    url: item?.url ?? "",
    isVideo: item?.type === "VIDEO",
    duration: item?.duration,
  };
}

function formatMediaDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* One Showcase album — a premium-styled card showing its cover, real photo/
 * video counts, and a media grid where videos play directly (no static
 * thumbnail placeholder). Lets the admin upload new photos/videos (POST
 * .../add-media) or delete existing ones. */
function ShowcaseSectionCard({ brand, section, onChanged }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingSection, setDeletingSection] = useState(false);
  const [error, setError] = useState("");

  const media = (section.medias ?? []).map(normalizeShowcaseMediaItem).filter((m) => m.url);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      await addShowcaseMedia(section._id, files, { brandId: brand.id });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    setDeletingId(mediaId);
    setError("");
    try {
      await deleteShowcaseMedia(section._id, mediaId, brand.id);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSection = async () => {
    if (!window.confirm(`Delete the "${section.title}" album and all its media?`)) return;
    setDeletingSection(true);
    setError("");
    try {
      await deleteShowcaseSection(section._id, brand.id);
      onChanged();
    } catch (err) {
      setError(err.message);
      setDeletingSection(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
            {section.coverImage ? (
              <img src={section.coverImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <ImageIcon size={16} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-neutral-800 dark:text-neutral-200">{section.title}</p>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              {section.photoCount ?? 0} photo{section.photoCount === 1 ? "" : "s"} · {section.videoCount ?? 0} video
              {section.videoCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3.5 py-2 text-[11.5px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-400"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? "Uploading…" : "Add Media"}
          </button>
          <button
            type="button"
            onClick={handleDeleteSection}
            disabled={deletingSection}
            aria-label={`Delete ${section.title} album`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-500"
          >
            {deletingSection ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
        </div>
      </div>

      {error && <p className="px-4 pb-2 text-[11.5px] text-red-600 dark:text-red-400">{error}</p>}

      {media.length ? (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="group relative aspect-video overflow-hidden bg-neutral-950">
              {m.isVideo ? (
                <>
                  <video src={m.url} className="h-full w-full object-cover" controls muted playsInline preload="metadata" />
                  {m.duration != null && (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {formatMediaDuration(m.duration)}
                    </span>
                  )}
                </>
              ) : (
                <img
                  src={m.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <button
                type="button"
                onClick={() => handleDeleteMedia(m.id)}
                disabled={deletingId === m.id}
                aria-label="Delete media"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 disabled:opacity-100"
              >
                {deletingId === m.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-4 mb-4 flex flex-col items-center gap-2 rounded-2xl bg-neutral-50 py-8 text-center dark:bg-neutral-950/60">
          <ImageIcon size={18} className="text-neutral-400 dark:text-neutral-600" />
          <p className="text-[12px] text-neutral-500">No media in this album yet.</p>
        </div>
      )}
    </div>
  );
}

/* Ambience tab — the admin-managed Showcase album system: real albums
 * (sections) with real media, fetched via GET /showcase/get-brand-showcase
 * and editable via the add-media/delete-media/delete-section endpoints. */
function AmbienceTab({ brand }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [addingSection, setAddingSection] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchShowcase = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getBrandShowcase(brand.id);
      const list = res?.data?.sections ?? res?.sections ?? res?.data ?? [];
      setSections(Array.isArray(list) ? list : []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brand.id]);

  useEffect(() => {
    fetchShowcase();
  }, [fetchShowcase]);

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      await createShowcaseSection({ brandId: brand.id, title: newTitle.trim(), sortOrder: sections.length + 1 });
      setNewTitle("");
      setAddingSection(false);
      fetchShowcase();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Showcase</p>
            <p className="mt-0.5 text-[12px] text-neutral-500">Real ambience, menu and event albums shown on this brand's profile.</p>
          </div>
          <button
            type="button"
            onClick={() => setAddingSection((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3.5 py-2 text-[12px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
          >
            <Plus size={13} />
            Add Album
          </button>
        </div>

        {addingSection && (
          <form
            onSubmit={handleCreateSection}
            className="mb-3 flex flex-col gap-2 rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:flex-row sm:items-center"
          >
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Album title, e.g. Ambience Photos"
              className={`${inputClass} sm:flex-1`}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!newTitle.trim() || creating}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating && <Loader2 size={13} className="animate-spin" />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingSection(false);
                  setNewTitle("");
                  setCreateError("");
                }}
                className="rounded-xl px-3 py-2.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
            {createError && <p className="text-[11.5px] text-red-600 dark:text-red-400 sm:basis-full">{createError}</p>}
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-10 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading showcase…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="shrink-0" />
            Couldn't load showcase: {loadError}
          </div>
        ) : sections.length ? (
          <div className="space-y-3">
            {sections.map((s) => (
              <ShowcaseSectionCard key={s._id} brand={brand} section={s} onChanged={fetchShowcase} />
            ))}
          </div>
        ) : (
          <EmptyState label="No showcase albums yet. Add one to upload photos or videos." />
        )}
      </div>
    </div>
  );
}

function SubBrandTab({ brand }) {
  if (!brand.outlets?.length) return <EmptyState label="No outlets added yet." />;
  return (
    <div className="space-y-4">
      {brand.outlets.map((outlet, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Store size={16} className="mt-0.5 shrink-0 text-neutral-500" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-neutral-800 capitalize dark:text-neutral-200">{outlet.name}</p>
                <p className="mt-0.5 text-[12px] text-neutral-500">{outlet.address}</p>
                {outlet.landmark && outlet.landmark !== "—" && (
                  <p className="mt-0.5 text-[11.5px] text-neutral-400">Landmark: {outlet.landmark}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {outlet.isDeleted && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-medium text-red-600 dark:text-red-400">
                  Deleted
                </span>
              )}
              <StatusBadge status={outlet.status} activeLabel="Active" />
            </div>
          </div>

          {/* Quick facts — bento tile row */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <DetailTile icon={Tag} label="Unique ID" value={outlet.uniqueId} />
            <DetailTile icon={Tag} label="Store ID" value={outlet.storeId} />
            <DetailTile icon={Building2} label="Outlet Type" value={outlet.outletType} />
            <DetailTile icon={Phone} label="WhatsApp" value={outlet.whatsappNumber ? `+91 ${outlet.whatsappNumber}` : "—"} />
            <DetailTile icon={Calendar} label="Joined" value={outlet.joinedDate} />
          </div>

          {/* Full address details — bento tile grid */}
          {outlet.location && (
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Address
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailTile icon={MapPin} label="Address Line 1" value={outlet.location.addressLine1} />
                <DetailTile icon={MapPin} label="Address Line 2" value={outlet.location.addressLine2} />
                <DetailTile icon={Tag} label="Address Type" value={outlet.location.addressType} />
                <DetailTile icon={MapPin} label="City" value={outlet.location.city} />
                <DetailTile icon={MapPin} label="District" value={outlet.location.district} />
                <DetailTile icon={MapPin} label="State" value={outlet.location.state} />
                <DetailTile icon={Globe} label="Country" value={outlet.location.country} />
                <DetailTile icon={MapPin} label="Zipcode" value={outlet.location.zipcode} />
                {outlet.geo && outlet.geo !== "—" && <DetailTile icon={MapPin} label="Coordinates" value={outlet.geo} />}
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
            <div className="mt-4 rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-950/60">
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
        if (!cancelled) {
          if (isNotFoundMessage(err.message)) {
            setVouchers([]);
          } else {
            setError(err.message);
          }
        }
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
  const paidCount = brand.settlements.filter((s) => s.status === "Paid").length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SectionCard title="Total Settlements">
          <p className="text-[20px] font-bold text-neutral-800 dark:text-neutral-200">{brand.settlements.length}</p>
        </SectionCard>
        <SectionCard title="Paid">
          <p className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{paidCount}</p>
        </SectionCard>
        <SectionCard title="Pending" className="col-span-2 sm:col-span-1">
          <p className="text-[20px] font-bold text-amber-600 dark:text-amber-400">{brand.settlements.length - paidCount}</p>
        </SectionCard>
      </div>

      <div className="space-y-2.5">
        {brand.settlements.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <HandCoins size={15} />
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{s.id}</p>
                <p className="text-[11.5px] text-neutral-500">{s.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-200">{s.amount}</p>
              <StatusBadge status={s.status} activeLabel="Paid" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* A real coupon/ticket-style card — a colored discount "stub" punched out
 * of the main card by two circular notches, separated from the details by
 * a dashed line, the way an actual physical voucher looks. */
function VoucherTicketCard({ voucher }) {
  const primaryOffer = voucher.offers?.[0];
  const discountLabel = primaryOffer
    ? primaryOffer.discountType === "PERCENTAGE"
      ? `${primaryOffer.discountValue}%`
      : `₹${primaryOffer.discountValue}`
    : "—";

  return (
    <div className="flex overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="relative flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-emerald-400 to-emerald-500 px-2 py-4 text-neutral-950">
        <p className="text-[22px] font-extrabold leading-none">{discountLabel}</p>
        <p className="text-[9.5px] font-semibold uppercase tracking-wide text-neutral-950/70">Off</p>
        <span className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-white dark:bg-neutral-900" />
        <span className="absolute -bottom-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-white dark:bg-neutral-900" />
      </div>

      <div className="min-w-0 flex-1 border-l border-dashed border-neutral-300 p-4 dark:border-neutral-700">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-200">{voucher.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
              <Tag size={10} /> {voucher.versionCode || "—"}
            </p>
          </div>
          <VoucherStatusPill status={voucher.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {formatShortDate(voucher.startAt)} → {formatShortDate(voucher.endAt)}
          </span>
          {voucher.category?.name && (
            <span className="flex items-center gap-1">
              <Store size={11} />
              {voucher.category.name}
              {voucher.subCategory?.name ? ` · ${voucher.subCategory.name}` : ""}
            </span>
          )}
          {voucher.offers?.length > 1 && (
            <span className="text-neutral-400">+{voucher.offers.length - 1} more offer{voucher.offers.length > 2 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* Review tab repurposed to show this brand's real vouchers (no review
 * endpoint exists), styled as actual coupon/ticket cards — pulled live
 * from the same GET /vouchers/versions/get-all?brandId=... as Listings. */
function VoucherTab({ brand }) {
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
        if (!cancelled) {
          if (isNotFoundMessage(err.message)) {
            setVouchers([]);
          } else {
            setError(err.message);
          }
        }
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

  const publishedCount = vouchers.filter((v) => v.status === "PUBLISHED").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SectionCard title="Total Vouchers">
          <p className="text-[20px] font-bold text-neutral-800 dark:text-neutral-200">{vouchers.length}</p>
        </SectionCard>
        <SectionCard title="Published">
          <p className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{publishedCount}</p>
        </SectionCard>
      </div>

      {vouchers.map((v) => (
        <VoucherTicketCard key={v._id} voucher={v} />
      ))}
    </div>
  );
}

function AccountDetailsTab({ brand }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
        <div className="col-span-2 row-span-2 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Brand &amp; Contact</p>
          <div className="space-y-0">
            <InfoRow icon={Users} label="Legal Name" value={brand.ownerName} />
            <InfoRow icon={Phone} label="Phone" value={brand.contactPhone} />
            <InfoRow icon={Mail} label="Email" value={brand.contactEmail} />
          </div>
        </div>
        <OverviewStat icon={ShieldCheck} label="GST Status" value={brand.gstVerified ? "Verified" : "Unverified"} />
        <OverviewStat icon={BadgeCheck} label="PAN Status" value={brand.panVerified ? "Verified" : "Unverified"} />
        <OverviewStat icon={Landmark} label="Bank Status" value={brand.bankVerified ? "Verified" : "Unverified"} />
        <OverviewStat icon={Tag} label="Bank Name" value={brand.bankName || "—"} />
      </div>

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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailTile icon={BadgeCheck} label="PAN Number" value={brand.panNumber} />
            <DetailTile icon={Tag} label="PAN Type" value={brand.panType} />
            <DetailTile icon={Users} label="Full Name" value={brand.panFullName} />
            <DetailTile icon={Globe} label="Country" value={brand.panCountry} />
            <DetailTile icon={ShieldCheck} label="Verification Message" value={brand.panVerificationMessage} />
            <DetailTile icon={ShieldCheck} label="Verification Provider" value={brand.panVerificationProvider} />
            <DetailTile icon={Calendar} label="Verified At" value={brand.panVerifiedAtDisplay} />
          </div>
        </CollapsibleSectionCard>
      )}

      {brand.gstNumber && brand.gstNumber !== "—" && (
        <CollapsibleSectionCard title="GST Details" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailTile icon={ShieldCheck} label="GST Number" value={brand.gstNumber} />
            <DetailTile icon={Tag} label="Legal Name" value={brand.gstLegalName} />
            <DetailTile icon={Tag} label="Trade Name" value={brand.gstTradeName} />
            <DetailTile icon={Briefcase} label="Constitution" value={brand.gstConstitution} />
            <DetailTile icon={Activity} label="Taxpayer Type" value={brand.gstTaxpayerType} />
            <DetailTile
              icon={Calendar}
              label="Registration Date"
              value={brand.gstRegistrationDate ? new Date(brand.gstRegistrationDate).toLocaleDateString("en-IN") : "—"}
            />
            <DetailTile icon={ShieldCheck} label="Registration Status" value={brand.gstRegistrationStatus} />
            {brand.gstNatureOfBusiness?.length > 0 && (
              <DetailTile icon={Briefcase} label="Nature of Business" value={brand.gstNatureOfBusiness.join(", ")} />
            )}
            <DetailTile icon={Landmark} label="Jurisdiction" value={brand.gstStateJurisdiction} />
            <DetailTile icon={MapPin} label="Registered Address" value={brand.gstAddress} />
            <DetailTile icon={ShieldCheck} label="Verification Message" value={brand.gstVerificationMessage} />
            <DetailTile icon={ShieldCheck} label="Verification Provider" value={brand.gstVerificationProvider} />
            <DetailTile icon={Calendar} label="Verified At" value={brand.gstVerifiedAtDisplay} />
          </div>
        </CollapsibleSectionCard>
      )}

      {brand.bankName && brand.bankName !== "—" && (
        <CollapsibleSectionCard title="Bank Details" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailTile icon={Landmark} label="Bank Name" value={brand.bankName} />
            <DetailTile icon={Users} label="Account Holder" value={brand.accountHolder} />
            <DetailTile icon={Landmark} label="Branch" value={brand.bankBranch} />
            <DetailTile icon={CreditCard} label="Account Number" value={brand.maskedAccountNumber} />
            <DetailTile icon={CreditCard} label="IFSC Code" value={brand.ifscCode} />
            <DetailTile icon={CreditCard} label="Account Type" value={brand.accountType} />
            <DetailTile icon={MapPin} label="Bank Address" value={brand.bankAddress} />
            <DetailTile icon={Activity} label="Payment Mode" value={brand.bankPaymentMode} />
            <DetailTile icon={ShieldCheck} label="Recommended Action" value={brand.bankRecommendedAction} />
            <DetailTile icon={ShieldCheck} label="Verification Message" value={brand.bankVerificationMessage} />
            <DetailTile icon={ShieldCheck} label="Verification Provider" value={brand.bankVerificationProvider} />
            <DetailTile icon={Calendar} label="Verified At" value={brand.bankVerifiedAtDisplay} />
          </div>
        </CollapsibleSectionCard>
      )}
    </div>
  );
}

function SystemVerificationTab({ brand }) {
  const sv = brand.systemVerify;
  if (!sv) return <EmptyState label="No system verification record yet." />;

  const gaugeData =
    sv.score != null
      ? [
          { name: "score", value: sv.score },
          { name: "rest", value: 100 - sv.score },
        ]
      : [];
  const gaugeColor = sv.score >= 80 ? "#34d399" : sv.score >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SectionCard title="Trust Score">
          {sv.score != null ? (
            <div className="relative h-[110px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    startAngle={180}
                    endAngle={0}
                    cx="50%"
                    cy="90%"
                    innerRadius={42}
                    outerRadius={58}
                    stroke="none"
                  >
                    <Cell fill={gaugeColor} />
                    <Cell fill="#e5e7eb" opacity={0.6} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
                <p className="text-[19px] font-bold text-neutral-800 dark:text-neutral-100">{sv.score}</p>
                <p className="text-[10px] text-neutral-500">out of 100</p>
              </div>
            </div>
          ) : (
            <div className="flex h-[110px] items-center justify-center text-[12.5px] text-neutral-500">No score yet.</div>
          )}
        </SectionCard>

        <div className="sm:col-span-2">
          <SectionCard title="Verification Status">
            <p className="mb-3 text-[12.5px] text-neutral-500">Attempt #{sv.attemptNumber}</p>
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
        </div>
      </div>

      {sv.nameMatch && (
        <SectionCard title="Name Match Scores">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "PAN↔GST", value: sv.nameMatch.panGstScore },
                    { name: "PAN↔Brand", value: sv.nameMatch.panBrandScore },
                    { name: "GST↔Brand", value: sv.nameMatch.gstBrandScore },
                    { name: "Avg", value: sv.nameMatch.averageScore },
                  ]}
                  barCategoryGap="25%"
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v}%`, "Score"]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                  <Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">PAN ↔ GST</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.panGstScore}%</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">PAN ↔ Brand</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.panBrandScore}%</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">GST ↔ Brand</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.gstBrandScore}%</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">Average</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.nameMatch.averageScore}%</p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {sv.bankNameMatch && (
        <SectionCard title="Bank Name Match Scores">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Bank↔PAN", value: sv.bankNameMatch.bankPanScore },
                    { name: "Bank↔GST", value: sv.bankNameMatch.bankGstScore },
                    { name: "Bank↔Brand", value: sv.bankNameMatch.bankBrandScore },
                    { name: "Highest", value: sv.bankNameMatch.highestScore },
                  ]}
                  barCategoryGap="25%"
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v}%`, "Score"]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                  <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">Bank ↔ PAN</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.bankPanScore}%</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">Bank ↔ GST</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.bankGstScore}%</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">Bank ↔ Brand</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.bankBrandScore}%</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <p className="text-[10.5px] text-neutral-500">Highest</p>
                <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{sv.bankNameMatch.highestScore}%</p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {sv.entityMatch && (
        <SectionCard title="Business Entity Match">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailTile icon={Briefcase} label="GST Constitution" value={sv.entityMatch.gstConstitution} />
            <DetailTile icon={Building2} label="Brand Entity Type" value={sv.entityMatch.brandEntityType} />
            <DetailTile icon={ShieldCheck} label="Matched" value={sv.entityMatch.matched ? "Yes" : "No"} />
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

      {(() => {
        const flagList = [
          ["PAN Verified", sv.flags?.panVerified],
          ["GST Verified", sv.flags?.gstVerified],
          ["Bank Verified", sv.flags?.bankVerified],
          ["PAN ↔ GST Match", sv.flags?.panMatchedWithGST],
          ["PAN ↔ Brand Match", sv.flags?.panMatchedWithBrand],
          ["GST ↔ Brand Match", sv.flags?.gstMatchedWithBrand],
          ["Bank Matched", sv.flags?.bankMatched],
          ["Entity Type Matched", sv.flags?.businessEntityMatched],
          ["GST Active", sv.flags?.gstActive],
        ];
        const passCount = flagList.filter(([, ok]) => ok).length;
        const flagsChartData = [
          { name: "Passed", value: passCount },
          { name: "Failed", value: flagList.length - passCount },
        ];
        return (
          <SectionCard title="Verification Flags">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative flex h-[110px] items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={flagsChartData} dataKey="value" innerRadius={32} outerRadius={48} paddingAngle={3} stroke="none">
                      <Cell fill="#34d399" />
                      <Cell fill="#e5e7eb" opacity={0.6} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[15px] font-bold text-neutral-800 dark:text-neutral-100">
                    {passCount}/{flagList.length}
                  </p>
                  <p className="text-[9.5px] text-neutral-500">Passed</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
                {flagList.map(([label, ok]) => (
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
            </div>
          </SectionCard>
        );
      })()}

      <SectionCard title="Review Trail">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <DetailTile icon={ShieldCheck} label="Verified By" value={sv.verifiedBy} />
          <DetailTile icon={Calendar} label="Verified At" value={sv.verifiedAtDisplay} />
          {sv.reviewedAtDisplay && <DetailTile icon={Calendar} label="Reviewed At" value={sv.reviewedAtDisplay} />}
          {sv.adminApprovedAtDisplay && (
            <DetailTile icon={Calendar} label="Admin Approved At" value={sv.adminApprovedAtDisplay} />
          )}
          {sv.rejectedAtDisplay && <DetailTile icon={Calendar} label="Rejected At" value={sv.rejectedAtDisplay} />}
          {sv.rejectionReason && <DetailTile icon={AlertTriangle} label="Rejection Reason" value={sv.rejectionReason} />}
          {sv.revokedAtDisplay && <DetailTile icon={Calendar} label="Revoked At" value={sv.revokedAtDisplay} />}
          {sv.revokeReason && <DetailTile icon={AlertTriangle} label="Revoke Reason" value={sv.revokeReason} />}
          <DetailTile icon={Calendar} label="Created" value={sv.createdAtDisplay} />
          <DetailTile icon={Calendar} label="Last Updated" value={sv.updatedAtDisplay} />
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
  Voucher: Ticket,
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
    Voucher: <VoucherTab brand={brand} />,
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

          <div className="flex flex-wrap items-center gap-2">
            {onSetTopBrand && (
              <button
                onClick={() => setShowTopBrandModal(true)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${brand.isTopBrand
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-amber-400/40 hover:text-amber-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-amber-400"
                  }`}
              >
                <Sparkles size={13} />
                <span className="hidden sm:inline">{brand.isTopBrand ? `Top Brand · #${brand.topOrder}` : "Mark as Top Brand"}</span>
                <span className="sm:hidden">{brand.isTopBrand ? `#${brand.topOrder}` : "Top Brand"}</span>
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-emerald-400"
            >
              <Pencil size={13} />
              <span className="hidden sm:inline">Edit Brand Details</span>
              <span className="sm:hidden">Edit</span>
            </button>
            <button
              onClick={() => onDelete(brand)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete Brand</span>
            </button>
          </div>
        </div>

        {/* Header card */}
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-br ${accent} opacity-80`} />
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/40 blur-2xl dark:bg-white/5" />
          <div className="pointer-events-none absolute right-24 top-4 h-16 w-16 rounded-full bg-white/30 blur-xl dark:bg-white/5" />

          <div className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="rounded-2xl shadow-sm ring-4 ring-neutral-50 dark:ring-neutral-950">
                <BrandAvatar brand={brand} size="xl" className="shadow-inner" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end">
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

          {/* Quick-glance stat strip — visible no matter which tab is open.
              Only shows fields the header rings above don't already cover
              (they already surface expiry days and outlet count). */}
          {!incomplete && (
            <div className="relative flex flex-wrap gap-2 bg-neutral-50/70 px-6 py-3 dark:bg-neutral-950/40">
              <StatChip icon={BadgeCheck} value={brand.subscriptionPlan} label="Plan" tint="emerald" />
              <StatChip icon={CreditCard} value={brand.planPrice} label="Price" tint="violet" />
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