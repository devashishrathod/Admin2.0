import { useState } from "react";
import { FileText, IdCard, ExternalLink, Check, X, Plus, Pencil, Upload, Trash2 } from "lucide-react";
import { useKycDocuments } from "../../onboarding/queries/onboardingQueries";
import {
  getKycDocuments,
  addKycDocument,
  updateKycDocument,
  deleteKycDocument,
  reviewKycDocument,
  saveOwnerIdDocument,
} from "../../onboarding/services/onboardingApi";
import { DOC_TYPE_LABELS, docTypeLabel, OWNER_ID_TYPES, DOCUMENT_RULES } from "../../onboarding/onboardingFlow";
import Loader from "../../../components/common/Loader";
import { Modal, ModalActions, Notice } from "../BrandAdminExtras";
import { Field, inputClass } from "../BrandShared";
import { V2Card, Chip, Btn, Count } from "./shared";
import { fmtDateTime, humanize, v2ErrorText, openSignedLink } from "./util";

/* -------------------------------------------------------------------------
 * Owner ID + KYC documents (admin guide §7, #25c / #25d).
 *  - List: GET /brands/onboarding/documents?brandId= (owner ID first).
 *  - Open: the signed `fileUrl` lives a few minutes, so every "Open" reads
 *    the list again and opens the fresh link. It is never shown or logged.
 *  - Review: PUT /brands/admin/onboarding/documents/:id/review — reject
 *    needs a reason (≤ 500, the vendor sees it).
 *  - Business documents: add / rename / replace / delete with ?brandId=.
 *  - The owner ID changes only through owner-verification (a review here
 *    is fine; edit / delete would be 422 OWNER_ID_DOCUMENT).
 * ---------------------------------------------------------------------- */

const REASON_MAX = 500;
const STATUS = {
  UPLOADED: { label: "To check", tone: "amber" },
  ACCEPTED: { label: "Accepted", tone: "emerald" },
  REJECTED: { label: "Rejected", tone: "red" },
};
const ownerIdLabel = (t) => OWNER_ID_TYPES.find((o) => o.value === t)?.label || humanize(t);

function fileProblem(file) {
  if (!file) return "Pick a file.";
  if (!DOCUMENT_RULES.types.test(file.type)) return "Only PDF, JPG or PNG files.";
  if (file.size > DOCUMENT_RULES.maxSizeBytes) return "The file is over 5 MB.";
  return null;
}

const kb = (n) => (n ? `${Math.round(n / 1024)} KB` : null);

/* ---- Modals ------------------------------------------------------------ */

function RejectModal({ doc, onClose, onDone }) {
  const [reason, setReason] = useState(doc.reason || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const trimmed = reason.trim();
  const submit = async () => {
    if (!trimmed) return setError("A reason is required — the vendor sees it.");
    if (trimmed.length > REASON_MAX) return setError(`At most ${REASON_MAX} characters.`);
    setBusy(true);
    setError("");
    try {
      await reviewKycDocument(doc._id, { status: "REJECTED", reason: trimmed });
      onDone("Document rejected — the vendor is told why.");
    } catch (err) {
      setError(v2ErrorText(err));
      setBusy(false);
    }
  };
  return (
    <Modal title="Reject document" subtitle={doc.title || ownerIdLabel(doc.idType)} onClose={onClose}>
      <Field label="Reason (shown to the vendor)" required>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} resize-none`} placeholder="e.g. Aadhaar isn't masked — only the last 4 digits may show." />
      </Field>
      <div className="mt-1 text-right">
        <Count value={reason} max={REASON_MAX} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={submit} submitting={busy} disabled={!trimmed || trimmed.length > REASON_MAX} label="Reject" />
    </Modal>
  );
}

/** Add a business document, or rename / replace one. */
function DocumentFormModal({ brandId, doc, hints, onClose, onDone }) {
  const editing = Boolean(doc);
  const [title, setTitle] = useState(doc?.title || "");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = title.trim();
  const titleBad = t.length < DOCUMENT_RULES.minTitle || t.length > DOCUMENT_RULES.maxTitle;

  const submit = async () => {
    if (titleBad) return setError(`Title: ${DOCUMENT_RULES.minTitle}–${DOCUMENT_RULES.maxTitle} characters.`);
    if (!editing || file) {
      const bad = fileProblem(file);
      if (bad) return setError(bad);
    }
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await updateKycDocument(brandId, doc._id, { title: t !== doc.title ? t : undefined, file: file || undefined });
        onDone(file ? "File replaced — it's back to \"To check\"." : "Document renamed.");
      } else {
        await addKycDocument(brandId, { file, title: t, docType: docType || undefined });
        onDone("Document added.");
      }
    } catch (err) {
      setError(v2ErrorText(err));
      setBusy(false);
    }
  };

  const nothingChanged = editing && !file && t === doc.title;
  return (
    <Modal title={editing ? "Rename / replace document" : "Add business document"} subtitle="PDF, JPG or PNG · max 5 MB · images ≥ 800 px on the short side" onClose={onClose}>
      <div className="space-y-3">
        {!editing && hints?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hints.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setDocType(h);
                  setTitle(DOC_TYPE_LABELS[h] || humanize(h));
                }}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${docType === h ? "bg-emerald-400/15 text-emerald-700 ring-emerald-400/50 dark:text-emerald-300" : "text-neutral-600 ring-neutral-200 dark:text-neutral-300 dark:ring-neutral-700"}`}
              >
                {docTypeLabel(h)}
              </button>
            ))}
          </div>
        )}
        <Field label="Title" required>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!editing) setDocType("");
            }}
            maxLength={DOCUMENT_RULES.maxTitle}
            className={inputClass}
          />
        </Field>
        <Field label={editing ? "New file (optional — replaces the old one)" : "File"} required={!editing}>
          <input type="file" accept={DOCUMENT_RULES.accept} onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-[12.5px] text-neutral-600 dark:text-neutral-300" />
        </Field>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={submit} submitting={busy} disabled={titleBad || nothingChanged || (!editing && !file)} label={editing ? "Save" : "Add"} />
    </Modal>
  );
}

