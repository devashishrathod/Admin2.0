import { useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, SecondaryButton, Field, Note, KeyValue, RadioCard, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { useKycDocuments } from "../queries/onboardingQueries";
import {
  addKycDocument,
  updateKycDocument,
  deleteKycDocument,
  reviewKycDocument,
  continueOnboarding,
  skipOnboardingScreen,
  verifyPan,
  savePan,
  verifyGst,
  saveGst,
  verifyBank,
  saveBank,
  saveOwnerPan,
  saveOwnerIdDocument,
} from "../services/onboardingApi";
import {
  DOC_TYPE_LABELS,
  DOCUMENT_RULES,
  OWNER_ID_TYPES,
  BANK_ACCOUNT_TYPES,
  PAN_RE,
  GST_RE,
  IFSC_RE,
  ACCOUNT_RE,
  docTypeLabel,
  entityLabel,
  errorText,
} from "../onboardingFlow";
import Loader from "../../../components/common/Loader";

const payload = (res) => res?.data ?? res ?? {};

/** Client-side file check (the server checks again). "" when fine. */
function fileProblem(file) {
  if (!file) return "Choose a file.";
  if (file.size > DOCUMENT_RULES.maxSizeBytes) return "Max 5 MB per file.";
  if (!DOCUMENT_RULES.types.test(file.type)) return "PDF, JPG or PNG only.";
  return "";
}

/* ---- KYC_DOCUMENTS ------------------------------------------------- */
// A list of business documents (up to `limit`), each with a title, an
// optional docType (from the category's hints) and a file. ≥1 → continue;
// none → skip. The admin can also accept / reject each one.
const REVIEW_TONE = {
  ACCEPTED: "text-[#08513F] bg-[#E3F1EC]",
  REJECTED: "text-[#7F1D14] bg-[#FDECEA]",
  UPLOADED: "text-[#1F4FB8] bg-[#E8EEFB]",
};

// Uploads, replaces, deletes and reviews are writes under /brands, so the
// list refreshes itself afterwards (shared interceptor).
function DocumentRow({ brandId, doc }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const act = async (key, fn) => {
    setBusy(key);
    setError("");
    try {
      await fn();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const replace = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = fileProblem(file);
    if (problem) return setError(problem);
    act("replace", () => updateKycDocument(brandId, doc._id, { file }));
  };
  const remove = () => {
    if (window.confirm(`Delete “${doc.title}”?`)) act("delete", () => deleteKycDocument(brandId, doc._id));
  };
  const review = async (value) => {
    if (value === "REJECTED" && !reason.trim()) return setError("A reason is required to reject.");
    const ok = await act(value, () => reviewKycDocument(doc._id, value === "REJECTED" ? { status: value, reason: reason.trim() } : { status: value }));
    if (ok) {
      setRejecting(false);
      setReason("");
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[#E2E3DE] p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <FileText size={18} className="mt-0.5 shrink-0 text-[#5B616E]" />
          <div className="min-w-0">
            <p className="m-0 truncate text-[15px] font-semibold text-[#15171C] dark:text-neutral-50">{doc.title}</p>
            <p className="m-0 mt-0.5 truncate text-[12.5px] text-[#5B616E]">
              {[docTypeLabel(doc.docType), doc.file?.originalName, doc.uploadedByType ? `by ${doc.uploadedByType.toLowerCase()}` : ""].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${REVIEW_TONE[doc.status] || REVIEW_TONE.UPLOADED}`}>{doc.status || "UPLOADED"}</span>
      </div>
      {doc.status === "REJECTED" && doc.reason && <Note tone="error">Rejected: {doc.reason}</Note>}

      <div className="flex flex-wrap items-center gap-2">
        {doc.fileUrl && (
          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#CFD1CA] px-3 text-[13.5px] font-medium text-[#0B6E5A] dark:border-neutral-700">
            Open <ExternalLink size={13} />
          </a>
        )}
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#CFD1CA] px-3 text-[13.5px] font-medium hover:bg-[#F5F5F2] dark:border-neutral-700">
          {busy === "replace" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Replace
          <input type="file" accept={DOCUMENT_RULES.accept} onChange={replace} className="hidden" disabled={Boolean(busy)} />
        </label>
        <button type="button" onClick={remove} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[#7F1D14] hover:bg-[#FDECEA] disabled:opacity-50">
          {busy === "delete" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
        </button>
        {doc.status !== "ACCEPTED" && (
          <button type="button" onClick={() => review("ACCEPTED")} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#E3F1EC] px-3 text-[13px] font-semibold text-[#08513F] disabled:opacity-50">
            {busy === "ACCEPTED" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Accept
          </button>
        )}
        {doc.status !== "REJECTED" && !rejecting && (
          <button type="button" onClick={() => setRejecting(true)} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FDECEA] px-3 text-[13px] font-semibold text-[#7F1D14] disabled:opacity-50">
            <XCircle size={13} /> Reject
          </button>
        )}
      </div>
      {rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputCls} h-10 min-w-0 flex-1`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. Photo is not clear" />
          <SecondaryButton onClick={() => setRejecting(false)}>Cancel</SecondaryButton>
          <PrimaryButton tone="dark" busy={busy === "REJECTED"} onClick={() => review("REJECTED")}>Reject</PrimaryButton>
        </div>
      )}
      {error && <p className="m-0 text-[12.5px] text-red-600">{error}</p>}
    </li>
  );
}

function AddDocumentForm({ brandId, hints }) {
  // docType = a hint code, or "" for a custom title (stored as OTHER).
  const [docType, setDocType] = useState(hints[0] || "");
  const [title, setTitle] = useState(hints[0] ? docTypeLabel(hints[0]) : "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleLen = title.trim().length;
  const titleOk = titleLen >= DOCUMENT_RULES.minTitle && titleLen <= DOCUMENT_RULES.maxTitle;

  const pickType = (code) => {
    setDocType(code);
    setTitle(code ? docTypeLabel(code) : "");
  };
  const add = async () => {
    const problem = fileProblem(file);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      await addKycDocument(brandId, { file, title: title.trim(), docType: docType || undefined });
      setFile(null);
      pickType("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const chip = (on) =>
    `min-h-9 rounded-full border px-3.5 text-[13.5px] font-medium transition ${
      on ? "border-[#0B6E5A] bg-[#0B6E5A] text-white" : "border-[#CFD1CA] bg-white hover:border-[#0B6E5A] dark:border-neutral-700 dark:bg-neutral-900"
    }`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#CFD1CA] p-4 dark:border-neutral-700">
      <p className="m-0 text-[15px] font-semibold">Add a document</p>
      <div className="flex flex-wrap gap-2">
        {hints.map((code) => (
          <button key={code} type="button" onClick={() => pickType(code)} aria-pressed={docType === code} className={chip(docType === code)}>
            {docTypeLabel(code)}
          </button>
        ))}
        <button type="button" onClick={() => pickType("")} aria-pressed={!docType} className={chip(!docType)}>
          Something else
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Title" hint={`${DOCUMENT_RULES.minTitle}–${DOCUMENT_RULES.maxTitle} characters`} error={title && !titleOk ? `${DOCUMENT_RULES.minTitle}–${DOCUMENT_RULES.maxTitle} characters` : ""}>
          <input className={inputCls} value={title} maxLength={DOCUMENT_RULES.maxTitle} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. GST certificate" />
        </Field>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#CFD1CA] px-3 text-[13.5px] font-medium hover:bg-[#F5F5F2] dark:border-neutral-700">
          <Upload size={14} /> <span className="max-w-40 truncate">{file ? file.name : "Choose file"}</span>
          <input type="file" accept={DOCUMENT_RULES.accept} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      {error && <Note tone="error">{error}</Note>}
      <div>
        <PrimaryButton tone="dark" busy={busy} disabled={!titleOk || !file} onClick={add}>Upload document</PrimaryButton>
      </div>
    </div>
  );
}

export function KycDocumentsScreen({ brandId, brand, eyebrow, onAdvance, onBack }) {
  // A failed load just shows an empty list (no error).
  const { data: docsRes, isPending: loading } = useKycDocuments(brandId);
  const docsData = docsRes ? payload(docsRes) : {};
  const docs = (docsData.documents || []).filter((d) => d.purpose !== "OWNER_ID");
  const hints = (docsData.hints || []).filter((h) => DOC_TYPE_LABELS[h] && h !== "OTHER");
  const limit = docsData.limit ?? 10;
  const { run, busy, error } = useStepAction(onAdvance);
  const isFood = /food|cafe|restaurant|bakery|sweet/i.test(`${brand?.category?.name || ""} ${brand?.categoryName || ""}`);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Business documents"
      intro="Licences or shop proof help the verification team approve faster. This step can be skipped and filled later."
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
        <Loader variant="inline" label="Loading documents…" />
      ) : (
        <>
          {docs.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {docs.map((d) => <DocumentRow key={d._id} brandId={brandId} doc={d} />)}
            </ul>
          )}
          {docs.length < limit ? <AddDocumentForm brandId={brandId} hints={hints} /> : <Note tone="muted">The limit of {limit} documents is reached.</Note>}
        </>
      )}
      <Note tone="muted">PDF works best. JPG or PNG must be clear (at least 800 px on the short side). Up to 5 MB each.</Note>
      {isFood && <Note tone="warn">Food businesses are required by law to hold an FSSAI registration. Onboarding can continue without it, but add it soon.</Note>}
    </ScreenShell>
  );
}

/* ---- Shared verify-then-save pattern (PAN / GST / bank) ------------ */
// verify-* is paid: only on an explicit press, never retried automatically.
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

/** Result box under a verify button. */
function VerifyResult({ result, children }) {
  if (!result) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E2E3DE] p-4 dark:border-neutral-800">
      <Note tone={result.isVerified ? "ok" : "warn"}>
        {result.isVerified ? "Verified" : "Not verified"}
        {result.message ? ` — ${result.message}` : ""}
        {result.reused ? " · reused an earlier check (no charge)" : ""}
      </Note>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

const PAID_NOTE = "Each check is a paid provider call — verify once, after the number is final.";

/* ---- GST_VERIFICATION (GST path) ---------------------------------- */
export function GstScreen({ brandId, eyebrow, onAdvance, onBack }) {
  const [gst, setGst] = useState("");
  const { result, verifying, verifyError, verify, reset } = useVerify();
  const { run, busy, error } = useStepAction(onAdvance);
  const valid = GST_RE.test(gst);
  const addr = result?.addressOnRecord || result?.details?.address;
  const addrText = typeof addr === "string" ? addr : addr ? [addr.location, addr.city, addr.state, addr.pin].filter(Boolean).join(", ") : "";

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Verify the GST number"
      intro="The GSTIN fills the legal name and decides the tax on Trydood invoices."
      error={error || verifyError}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} disabled={!result?.isVerified || !result?.verificationId} onClick={() => run("save", () => saveGst(brandId, result.verificationId))}>Save & continue</PrimaryButton>}
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
      <VerifyResult result={result}>
        <KeyValue label="Legal name" value={result?.nameOnRecord || result?.details?.legalName} />
        <KeyValue label="Trade name" value={result?.details?.tradeName} />
        <KeyValue label="Constitution" value={result?.constitution} />
        <KeyValue label="Suggested business type" value={entityLabel(result?.suggestedEntity)} />
        <KeyValue label="GST status" value={result?.isActive === false ? "Inactive" : result?.isActive ? "Active" : ""} />
        <KeyValue label="State code" value={result?.gstStateCode || (gst ? gst.slice(0, 2) : "")} />
        <div className="sm:col-span-2"><KeyValue label="Registered address" value={addrText} /></div>
      </VerifyResult>
      <Note tone="muted">{PAID_NOTE} The PAN on the next step must be the one inside this GSTIN.</Note>
    </ScreenShell>
  );
}

