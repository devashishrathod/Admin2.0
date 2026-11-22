import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, Field, RadioCard, Note, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { addBasicDetails } from "../services/onboardingApi";
import { ENTITY_TYPES, KYC_PATHS, entityLabel } from "../onboardingFlow";
import { useCategories } from "../../category/queries/categoryQueries";
import { useSubCategories } from "../../subcategory/queries/subCategoryQueries";
import Loader from "../../../components/common/Loader";

/* Basic details: brand name, category, business status, then (registered
   paths) business type. All four save through add-basic-details with
   `step` = this screen; the response's currentScreen is re-read from status. */

const listOf = (res) => {
  const l = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(l) ? l : [];
};
const idOf = (x) => (x && typeof x === "object" ? x._id || x.id : x) || "";

/* ---- BRAND_NAME --------------------------------------------------- */
// Only the brand name. The legal name is filled by the server from the
// PAN / GST record (or the owner's PAN on the not-registered path).
export function BrandNameScreen({ brandId, brand, status, eyebrow, onAdvance, onBack }) {
  const min = status.limits.brandNameMinLength ?? 2;
  const max = status.limits.brandNameMaxLength ?? 25;
  const [name, setName] = useState(brand?.brandName || "");
  const { run, busy, error } = useStepAction(onAdvance);
  const len = name.trim().length;
  const ok = len >= min && len <= max;

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="What do customers call the brand?"
      intro="The name shown on the app, vouchers and the brand page. The legal name is taken from the PAN or GST record later."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} disabled={!ok} onClick={() => run("save", () => addBasicDetails(brandId, "BRAND_NAME", { brandName: name.trim() }))}>Save & continue</PrimaryButton>}
        />
      }
    >
      <Field label="Brand name" hint={`${min}–${max} characters · ${len}/${max}`} error={name && !ok ? `${min}–${max} characters` : ""}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cafe Mocha" maxLength={max} autoFocus />
      </Field>
      {brand?.legalBusinessName && <Note tone="muted">Legal name on record: {brand.legalBusinessName}</Note>}
    </ScreenShell>
  );
}

