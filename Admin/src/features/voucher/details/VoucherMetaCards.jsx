import { Store, BadgeCheck, Phone, MapPin, Globe, Layers3, ShieldCheck, Calendar, Clock, Info, Archive } from "lucide-react";
import ValueOr from "../../../components/common/ValueOr";
import { isMissing, orText, MISSING } from "../../../utils/helpers";
import { DetailCard, InfoRow, FlagChip, FactLine } from "./DetailsUI";
import { statusLabel } from "./detailsConstants";

/* Right-column info sections of the voucher details page: brand, attached
 * outlets, parent voucher record, quick facts. Display only. */

export function BrandCard({ brand }) {
  return (
    <DetailCard icon={Store} tint="sky" title="Brand">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-neutral-200 dark:ring-neutral-800">
          {brand.logo ? <img src={brand.logo} alt={brand.name} className="h-full w-full object-contain" /> : <Store size={16} className="text-neutral-500 dark:text-neutral-400" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-neutral-900 dark:text-neutral-50"><ValueOr value={brand.name} fallback="No brand" /></p>
          <p className="truncate text-[11.5px] text-neutral-500"><ValueOr value={brand.legalName} fallback="No legal name" /></p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoRow icon={BadgeCheck} label="Brand ID" value={brand.uniqueId} fallback={MISSING.id} />
        <InfoRow icon={Store} label="Merchant ID" value={brand.merchantId} fallback={MISSING.id} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <FlagChip on={brand.isApproved}>{brand.isApproved ? "Brand Approved" : "Brand Pending Approval"}</FlagChip>
        <FlagChip on={brand.isActive}>{brand.isActive ? "Brand Active" : "Brand Inactive"}</FlagChip>
      </div>
    </DetailCard>
  );
}

export function OutletsCard({ voucher }) {
  return (
    <DetailCard
      icon={MapPin}
      tint="emerald"
      title={`Attached outlets (${voucher.outletCount})`}
      subtitle={`${voucher.liveOutletCount} live of ${voucher.totalBrandOutlets} total brand outlets${voucher.isAppliedOnAllOutlets ? " · Applied on all outlets" : ""}`}
    >
      <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-0.5">
        {voucher.outlets.map((o) => (
          <div key={o.id} className="rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-950/60">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-neutral-800 dark:text-neutral-100">{o.uniqueId}</span>
              <FlagChip on={o.isActive}>{o.isActive ? "Active" : "Inactive"}</FlagChip>
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {o.outletType} · {o.storeId}
            </p>
            {o.address && <p className="mt-1 text-[11.5px] text-neutral-600 dark:text-neutral-400">{o.address}</p>}
            {o.whatsappNumber && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                <Phone size={10} /> {o.whatsappNumber}
              </p>
            )}
          </div>
        ))}
      </div>
    </DetailCard>
  );
}

export function ParentVoucherCard({ parentVoucher }) {
  return (
    <DetailCard
      icon={Archive}
      title="Parent voucher record"
      right={
        <div className="flex flex-wrap justify-end gap-1.5">
          <FlagChip on={parentVoucher.isActive}>{parentVoucher.isActive ? "Active" : "Inactive"}</FlagChip>
          {parentVoucher.isDeleted && <FlagChip danger>Deleted</FlagChip>}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <InfoRow icon={Globe} label="Timezone" value={parentVoucher.timezone} fallback={MISSING.date} />
        <InfoRow icon={Layers3} label="Current Version" value={parentVoucher.currentVersionNumber} fallback={MISSING.id} />
        <InfoRow icon={ShieldCheck} label="Parent Status" value={parentVoucher.status} />
        {/* Date + time — full row width so it fits on one line */}
        <InfoRow icon={Calendar} label="Created" value={parentVoucher.createdAtDisplay} fallback={MISSING.date} wide />
        <InfoRow icon={Clock} label="Last Updated" value={parentVoucher.updatedAtDisplay} fallback={MISSING.date} wide />
      </div>
    </DetailCard>
  );
}

// "At a glance" — sits beside the images at the top of the page.
export function QuickFactsCard({ voucher, status }) {
  return (
    <DetailCard icon={Info} tint="sky" title="At a glance" bodyClass="px-5 pb-3">
      <div className="divide-y divide-neutral-200/70 dark:divide-white/5">
        <FactLine label="Status">{statusLabel(status)}</FactLine>
        <FactLine label="Validity">
          {orText(voucher.startDate, MISSING.date).split(",")[0]} → {orText(voucher.endDate, "No end date").split(",")[0]}
        </FactLine>
        <FactLine label="Offers">{voucher.offers?.length ?? 0}</FactLine>
        {voucher.outletCount != null && <FactLine label="Outlets">{voucher.outletCount}</FactLine>}
        <FactLine label="Voucher code">
          <ValueOr value={voucher.voucherCode} fallback="No code" />
        </FactLine>
        <FactLine label="Vendor">
          <ValueOr value={isMissing(voucher.brand?.name) ? voucher.brandName : voucher.brand.name} fallback="No brand" />
        </FactLine>
        <FactLine label="Version number">
          <ValueOr value={voucher.versionNumber} fallback={MISSING.id} />
        </FactLine>
        <FactLine label="Last updated">
          <ValueOr value={voucher.updatedAtDisplay} fallback={MISSING.date} />
        </FactLine>
      </div>
    </DetailCard>
  );
}
