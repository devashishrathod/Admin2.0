import { FlaskConical } from "lucide-react";
import { isMissing } from "../../../utils/helpers";
import { VOUCHER_STATUSES } from "../services/VoucherApi";
import { STATUS_LABELS, STATUS_STYLES } from "../voucherUtils";

export function VoucherStatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES[VOUCHER_STATUSES.DRAFT];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function BrandMark({ voucher, size = "sm" }) {
  const box = size === "sm" ? "h-7 w-7 rounded-lg text-[11px]" : "h-9 w-9 rounded-xl text-[13px]";
  return voucher.brand?.logo ? (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-white p-0.5 ring-1 ring-neutral-200 dark:ring-neutral-800 ${box}`}>
      <img src={voucher.brand.logo} alt={voucher.brandName} className="h-full w-full object-contain" />
    </div>
  ) : (
    <div className={`flex shrink-0 items-center justify-center bg-orange-500 font-semibold text-white ${box}`}>
      {(!isMissing(voucher.brandName) && voucher.brandName?.charAt(0)?.toUpperCase()) || "?"}
    </div>
  );
}

// Purple "Dummy" pill for test/demo vouchers (isDummy) — same look as the
// Brand page's dummy badge.
export function DummyBadge({ size = "md" }) {
  const sm = size === "sm";
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400 ${
        sm ? "bg-violet-500/10 px-1.5 py-0.5 text-[9.5px]" : "bg-white px-2.5 py-1 text-[10.5px] shadow-sm dark:bg-neutral-900"
      }`}
    >
      <FlaskConical size={sm ? 9 : 11} />
      D
    </span>
  );
}
