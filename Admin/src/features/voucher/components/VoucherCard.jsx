import { Ticket, Star, Lock, CalendarDays, Clock, Tag, Trash2, ChevronRight, Rocket, CheckCircle2, XCircle, Images, Layers3, Store } from "lucide-react";
import StatusStepButton from "../../../components/common/StatusStepButton";
import ValueOr from "../../../components/common/ValueOr";
import { orText, MISSING } from "../../../utils/helpers";
import { VOUCHER_STATUSES } from "../services/VoucherApi";
import { STATUS_LABELS, VOUCHER_TONES, TONE_CLASSES, getVoucherStep, validityOf, dateOnly } from "../voucherUtils";
import { VoucherStatusBadge, DummyBadge, BrandMark } from "./VoucherBadges";

/* -------------------------------------------------------------------------
 * VoucherCard — the one voucher card used everywhere vouchers show as
 * cards (Vouchers pages' grid view, a brand's Voucher tab). Takes a row
 * from apiVersionToRow (voucherUtils). Layout:
 *   cover image  — status (workflow button), D badge, ★ suggest / 🔒,
 *                  category + photo count
 *   brand + validity chip, title
 *   ticket       — big discount stub | offer title + terms
 *   dates, code, Delete / View
 *   review bar   — Approve / Reject / Publish (Voucher Waiting only)
 * Every action prop is optional: without onStep the status is a plain
 * badge; without onToggleSuggested / onDelete those buttons are hidden.
 * ---------------------------------------------------------------------- */

const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// "20%" / "₹100" for the ticket stub, from the first offer.
function discountStub(voucher) {
  const offer = voucher.offers?.[0];
  if (!offer || offer.discountValue == null) return { big: "—", small: "No offer" };
  return offer.discountType === "PERCENTAGE"
    ? { big: `${offer.discountValue}%`, small: "Off" }
    : { big: rupees(offer.discountValue), small: "Flat off" };
}

const actionBtn =
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-50";

