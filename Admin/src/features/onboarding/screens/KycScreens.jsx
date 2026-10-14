import { useCallback, useEffect, useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, SecondaryButton, Field, Note, KeyValue, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import {
  getKycDocuments,
  uploadKycDocument,
  reviewKycDocument,
  continueOnboarding,
  skipOnboardingScreen,
  verifyPan,
  savePan,
  verifyGst,
  saveGst,
  verifyBank,
  saveBank,
} from "../services/onboardingApi";
import { DOC_SLOTS, PAN_RE, GST_RE, IFSC_RE, ACCOUNT_RE, errorText } from "../onboardingFlow";

const payload = (res) => res?.data ?? res ?? {};

/* ---- 06 · KYC_DOCUMENTS (unregistered lane) ----------------------- */
// Up to 3 documents, one per slot; uploading into a filled slot replaces it.
// ≥1 document → continue; 0 → skip. The admin can also accept / reject each.
const MAX_BYTES = 5 * 1024 * 1024;

function DocSlot({ brandId, slotDef, doc, hint, onChanged }) {
  const [docType, setDocType] = useState(doc?.docType || slotDef.types[0][0]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("Max 5 MB per file.");
    if (!/pdf|jpe?g|png/i.test(file.type)) return setError("PDF, JPG or PNG only.");
    setBusy("upload");
    setError("");
    try {
      await uploadKycDocument(brandId, { file, slot: slotDef.slot, docType });
      await onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const review = async (statusValue) => {
    if (statusValue === "REJECTED" && !reason.trim()) return setError("A reason is required to reject.");
    setBusy(statusValue);
    setError("");
    try {
      await reviewKycDocument(doc._id || doc.id, statusValue === "REJECTED" ? { status: statusValue, reason: reason.trim() } : { status: statusValue });
      setRejecting(false);
      setReason("");
      await onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const reviewTone = { ACCEPTED: "text-[#08513F] bg-[#E3F1EC]", REJECTED: "text-[#7F1D14] bg-[#FDECEA]", UPLOADED: "text-[#1F4FB8] bg-[#E8EEFB]" }[doc?.status] || "text-[#1F4FB8] bg-[#E8EEFB]";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E2E3DE] p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[15px] font-semibold text-[#15171C] dark:text-neutral-50">{slotDef.title}</p>
          <p className="m-0 mt-0.5 text-[13px] text-[#5B616E]">{slotDef.hint}</p>
          {hint && <p className="m-0 mt-1 text-[12.5px] font-medium text-[#1F4FB8]">Suggested: {hint}</p>}
        </div>
        {doc && <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${reviewTone}`}>{doc.status || "Uploaded"}</span>}
      </div>

      {doc && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#F7F9F8] px-3 py-2 text-[13px] dark:bg-neutral-950">
          <FileText size={15} className="text-[#5B616E]" />
          <span className="min-w-0 flex-1 truncate">{doc.originalName || doc.fileName || doc.docType}</span>
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#0B6E5A]">
              Open <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
      {doc?.status === "REJECTED" && doc.reason && <Note tone="error">Rejected: {doc.reason}</Note>}

      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputCls} h-10 w-auto min-w-48`} value={docType} onChange={(e) => setDocType(e.target.value)} aria-label={`${slotDef.title} document type`}>
          {slotDef.types.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#CFD1CA] px-3 text-[13.5px] font-medium hover:bg-[#F5F5F2] dark:border-neutral-700">
          {busy === "upload" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {doc ? "Replace" : "Upload"}
          <input type="file" accept=".pdf,image/jpeg,image/png" onChange={upload} className="hidden" disabled={Boolean(busy)} />
        </label>
        {doc && doc.status !== "ACCEPTED" && (
          <button type="button" onClick={() => review("ACCEPTED")} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#E3F1EC] px-3 text-[13px] font-semibold text-[#08513F] disabled:opacity-50">
            {busy === "ACCEPTED" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Accept
          </button>
        )}
        {doc && doc.status !== "REJECTED" && !rejecting && (
          <button type="button" onClick={() => setRejecting(true)} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FDECEA] px-3 text-[13px] font-semibold text-[#7F1D14] disabled:opacity-50">
            <XCircle size={13} /> Reject
          </button>
        )}
      </div>
      {rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputCls} h-10 min-w-0 flex-1`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. Photo saaf nahi hai" />
          <SecondaryButton onClick={() => setRejecting(false)}>Cancel</SecondaryButton>
          <PrimaryButton tone="dark" busy={busy === "REJECTED"} onClick={() => review("REJECTED")}>Reject</PrimaryButton>
        </div>
      )}
      {error && <p className="m-0 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}

export function KycDocumentsScreen({ brandId, brand, eyebrow, onAdvance, onBack }) {
  const [docs, setDocs] = useState([]);
  const [slotHint, setSlotHint] = useState(null);
  const [loading, setLoading] = useState(true);
  const { run, busy, error } = useStepAction(onAdvance);

  const fetchDocs = useCallback(
    () =>
      getKycDocuments(brandId)
        .then(payload)
        .catch(() => ({})),
    [brandId]
  );
  const apply = (res) => {
    setDocs(res.documents || []);
    setSlotHint(res.slotHint || null);
    setLoading(false);
  };
  const load = async () => apply(await fetchDocs());
  useEffect(() => {
    let cancelled = false;
    fetchDocs().then((res) => {
      if (cancelled) return;
      setDocs(res.documents || []);
      setSlotHint(res.slotHint || null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchDocs]);

  const bySlot = (slot) => docs.filter((d) => d.slot === slot && !d.isReplaced).slice(-1)[0];
  const isFood = /food|cafe|restaurant|bakery|sweet/i.test(`${brand?.category?.name || ""} ${brand?.subCategory?.name || ""}`);
  const licenceHint = typeof slotHint === "string" ? slotHint : slotHint?.BUSINESS_LICENSE || slotHint?.label || null;

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Help us verify the shop"
      intro="Upload up to 3 documents, one in each box. More documents mean faster approval and a stronger profile. This step can be skipped and filled later."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          onSkip={() => run("skip", () => skipOnboardingScreen(brandId, "KYC_DOCUMENTS"))}
          skipBusy={busy === "skip"}
          primary={<PrimaryButton busy={busy === "continue"} disabled={!docs.length} onClick={() => run("continue", () => continueOnboarding(brandId))}>Continue</PrimaryButton>}
        />
      }
    >
      {loading ? (
        <p className="flex items-center gap-2 text-[14px] text-[#5B616E]"><Loader2 size={15} className="animate-spin" /> Loading documents…</p>
      ) : (
        DOC_SLOTS.map((s) => (
          <DocSlot key={s.slot} brandId={brandId} slotDef={s} doc={bySlot(s.slot)} hint={s.slot === "BUSINESS_LICENSE" ? licenceHint : null} onChanged={load} />
        ))
      )}
      <Note tone="muted">PDF works best. JPG or PNG must be clear (at least 800 px on the short side). Up to 5 MB each.</Note>
      {isFood && <Note tone="warn">Food businesses are required by law to hold an FSSAI registration. Onboarding can continue without it, but add it soon.</Note>}
    </ScreenShell>
  );
}

/* ---- Shared verify-then-save pattern (PAN / GST / bank) ------------ */
function useVerify() {
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const verify = async (fn) => {
    setVerifying(true);
    setError("");
    setResult(null);
    try {
      setResult(payload(await fn()));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setVerifying(false);
    }
  };
  return { result, verifying, verifyError: error, verify, reset: () => setResult(null) };
}

/* ---- 07 · PAN_VERIFICATION ---------------------------------------- */
export function PanScreen({ brandId, brand, status, eyebrow, onAdvance, onBack, onGoTo }) {
  const [pan, setPan] = useState(brand?.pan?.pan || "");
  const { result, verifying, verifyError, verify, reset } = useVerify();
  const { run, busy, error } = useStepAction(onAdvance);
  const valid = PAN_RE.test(pan);
  const unregistered = status.kycPath === "UNREGISTERED";
  const mismatch = (result?.warnings || []).some((w) => (w.code || w) === "PAN_ENTITY_MISMATCH");

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Verify the PAN"
      intro={unregistered ? "Not registered? Use the owner's personal PAN — that's fine." : "We check the PAN with the income-tax records."}
      error={error || verifyError}
      footer={
        <StepFooter
          onBack={onBack}
          onSkip={() => run("skip", () => skipOnboardingScreen(brandId, "PAN_VERIFICATION"))}
          skipBusy={busy === "skip"}
          primary={<PrimaryButton busy={busy === "save"} disabled={!result?.verificationId} onClick={() => run("save", () => savePan(brandId, result.verificationId))}>Save & continue</PrimaryButton>}
        />
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="PAN number" error={pan && !valid ? "Format: ABCDE1234F" : ""}>
            <input className={`${inputCls} font-mono uppercase`} value={pan} maxLength={10} onChange={(e) => { setPan(e.target.value.toUpperCase().trim()); reset(); }} placeholder="ABCDE1234F" />
          </Field>
        </div>
        <PrimaryButton tone="dark" busy={verifying} disabled={!valid} onClick={() => verify(() => verifyPan(brandId, pan))}>Verify PAN</PrimaryButton>
      </div>
      {result && (
        <div className="grid gap-4 rounded-xl border border-[#E2E3DE] p-4 sm:grid-cols-2 dark:border-neutral-800">
          <KeyValue label="Name on PAN" value={result.nameOnRecord} />
          <KeyValue label="PAN type" value={result.panType} />
          <KeyValue label="Result" value={result.isVerified ? "Verified" : "Not verified"} />
        </div>
      )}
      {mismatch && (
        <Note tone="warn">
          <p className="m-0">This PAN's type doesn't match the selected entity type. It won't block onboarding.</p>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={() => onGoTo("REGISTRATION_ENTITY_TYPE")} className="font-semibold underline">Change entity type</button>
            <span>or save to continue anyway</span>
          </div>
        </Note>
      )}
      <Note tone="muted">If this PAN is already used by another brand on Trydood, verification stops with a clear message.</Note>
    </ScreenShell>
  );
}

/* ---- 08 · GST_VERIFICATION (registered lane) ---------------------- */
export function GstScreen({ brandId, brand, eyebrow, onAdvance, onBack }) {
  const [gst, setGst] = useState(brand?.gst?.gstNumber || "");
  const { result, verifying, verifyError, verify, reset } = useVerify();
  const { run, busy, error } = useStepAction(onAdvance);
  const valid = GST_RE.test(gst);
  const addr = result?.addressOnRecord;
  const addrText = typeof addr === "string" ? addr : addr ? [addr.location, addr.city, addr.state, addr.pin].filter(Boolean).join(", ") : "";

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Verify the GST number"
      intro="The GSTIN decides the tax on Trydood invoices. It can be skipped and added later from the profile."
      error={error || verifyError}
      footer={
        <StepFooter
          onBack={onBack}
          onSkip={() => run("skip", () => skipOnboardingScreen(brandId, "GST_VERIFICATION"))}
          skipBusy={busy === "skip"}
          primary={<PrimaryButton busy={busy === "save"} disabled={!result?.verificationId} onClick={() => run("save", () => saveGst(brandId, result.verificationId))}>Save & continue</PrimaryButton>}
        />
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="GSTIN" error={gst && !valid ? "15-character GSTIN, e.g. 27AABCM1234K1Z5" : ""}>
            <input className={`${inputCls} font-mono uppercase`} value={gst} maxLength={15} onChange={(e) => { setGst(e.target.value.toUpperCase().trim()); reset(); }} placeholder="27AABCM1234K1Z5" />
          </Field>
        </div>
        <PrimaryButton tone="dark" busy={verifying} disabled={!valid} onClick={() => verify(() => verifyGst(brandId, gst))}>Verify GST</PrimaryButton>
      </div>
      {result && (
        <div className="grid gap-4 rounded-xl border border-[#E2E3DE] p-4 sm:grid-cols-2 dark:border-neutral-800">
          <KeyValue label="Legal name" value={result.nameOnRecord || result.legalName} />
          <KeyValue label="Trade name" value={result.tradeName} />
          <KeyValue label="Constitution" value={result.constitutionOfBusiness} />
          <KeyValue label="State" value={result.state || (gst ? `State code ${gst.slice(0, 2)}` : "")} />
          <div className="sm:col-span-2"><KeyValue label="Registered address" value={addrText} /></div>
        </div>
      )}
      {valid && <Note tone="info">The billing address (next steps) must be in the same state as this GSTIN (state code {gst.slice(0, 2)}).</Note>}
    </ScreenShell>
  );
}

/* ---- 09 · BANK_VERIFICATION --------------------------------------- */
export function BankScreen({ brandId, brand, eyebrow, onAdvance, onBack }) {
  const [holder, setHolder] = useState(brand?.bank?.accountHolderName || brand?.legalBusinessName || "");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const { result, verifying, verifyError, verify, reset } = useVerify();
  const { run, busy, error } = useStepAction(onAdvance);
  const accountOk = ACCOUNT_RE.test(account);
  const ifscOk = IFSC_RE.test(ifsc);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Where should we send the money?"
      intro="We send ₹1 to check the account belongs to the business. Customer payments for vouchers are settled here."
      error={error || verifyError}
      footer={
        <StepFooter
          onBack={onBack}
          onSkip={() => run("skip", () => skipOnboardingScreen(brandId, "BANK_VERIFICATION"))}
          skipBusy={busy === "skip"}
          primary={<PrimaryButton busy={busy === "save"} disabled={!result?.verificationId} onClick={() => run("save", () => saveBank(brandId, result.verificationId))}>Save & continue</PrimaryButton>}
        />
      }
    >
      <Field label="Account holder name" hint="Used for the name match">
        <input className={inputCls} value={holder} onChange={(e) => { setHolder(e.target.value); reset(); }} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account number" error={account && !accountOk ? "9–18 digits" : ""}>
          <input className={`${inputCls} font-mono`} inputMode="numeric" value={account} onChange={(e) => { setAccount(e.target.value.replace(/\D/g, "")); reset(); }} />
        </Field>
        <Field label="IFSC" error={ifsc && !ifscOk ? "Format: HDFC0001234" : ""}>
          <input className={`${inputCls} font-mono uppercase`} maxLength={11} value={ifsc} onChange={(e) => { setIfsc(e.target.value.toUpperCase().trim()); reset(); }} />
        </Field>
      </div>
      <div>
        <PrimaryButton
          tone="dark"
          busy={verifying}
          disabled={!accountOk || !ifscOk}
          onClick={() => verify(() => verifyBank(brandId, { accountNumber: account, ifscCode: ifsc, beneficiaryName: holder.trim().length >= 3 ? holder.trim() : undefined }))}
        >
          Verify account (₹1 test)
        </PrimaryButton>
      </div>
      {result && (
        <Note tone={result.isVerified ? "ok" : "warn"}>
          {result.isVerified ? "Account verified." : "Account could not be verified."} Name at bank: <strong>{result.nameOnRecord || "—"}</strong>
        </Note>
      )}
      <Note tone="warn">If skipped, onboarding can still finish, but the brand can't publish vouchers until a verified bank account is added.</Note>
    </ScreenShell>
  );
}
