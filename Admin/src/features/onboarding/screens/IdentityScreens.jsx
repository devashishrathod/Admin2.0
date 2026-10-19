import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, Field, RadioCard, Note, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { addBasicDetails } from "../services/onboardingApi";
import { ENTITY_TYPES } from "../onboardingFlow";
import { getSubCategories } from "../../subcategory/services/SubCategoryApi";
import Loader from "../../../components/common/Loader";

/* Design 02–05: business name, category, registration status, entity type.
   All four save through add-basic-details with `step` = this screen. */

/* ---- 02 · BUSINESS_NAME ------------------------------------------- */
export function BusinessNameScreen({ brandId, brand, eyebrow, onAdvance, onBack }) {
  const [legal, setLegal] = useState(brand?.legalBusinessName || "");
  const [name, setName] = useState(brand?.brandName || "");
  const { run, busy, error } = useStepAction(onAdvance);
  const legalOk = legal.trim().length >= 3 && legal.trim().length <= 120;
  const nameOk = !name.trim() || (name.trim().length >= 2 && name.trim().length <= 120);

  const save = () =>
    run("save", () =>
      addBasicDetails(brandId, "BUSINESS_NAME", {
        legalBusinessName: legal.trim(),
        ...(name.trim() ? { brandName: name.trim() } : {}),
      })
    );

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="What is the business called?"
      intro="The legal name goes on invoices and must match the PAN or GST. The brand name is what customers see."
      error={error}
      footer={<StepFooter onBack={onBack} primary={<PrimaryButton busy={busy === "save"} disabled={!legalOk || !nameOk} onClick={save}>Save & continue</PrimaryButton>} />}
    >
      <Field label="Legal business name" hint="As on PAN / GST · 3–120 characters" error={legal && !legalOk ? "3–120 characters" : ""}>
        <input className={inputCls} value={legal} onChange={(e) => setLegal(e.target.value)} placeholder="e.g. Mocha Hospitality Private Limited" maxLength={120} />
      </Field>
      <Field label="Brand name" optional hint="Shown to customers · 2–120 characters" error={!nameOk ? "2–120 characters" : ""}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cafe Mocha" maxLength={120} />
      </Field>
      <Note tone="muted">After the brand is approved, these two names can only be changed by an admin.</Note>
    </ScreenShell>
  );
}

/* ---- 03 · BUSINESS_CATEGORY --------------------------------------- */
export function BusinessCategoryScreen({ brandId, brand, eyebrow, onAdvance, onBack }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(brand?.subCategory?._id || brand?.subCategoryId || "");
  const { run, busy, error } = useStepAction(onAdvance);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getSubCategories({ page: 1, limit: 200, isActive: true });
        const list = res?.data?.data ?? res?.data ?? [];
        if (!cancelled) setSubs(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Grouped by parent category; category is worked out by the server from the subcategory.
  const groups = useMemo(() => {
    const qText = search.trim().toLowerCase();
    const map = new Map();
    subs
      .filter((s) => !qText || `${s.name} ${s.category?.name || ""}`.toLowerCase().includes(qText))
      .forEach((s) => {
        const g = s.category?.name || s.categoryName || "Other";
        if (!map.has(g)) map.set(g, []);
        map.get(g).push(s);
      });
    return [...map.entries()];
  }, [subs, search]);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="What kind of business is it?"
      intro="Pick the one that fits best. Customers find the brand under it, and it decides which licence is suggested in KYC."
      error={error || loadError}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} disabled={!picked} onClick={() => run("save", () => addBasicDetails(brandId, "BUSINESS_CATEGORY", { subCategoryId: picked }))}>Save & continue</PrimaryButton>}
        />
      }
    >
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A9]" />
        <input className={`${inputCls} pl-9`} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cafe, salon, pharmacy…" aria-label="Search categories" />
      </div>
      {loading ? (
        <Loader variant="inline" label="Loading categories…" />
      ) : groups.length === 0 ? (
        <p className="text-[14px] text-[#5B616E]">No category matches “{search}”.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([group, items]) => (
            <div key={group} className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[#5B616E]">{group}</span>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => setPicked(s._id)}
                    aria-pressed={picked === s._id}
                    className={`min-h-10 rounded-full border px-4 text-[14px] font-medium transition ${
                      picked === s._id
                        ? "border-[#0B6E5A] bg-[#0B6E5A] text-white"
                        : "border-[#CFD1CA] bg-white text-[#15171C] hover:border-[#0B6E5A] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Note tone="muted">Can be changed until the brand is approved; after approval only an admin can change it.</Note>
    </ScreenShell>
  );
}

/* ---- 04 · REGISTRATION_STATUS ------------------------------------- */
export function RegistrationStatusScreen({ brandId, brand, status, eyebrow, onAdvance, onBack }) {
  const [value, setValue] = useState(brand?.businessRegistrationStatus || (status.kycPath === "UNREGISTERED" ? "UNREGISTERED" : "REGISTERED"));
  const { run, busy, error } = useStepAction(onAdvance);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Is the business registered?"
      intro="Both are welcome on Trydood. This only decides which documents are asked for next."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} onClick={() => run("save", () => addBasicDetails(brandId, "REGISTRATION_STATUS", { businessRegistrationStatus: value }))}>Save & continue</PrimaryButton>}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <RadioCard
          name="registration"
          checked={value === "REGISTERED"}
          onChange={() => setValue("REGISTERED")}
          title="Registered"
          description="Has a GST number, or is a registered company, LLP, partnership, trust or society."
          extra={<span className="mt-1 text-[12.5px] font-medium text-[#1F4FB8]">Next: entity type → PAN → GST</span>}
        />
        <RadioCard
          name="registration"
          checked={value === "UNREGISTERED"}
          onChange={() => setValue("UNREGISTERED")}
          title="Not registered"
          description="A local shop without GST or company registration. A few simple documents are uploaded instead."
          extra={<span className="mt-1 text-[12.5px] font-medium text-[#1F4FB8]">Next: documents → personal PAN</span>}
        />
      </div>
      <Note tone="info">
        Picked the wrong one? Come back and switch before submitting. If a GST number is already saved, switch to “Not registered” only after correcting the GST.
      </Note>
    </ScreenShell>
  );
}

/* ---- 05 · REGISTRATION_ENTITY_TYPE (registered lane) -------------- */
export function EntityTypeScreen({ brandId, brand, eyebrow, onAdvance, onBack, onGoTo }) {
  const [value, setValue] = useState(brand?.businessEntityType || "");
  const { run, busy, error } = useStepAction(onAdvance);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="How is the business registered?"
      intro="Choose the type that appears on the GST certificate or company papers."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} disabled={!value} onClick={() => run("save", () => addBasicDetails(brandId, "REGISTRATION_ENTITY_TYPE", { businessEntityType: value }))}>Save & continue</PrimaryButton>}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {ENTITY_TYPES.map((t) => (
          <RadioCard key={t.value} name="entity" checked={value === t.value} onChange={() => setValue(t.value)} title={t.label} description={t.hint} />
        ))}
      </div>
      <button type="button" onClick={() => onGoTo("REGISTRATION_STATUS")} className="self-start text-[14px] font-medium text-[#0B6E5A] underline-offset-2 hover:underline">
        Picked “Registered” by mistake? Change registration status
      </button>
    </ScreenShell>
  );
}
