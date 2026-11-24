import { useState } from "react";
import { Scale, AlertTriangle } from "lucide-react";
import { updateBasicDetails } from "../../onboarding/services/onboardingApi";
import { KYC_PATHS, kycPathLabel, ENTITY_TYPES, entityLabel } from "../../onboarding/onboardingFlow";
import { useCategories } from "../../category/queries/categoryQueries";
import { useSubCategories } from "../../subcategory/queries/subCategoryQueries";
import Loader from "../../../components/common/Loader";
import { Notice } from "../BrandAdminExtras";
import { Field, inputClass } from "../BrandShared";
import { useBrandRaw, useStatusRaw } from "./hooks";
import { V2Card, Btn } from "./shared";
import { v2ErrorText } from "./util";

/* -------------------------------------------------------------------------
 * Legal details, any state (admin guide §6, vendor doc #27):
 * PUT /brands/onboarding/update-basic-details?brandId= — one small form
 * per section, each sending only its own fields:
 *   names (brandName, legalBusinessName — admin only) · business status
 *   (kycPath, sent alone) · entity · category + subcategories (together).
 * Leaving the GST path removes the GSTIN from the brand (D110) — the form
 * asks first. Rules the server still applies: ENTITY_FROM_GST,
 * REGISTRATION_STATUS_LOCKED, SUBCATEGORY_LIMIT, ONBOARDING_SCREEN_MISMATCH.
 * ---------------------------------------------------------------------- */

const LEGAL_MIN = 2;
const LEGAL_MAX = 200;
const rows = (res) => {
  const d = res?.data;
  const list = Array.isArray(d) ? d : d?.data ?? d?.categories ?? d?.subCategories ?? d?.docs ?? [];
  return Array.isArray(list) ? list : [];
};

function Section({ title, children }) {
  return (
    <div className="rounded-2xl bg-white/60 p-3.5 ring-1 ring-neutral-200/60 dark:bg-neutral-950/40 dark:ring-white/5">
      <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      {children}
    </div>
  );
}

