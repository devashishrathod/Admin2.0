import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, Field, RadioCard, Note, Section, ChoiceChip, StatusBadge, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { addBasicDetails, updateBasicDetails } from "../services/onboardingApi";
import { ENTITY_TYPES, KYC_PATHS, entityLabel, kycPathLabel } from "../onboardingFlow";
import { useCategories } from "../../category/queries/categoryQueries";
import { useSubCategories } from "../../subcategory/queries/subCategoryQueries";
import Loader from "../../../components/common/Loader";

/* Basic details: brand name, category, business status, then (registered
   paths) business type.
   - On the vendor's CURRENT screen → POST add-basic-details { step, … }
     (moves the vendor's screen).
   - A back-edit of a screen the vendor already passed → PUT
     update-basic-details (#27): the screen doesn't move, and the vendor's
     locks (status lock, legal locks) don't apply to the admin (#25h note 2).
   Either way the page re-reads status afterwards. */

const listOf = (res) => {
  const l = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(l) ? l : [];
};
const idOf = (x) => (x && typeof x === "object" ? x._id || x.id : x) || "";
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// Admin-only legal-name correction (#27 legalBusinessName, 2–200).
const LEGAL_NAME = { min: 2, max: 200 };

/* ---- BRAND_NAME --------------------------------------------------- */
// The brand name, plus — once the server has filled it from PAN / GST /
// owner verification — the admin's correction of the legal name.
export function BrandNameScreen({ brandId, brand, status, eyebrow, onAdvance, onBack, isCurrent = true }) {
  const min = status.limits.brandNameMinLength ?? 2;
  const max = status.limits.brandNameMaxLength ?? 25;
  const savedName = brand?.brandName || "";
  const savedLegal = brand?.legalBusinessName || "";
  const [name, setName] = useState(savedName);
  const [legal, setLegal] = useState(savedLegal);
  const { run, busy, error } = useStepAction(onAdvance);

  const len = name.trim().length;
  const nameOk = len >= min && len <= max;
  const legalLen = legal.trim().length;
  const legalChanged = Boolean(savedLegal) && legal.trim() !== savedLegal;
  const legalOk = !legalChanged || (legalLen >= LEGAL_NAME.min && legalLen <= LEGAL_NAME.max);
  const nameChanged = name.trim() !== savedName;
  const ok = nameOk && legalOk && (isCurrent || nameChanged || legalChanged);

  const save = () =>
    run("save", async () => {
      if (isCurrent) {
        const res = await addBasicDetails(brandId, "BRAND_NAME", { brandName: name.trim() });
        if (legalChanged) await updateBasicDetails(brandId, { legalBusinessName: legal.trim() });
        return res;
      }
      return updateBasicDetails(brandId, {
        ...(nameChanged ? { brandName: name.trim() } : {}),
        ...(legalChanged ? { legalBusinessName: legal.trim() } : {}),
      });
    });

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="What do customers call the brand?"
      intro="The name shown on the app, vouchers and the brand page. The legal name comes from the PAN, GST or owner record; you can correct it here once it's filled."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} disabled={!ok} onClick={save}>{isCurrent ? "Save & continue" : "Save changes"}</PrimaryButton>}
        />
      }
    >
      <Field label="Brand name" hint={`${min}–${max} characters · ${len}/${max}`} error={name && !nameOk ? `${min}–${max} characters` : ""}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cafe Mocha" maxLength={max} autoFocus />
      </Field>
      {savedLegal ? (
        <Field
          label="Legal name"
          hint={`Admin correction only · ${LEGAL_NAME.min}–${LEGAL_NAME.max} characters`}
          error={!legalOk ? `${LEGAL_NAME.min}–${LEGAL_NAME.max} characters` : ""}
        >
          <input className={inputCls} value={legal} maxLength={LEGAL_NAME.max} onChange={(e) => setLegal(e.target.value)} />
        </Field>
      ) : (
        <Note tone="muted">The legal name is filled from the PAN / GST / owner record in the verification steps.</Note>
      )}
    </ScreenShell>
  );
}

