import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  ImageOff,
  Image as ImageIcon,
  PencilLine,
  Repeat,
  ScanSearch,
  ShieldCheck,
  Store,
  Ticket,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * StatTile — the KPI tile from Live Vouchers (icon tile + big number +
 * label + hint), shared so Draft Vouchers, Voucher Waiting and Brand
 * Waiting show the same row of cards.
 *
 *   <StatTile icon="voucher" label="Total Drafts" value={12} hint="Not submitted yet" tint="emerald" />
 *
 * `icon` is a preset key (below) or any lucide icon. Pass `onClick` to make
 * it a button (e.g. to filter the list); `active` adds the green ring.
 * ---------------------------------------------------------------------- */

const ICONS = {
  voucher: Ticket,
  draft: PencilLine,
  brand: Store,
  clock: Clock,
  alert: AlertTriangle,
  imageOff: ImageOff,
  banner: ImageIcon,
  shield: ShieldCheck,
  hourglass: Hourglass,
  scan: ScanSearch,
  up: TrendingUp,
  down: TrendingDown,
  repeat: Repeat,
  check: CheckCircle2,
};

const TINTS = {
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export default function StatTile({ icon = "voucher", label, value, hint, tint = "emerald", active = false, onClick }) {
  const Icon = typeof icon === "string" ? ICONS[icon] || Ticket : icon;
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`group flex h-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all dark:bg-neutral-900 dark:shadow-black/20 ${
        onClick ? "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10" : ""
      } ${active ? "ring-2 ring-emerald-400" : ""}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TINTS[tint] || TINTS.emerald}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-[22px] font-bold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">{value}</p>
        <p className="mt-1 truncate text-[11.5px] font-medium text-neutral-500">{label}</p>
        {hint && <p className="truncate text-[10.5px] text-neutral-400">{hint}</p>}
      </div>
    </Wrapper>
  );
}