/* ---- BUSINESS_CATEGORY -------------------------------------------- */
// One category, then 1..limits.maxSubCategories of its subcategories.
export function BusinessCategoryScreen({ brandId, brand, status, eyebrow, onAdvance, onBack }) {
  const maxSubs = status.limits.maxSubCategories ?? 3;
  const [categoryId, setCategoryId] = useState(idOf(brand?.categoryId) || idOf(brand?.category));
  const [subIds, setSubIds] = useState(() => (brand?.subCategoryIds || []).map(idOf).filter(Boolean));
  const [search, setSearch] = useState("");
  const { run, busy, error } = useStepAction(onAdvance);

  const categoriesQuery = useCategories({ page: 1, limit: 100, isActive: true });
  const subsQuery = useSubCategories({ page: 1, limit: 200, categoryId, isActive: true }, { enabled: Boolean(categoryId) });
  const categories = useMemo(() => listOf(categoriesQuery.data), [categoriesQuery.data]);
  const subs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = listOf(subsQuery.data);
    return q ? all.filter((s) => String(s.name).toLowerCase().includes(q)) : all;
  }, [subsQuery.data, search]);
  const atLimit = subIds.length >= maxSubs;

  const pickCategory = (id) => {
    if (id === categoryId) return;
    setCategoryId(id);
    setSubIds([]);
    setSearch("");
  };
  const toggleSub = (id) => setSubIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : atLimit ? cur : [...cur, id]));
  const chip = (active) =>
    `min-h-10 rounded-full border px-4 text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "border-[#0B6E5A] bg-[#0B6E5A] text-white"
        : "border-[#CFD1CA] bg-white text-[#15171C] hover:border-[#0B6E5A] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
    }`;

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="What kind of business is it?"
      intro="Customers find the brand under this category, and it decides which licence is suggested in the documents step."
      error={error || categoriesQuery.error?.message || subsQuery.error?.message || ""}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            <PrimaryButton
              busy={busy === "save"}
              disabled={!categoryId || !subIds.length}
              onClick={() => run("save", () => addBasicDetails(brandId, "BUSINESS_CATEGORY", { categoryId, subCategoryIds: subIds }))}
            >
              Save & continue
            </PrimaryButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Category</span>
        {categoriesQuery.isPending ? (
          <Loader variant="inline" label="Loading categories…" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={idOf(c)} type="button" onClick={() => pickCategory(idOf(c))} aria-pressed={categoryId === idOf(c)} className={chip(categoryId === idOf(c))}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {categoryId && (
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium">
            Subcategories <span className="font-normal text-[#5B616E]">· pick up to {maxSubs} ({subIds.length} picked)</span>
          </span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A9]" />
            <input className={`${inputCls} pl-9`} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subcategories" aria-label="Search subcategories" />
          </div>
          {subsQuery.isPending ? (
            <Loader variant="inline" label="Loading subcategories…" />
          ) : subs.length === 0 ? (
            <p className="m-0 text-[14px] text-[#5B616E]">{search ? `No subcategory matches “${search}”.` : "This category has no active subcategories — pick another one."}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subs.map((s) => {
                const on = subIds.includes(idOf(s));
                return (
                  <button key={idOf(s)} type="button" onClick={() => toggleSub(idOf(s))} aria-pressed={on} disabled={!on && atLimit} className={chip(on)}>
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      <Note tone="muted">Can be changed until the brand is approved; after approval only an admin can change it.</Note>
    </ScreenShell>
  );
}

/* ---- REGISTRATION_STATUS → kycPath -------------------------------- */
export function RegistrationStatusScreen({ brandId, status, eyebrow, onAdvance, onBack }) {
  const [value, setValue] = useState(status.kycPath || "");
  const { run, busy, error } = useStepAction(onAdvance);
  const locked = status.raw.registrationStatusLocked === true && status.editable.registrationStatus === false;

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Is the business registered?"
      intro="All three are welcome on Trydood. This only decides which verification is asked for next."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            <PrimaryButton busy={busy === "save"} disabled={!value || locked} onClick={() => run("save", () => addBasicDetails(brandId, "REGISTRATION_STATUS", { kycPath: value }))}>
              Save & continue
            </PrimaryButton>
          }
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {KYC_PATHS.map((p) => (
          <RadioCard
            key={p.value}
            name="kycPath"
            checked={value === p.value}
            onChange={() => setValue(p.value)}
            disabled={locked}
            title={p.label}
            description={p.description}
            extra={<span className="mt-1 text-[12.5px] font-medium text-[#1F4FB8]">Next: {p.next}</span>}
          />
        ))}
      </div>
      {locked ? (
        <Note tone="warn">The business status is locked now that PAN / GST is saved.</Note>
      ) : (
        <Note tone="info">Picked the wrong one? Come back and switch before the PAN / GST is saved.</Note>
      )}
    </ScreenShell>
  );
}

/* ---- REGISTRATION_ENTITY_TYPE (registered paths) ------------------ */
export function EntityTypeScreen({ brandId, brand, eyebrow, onAdvance, onBack }) {
  const [value, setValue] = useState(brand?.businessEntityType || "");
  const { run, busy, error } = useStepAction(onAdvance);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="How is the business registered?"
      intro="Choose the type on the GST certificate or company papers."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} disabled={!value} onClick={() => run("save", () => addBasicDetails(brandId, "REGISTRATION_ENTITY_TYPE", { businessEntityType: value }))}>Save & continue</PrimaryButton>}
        />
      }
    >
      {brand?.businessEntityType && <Note tone="muted">Saved: {entityLabel(brand.businessEntityType)}</Note>}
      <div className="grid gap-3 sm:grid-cols-2">
        {ENTITY_TYPES.map((t) => (
          <RadioCard key={t.value} name="entity" checked={value === t.value} onChange={() => setValue(t.value)} title={t.label} description={t.hint} />
        ))}
      </div>
    </ScreenShell>
  );
}