export default function VoucherCard({
  voucher,
  onOpen,
  onToggleSuggested,
  onDelete,
  onStep,
  onApprove,
  onReject,
  showReviewActions = false,
  busy = false,
}) {
  const cover = voucher.images?.[0]?.url;
  const validity = validityOf(voucher);
  const step = getVoucherStep(voucher);
  const stub = discountStub(voucher);
  const isReview = voucher.approvalStatus === VOUCHER_STATUSES.UNDER_REVIEW;
  const terms = [
    voucher.minBillAmount ? `Min bill ${rupees(voucher.minBillAmount)}` : "No minimum bill",
    voucher.maxDiscountAmount ? `Up to ${rupees(voucher.maxDiscountAmount)} off` : null,
  ].filter(Boolean);
  const offerCount = voucher.offers?.length || 0;
  const open = () => onOpen?.(voucher);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:bg-neutral-900 dark:shadow-black/20 dark:ring-white/5">
      {/* ---- Cover ---- */}
      <div className="relative">
        <button type="button" onClick={open} aria-label={`Open ${voucher.title}`} className="block aspect-[16/8] w-full overflow-hidden">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400/25 via-sky-400/15 to-violet-400/20">
              <Ticket size={32} className="text-emerald-600/60 dark:text-emerald-400/60" />
            </span>
          )}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/25" />
        </button>

        {/* Status = workflow button; plain badge when there's no step
            handler, on Voucher Waiting (it has its own bar) and for D vouchers. */}
        {/* The pills are tinted (10% colour), which vanishes on a busy
            photo — so they sit on a solid chip that reads on any cover. */}
        <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-3.5rem)] flex-wrap items-center gap-1.5">
          <span className="flex rounded-full bg-white shadow-sm shadow-black/20 dark:bg-neutral-900">
            {voucher.isDummy || showReviewActions || !onStep ? (
              <VoucherStatusBadge status={voucher.approvalStatus} />
            ) : (
              <StatusStepButton
                bare
                label={STATUS_LABELS[voucher.approvalStatus] || voucher.approvalStatus}
                tone={VOUCHER_TONES[voucher.approvalStatus]}
                stepLabel={step?.label}
                disabled={busy}
                onClick={() => onStep(voucher, step)}
              />
            )}
          </span>
          {voucher.isDummy && <DummyBadge />}
        </div>

        {voucher.isDummy ? (
          <span
            title="D voucher — view only"
            aria-label="View only"
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-violet-600 backdrop-blur dark:bg-neutral-900/80 dark:text-violet-400"
          >
            <Lock size={14} />
          </span>
        ) : (
          onToggleSuggested && (
            <button
              type="button"
              onClick={() => onToggleSuggested(voucher)}
              disabled={busy}
              aria-label={voucher.isSuggested ? `Remove ${voucher.title} from suggestions` : `Suggest ${voucher.title}`}
              title={voucher.isSuggested ? "Remove from Suggested" : "Mark as Suggested"}
              className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors disabled:opacity-40 ${
                voucher.isSuggested ? "bg-amber-400 text-neutral-950" : "bg-white/90 text-neutral-500 hover:text-amber-500 dark:bg-neutral-900/80"
              }`}
            >
              <Star size={14} fill={voucher.isSuggested ? "currentColor" : "none"} />
            </button>
          )
        )}

        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
          <span className="max-w-[70%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-700 backdrop-blur dark:bg-neutral-900/80 dark:text-neutral-200">
            {orText(voucher.category, MISSING.category)}
            {voucher.subCategory && voucher.subCategory !== "—" ? ` · ${voucher.subCategory}` : ""}
          </span>
          {voucher.images?.length > 1 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              <Images size={10} /> {voucher.images.length}
            </span>
          )}
        </div>
      </div>

      {/* ---- Body ---- */}
      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-1.5 flex items-center gap-2">
          <BrandMark voucher={voucher} />
          <p className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-neutral-500">
            <ValueOr value={voucher.brandName} fallback="No brand" />
          </p>
          {validity && (
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[validity.tone]}`}>
              <Clock size={10} /> {validity.label}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={open}
          title={voucher.title}
          className="mb-3 line-clamp-2 text-left text-[14px] font-semibold leading-snug text-neutral-900 transition-colors hover:text-emerald-600 dark:text-neutral-50 dark:hover:text-emerald-400"
        >
          {voucher.title || "Untitled voucher"}
        </button>

        {/* Ticket: discount stub | offer, with punched notches on the tear line */}
        <div className="relative mb-3 flex overflow-hidden rounded-xl bg-emerald-400/[0.07] ring-1 ring-emerald-400/25">
          <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center bg-emerald-400/15 px-1.5 py-2 text-emerald-700 dark:text-emerald-300">
            <span className="text-[17px] font-extrabold leading-none tracking-tight">{stub.big}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-80">{stub.small}</span>
          </div>
          {/* Offer count (not the offer's own title) + the first offer's terms */}
          <div className="min-w-0 flex-1 border-l border-dashed border-emerald-400/50 px-3 py-2">
            <p className="truncate text-[12.5px] font-bold text-emerald-700 dark:text-emerald-400">
              {offerCount ? `${offerCount} offer${offerCount === 1 ? "" : "s"}` : "No offers"}
            </p>
            {offerCount > 0 && <p className="truncate text-[10.5px] text-neutral-500">{terms.join(" · ")}</p>}
          </div>
          <span className="absolute -top-1.5 left-[4.5rem] h-3 w-3 -translate-x-1/2 rounded-full bg-white dark:bg-neutral-900" />
          <span className="absolute -bottom-1.5 left-[4.5rem] h-3 w-3 -translate-x-1/2 rounded-full bg-white dark:bg-neutral-900" />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-neutral-500">
          <span className="flex min-w-0 items-center gap-1.5">
            <CalendarDays size={12} className="shrink-0" />
            <span className="truncate">
              {dateOnly(voucher.startDate)} – {dateOnly(voucher.endDate, "No end date")}
            </span>
          </span>
          {/* versionNumber + attachedSubBrandsCount from the version record */}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {voucher.versionNumber != null && (
              <span title="Version number" className="inline-flex items-center gap-1 rounded-full bg-violet-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-violet-600 dark:text-violet-400">
                <Layers3 size={10} /> v{voucher.versionNumber}
              </span>
            )}
            <span
              title="Outlets (sub-brands) this voucher is attached to"
              className="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-sky-600 dark:text-sky-400"
            >
              <Store size={10} /> {voucher.attachedSubBrandsCount ?? 0} outlet{(voucher.attachedSubBrandsCount ?? 0) === 1 ? "" : "s"}
            </span>
          </span>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-[10.5px] normal-case text-neutral-400">
            <Tag size={10} className="shrink-0" /> {orText(voucher.versionCode, "No code")}
          </span>
          {onDelete && !voucher.isDummy && (
            <button
              type="button"
              onClick={() => onDelete(voucher)}
              disabled={busy}
              aria-label={`Delete ${voucher.title}`}
              title="Delete"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={open}
            className="flex items-center gap-1 rounded-lg bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
          >
            {isReview ? "Review" : "View"} <ChevronRight size={13} />
          </button>
        </div>

        {/* Voucher Waiting: the next step right on the card */}
        {showReviewActions && !voucher.isDummy && voucher.approvalStatus === VOUCHER_STATUSES.APPROVED && onStep && (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onStep(voucher, step)} disabled={busy} className={`${actionBtn} bg-emerald-400 text-neutral-950 hover:bg-emerald-300`}>
              <Rocket size={14} /> Publish
            </button>
          </div>
        )}
        {showReviewActions && !voucher.isDummy && isReview && onApprove && onReject && (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onApprove(voucher)} disabled={busy} className={`${actionBtn} bg-emerald-400 text-neutral-950 hover:bg-emerald-300`}>
              <CheckCircle2 size={14} /> Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(voucher)}
              disabled={busy}
              className={`${actionBtn} bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400`}
            >
              <XCircle size={14} /> Reject
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