/** Shared save button + result line for one section. */
function useSave(brandId) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text }
  const save = async (fields, okText) => {
    setBusy(true);
    setMsg(null);
    try {
      await updateBasicDetails(brandId, fields);
      setMsg({ tone: "ok", text: okText });
      return true;
    } catch (err) {
      const extra = err.code === "ENTITY_FROM_GST" && err.details?.acceptedEntityTypes?.length ? ` Allowed: ${err.details.acceptedEntityTypes.map(entityLabel).join(", ")}.` : "";
      setMsg({ tone: "error", text: `${v2ErrorText(err)}${extra}` });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const line = msg && <Notice tone={msg.tone === "error" ? "error" : undefined}>{msg.text}</Notice>;
  return { busy, save, line };
}

function NamesForm({ brandId, raw, limits }) {
  const [brandName, setBrandName] = useState(raw.brandName || "");
  const [legal, setLegal] = useState(raw.legalBusinessName || "");
  const { busy, save, line } = useSave(brandId);
  const min = limits?.brandNameMinLength ?? 2;
  const max = limits?.brandNameMaxLength ?? 25;
  const b = brandName.trim();
  const l = legal.trim();
  const fields = {};
  if (b !== (raw.brandName || "")) fields.brandName = b;
  if (l !== (raw.legalBusinessName || "")) fields.legalBusinessName = l;
  const bad = (fields.brandName != null && (b.length < min || b.length > max)) || (fields.legalBusinessName != null && (l.length < LEGAL_MIN || l.length > LEGAL_MAX));
  return (
    <Section title="Names">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Brand name (${min}–${max})`}>
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={max + 10} className={inputClass} />
        </Field>
        <Field label={`Legal name (${LEGAL_MIN}–${LEGAL_MAX}, admin only)`}>
          <input value={legal} onChange={(e) => setLegal(e.target.value)} maxLength={LEGAL_MAX + 10} className={inputClass} />
        </Field>
      </div>
      <div className="mt-2.5 flex justify-end">
        <Btn tone="dark" busy={busy} disabled={!Object.keys(fields).length || bad} onClick={() => save(fields, "Names saved.")}>
          Save names
        </Btn>
      </div>
      {line}
    </Section>
  );
}

function PathForm({ brandId, current }) {
  const [kycPath, setKycPath] = useState(current || "");
  const [ack, setAck] = useState(false);
  const { busy, save, line } = useSave(brandId);
  const leavingGst = current === "GST" && kycPath && kycPath !== "GST";
  const changed = kycPath && kycPath !== current;
  return (
    <Section title="Business status (KYC path)">
      <Field label={`Now: ${kycPathLabel(current)}`}>
        <select
          value={kycPath}
          onChange={(e) => {
            setKycPath(e.target.value);
            setAck(false);
          }}
          className={inputClass}
        >
          <option value="" disabled>
            Pick a path
          </option>
          {KYC_PATHS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      {leavingGst && (
        <label className="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2.5 text-[12px] text-amber-800 dark:text-amber-300">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-amber-500" />
          <span>
            <AlertTriangle size={12} className="mr-1 inline" />
            Leaving the GST path removes the GSTIN from this brand (the GST record stays on file). To come back, the GST must be verified and saved again.
          </span>
        </label>
      )}
      <div className="mt-2.5 flex justify-end">
        <Btn tone="dark" busy={busy} disabled={!changed || (leavingGst && !ack)} onClick={() => save({ kycPath }, `Business status set to ${kycPathLabel(kycPath)}.`)}>
          Save status
        </Btn>
      </div>
      {line}
    </Section>
  );
}

function EntityForm({ brandId, current }) {
  const [entity, setEntity] = useState(current || "");
  const { busy, save, line } = useSave(brandId);
  return (
    <Section title="Business entity">
      <Field label={`Now: ${current ? entityLabel(current) : "not set"}`}>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className={inputClass}>
          <option value="" disabled>
            Pick an entity
          </option>
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-2.5 flex justify-end">
        <Btn tone="dark" busy={busy} disabled={!entity || entity === current} onClick={() => save({ businessEntityType: entity }, "Entity saved.")}>
          Save entity
        </Btn>
      </div>
      {line}
    </Section>
  );
}

function CategoryForm({ brandId, raw, maxSub }) {
  const [categoryId, setCategoryId] = useState(raw.category?._id || raw.categoryId || "");
  const [subIds, setSubIds] = useState(() => (raw.subCategoryIds || []).map(String));
  const { busy, save, line } = useSave(brandId);
  const catsQuery = useCategories({ page: 1, limit: 100 }, { select: rows });
  const subsQuery = useSubCategories({ page: 1, limit: 100, categoryId }, { enabled: Boolean(categoryId), select: rows });
  const max = maxSub ?? 3;
  const original = { cat: raw.category?._id || raw.categoryId || "", subs: (raw.subCategoryIds || []).map(String).sort().join(",") };
  const changed = categoryId !== original.cat || [...subIds].sort().join(",") !== original.subs;
  const toggle = (id) => setSubIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= max ? s : [...s, id]));

  return (
    <Section title={`Category + subcategories (max ${max})`}>
      <Field label="Category">
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubIds([]);
          }}
          className={inputClass}
        >
          <option value="" disabled>
            {catsQuery.isPending ? "Loading…" : "Pick a category"}
          </option>
          {(catsQuery.data || []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {subsQuery.isLoading ? (
          <Loader variant="inline" label="Loading subcategories…" />
        ) : (
          (subsQuery.data || []).map((s) => {
            const on = subIds.includes(String(s._id));
            return (
              <button
                key={s._id}
                type="button"
                onClick={() => toggle(String(s._id))}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${on ? "bg-emerald-400/15 text-emerald-700 ring-emerald-400/50 dark:text-emerald-300" : "text-neutral-600 ring-neutral-200 dark:text-neutral-300 dark:ring-neutral-700"}`}
              >
                {s.name}
              </button>
            );
          })
        )}
      </div>
      <div className="mt-2.5 flex justify-end">
        <Btn tone="dark" busy={busy} disabled={!changed || !categoryId || !subIds.length} onClick={() => save({ categoryId, subCategoryIds: subIds }, "Category saved.")}>
          Save category
        </Btn>
      </div>
      {line}
    </Section>
  );
}

export default function LegalBasicsCard({ brandId, readOnly = false }) {
  const rawQuery = useBrandRaw(brandId);
  const statusQuery = useStatusRaw(brandId);
  const raw = rawQuery.data;
  const status = statusQuery.data;

  if (readOnly) return null;
  return (
    <V2Card icon={Scale} tint="violet" title="Legal details" subtitle="Admin can correct these in any state — the vendor is notified after submit">
      {!raw || !status ? (
        <Loader variant="inline" label="Loading legal details…" />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <NamesForm brandId={brandId} raw={raw} limits={status.limits} />
          <PathForm brandId={brandId} current={status.kycPath} />
          {status.kycPath !== "UNREGISTERED" && <EntityForm brandId={brandId} current={raw.businessEntityType} />}
          <CategoryForm brandId={brandId} raw={raw} maxSub={status.limits?.maxSubCategories} />
        </div>
      )}
    </V2Card>
  );
}
