import { useState } from "react";
import { Landmark, Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { verifyPan, savePan, verifyGst, saveGst, verifyBank, saveBank, saveOwnerPan } from "../../onboarding/services/onboardingApi";
import { PAN_RE, GST_RE, IFSC_RE, ACCOUNT_RE, BANK_ACCOUNT_TYPES } from "../../onboarding/onboardingFlow";
import Loader from "../../../components/common/Loader";
import { Modal, ModalActions, Notice } from "../BrandAdminExtras";
import { Field, inputClass } from "../BrandShared";
import { useBrandRaw, useStatusRaw } from "./hooks";
import { V2Card, Chip, KV, Btn } from "./shared";
import { fmtDateTime, humanize, v2ErrorText } from "./util";

/* -------------------------------------------------------------------------
 * PAN / GST / bank / owner PAN in any state (admin guide §6):
 *   verify-*?brandId=  →  add-*-details?brandId= { verificationId }
 *   (owner: owner-verification { method: PAN, verificationId }).
 *  - Every verify-* is a PAID provider call: a confirm comes first. The
 *    server reuses its own answer for the same value inside the reuse
 *    window — `reused: true` is shown as "already checked, no charge".
 *  - Save sends only the verificationId (+ accountType for bank) — never
 *    provider data or isVerified. A failed check can't be saved.
 *  - The full bank account number is masked; "Show" reveals it on this
 *    block only.
 * ---------------------------------------------------------------------- */

const KINDS = {
  PAN: { label: "PAN", verify: (id, v) => verifyPan(id, v.value), save: (id, r) => savePan(id, r.verificationId) },
  OWNER_PAN: { label: "Owner PAN", verify: (id, v) => verifyPan(id, v.value), save: (id, r) => saveOwnerPan(id, r.verificationId) },
  GST: { label: "GSTIN", verify: (id, v) => verifyGst(id, v.value), save: (id, r) => saveGst(id, r.verificationId) },
  BANK: {
    label: "Bank account",
    verify: (id, v) => verifyBank(id, { accountNumber: v.accountNumber, ifscCode: v.ifscCode }),
    save: (id, r, v) => saveBank(id, { verificationId: r.verificationId, accountType: v.accountType || undefined }),
  },
};

function valueProblem(kind, v) {
  if (kind === "PAN" || kind === "OWNER_PAN") return PAN_RE.test(v.value) ? null : "Enter a valid PAN (ABCDE1234F).";
  if (kind === "GST") return GST_RE.test(v.value) ? null : "Enter a valid GSTIN.";
  if (!ACCOUNT_RE.test(v.accountNumber)) return "Account number: 9–18 digits.";
  if (!IFSC_RE.test(v.ifscCode)) return "Enter a valid IFSC (e.g. HDFC0001234).";
  return null;
}

/** Verify (after a paid-call confirm) → result → save. */
function VerifyFlow({ brandId, kind, initial, onClose }) {
  const k = KINDS[kind];
  const [v, setV] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(null); // "verify" | "save"
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const problem = valueProblem(kind, v);

  const runVerify = async () => {
    setConfirm(false);
    setBusy("verify");
    setError("");
    setResult(null);
    try {
      const res = await k.verify(brandId, v);
      setResult(res?.data ?? null);
    } catch (err) {
      setError(v2ErrorText(err));
    } finally {
      setBusy(null);
    }
  };

  const runSave = async () => {
    setBusy("save");
    setError("");
    try {
      await k.save(brandId, result, v);
      setSaved(true);
    } catch (err) {
      setError(v2ErrorText(err));
    } finally {
      setBusy(null);
    }
  };

  const upper = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.value.toUpperCase().trim() }));

  return (
    <div className="mt-3 rounded-2xl bg-neutral-50 p-3.5 ring-1 ring-neutral-200 dark:bg-neutral-950/60 dark:ring-neutral-800">
      {kind === "BANK" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Account number">
            <input value={v.accountNumber} onChange={(e) => setV((s) => ({ ...s, accountNumber: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className={inputClass} disabled={Boolean(result)} />
          </Field>
          <Field label="IFSC">
            <input value={v.ifscCode} onChange={upper("ifscCode")} className={inputClass} disabled={Boolean(result)} />
          </Field>
          <Field label="Account type">
            <select value={v.accountType} onChange={(e) => setV((s) => ({ ...s, accountType: e.target.value }))} className={inputClass}>
              <option value="">Keep / not set</option>
              {BANK_ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <Field label={k.label}>
          <input value={v.value} onChange={upper("value")} className={`${inputClass} font-mono`} disabled={Boolean(result)} />
        </Field>
      )}

      {result && (
        <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px] ${result.isVerified ? "bg-emerald-400/10 text-emerald-800 dark:text-emerald-300" : "bg-red-500/5 text-red-700 dark:text-red-300"}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            {result.isVerified ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span className="font-semibold">{result.isVerified ? "Verified" : "Not verified"}</span>
            {result.reused ? <Chip tone="emerald">Already checked — no charge</Chip> : <Chip tone="amber">Paid check done</Chip>}
          </div>
          {result.nameOnRecord && <p className="mt-1">Name on record: {result.nameOnRecord}</p>}
          {!result.isVerified && result.message && <p className="mt-1">{result.message}</p>}
          {result.isVerified && kind === "GST" && result.isActive === false && <p className="mt-1">This GSTIN isn't active — the save will be refused.</p>}
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice>Saved. The record below refreshes on its own.</Notice>}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Btn onClick={onClose} disabled={Boolean(busy)}>
          {saved ? "Close" : "Cancel"}
        </Btn>
        {!result && (
          <Btn tone="warn" busy={busy === "verify"} disabled={Boolean(problem)} title={problem || undefined} onClick={() => setConfirm(true)}>
            Verify (paid call)
          </Btn>
        )}
        {result?.isVerified && !saved && (
          <Btn tone="primary" busy={busy === "save"} onClick={runSave}>
            Save {k.label}
          </Btn>
        )}
      </div>
      {problem && !result && <p className="mt-1 text-right text-[11px] text-neutral-500">{problem}</p>}

      {confirm && (
        <Modal title={`Verify ${k.label} — paid call`} subtitle="verify-* goes to the KYC provider" onClose={() => setConfirm(false)}>
          <p className="flex items-start gap-2 rounded-xl bg-amber-400/10 px-3.5 py-2.5 text-[12.5px] text-amber-800 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            This is a paid provider check{kind === "BANK" ? " (₹1 penny drop)" : ""}. If this brand checked the same value inside the reuse window, the server reuses that answer and nothing is charged (shown as "already checked").
          </p>
          <ModalActions onCancel={() => setConfirm(false)} onConfirm={runVerify} label="Verify" />
        </Modal>
      )}
    </div>
  );
}

function RecordBlock({ title, icon: Icon, verified, verifiedAt, children, action }) {
  return (
    <div className="rounded-2xl bg-white/60 p-3.5 ring-1 ring-neutral-200/60 dark:bg-neutral-950/40 dark:ring-white/5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">
          <Icon size={14} className="text-neutral-400" />
          {title}
          {verified != null && <Chip tone={verified ? "emerald" : "neutral"}>{verified ? `Verified ${fmtDateTime(verifiedAt) || ""}` : "Not verified"}</Chip>}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function KycRecordsCard({ brandId, readOnly = false }) {
  const rawQuery = useBrandRaw(brandId);
  const statusQuery = useStatusRaw(brandId);
  const raw = rawQuery.data;
  const status = statusQuery.data;
  const [open, setOpen] = useState(null); // kind being edited
  const [showAccount, setShowAccount] = useState(false);

  if (!raw || !status) {
    return (
      <V2Card icon={ShieldCheck} tint="sky" title="PAN, GST & bank">
        <Loader variant="inline" label="Loading KYC records…" />
      </V2Card>
    );
  }

  const path = status.kycPath;
  const pan = raw.pan && typeof raw.pan === "object" ? raw.pan : null;
  const gst = raw.gst && typeof raw.gst === "object" ? raw.gst : null;
  const bank = raw.bank && typeof raw.bank === "object" ? raw.bank : null;
  const panKind = path === "UNREGISTERED" ? "OWNER_PAN" : "PAN";
  const editBtn = (kind) =>
    !readOnly &&
    open !== kind && (
      <Btn
        onClick={() => {
          setOpen(kind);
        }}
      >
        <Pencil size={12} /> Verify / change
      </Btn>
    );

  return (
    <V2Card icon={ShieldCheck} tint="sky" title="PAN, GST & bank" subtitle="Verify (paid) → save. Saved records come from the server's verify.">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {path === "GST" || gst ? (
          <RecordBlock title="GSTIN" icon={ShieldCheck} verified={gst ? Boolean(gst.isVerified) : null} verifiedAt={gst?.verifiedAt} action={path === "GST" && editBtn("GST")}>
            <div className="grid grid-cols-2 gap-2">
              <KV label="GSTIN" value={gst?.gstNumber} mono />
              <KV label="Legal name" value={gst?.legalName} />
              <KV label="Status" value={humanize(gst?.registrationStatus)} />
              <KV label="State code" value={gst?.stateCode} />
            </div>
            {path !== "GST" && gst && <p className="mt-2 text-[11.5px] text-neutral-500">Not on the GST path — this GSTIN isn't the brand's any more.</p>}
            {open === "GST" && <VerifyFlow brandId={brandId} kind="GST" initial={{ value: gst?.gstNumber || "" }} onClose={() => setOpen(null)} />}
          </RecordBlock>
        ) : null}

        <RecordBlock title={panKind === "OWNER_PAN" ? "Owner PAN" : "PAN"} icon={ShieldCheck} verified={pan ? Boolean(pan.isVerified) : null} verifiedAt={pan?.verifiedAt} action={editBtn(panKind)}>
          <div className="grid grid-cols-2 gap-2">
            <KV label="PAN" value={pan?.pan} mono />
            <KV label="Name" value={pan?.fullName} />
            <KV label="Type" value={humanize(pan?.panType)} />
          </div>
          {panKind === "OWNER_PAN" && <p className="mt-2 text-[11.5px] text-neutral-500">Owner verification by ID document is in "Owner ID & KYC documents".</p>}
          {open === panKind && <VerifyFlow brandId={brandId} kind={panKind} initial={{ value: pan?.pan || "" }} onClose={() => setOpen(null)} />}
        </RecordBlock>

        <RecordBlock title="Bank account" icon={Landmark} verified={bank ? Boolean(bank.isVerified) : null} verifiedAt={bank?.verifiedAt} action={editBtn("BANK")}>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Account number">
              {bank ? (
                <span className="inline-flex items-center gap-1.5 font-mono">
                  {showAccount ? bank.accountNumber || bank.maskedAccountNumber : bank.maskedAccountNumber || (bank.accountLast4Digits ? `•••• ${bank.accountLast4Digits}` : "••••")}
                  {bank.accountNumber && (
                    <button type="button" onClick={() => setShowAccount((s) => !s)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" title={showAccount ? "Hide" : "Show the full number"}>
                      {showAccount ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </span>
              ) : (
                <span className="font-normal text-neutral-400">Not set</span>
              )}
            </KV>
            <KV label="IFSC" value={bank?.ifscCode} mono />
            <KV label="Holder" value={bank?.accountHolderName} />
            <KV label="Type" value={humanize(bank?.accountType)} />
          </div>
          {open === "BANK" && (
            <VerifyFlow brandId={brandId} kind="BANK" initial={{ accountNumber: "", ifscCode: bank?.ifscCode || "", accountType: bank?.accountType || "" }} onClose={() => setOpen(null)} />
          )}
        </RecordBlock>
      </div>
    </V2Card>
  );
}
