import {
  FileText,
  Hash,
  Layers3,
  UserRound,
  Layers,
  Calendar,
  Clock,
  Lock,
  Users,
  CheckCircle2,
  XCircle,
  Coins,
  History,
  BarChart3,
} from "lucide-react";
import { isMissing, orText, MISSING } from "../../../utils/helpers";
import { DetailCard, InfoRow, FlagChip } from "./DetailsUI";
import { HISTORY_ICONS, HISTORY_COLORS } from "./detailsConstants";

/* Left-column sections of the voucher details page: the voucher's own
 * info (+ category / sub-category), claims & revenue, approval history.
 * Display only — same fields and conditions as before. */

function CategoryTile({ label, details, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
      {details.image ? (
        <img src={details.image} alt={details.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <Icon size={15} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[10.5px] text-neutral-500">{label}</p>
        <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-50">{orText(details.name, MISSING.category)}</p>
      </div>
    </div>
  );
}

export function VoucherInfoCard({ voucher }) {
  return (
    <DetailCard
      icon={FileText}
      tint="emerald"
      title="Voucher details"
      right={
        <div className="flex flex-wrap justify-end gap-1.5">
          <FlagChip on={voucher.isActive}>{voucher.isActive ? "Active" : "Inactive"}</FlagChip>
          {voucher.isDeleted && <FlagChip danger>Deleted</FlagChip>}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <InfoRow icon={Hash} label="Voucher Code" value={voucher.voucherCode} fallback="No code" />
        <InfoRow icon={Layers3} label="Version" value={voucher.versionCode} fallback="No code" />
        <InfoRow icon={UserRound} label="Created By" value={voucher.creator?.role} fallback={MISSING.method} />
        <InfoRow icon={Layers} label="Category" value={[voucher.category, voucher.subCategory].filter((c) => !isMissing(c)).join(" · ")} fallback={MISSING.category} />
        <InfoRow icon={Calendar} label="Created" value={voucher.createdAtDisplay} fallback={MISSING.date} />
        <InfoRow icon={Clock} label="Last Updated" value={voucher.updatedAtDisplay} fallback={MISSING.date} />
        {/* Only shown once the voucher has actually been published —
            no fallback to createdAt, so a DRAFT never shows this. */}
        {voucher.publishedDate && <InfoRow icon={Calendar} label="Published" value={voucher.publishedDate} />}
        <InfoRow icon={Calendar} label="Start Date" value={voucher.startDate} fallback={MISSING.date} />
        <InfoRow icon={Calendar} label="End Date" value={voucher.endDate} fallback="No end date" />
        <InfoRow icon={Lock} label="Immutable" value={voucher.isImmutable ? "Yes — locked from further edits" : "No — still editable"} />
      </div>

      {(voucher.categoryDetails || voucher.subCategoryDetails) && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {voucher.categoryDetails && <CategoryTile label="Category" details={voucher.categoryDetails} icon={Layers} />}
          {voucher.subCategoryDetails && <CategoryTile label="Sub-Category" details={voucher.subCategoryDetails} icon={Layers3} />}
        </div>
      )}

      {voucher.description && (
        <div className="mt-3 rounded-xl border border-neutral-100 p-3.5 dark:border-neutral-800">
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Description</p>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">{voucher.description}</p>
        </div>
      )}
      {voucher.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {voucher.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </DetailCard>
  );
}

// Big headline numbers first, the full breakdown below.
export function ClaimsRevenueCard({ stats }) {
  const claims = stats.claims || {};
  const revenue = stats.revenue || {};
  const money = (n) => `₹${n ?? 0}`;
  const headline = [
    ["Total claims", claims.total ?? 0, "emerald"],
    ["Customer paid", money(revenue.customerPaid), "sky"],
    ["Vendor payable", money(revenue.vendorPayable), "violet"],
  ];
  const tint = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <DetailCard icon={BarChart3} tint="sky" title="Claims & revenue" subtitle={`Amounts in ${stats.currency || "INR"}`}>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {headline.map(([label, value, t]) => (
          <div key={label} className="rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-950/60">
            <p className="truncate text-[10.5px] text-neutral-500">{label}</p>
            <p className={`truncate text-[19px] font-bold leading-tight ${tint[t]}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Claims</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <InfoRow icon={Users} label="Total Claims" value={claims.total ?? 0} />
        <InfoRow icon={Clock} label="Pending" value={claims.pending ?? 0} />
        <InfoRow icon={CheckCircle2} label="Paid" value={claims.paid ?? 0} />
        <InfoRow icon={CheckCircle2} label="Redeemed" value={claims.redeemed ?? 0} />
        <InfoRow icon={XCircle} label="Failed" value={claims.failed ?? 0} />
        <InfoRow icon={XCircle} label="Cancelled" value={claims.cancelled ?? 0} />
        <InfoRow icon={Clock} label="Expired" value={claims.expired ?? 0} />
        <InfoRow icon={XCircle} label="Refunded" value={claims.refunded ?? 0} />
      </div>
      <p className="mb-1.5 mt-3 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Revenue</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <InfoRow icon={Coins} label="Bill Amount" value={money(revenue.billAmount)} />
        <InfoRow icon={Coins} label="Customer Paid" value={money(revenue.customerPaid)} />
        <InfoRow icon={Coins} label="Net Customer Paid" value={money(revenue.netCustomerPaid)} />
        <InfoRow icon={Coins} label="Offer Discount" value={money(revenue.offerDiscount)} />
        <InfoRow icon={Coins} label="Promo Discount" value={money(revenue.promoDiscount)} />
        <InfoRow icon={Coins} label="Convenience Fee" value={money(revenue.convenienceFee)} />
        <InfoRow icon={Coins} label="Tax" value={money(revenue.taxOnTop)} />
        <InfoRow icon={Coins} label="Vendor Payable" value={money(revenue.vendorPayable)} />
        <InfoRow icon={Coins} label="Commission" value={money(revenue.commission)} />
        <InfoRow icon={Coins} label="Refunded" value={money(revenue.refunded)} />
      </div>
    </DetailCard>
  );
}

export function ApprovalHistoryCard({ history }) {
  return (
    <DetailCard icon={History} tint="violet" title="Approval history" subtitle={`${history.length} event${history.length === 1 ? "" : "s"}`}>
      <div>
        {history.map((h, i) => {
          const Icon = HISTORY_ICONS[h.action] || Clock;
          const color = HISTORY_COLORS[h.action] || "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40";
          const isLast = i === history.length - 1;
          return (
            <div key={`${h.action}-${i}`} className={`relative flex gap-3 ${isLast ? "" : "pb-4"}`}>
              {!isLast && <span className="absolute bottom-0 left-[13px] top-7 w-px bg-neutral-200 dark:bg-neutral-800" />}
              <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-neutral-900 ${color}`}>
                <Icon size={13} />
              </span>
              <div className="min-w-0 flex-1 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                  <p className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100">{h.action}</p>
                  <span className="text-[11px] text-neutral-500">{h.date}</span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-neutral-500">
                  {h.by ? (
                    <>
                      by <span className="font-medium text-neutral-700 dark:text-neutral-300">{h.by}</span>
                    </>
                  ) : null}
                  {h.by && h.remarks ? " · " : null}
                  {h.remarks || (!h.by ? "No remarks" : null)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </DetailCard>
  );
}
