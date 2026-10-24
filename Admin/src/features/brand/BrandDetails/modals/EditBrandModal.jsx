import { useState } from "react";
import { X } from "lucide-react";
import { BUSINESS_STATUSES, BUSINESS_TYPES } from "../../data/BrandData";
import { Field, FileField, inputClass } from "../../BrandShared";
import { updateBrand } from "../../services/BrandApi";
import { useBrands } from "../../BrandContext";

/* -------------------------------------------------------------------------
 * Edit Brand Details — lets a super admin update the brand-info fields
 * (identity, business details, contact, tags, media) for an existing brand.
 * ---------------------------------------------------------------------- */

export default function EditBrandModal({ brand, onClose, onSave }) {
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { syncAfterUpdate } = useBrands();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // PUT /brands/update (doc #27, known issue A-11) saves name, about,
  // contact email and logo — only the ones that changed, since email is
  // the vendor ACCOUNT's and loses its verified flag when written. The
  // other fields have no API yet and stay local, as before.
  const serverChanges = () => {
    const out = {};
    const name = form.brandName.trim();
    if (name && name !== (brand.brandName || "")) out.brandName = name;
    if (form.about !== (brand.about || "")) out.description = form.about;
    const email = form.contactEmail.trim();
    if (email && email !== "—" && email !== (brand.contactEmail || "")) out.email = email;
    if (logoFile) out.logo = logoFile;
    return out;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brandName.trim()) return;

    const changes = serverChanges();
    if (Object.keys(changes).length) {
      setSaving(true);
      setSaveError("");
      try {
        await updateBrand(brand.id, changes);
      } catch (err) {
        setSaveError(err.message);
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    const updates = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (logoFile) updates.logo = URL.createObjectURL(logoFile);

    onSave(brand.id, updates);
    if (Object.keys(changes).length) syncAfterUpdate(brand.id);
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

          <p className="text-[11.5px] text-neutral-500">
            Saved to the server: brand name, about, contact email and logo. The other fields have no API yet and only
            change this view until the next refresh.
          </p>
          {saveError && (
            <p className="rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">{saveError}</p>
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
              disabled={saving}
              className="rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
