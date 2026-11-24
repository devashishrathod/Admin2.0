import { useState } from "react";
import { BadgeCheck, CheckCircle2, CircleDashed, MinusCircle, AlertTriangle } from "lucide-react";
import { useProfileStrength } from "../queries/brandQueries";
import { setVerifiedBadge } from "../services/BrandApi";
import { STRENGTH_LEVELS } from "../brandStage";
import Loader from "../../../components/common/Loader";
import { Modal, ModalActions, Notice } from "../BrandAdminExtras";
import { Field, inputClass } from "../BrandShared";
import { useBrandRaw } from "./hooks";
import { V2Card, Chip, Btn, Count } from "./shared";
import { fmtDateTime, v2ErrorText } from "./util";

/* -------------------------------------------------------------------------
 * Verified badge (admin guide §11, #25i / #25j). A trust badge only — it
 * is NOT approval and changes nothing the brand can do.
 *  - Strength breakdown: GET /brands/profile-strength?brandId= (sections →
 *    items with earned / max, "+N" action, available), badgeEligible,
 *    badgeBlockers — all from the server.
 *  - Grant / remove: PUT /brands/admin/:brandId/verified-badge
 *    { isVerified, note? ≤ 1000 }. 409 BADGE_NOT_ELIGIBLE → the server's
 *    details.badgeBlockers (and score) are shown.
 *  - At risk: the list's `badgeAtRisk`, or the server's STRENGTH_BELOW_75
 *    blocker on a badged brand (strength fell after the grant — the badge
 *    stays, the admin decides).
 * ---------------------------------------------------------------------- */

const NOTE_MAX = 1000;

const BLOCKERS = {
  NOT_APPROVED: "The brand isn't approved.",
  STRENGTH_BELOW_75: "Profile strength is below 75.",
  BANK_NOT_VERIFIED: "The bank account isn't verified.",
  NO_IDENTITY_PROOF: "No identity proof — a verified PAN or an ACCEPTED owner ID.",
};

function Blockers({ codes }) {
  if (!codes?.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {codes.map((c) => (
        <li key={c} className="flex items-start gap-2 text-[12px] text-amber-800 dark:text-amber-300">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {BLOCKERS[c] || c}
        </li>
      ))}
    </ul>
  );
}