function DeleteModal({ brandId, doc, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteKycDocument(brandId, doc._id);
      onDone("Document deleted.");
    } catch (err) {
      setError(v2ErrorText(err));
      setBusy(false);
    }
  };
  return (
    <Modal title="Delete document?" subtitle={doc.title} onClose={onClose}>
      <p className="text-[12.5px] text-neutral-600 dark:text-neutral-400">It leaves the vendor's list. The record stays on the server for audit.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={submit} submitting={busy} label="Delete" />
    </Modal>
  );
}

/** Owner ID re-upload — only through owner-verification (method ID_DOCUMENT). */
function OwnerIdModal({ brandId, current, onClose, onDone }) {
  const [idType, setIdType] = useState(current?.idType || OWNER_ID_TYPES[0].value);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    const bad = fileProblem(file);
    if (bad) return setError(bad);
    setBusy(true);
    setError("");
    try {
      await saveOwnerIdDocument(brandId, { idType, file });
      onDone("Owner ID uploaded — it's \"To check\" now.");
    } catch (err) {
      setError(v2ErrorText(err));
      setBusy(false);
    }
  };
  return (
    <Modal title="Upload a new owner ID" subtitle="POST /brands/onboarding/owner-verification (ID document)" onClose={onClose}>
      <div className="space-y-3">
        <Field label="ID type" required>
          <select value={idType} onChange={(e) => setIdType(e.target.value)} className={inputClass}>
            {OWNER_ID_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {idType === "AADHAAR" && <p className="text-[12px] text-amber-700 dark:text-amber-300">Aadhaar must be masked — only the last 4 digits may show.</p>}
        <Field label="File" required>
          <input type="file" accept={DOCUMENT_RULES.accept} onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-[12.5px] text-neutral-600 dark:text-neutral-300" />
        </Field>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={submit} submitting={busy} disabled={!file} label="Upload" />
    </Modal>
  );
}

/* ---- Row --------------------------------------------------------------- */

