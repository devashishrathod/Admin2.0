import { ArrowLeft, Tag, PauseCircle, PlayCircle, Ticket, Store, CheckCircle2, XCircle, Lock, LockOpen } from "lucide-react";
import ValueOr from "../../../components/common/ValueOr";
import { formatBatch, orText } from "../../../utils/helpers";
import { VOUCHER_STATUSES } from "../services/VoucherApi";
import { VoucherStatusBadge, DummyBadge } from "../components/VoucherBadges";
import { heroClass } from "../../brand/BrandDetails/components/bentoStyles";

const STATE_TONES = {
  emerald: "bg-emerald-500 text-white",
  red: "bg-red-500 text-white",
  amber: "bg-amber-400 text-neutral-950",
  sky: "bg-sky-500 text-white",
};

// "Status · Active" — solid icon badge + label / value on a light chip.
function StateChip({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/80 py-2 pl-2 pr-3.5 shadow-sm dark:bg-white/10">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${STATE_TONES[tone]}`}>
        <Icon size={15} />
      </span>
      <div className="leading-tight">
        <p className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
      </div>
    </div>
  );
}

/* Page header: back, cover thumbnail, title + status, code / brand, and
 * the Pause / Resume step (opens the parent's confirm) + Active / Editable
 * rings. Same conditions as before — only the layout changed. */
export default function VoucherDetailsHeader({ voucher, status, readOnly, busy, onBack, onRequestStep }) {
  const cover = voucher.images?.[0]?.url;
  return (
    // Emerald "hero" card — same recipe as the brand Overview's hero.
    <div className={`${heroClass} mb-4 !h-auto`}>
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            onClick={onBack}
            aria-label="Back to vouchers"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15 dark:hover:text-neutral-100"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/5 sm:block dark:bg-neutral-800 dark:ring-white/10">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-neutral-400">
                <Ticket size={18} />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl dark:text-neutral-50">{voucher.title}</h1>
              <VoucherStatusBadge status={status} />
              {voucher.isDummy && <DummyBadge size="sm" />}
              {voucher.isDummy && voucher.dummyBatch && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10.5px] text-violet-600 dark:bg-neutral-800 dark:text-violet-400">
                  {formatBatch(voucher.dummyBatch)}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-neutral-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-mono text-[11px] normal-case text-neutral-700 dark:bg-white/10 dark:text-neutral-300">
                <Tag size={10} /> {orText(voucher.versionCode, "No code")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-neutral-700 dark:bg-white/10 dark:text-neutral-300">
                <Store size={10} /> <ValueOr value={voucher.brandName} fallback="No brand" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pause a live voucher / resume a paused one (API doc #57a/#57b) —
              opens the parent's confirm dialog. */}
          {onRequestStep && !readOnly && status === VOUCHER_STATUSES.PUBLISHED && (
            <button
              onClick={() => onRequestStep("pause")}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-3.5 py-2 text-[12.5px] font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-60 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-300"
            >
              <PauseCircle size={14} /> Pause voucher
            </button>
          )}
          {onRequestStep && !readOnly && status === VOUCHER_STATUSES.PAUSED && (
            <button
              onClick={() => onRequestStep("resume")}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:opacity-60"
            >
              <PlayCircle size={14} /> Resume voucher
            </button>
          )}
          {/* Yes / no facts as chips (a % ring didn't fit "100%" and
              implied a percentage that isn't there). */}
          <StateChip
            icon={voucher.isActive ? CheckCircle2 : XCircle}
            label="Status"
            value={voucher.isActive ? "Active" : "Inactive"}
            tone={voucher.isActive ? "emerald" : "red"}
          />
          <StateChip
            icon={voucher.isImmutable ? Lock : LockOpen}
            label="Editable"
            value={voucher.isImmutable ? "Locked" : "Open"}
            tone={voucher.isImmutable ? "amber" : "sky"}
          />
        </div>
      </div>
    </div>
  );
}
