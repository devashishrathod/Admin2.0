import { useState } from "react";
import { ScrollText, ExternalLink, Upload, Clock } from "lucide-react";
import { getOnboardingStatus, recordOfflineDeed } from "../../onboarding/services/onboardingApi";
import { DEED_NOTE, DOCUMENT_RULES } from "../../onboarding/onboardingFlow";
import Loader from "../../../components/common/Loader";
import { Modal, ModalActions, Notice } from "../BrandAdminExtras";
import { Field, inputClass } from "../BrandShared";
import { useBrandRaw, useStatusRaw } from "./hooks";
import { V2Card, Chip, KV, Btn, Count } from "./shared";
import { fmtDateTime, humanize, v2ErrorText, openSignedLink } from "./util";

/* -------------------------------------------------------------------------
 * Partnership deed (admin guide §12, #25g). Read: status.deed (accepted,
 * acceptedByType, mode, version, acceptedAt, isLegacy, hasProof, note,
 * vendorConfirmedAt / Version, requiresDeedConfirmation) + the raw brand's
 * deed (acceptedBy, proof file name). The proof link is signed and short
 * — "Open proof" reads the status again for a fresh one, never shows it.
 * Write: PUT /brands/admin/:brandId/deed — multipart file + note (2–1000),
 * saved as acceptedByType ADMIN, mode OFFLINE; a repeat replaces the proof.
 * The vendor's own acceptance is never replaced (409 DEED_ALREADY_ACCEPTED).
 * ---------------------------------------------------------------------- */

function DeedModal({ brandId, replacing, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const n = note.trim();
  const noteBad = n.length < DEED_NOTE.min || n.length > DEED_NOTE.max;

  const submit = async () => {
    if (!file) return setError("Attach the signed deed copy (PDF, JPG or PNG).");
    if (!DOCUMENT_RULES.types.test(file.type)) return setError("Only PDF, JPG or PNG files.");
    if (file.size > DOCUMENT_RULES.maxSizeBytes) return setError("The file is over 5 MB.");
    if (noteBad) return setError(`Note: ${DEED_NOTE.min}–${DEED_NOTE.max} characters.`);
    setBusy(true);
    setError("");
    try {
      await recordOfflineDeed(brandId, { file, note: n });
      onDone(replacing ? "Deed proof replaced." : "Offline deed recorded — the vendor confirms it at their next login.");
    } catch (err) {
      setError(v2ErrorText(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={replacing ? "Replace deed proof" : "Record offline deed"} subtitle="Signed copy · PDF / JPG / PNG · max 5 MB" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Signed deed copy" required>
          <input type="file" accept={DOCUMENT_RULES.accept} onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-[12.5px] text-neutral-600 dark:text-neutral-300" />
        </Field>
        <Field label="Note — how and when it was signed" required>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={DEED_NOTE.max + 50} className={`${inputClass} resize-none`} placeholder="e.g. Signed at the Indore office on 24 Nov; original with ops." />
        </Field>
        <div className="text-right">
          <Count value={note} max={DEED_NOTE.max} />
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={submit} submitting={busy} disabled={!file || noteBad} label={replacing ? "Replace proof" : "Record deed"} />
    </Modal>
  );
}

export default function DeedCard({ brandId, readOnly = false }) {
  const statusQuery = useStatusRaw(brandId);
  const rawQuery = useBrandRaw(brandId);
  const deed = statusQuery.data?.deed ?? null;
  const rawDeed = rawQuery.data?.deed ?? null;
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState(null);

  const byVendor = deed?.acceptedByType === "VENDOR";
  const canRecord = !readOnly && deed && !byVendor;
  const replacing = deed?.accepted && deed?.acceptedByType === "ADMIN";

  const openProof = async () => {
    setNotice(null);
    const ok = await openSignedLink(async () => {
      const res = await getOnboardingStatus(brandId);
      return res?.data?.deed?.proofUrl || null;
    });
    if (!ok) setNotice({ tone: "error", text: "Couldn't open the proof — try again." });
  };

  let who = null;
  if (deed?.accepted) {
    who = byVendor ? "Vendor (in the panel)" : deed.acceptedByType === "ADMIN" ? "Admin (offline)" : humanize(deed.acceptedByType);
    if (rawDeed?.acceptedBy) who += ` · …${String(rawDeed.acceptedBy).slice(-6)}`;
  }

  return (
    <V2Card
      icon={ScrollText}
      tint="violet"
      title="Partnership deed"
      subtitle="Needed to approve: the vendor's own acceptance, or an offline deed with proof"
      action={
        canRecord && (
          <Btn tone={replacing ? "ghost" : "dark"} onClick={() => setModal(true)}>
            <Upload size={12} /> {replacing ? "Replace proof" : "Record offline deed"}
          </Btn>
        )
      }
    >
      {statusQuery.isPending ? (
        <Loader variant="inline" label="Loading the deed…" />
      ) : !deed ? (
        <Notice tone="error">{v2ErrorText(statusQuery.error) || "No deed data."}</Notice>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <Chip tone={deed.accepted ? "emerald" : "amber"}>{deed.accepted ? "Accepted" : "Not accepted"}</Chip>
            {deed.isLegacy && <Chip tone="neutral">Legacy record</Chip>}
            {deed.requiresDeedConfirmation && (
              <Chip tone="amber" title="The vendor sees a blocking popup at login">
                <Clock size={11} /> Waiting for the vendor's confirm
              </Chip>
            )}
            {deed.vendorConfirmedAt && <Chip tone="emerald">Vendor confirmed</Chip>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KV label="Who" value={who} empty="—" />
            <KV label="When" value={fmtDateTime(deed.acceptedAt)} empty={deed.isLegacy ? "Legacy (no date)" : "—"} />
            <KV label="Mode" value={humanize(deed.mode)} empty="—" />
            <KV label="Version" value={deed.version} empty="—" />
            <KV label="Vendor confirmed" value={deed.vendorConfirmedAt ? `${fmtDateTime(deed.vendorConfirmedAt)}${deed.vendorConfirmedVersion ? ` · ${deed.vendorConfirmedVersion}` : ""}` : null} empty={deed.acceptedByType === "ADMIN" ? "Not yet" : "—"} />
            <KV label="Proof">
              {deed.hasProof ? (
                <button type="button" onClick={openProof} className="inline-flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400" title="Opens a fresh signed link">
                  <ExternalLink size={12} /> {rawDeed?.proofDocument?.originalName || "Open proof"}
                </button>
              ) : (
                <span className="font-normal text-neutral-400">{byVendor ? "Not needed" : "None"}</span>
              )}
            </KV>
          </div>
          {deed.note && <p className="mt-3 rounded-xl bg-neutral-100/80 px-3 py-2 text-[12px] text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">Note: {deed.note}</p>}
          {byVendor && <p className="mt-3 text-[12px] text-neutral-500">The vendor accepted the deed themselves — that acceptance is never replaced.</p>}
          {deed.acceptedByType === "ADMIN" && !deed.vendorConfirmedAt && (
            <p className="mt-3 text-[12px] text-neutral-500">The deed's 5 profile-strength points come once the vendor confirms. Approval doesn't wait for it.</p>
          )}
        </>
      )}
      {notice && <Notice tone={notice.tone === "error" ? "error" : undefined}>{notice.text}</Notice>}
      {modal && (
        <DeedModal
          brandId={brandId}
          replacing={replacing}
          onClose={() => setModal(false)}
          onDone={(text) => {
            setModal(false);
            setNotice({ tone: "ok", text });
          }}
        />
      )}
    </V2Card>
  );
}