function BadgeModal({ brandId, granting, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, blockers, score }
  const tooLong = note.trim().length > NOTE_MAX;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await setVerifiedBadge(brandId, { isVerified: granting, note });
      onDone(granting ? "Verified badge granted." : "Verified badge removed.");
    } catch (err) {
      if (err.code === "BADGE_NOT_ELIGIBLE") {
        const ps = err.details?.profileStrength;
        setError({ text: `Not eligible yet${ps?.score != null ? ` (strength ${ps.score}${ps.level ? `, ${ps.level.toLowerCase()}` : ""})` : ""}:`, blockers: err.details?.badgeBlockers || [] });
      } else {
        setError({ text: v2ErrorText(err) });
      }
      setBusy(false);
    }
  };

  return (
    <Modal
      title={granting ? "Grant the verified badge" : "Remove the verified badge"}
      subtitle="Trust badge only — approval and access stay as they are"
      onClose={onClose}
    >
      <Field label="Note (optional — kept in the history)">
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} resize-none`} placeholder={granting ? "e.g. Documents checked on call" : "e.g. Strength fell, outlet details missing"} />
      </Field>
      <div className="mt-1 text-right">
        <Count value={note} max={NOTE_MAX} />
      </div>
      {error && (
        <div className="mt-3 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-700 dark:text-red-300">
          {error.text}
          <Blockers codes={error.blockers} />
        </div>
      )}
      <ModalActions onCancel={onClose} onConfirm={submit} submitting={busy} disabled={tooLong} label={granting ? "Grant badge" : "Remove badge"} />
    </Modal>
  );
}

export default function BadgeCard({ brand, readOnly = false }) {
  const brandId = brand.id;
  const strengthQuery = useProfileStrength(brandId, { select: (res) => res?.data ?? null });
  const rawQuery = useBrandRaw(brandId);
  const ps = strengthQuery.data;
  const raw = rawQuery.data;
  const isVerified = Boolean(raw?.isVerified ?? ps?.isVerified);
  // The list row's badgeAtRisk, or — on the detail page, where /brands/get
  // has no such flag — the server's own STRENGTH_BELOW_75 blocker.
  const atRisk = isVerified && (Boolean(raw?.badgeAtRisk ?? brand.badgeAtRisk) || (ps?.badgeBlockers || []).includes("STRENGTH_BELOW_75"));
  const level = STRENGTH_LEVELS[ps?.level] || null;
  const [modal, setModal] = useState(null); // "grant" | "remove"
  const [notice, setNotice] = useState("");

  return (
    <V2Card
      icon={BadgeCheck}
      tint="emerald"
      title="Verified badge & profile strength"
      subtitle="Trust badge — separate from approval"
      action={
        !readOnly &&
        ps && (
          <Btn tone={isVerified ? "ghost" : "primary"} onClick={() => setModal(isVerified ? "remove" : "grant")}>
            {isVerified ? "Remove badge" : "Grant badge"}
          </Btn>
        )
      }
    >
      {strengthQuery.isPending ? (
        <Loader variant="inline" label="Loading profile strength…" />
      ) : strengthQuery.error ? (
        <Notice tone="error">{v2ErrorText(strengthQuery.error)}</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={isVerified ? "emerald" : "neutral"}>{isVerified ? "Has the badge" : "No badge"}</Chip>
            {isVerified && raw?.badgeGrantedAt && <Chip tone="neutral">since {fmtDateTime(raw.badgeGrantedAt)}</Chip>}
            {atRisk && (
              <Chip tone="amber" title="Strength fell below 75 after the grant — the badge stays until you decide">
                <AlertTriangle size={11} /> At risk
              </Chip>
            )}
            <Chip tone={level?.tone || "neutral"}>
              Strength {ps?.score ?? "—"}
              {level ? ` · ${level.label}` : ""}
            </Chip>
            {!isVerified && <Chip tone={ps?.badgeEligible ? "emerald" : "amber"}>{ps?.badgeEligible ? "Eligible" : "Not eligible yet"}</Chip>}
          </div>
          {!isVerified && <Blockers codes={ps?.badgeBlockers} />}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {(ps?.sections || []).map((s) => (
              <div key={s.key} className="rounded-2xl bg-white/60 p-3 ring-1 ring-neutral-200/60 dark:bg-neutral-950/40 dark:ring-white/5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">{s.label || s.key}</p>
                  <span className="text-[11.5px] tabular-nums text-neutral-500">
                    {s.earned}/{s.max}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {(s.items || []).map((it) => {
                    const Icon = it.done ? CheckCircle2 : it.available === false ? MinusCircle : CircleDashed;
                    return (
                      <li key={it.key} className="text-[12px]">
                        <div className="flex items-center gap-2">
                          <Icon size={13} className={it.done ? "text-emerald-500" : "text-neutral-400"} />
                          <span className={`min-w-0 flex-1 truncate ${it.available === false ? "text-neutral-400 line-through" : "text-neutral-700 dark:text-neutral-300"}`}>{it.label}</span>
                          <span className="shrink-0 tabular-nums text-neutral-500">
                            {it.earned}/{it.max}
                          </span>
                        </div>
                        {!it.done && it.points > 0 && it.action && (
                          <p className="ml-5 text-[11px] text-emerald-700 dark:text-emerald-400">
                            +{it.points}: {it.action}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-neutral-500">Approval decides if the brand goes live; the badge only shows trust. Reject or revoke removes the badge on its own.</p>
        </>
      )}
      {notice && <Notice>{notice}</Notice>}
      {modal && (
        <BadgeModal
          brandId={brandId}
          granting={modal === "grant"}
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
