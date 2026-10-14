import { Pencil } from "lucide-react";
import { FileThumb } from "../components/FormControls";
import { DAYS, ENTITY_TYPES, REGISTRATION_STATUSES, ACCOUNT_TYPES, isRegisteredBusiness } from "../brandFormConfig";

const labelOf = (options, value) => options.find((o) => o.value === value)?.label || value || "—";
const maskAccount = (n) => (n ? `•••• ${n.slice(-4)}` : "—");
const fmt = (v) => (String(v ?? "").trim() ? v : "—");

function ReviewCard({ title, onEdit, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-emerald-600 transition-colors hover:bg-emerald-400/10 dark:text-emerald-400"
        >
          <Pencil size={11} />
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

function Rows({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] text-neutral-400">{label}</dt>
          <dd className="truncate text-[13px] text-neutral-800 dark:text-neutral-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ReviewStep({ form, onEdit }) {
  const { owner, basicDetails, pan, gst, bank, brandDetails, outlet, location, workingHours, listingFeatures, showcase } = form;
  const address = [location.addressLine1, location.addressLine2, location.landmark, location.city, location.district, location.state, location.zipcode]
    .filter((p) => String(p).trim())
    .join(", ");

  return (
    <div className="space-y-3">
      <ReviewCard title="Business" onEdit={() => onEdit("business")}>
        <Rows
          items={[
            ["Owner WhatsApp", `+91 ${owner.whatsappNumber}`],
            ["Brand name", fmt(basicDetails.brandName)],
            ["Legal name", fmt(basicDetails.legalBusinessName)],
            ["Entity type", labelOf(ENTITY_TYPES, basicDetails.businessEntityType)],
            ["Registration", labelOf(REGISTRATION_STATUSES, basicDetails.businessRegistrationStatus)],
          ]}
        />
      </ReviewCard>

      {isRegisteredBusiness(form) && (
        <ReviewCard title="GST & PAN" onEdit={() => onEdit("gstPan")}>
          <Rows items={[["PAN", fmt(pan.pan)], ["GSTIN", fmt(gst.gstNumber)]]} />
        </ReviewCard>
      )}

      <ReviewCard title="Bank account" onEdit={() => onEdit("bank")}>
        <Rows
          items={[
            ["Account number", maskAccount(bank.accountNumber)],
            ["IFSC", fmt(bank.ifscCode)],
            ["Account type", labelOf(ACCOUNT_TYPES, bank.accountType)],
            ["Beneficiary", fmt(bank.beneficiaryName)],
            ["Account holder", fmt(bank.accountHolderName)],
          ]}
        />
      </ReviewCard>

      <ReviewCard title="Brand profile" onEdit={() => onEdit("brandProfile")}>
        <div className="mb-3 flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            {brandDetails.logo && <FileThumb file={brandDetails.logo} className="h-full w-full" />}
          </div>
          <p className="line-clamp-2 text-[12.5px] text-neutral-500">{brandDetails.description || "No description"}</p>
        </div>
        <Rows
          items={[
            ["Email", fmt(brandDetails.email)],
            ["Mobile", `+91 ${brandDetails.mobile}`],
            ["Category", fmt(brandDetails.categoryName)],
            ["Sub-category", fmt(brandDetails.subCategoryName)],
          ]}
        />
      </ReviewCard>

      <ReviewCard title="Outlet & location" onEdit={() => onEdit("outlet")}>
        <Rows
          items={[
            ["Outlet WhatsApp", `+91 ${outlet.whatsappNumber}`],
            ["Country", fmt(location.country)],
          ]}
        />
        <p className="mt-2.5 text-[11px] text-neutral-400">Address</p>
        <p className="text-[13px] text-neutral-800 dark:text-neutral-200">{address || "—"}</p>
      </ReviewCard>

      <ReviewCard title="Working hours" onEdit={() => onEdit("hours")}>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {DAYS.map((day) => {
            const h = workingHours[day];
            return (
              <li key={day} className="flex justify-between gap-3 text-[12.5px]">
                <span className="capitalize text-neutral-500">{day}</span>
                <span className={h.isOpen ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-400"}>
                  {h.isOpen ? `${h.start} – ${h.end}` : "Closed"}
                </span>
              </li>
            );
          })}
        </ul>
      </ReviewCard>

      <ReviewCard title="Listing features" onEdit={() => onEdit("features")}>
        {listingFeatures.length ? (
          <div className="flex flex-wrap gap-2">
            {listingFeatures.map((f) => (
              <span
                key={f.id}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${
                  f.isActive
                    ? "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                    : "border-dashed border-neutral-200 text-neutral-400 dark:border-neutral-800"
                }`}
              >
                {f.icon && <FileThumb file={f.icon} className="h-4 w-4 rounded" />}
                {f.title}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-neutral-400">None added</p>
        )}
      </ReviewCard>

      <ReviewCard title="Showcase" onEdit={() => onEdit("showcase")}>
        {showcase.length ? (
          <ul className="space-y-1.5">
            {showcase.map((a) => (
              <li key={a.id} className="flex justify-between text-[12.5px]">
                <span className="text-neutral-800 dark:text-neutral-200">{a.title}</span>
                <span className="text-neutral-500">
                  {a.files.length} file{a.files.length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-neutral-400">None added</p>
        )}
      </ReviewCard>
    </div>
  );
}