/* ---- PAN_VERIFICATION (GST / NO_GST paths) ------------------------ */
export function PanScreen({ brandId, status, eyebrow, onAdvance, onBack }) {
  const [pan, setPan] = useState("");
  const { result, verifying, verifyError, verify, reset } = useVerify();
  const { run, busy, error } = useStepAction(onAdvance);
  const valid = PAN_RE.test(pan);
  const gstPath = status.kycPath === "GST";

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Verify the PAN"
      intro={gstPath ? "Use the PAN inside the GSTIN (characters 3–12)." : "The business PAN, checked with the income-tax records. It fills the legal name."}
      error={error || verifyError}
      footer={
        <StepFooter
          onBack={onBack}
          primary={<PrimaryButton busy={busy === "save"} disabled={!result?.isVerified || !result?.verificationId} onClick={() => run("save", () => savePan(brandId, result.verificationId))}>Save & continue</PrimaryButton>}
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
      <VerifyResult result={result}>
        <KeyValue label="Name on PAN" value={result?.nameOnRecord} />
        <KeyValue label="PAN type" value={result?.panType} />
        <KeyValue label="Suggested business type" value={entityLabel(result?.suggestedEntity)} />
      </VerifyResult>
      <Note tone="muted">{PAID_NOTE} A PAN already used by another brand stops with a clear message.</Note>
    </ScreenShell>
  );
}