/* ---- BUSINESS_CATEGORY -------------------------------------------- */
// One category, then 1..status.limits.maxSubCategories of its
// subcategories. The limit is the server's (Setting); without it the server
// enforces it (422 SUBCATEGORY_LIMIT).
export function BusinessCategoryScreen({ brandId, brand, status, eyebrow, onAdvance, onBack, isCurrent = true }) {
  const maxSubs = Number.isFinite(status.limits.maxSubCategories) ? status.limits.maxSubCategories : null;
  const savedCategory = idOf(brand?.categoryId) || idOf(brand?.category);
  const savedSubs = useMemo(() => (brand?.subCategoryIds || []).map(idOf).filter(Boolean), [brand]);
  const [categoryId, setCategoryId] = useState(savedCategory);
  const [subIds, setSubIds] = useState(savedSubs);
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
  const atLimit = maxSubs != null && subIds.length >= maxSubs;
  const changed = categoryId !== savedCategory || !sameSet(subIds, savedSubs);

  const pickCategory = (id) => {
    if (id === categoryId) return;
    setCategoryId(id);
    setSubIds([]);
    setSearch("");
  };
  const toggleSub = (id) => setSubIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : atLimit ? cur : [...cur, id]));
  // categoryId + subCategoryIds always go together (#27).
  const save = () =>
    run("save", () =>
      isCurrent
        ? addBasicDetails(brandId, "BUSINESS_CATEGORY", { categoryId, subCategoryIds: subIds })
        : updateBasicDetails(brandId, { categoryId, subCategoryIds: subIds })
    );

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
            <PrimaryButton busy={busy === "save"} disabled={!categoryId || !subIds.length || (!isCurrent && !changed)} onClick={save}>
              {isCurrent ? "Save & continue" : "Save changes"}
            </PrimaryButton>
          }
        />
      }
    >
      <Section number={1} title="Category" description="Pick the one that fits best.">
        {categoriesQuery.isPending ? (
          <Loader variant="inline" label="Loading categories…" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <ChoiceChip key={idOf(c)} active={categoryId === idOf(c)} onClick={() => pickCategory(idOf(c))}>
                {c.name}
              </ChoiceChip>
            ))}
          </div>
        )}
      </Section>

      <Section
        number={2}
        title="Subcategories"
        dimmed={!categoryId}
        description={!categoryId ? "Pick a category first." : maxSubs != null ? `Pick up to ${maxSubs}.` : "Pick at least one."}
        badge={categoryId ? <StatusBadge tone={subIds.length ? "ok" : "muted"}>{subIds.length}{maxSubs != null ? ` / ${maxSubs}` : ""} picked</StatusBadge> : null}
      >
        {categoryId && (
          <>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input className={`${inputCls} pl-10`} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subcategories" aria-label="Search subcategories" />
            </div>
            {subsQuery.isPending ? (
              <Loader variant="inline" label="Loading subcategories…" />
            ) : subs.length === 0 ? (
              <p className="m-0 text-[14px] text-neutral-500">{search ? `No subcategory matches “${search}”.` : "This category has no active subcategories. Pick another one."}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subs.map((s) => {
                  const on = subIds.includes(idOf(s));
                  return (
                    <ChoiceChip key={idOf(s)} active={on} disabled={!on && atLimit} onClick={() => toggleSub(idOf(s))}>
                      {s.name}
                    </ChoiceChip>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Section>
    </ScreenShell>
  );
}

/* ---- REGISTRATION_STATUS → kycPath -------------------------------- */
// The vendor's status lock (after PAN / GST is saved) doesn't apply to the
// admin: a back-edit switches the path through update-basic-details. Before
// submit the vendor then lands on the new path's first verification screen;
// leaving the GST path drops the brand's GSTIN (D110).
export function RegistrationStatusScreen({ brandId, status, eyebrow, onAdvance, onBack, isCurrent = true }) {
  const saved = status.kycPath || "";
  const [value, setValue] = useState(saved);
  const { run, busy, error } = useStepAction(onAdvance);
  const switching = !isCurrent && value && value !== saved;
  const leavingGst = switching && saved === "GST";

  const save = () =>
    run("save", () =>
      isCurrent ? addBasicDetails(brandId, "REGISTRATION_STATUS", { kycPath: value }) : updateBasicDetails(brandId, { kycPath: value })
    );

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
            <PrimaryButton busy={busy === "save"} disabled={!value || (!isCurrent && !switching)} onClick={save}>
              {isCurrent ? "Save & continue" : "Switch path"}
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
            title={p.label}
            description={p.description}
            extra={
              <span className="mt-2 rounded-lg bg-neutral-100 px-2 py-1 text-[12px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Next: {p.next}
              </span>
            }
          />
        ))}
      </div>
      {switching && (
        <Note tone="warn">
          Switching {kycPathLabel(saved)} → {kycPathLabel(value)} sends the vendor to the first verification screen of the new path.
          {leavingGst ? " The GSTIN is removed from the brand; coming back to GST needs it verified and saved again." : ""}
        </Note>
      )}
    </ScreenShell>
  );
}

/* ---- REGISTRATION_ENTITY_TYPE (registered paths) ------------------ */
// On the GST path the entity must match the GST constitution: 409
// ENTITY_FROM_GST lists the allowed values in details.acceptedEntityTypes.
export function EntityTypeScreen({ brandId, brand, eyebrow, onAdvance, onBack, isCurrent = true }) {
  const saved = brand?.businessEntityType || "";
  const [value, setValue] = useState(saved);
  const { run, busy, error, errorInfo } = useStepAction(onAdvance);
  const accepted = errorInfo?.code === "ENTITY_FROM_GST" && Array.isArray(errorInfo.details?.acceptedEntityTypes) ? errorInfo.details.acceptedEntityTypes : null;

  const save = () =>
    run("save", () =>
      isCurrent
        ? addBasicDetails(brandId, "REGISTRATION_ENTITY_TYPE", { businessEntityType: value })
        : updateBasicDetails(brandId, { businessEntityType: value })
    );

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="How is the business registered?"
      intro="Choose the type on the GST certificate or company papers."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            <PrimaryButton busy={busy === "save"} disabled={!value || (!isCurrent && value === saved)} onClick={save}>
              {isCurrent ? "Save & continue" : "Save changes"}
            </PrimaryButton>
          }
        />
      }
    >
      {saved && <Note tone="muted">Saved: {entityLabel(saved)}</Note>}
      {accepted && (
        <Note tone="warn">
          The GST record allows: {accepted.length ? accepted.map(entityLabel).join(", ") : "none of these types"}.
        </Note>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {ENTITY_TYPES.map((t) => (
          <RadioCard
            key={t.value}
            name="entity"
            checked={value === t.value}
            onChange={() => setValue(t.value)}
            disabled={Boolean(accepted) && !accepted.includes(t.value)}
            title={t.label}
            description={t.hint}
          />
        ))}
      </div>
    </ScreenShell>
  );
}
