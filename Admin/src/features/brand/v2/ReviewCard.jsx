import { useState } from "react";
import { Link } from "react-router-dom";
import { Gavel, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import { reviewBrandVerification } from "../../newOnboarding/services/NewOnboardingApi";
import { useReviewGate, REVIEW_TEXT_MAX, APPROVE_WITHOUT_RESUBMIT } from "../../newOnboarding/reviewGate";
import Loader from "../../../components/common/Loader";
import { Modal, ModalActions, Notice } from "../BrandAdminExtras";
import { Field, inputClass } from "../BrandShared";
import { useStatusRaw } from "./hooks";
import { V2Card, Chip, Btn, Count } from "./shared";
import { approvalState, fmtDateTime, v2ErrorText } from "./util";

/* -------------------------------------------------------------------------
 * Approval on the brand detail (admin guide §10, §13) — one endpoint,
 * PUT /brands/admin/verifications/:brandId/review (#24):
 *  - Approved brand → Revoke, reason required (≤ 1000). Vendor stays on the
 *    dashboard with a banner + remediation; customers stop seeing it;
 *    outlets keep working; the badge goes too.
 *  - Rejected / revoked attempt → Approve stays available, after the
 *    "vendor hasn't resubmitted" confirm; Approve needs the deed (gate).
 *  - Awaiting a decision → decided on Brand Waiting.
 * The state is the server's (status.verification), never the system score.
 * ---------------------------------------------------------------------- */

function DecisionModal({ brandId, kind, onClose, onDone }) {
  const revoking = kind === "revoke";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = text.trim();
  const bad = (revoking && !t) || t.length > REVIEW_TEXT_MAX;

  const submit = async () => {
    if (bad) return setError(revoking ? "A reason is required — the vendor sees it." : `At most ${REVIEW_TEXT_MAX} characters.`);
    setBusy(true);
    setError("");
    try {
      const res = await reviewBrandVerification(brandId, revoking ? { action: "REVOKED", revokeReason: t } : { action: "APPROVED", note: t || undefined });
      const d = res?.data || {};
      onDone(
        `${revoking ? "Approval revoked." : "Brand approved."}${d.badgeRemoved ? " The verified badge was removed too." : ""}${d.isVendorNotified ? " The vendor was told." : ""}`
      );
    } catch (err) {
      setError(v2ErrorText(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={revoking ? "Revoke approval" : "Approve the brand"} subtitle="PUT /brands/admin/verifications/:brandId/review" onClose={onClose}>
      {revoking ? (
        <ul className="mb-3 space-y-1 text-[12.5px] text-neutral-600 dark:text-neutral-400">
          <li>• Customers stop seeing the brand and its vouchers — no new claims.</li>
          <li>• The vendor stays on the dashboard with a banner and can fix every detail, then resubmit.</li>
          <li>• Outlet staff keep working; paid claims and settlements carry on.</li>
          <li>• The verified badge is removed.</li>
        </ul>
      ) : (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700 dark:text-red-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {APPROVE_WITHOUT_RESUBMIT}
        </p>
      )}
      <Field label={revoking ? "Reason (shown to the vendor)" : "Note (optional — kept in the history)"} required={revoking}>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} resize-none`} placeholder={revoking ? "e.g. FSSAI licence expired — upload the renewed one and resubmit." : "e.g. Rejected by mistake — details were fine"} />
      </Field>
      <div className="mt-1 text-right">
        <Count value={text} max={REVIEW_TEXT_MAX} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={submit} submitting={busy} disabled={bad} label={revoking ? "Revoke approval" : "Approve anyway"} />
    </Modal>
  );
}

export default function ReviewCard({ brandId, readOnly = false }) {
  const statusQuery = useStatusRaw(brandId);
  const v = statusQuery.data?.verification ?? null;
  const approval = approvalState(v);
  const closed = Boolean(v?.isRejected || v?.isRevoked) && !v?.isApproved;
  const gate = useReviewGate(
    { id: brandId, submittedAt: v?.submittedAt, waitingChip: v?.isRevoked ? "REVOKED" : v?.isRejected ? "REJECTED" : null },
    { isRejected: v?.isRejected, isRevoked: v?.isRevoked },
    { enabled: closed }
  );
  const [modal, setModal] = useState(null); // "revoke" | "approve"
  const [notice, setNotice] = useState("");

  return (
    <V2Card icon={Gavel} tint={approval.tone === "red" ? "red" : "emerald"} title="Approval" subtitle="The admin's decision — the system score is advice only" action={<Chip tone={approval.tone}>{approval.label}</Chip>}>
      {statusQuery.isPending ? (
        <Loader variant="inline" label="Loading the approval state…" />
      ) : !v ? (
        <Notice tone="error">{v2ErrorText(statusQuery.error) || "No approval data."}</Notice>
      ) : (
        <>
          {(v.revokeReason || v.rejectionReason) && closed && (
            <p className="mb-3 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-700 dark:text-red-300">
              {v.isRevoked ? "Revoke reason" : "Reject reason"}: {v.revokeReason || v.rejectionReason}
            </p>
          )}
          {approval.key === "APPROVED" && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={14} /> Approved{v.isApprovalAcknowledged ? " — the vendor has seen it" : ""}.
              </p>
              {!readOnly && (
                <Btn tone="danger" onClick={() => setModal("revoke")}>
                  <RotateCcw size={12} /> Revoke approval
                </Btn>
              )}
            </div>
          )}
          {closed && (
            <div className="space-y-2">
              <p className="text-[12.5px] text-neutral-600 dark:text-neutral-400">Waiting for the vendor to fix and resubmit. You can still approve now.</p>
              {!readOnly && (
                <Btn tone="primary" disabled={Boolean(gate.approveBlocked)} title={gate.approveBlocked || undefined} onClick={() => setModal("approve")}>
                  <CheckCircle2 size={12} /> Approve
                </Btn>
              )}
              {gate.approveBlocked && <p className="text-[12px] text-amber-700 dark:text-amber-300">{gate.approveBlocked}</p>}
            </div>
          )}
          {approval.key === "PENDING" && (
            <p className="text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Submitted {fmtDateTime(v.submittedAt)} — awaiting your decision.{" "}
              <Link to="/brand-waiting" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                Decide on Brand Waiting
              </Link>
            </p>
          )}
          {approval.key === "NOT_SUBMITTED" && <p className="text-[12.5px] text-neutral-500">The review opens once the vendor submits.</p>}
        </>
      )}
      {notice && <Notice>{notice}</Notice>}
      {modal && (
        <DecisionModal
          brandId={brandId}
          kind={modal}
          onClose={() => setModal(null)}
          onDone={(text) => {
            setModal(null);
            setNotice(text);
          }}
        />
      )}
    </V2Card>
  );
}