/* ---- OWNER_VERIFICATION (not-registered path) --------------------- */
// The owner's personal PAN (verify, then save) or an ID document upload.
export function OwnerVerificationScreen({ brandId, status, eyebrow, onAdvance, onBack }) {
  const [method, setMethod] = useState(status.items.ownerVerificationMethod || "PAN");
  const [pan, setPan] = useState("");
  const [idType, setIdType] = useState(OWNER_ID_TYPES[0].value);
  const [file, setFile] = useState(null);
  const { result, verifying, verifyError, verify, reset } = useVerify();
  const { run, busy, error } = useStepAction(onAdvance);
  const panValid = PAN_RE.test(pan);
  const fileError = file ? fileProblem(file) : "";

  const save = () =>
    method === "PAN"
      ? run("save", () => saveOwnerPan(brandId, result.verificationId))
      : run("save", () => saveOwnerIdDocument(brandId, { idType, file }));
  const ready = method === "PAN" ? Boolean(result?.isVerified && result?.verificationId) : Boolean(file && !fileError);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Verify the owner"
      intro="Not registered is fine — we only need to know who runs the shop. The owner's name becomes the legal name."
      error={error || verifyError}
      footer={<StepFooter onBack={onBack} primary={<PrimaryButton busy={busy === "save"} disabled={!ready} onClick={save}>Save & continue</PrimaryButton>} />}
    >
      {status.items.ownerVerification === "PROVIDED" && (
        <Note tone="ok">Already verified by {String(status.items.ownerVerificationMethod || "").replace("_", " ").toLowerCase() || "the owner"}. Saving again replaces it.</Note>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <RadioCard name="ownerMethod" checked={method === "PAN"} onChange={() => setMethod("PAN")} title="Personal PAN" description="Checked with the income-tax records. Fastest." />
        <RadioCard name="ownerMethod" checked={method === "ID_DOCUMENT"} onChange={() => setMethod("ID_DOCUMENT")} title="Upload an ID" description="Aadhaar (masked), driving licence, passport or voter ID." />
      </div>

      {method === "PAN" ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field label="Owner's PAN" error={pan && !panValid ? "Format: ABCDE1234F" : ""}>
                <input className={`${inputCls} font-mono uppercase`} value={pan} maxLength={10} onChange={(e) => { setPan(e.target.value.toUpperCase().trim()); reset(); }} placeholder="ABCDE1234F" />
              </Field>
            </div>
            <PrimaryButton tone="dark" busy={verifying} disabled={!panValid} onClick={() => verify(() => verifyPan(brandId, pan))}>Verify PAN</PrimaryButton>
          </div>
          <VerifyResult result={result}>
            <KeyValue label="Name on PAN" value={result?.nameOnRecord} />
            <KeyValue label="PAN type" value={result?.panType} />
          </VerifyResult>
          <Note tone="muted">{PAID_NOTE}</Note>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ID type">
            <select className={inputCls} value={idType} onChange={(e) => setIdType(e.target.value)}>
              {OWNER_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="ID file" hint="PDF, or a clear JPG / PNG · max 5 MB" error={fileError}>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#CFD1CA] px-3 text-[13.5px] font-normal hover:bg-[#F5F5F2] dark:border-neutral-700">
              <Upload size={14} /> <span className="truncate">{file ? file.name : "Choose file"}</span>
              <input type="file" accept={DOCUMENT_RULES.accept} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </Field>
          {idType === "AADHAAR" && <div className="sm:col-span-2"><Note tone="warn">Only a masked Aadhaar — just the last 4 digits visible.</Note></div>}
        </div>
      )}
    </ScreenShell>
  );
}

/* ---- BANK_VERIFICATION (skippable) -------------------------------- */
export function BankScreen({ brandId, eyebrow, onAdvance, onBack }) {
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountType, setAccountType] = useState("CURRENT");
  const { result, verifying, verifyError, verify, reset } = useVerify();
  const { run, busy, error } = useStepAction(onAdvance);
  const accountOk = ACCOUNT_RE.test(account);
  const ifscOk = IFSC_RE.test(ifsc);

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Where should we send the money?"
      intro="We send ₹1 to check the account. Customer payments for vouchers are settled here. The name at the bank is matched with the legal name automatically."
      error={error || verifyError}
      footer={
        <StepFooter
          onBack={onBack}
          onSkip={() => run("skip", () => skipOnboardingScreen(brandId, "BANK_VERIFICATION"))}
          skipBusy={busy === "skip"}
          primary={
            <PrimaryButton busy={busy === "save"} disabled={!result?.isVerified || !result?.verificationId} onClick={() => run("save", () => saveBank(brandId, { verificationId: result.verificationId, accountType }))}>
              Save & continue
            </PrimaryButton>
          }
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Account number" error={account && !accountOk ? "9–18 digits" : ""}>
          <input className={`${inputCls} font-mono`} inputMode="numeric" value={account} onChange={(e) => { setAccount(e.target.value.replace(/\D/g, "")); reset(); }} />
        </Field>
        <Field label="IFSC" error={ifsc && !ifscOk ? "Format: HDFC0001234" : ""}>
          <input className={`${inputCls} font-mono uppercase`} maxLength={11} value={ifsc} onChange={(e) => { setIfsc(e.target.value.toUpperCase().trim()); reset(); }} />
        </Field>
        <Field label="Account type">
          <select className={inputCls} value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            {BANK_ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>
      <div>
        <PrimaryButton tone="dark" busy={verifying} disabled={!accountOk || !ifscOk} onClick={() => verify(() => verifyBank(brandId, { accountNumber: account, ifscCode: ifsc }))}>
          Verify account (₹1 test)
        </PrimaryButton>
      </div>
      <VerifyResult result={result}>
        <KeyValue label="Name at bank" value={result?.nameOnRecord} />
        <KeyValue label="Account" value={result?.details?.maskedAccountNumber} mono />
        <KeyValue label="Bank" value={[result?.bankName, result?.branchName].filter(Boolean).join(" · ")} />
      </VerifyResult>
      <Note tone="warn">If skipped, onboarding can still finish, but the brand can't publish vouchers until a verified bank account is added.</Note>
    </ScreenShell>
  );
}
