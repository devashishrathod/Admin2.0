import React, { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Users,
  Star,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Download,
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
  InfoRow,
  VerificationRow,
  MerchantTokenCard,
  SectionCard,
  EmptyState,
  OnboardingBadge,
  ApprovalDropdown,
  Field,
  FileField,
  inputClass,
  StatusBadge,
} from "./BrandShared";

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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-neutral-50">Edit Brand Details</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Update {brand.brandName}'s brand info. Changes are reflected immediately.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
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

          <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-800 px-4 py-2 text-[13px] font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
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
 * Tabs
 * ---------------------------------------------------------------------- */

function OverviewTab({ brand }) {
  const incomplete = brand.onboardingComplete === false;

  return (
    <div className="space-y-4">
      {brand.status === "Rejected" && brand.rejectionReason && (
        <SectionCard className="border-red-500/30 bg-red-500/[0.04]">
          <div className="flex items-start gap-3">
            <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="text-[13.5px] font-semibold text-red-400">Listing Rejected</p>
              <p className="mt-1 text-[12.5px] text-neutral-400">{brand.rejectionReason}</p>
            </div>
          </div>
        </SectionCard>
      )}

      {incomplete && (
        <SectionCard className="border-amber-400/30 bg-amber-400/[0.04]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold text-amber-400">
                Onboarding not completed
              </p>
              <p className="mt-1 text-[12.5px] text-neutral-400">
                This brand dropped off at{" "}
                <span className="font-medium text-neutral-200">{brand.onboardingStep}</span>{" "}
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
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          done ? "bg-emerald-400 text-neutral-950" : "bg-neutral-800 text-neutral-500"
                        }`}
                      >
                        {stepNum}
                      </span>
                      <span className={done ? "text-neutral-300" : "text-neutral-600"}>{step}</span>
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
            <p className="text-[13px] text-neutral-300">{brand.contactPhone}</p>
            <p className="mt-0.5 text-[13px] text-neutral-300">{brand.contactEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${brand.contactPhone}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 transition-colors hover:bg-emerald-400/20"
              aria-label="Call brand"
            >
              <Phone size={14} />
            </a>
            <a
              href={`mailto:${brand.contactEmail}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 transition-colors hover:bg-emerald-400/20"
              aria-label="Email brand"
            >
              <Mail size={14} />
            </a>
          </div>
        </div>
      </SectionCard>

      {!incomplete && (
        <SectionCard>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-neutral-500">Renewal Window</p>
            <p className="text-[12px] font-semibold text-neutral-300">
              {brand.remainderPercent}%
            </p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
              style={{ width: `${brand.remainderPercent}%` }}
            />
          </div>
        </SectionCard>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
        <span className="flex items-center overflow-hidden rounded-lg text-[13px] font-extrabold tracking-tight">
          <span className="bg-pink-500 px-1.5 py-0.5 text-white">S</span>
          <span className="bg-purple-500 px-1.5 py-0.5 text-white">M</span>
          <span className="bg-blue-500 px-1.5 py-0.5 text-white">A</span>
          <span className="bg-amber-500 px-1.5 py-0.5 text-white">R</span>
          <span className="bg-emerald-500 px-1.5 py-0.5 text-white">T</span>
        </span>
        <span className="text-[13px] font-semibold text-neutral-300">1K</span>
      </div>
    </div>
  );
}

function OverviewStat({ icon: Icon, label, value, strike = false }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3.5">
      <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400">
        <Icon size={14} />
      </span>
      <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13.5px] font-semibold text-neutral-100 ${
          strike ? "line-through decoration-neutral-600" : ""
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
        <p className="text-[13.5px] leading-relaxed text-neutral-300">{brand.about || "No description added yet."}</p>
      </SectionCard>

      <SectionCard title="Brand Identity">
        <div className="divide-y divide-neutral-800">
          <InfoRow icon={Tag} label="Brand Name" value={brand.brandName} />
          <InfoRow icon={Tag} label="Short Name" value={brand.shortName || "—"} />
          <InfoRow icon={Building2} label="Category" value={brand.category} />
          <InfoRow icon={Calendar} label="Live Since" value={brand.liveSince} />
          <InfoRow icon={Globe} label="Website" value={brand.website} />
          <InfoRow icon={MapPin} label="Location" value={brand.location} />
        </div>
      </SectionCard>

      <SectionCard title="Business Details">
        <div className="divide-y divide-neutral-800">
          <InfoRow icon={Briefcase} label="Business Type" value={brand.businessType || "—"} />
          <InfoRow icon={Activity} label="Business Status" value={brand.businessStatus || "—"} />
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
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-800">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-500">
                <ImageIcon size={18} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-neutral-200">Primary logo</p>
            <p className="text-[11.5px] text-neutral-500">Shown on cards, invoices and the brand header.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Ambience Photos">
        {brand.ambiencePhotos?.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {brand.ambiencePhotos.map((src, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl bg-neutral-800">
                <img
                  src={src}
                  alt={`${brand.brandName} ambience ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-neutral-500">No ambience photos uploaded yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Ambience Video">
        {brand.ambienceVideo ? (
          <video
            src={brand.ambienceVideo}
            controls
            className="w-full rounded-xl bg-neutral-950"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-800 py-8 text-center">
            <PlayCircle size={20} className="text-neutral-600" />
            <p className="text-[12.5px] text-neutral-500">No ambience video uploaded yet.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Tags">
        {brand.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {brand.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-[12px] text-neutral-300"
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

function SubBrandTab({ brand }) {
  if (!brand.outlets?.length) return <EmptyState label="No outlets added yet." />;
  return (
    <div className="space-y-3">
      {brand.outlets.map((outlet, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex items-start gap-3">
            <Store size={16} className="mt-0.5 shrink-0 text-neutral-500" />
            <div>
              <p className="text-[13.5px] font-medium text-neutral-200">{outlet.name}</p>
              <p className="mt-0.5 text-[12px] text-neutral-500">{outlet.address}</p>
            </div>
          </div>
          <StatusBadge status={outlet.status} activeLabel="Active" />
        </div>
      ))}
    </div>
  );
}

function ListingsTab({ brand }) {
  if (!brand.listings?.length) return <EmptyState label="No listings yet." />;
  return (
    <div className="space-y-3">
      {brand.listings.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div>
            <p className="text-[13.5px] font-medium text-neutral-200">{item.name}</p>
            <p className="mt-0.5 text-[12px] text-neutral-500">{item.price}</p>
          </div>
          <StatusBadge status={item.status} activeLabel="Active" />
        </div>
      ))}
    </div>
  );
}

function SettlementsTab({ brand }) {
  if (!brand.settlements?.length) return <EmptyState label="No settlements recorded." />;
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-neutral-900 text-[11.5px] uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Settlement ID</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 bg-neutral-950">
          {brand.settlements.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 text-neutral-300">{s.id}</td>
              <td className="px-4 py-3 text-neutral-500">{s.date}</td>
              <td className="px-4 py-3 font-medium text-neutral-200">{s.amount}</td>
              <td className="px-4 py-3 text-right">
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
        <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-medium text-neutral-200">{r.author}</p>
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={12} fill={s < r.rating ? "currentColor" : "none"} />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[13px] text-neutral-400">{r.comment}</p>
          <p className="mt-1.5 text-[11.5px] text-neutral-600">{r.date}</p>
        </div>
      ))}
    </div>
  );
}

function SubscriptionInvoiceTab({ brand }) {
  if (!brand.invoices?.length) return <EmptyState label="No invoices generated yet." />;
  return (
    <div className="space-y-3">
      {brand.invoices.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-neutral-500" />
            <div>
              <p className="text-[13.5px] font-medium text-neutral-200">{inv.id}</p>
              <p className="mt-0.5 text-[12px] text-neutral-500">{inv.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-neutral-300">{inv.amount}</span>
            <StatusBadge status={inv.status} activeLabel="Paid" />
            <button
              aria-label="Download invoice"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
            >
              <Download size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountDetailsTab({ brand }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Owner">
        <InfoRow icon={Users} label="Owner Name" value={brand.ownerName} />
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

      <SectionCard title="Contact">
        <div className="divide-y divide-neutral-800">
          <InfoRow icon={Phone} label="Phone" value={brand.contactPhone} />
          <InfoRow icon={Mail} label="Email" value={brand.contactEmail} />
        </div>
      </SectionCard>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * BrandDetails — full page with tab navigation
 *
 * Props:
 *  - brand           : the brand object to display
 *  - onBack()         : go back to the list page
 *  - onToggleActive(brand)
 *  - onDelete(brand)
 *  - onUpdate(id, updates)          : save edits from "Edit Brand Details"
 *  - onDecision(brand, status, reason)  : approve/reject a Pending brand
 * ---------------------------------------------------------------------- */

export default function BrandDetails({ brand, onBack, onToggleActive, onDelete, onUpdate, onDecision }) {
  const [tab, setTab] = useState("Overview");
  const [showEditModal, setShowEditModal] = useState(false);

  const tabContent = {
    Overview: <OverviewTab brand={brand} />,
    "Brand Info": <BrandInfoTab brand={brand} />,
    "Sub-Brand": <SubBrandTab brand={brand} />,
    Listings: <ListingsTab brand={brand} />,
    Settlements: <SettlementsTab brand={brand} />,
    Review: <ReviewTab brand={brand} />,
    "Subscription Invoice": <SubscriptionInvoiceTab brand={brand} />,
    "Account Details": <AccountDetailsTab brand={brand} />,
  };

  const incomplete = brand.onboardingComplete === false;
  const accent = STATUS_ACCENTS[brand.status] || "from-neutral-500/20 via-neutral-500/0";

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
          >
            <ArrowLeft size={13} />
            Back to Brands
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-400 transition-colors hover:border-emerald-400/40 hover:text-emerald-400"
            >
              <Pencil size={13} />
              Edit Brand Details
            </button>
            <button
              onClick={() => onDelete(brand)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <Trash2 size={13} />
              Delete Brand
            </button>
          </div>
        </div>

        {/* Header card */}
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accent} opacity-70`}
          />

          <div className="relative flex items-start justify-between gap-4 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl ring-4 ring-neutral-950">
                <BrandAvatar brand={brand} size="lg" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[19px] font-semibold text-neutral-50">{brand.brandName}</h1>
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
                  <span className="flex items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1">
                    <MapPin size={11} />
                    {brand.location}
                  </span>
                  {!incomplete && (
                    <span className="flex items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1 text-emerald-400">
                      <Users size={11} />
                      {brand.followers} followers
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1">
                    <Tag size={11} />
                    {brand.brandId}
                  </span>
                </div>
              </div>
            </div>
            <ToggleSwitch checked={brand.active} onChange={() => onToggleActive(brand)} />
          </div>

          {/* Segmented pill tabs */}
          <div className="relative border-t border-neutral-800/80 px-4 py-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {DETAIL_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    tab === t
                      ? "bg-emerald-400 text-neutral-950"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  }`}
                >
                  {t}
                </button>
              ))}
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
    </div>
  );
}