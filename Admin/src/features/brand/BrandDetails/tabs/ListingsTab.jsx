import {
  Calendar,
  BadgeCheck,
  Tag,
  Store,
  RefreshCw,
} from "lucide-react";
import { EmptyState } from "../../BrandShared";
import CommonEmptyState from "../../../../components/common/EmptyState";
import Loader from "../../../../components/common/Loader";
import VoucherStatusPill from "../components/VoucherStatusPill";
import { formatShortDate, useBrandVoucherList } from "../detailsUtils";
import ValueOr from "../../../../components/common/ValueOr";
import { MISSING, orText } from "../../../../utils/helpers";

/* Listings tab — shows the real vouchers this brand has created, pulled
   live from GET /vouchers/versions/get-all?brandId=... rather than the
   unused `brand.listings` mock field (no listings endpoint exists yet). */
export default function ListingsTab({ brand }) {
  const { vouchers, loading, error, refetch } = useBrandVoucherList(brand.id);

  if (loading) {
    return (
      <Loader label="Loading vouchers…" />
    );
  }

  if (error) {
    return (
      <CommonEmptyState
        variant="compact"
        tone="error"
        icon="error"
        title="Couldn't load vouchers"
        description={error}
        action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
      />
    );
  }

  if (!vouchers.length) return <EmptyState label="No vouchers created by this brand yet." />;

  return (
    <div className="space-y-3">
      {vouchers.map((v) => {
        const primaryOffer = v.offers?.[0];
        return (
          <div
            key={v._id}
            className="rounded-3xl border border-white/80 bg-white/65 p-4 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{v.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-neutral-500">
                  <Tag size={10} /> <ValueOr value={v.versionCode} fallback="No code" />
                </p>
              </div>
              <VoucherStatusPill status={v.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-neutral-500">
              {primaryOffer && (
                <span className="flex items-center gap-1">
                  <BadgeCheck size={11} />
                  {primaryOffer.discountType === "PERCENTAGE"
                    ? `${primaryOffer.discountValue}% off`
                    : `₹${primaryOffer.discountValue} off`}
                  {v.offers.length > 1 && ` (+${v.offers.length - 1} more)`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {orText(formatShortDate(v.startAt), MISSING.date)} → {orText(formatShortDate(v.endAt), "No end date")}
              </span>
              {v.category?.name && (
                <span className="flex items-center gap-1">
                  <Store size={11} />
                  {v.category.name}
                  {v.subCategory?.name ? ` · ${v.subCategory.name}` : ""}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