function DocRow({ doc, readOnly, busy, onOpen, onAccept, onReject, onEdit, onDelete, onReplaceOwnerId }) {
  const owner = doc.purpose === "OWNER_ID";
  const st = STATUS[doc.status] || { label: humanize(doc.status), tone: "neutral" };
  const Icon = owner ? IdCard : FileText;
  return (
    <li className="rounded-2xl bg-white/60 p-3 ring-1 ring-neutral-200/60 dark:bg-neutral-950/40 dark:ring-white/5">
      <div className="flex flex-wrap items-start gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${owner ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"}`}>
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{owner ? `Owner ID · ${ownerIdLabel(doc.idType)}` : doc.title || "Untitled"}</p>
            <Chip tone={st.tone}>{st.label}</Chip>
            {!owner && doc.docType && doc.docType !== "OTHER" && <Chip tone="neutral">{docTypeLabel(doc.docType)}</Chip>}
          </div>
          <p className="mt-0.5 text-[11.5px] text-neutral-500">
            {[doc.uploadedByType && `by ${humanize(doc.uploadedByType)}`, fmtDateTime(doc.createdAt), doc.file?.mimeType, kb(doc.file?.sizeBytes), doc.reviewedAt && `reviewed ${fmtDateTime(doc.reviewedAt)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {doc.reason && <p className="mt-1 text-[12px] text-red-700 dark:text-red-300">Reason: {doc.reason}</p>}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Btn onClick={onOpen} title="Opens a fresh signed link in a new tab">
          <ExternalLink size={12} /> Open
        </Btn>
        {!readOnly && (
          <>
            <Btn tone="primary" busy={busy === "ACCEPTED"} disabled={Boolean(busy) || doc.status === "ACCEPTED"} onClick={onAccept}>
              <Check size={12} /> Accept
            </Btn>
            <Btn tone="danger" disabled={Boolean(busy)} onClick={onReject}>
              <X size={12} /> {doc.status === "REJECTED" ? "Edit reason" : "Reject"}
            </Btn>
            {owner ? (
              <Btn disabled={Boolean(busy)} onClick={onReplaceOwnerId} title="Owner ID changes only through owner verification">
                <Upload size={12} /> New owner ID
              </Btn>
            ) : (
              <>
                <Btn disabled={Boolean(busy)} onClick={onEdit}>
                  <Pencil size={12} /> Rename / replace
                </Btn>
                <Btn disabled={Boolean(busy)} onClick={onDelete}>
                  <Trash2 size={12} /> Delete
                </Btn>
              </>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/* ---- Card -------------------------------------------------------------- */

export default function KycDocumentsCard({ brandId, readOnly = false }) {
  const query = useKycDocuments(brandId, { select: (res) => res?.data ?? null });
  const data = query.data;
  const docs = data?.documents ?? [];
  const ordered = [...docs.filter((d) => d.purpose === "OWNER_ID"), ...docs.filter((d) => d.purpose !== "OWNER_ID")];
  const [modal, setModal] = useState(null); // { kind, doc }
  const [busy, setBusy] = useState(null); // { id, action }
  const [notice, setNotice] = useState(null); // { tone, text }

  const done = (text) => {
    setModal(null);
    setNotice({ tone: "ok", text });
  };

  const open = async (doc) => {
    setNotice(null);
    const ok = await openSignedLink(async () => {
      // Fresh list → fresh signed link (the one on screen may have expired).
      const res = await getKycDocuments(brandId);
      return (res?.data?.documents || []).find((d) => d._id === doc._id)?.fileUrl || null;
    });
    if (!ok) {
      setNotice({ tone: "error", text: "Couldn't open the file — it may have been replaced. The list is refreshed." });
      query.refetch();
    }
  };

  const accept = async (doc) => {
    setBusy({ id: doc._id, action: "ACCEPTED" });
    setNotice(null);
    try {
      await reviewKycDocument(doc._id, { status: "ACCEPTED" });
      setNotice({ tone: "ok", text: "Document accepted." });
    } catch (err) {
      setNotice({ tone: "error", text: v2ErrorText(err) });
    } finally {
      setBusy(null);
    }
  };

  const atLimit = data?.limit != null && data?.count != null && data.count >= data.limit;

  return (
    <V2Card
      icon={FileText}
      tint="sky"
      title="Owner ID & KYC documents"
      subtitle={data ? `${data.count ?? 0}/${data.limit ?? "—"} business documents · owner ID not counted` : "GET /brands/onboarding/documents"}
      action={
        !readOnly && (
          <Btn tone="dark" disabled={!data || atLimit} title={atLimit ? "The document limit is reached" : undefined} onClick={() => setModal({ kind: "add" })}>
            <Plus size={12} /> Add document
          </Btn>
        )
      }
    >
      {query.isPending ? (
        <Loader variant="inline" label="Loading documents…" />
      ) : query.error ? (
        <Notice tone="error">{v2ErrorText(query.error)}</Notice>
      ) : ordered.length === 0 ? (
        <p className="text-[12.5px] text-neutral-500">No documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((doc) => (
            <DocRow
              key={doc._id}
              doc={doc}
              readOnly={readOnly}
              busy={busy?.id === doc._id ? busy.action : null}
              onOpen={() => open(doc)}
              onAccept={() => accept(doc)}
              onReject={() => setModal({ kind: "reject", doc })}
              onEdit={() => setModal({ kind: "edit", doc })}
              onDelete={() => setModal({ kind: "delete", doc })}
              onReplaceOwnerId={() => setModal({ kind: "owner", doc })}
            />
          ))}
        </ul>
      )}
      {notice && <Notice tone={notice.tone === "error" ? "error" : undefined}>{notice.text}</Notice>}

      {modal?.kind === "reject" && <RejectModal doc={modal.doc} onClose={() => setModal(null)} onDone={done} />}
      {(modal?.kind === "add" || modal?.kind === "edit") && (
        <DocumentFormModal brandId={brandId} doc={modal.doc} hints={data?.hints} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal?.kind === "delete" && <DeleteModal brandId={brandId} doc={modal.doc} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === "owner" && <OwnerIdModal brandId={brandId} current={modal.doc} onClose={() => setModal(null)} onDone={done} />}
    </V2Card>
  );
}
