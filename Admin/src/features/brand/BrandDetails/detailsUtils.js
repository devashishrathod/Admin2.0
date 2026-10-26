import { useMemo } from "react";
import { useVouchers } from "../../voucher/queries/voucherQueries";
import { retryUnlessNotFound } from "../queries/brandQueries";
import { isNotFoundMessage } from "../../../utils/helpers";

// Shared by the brand-details tabs.

// "2026-09-24T…" → "24 September 2026"
export const fullDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

export function formatShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const inrAmount = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* This brand's vouchers (first 50), shared by the Listings and Voucher
   tabs — same params, so both read one cache entry. "Not found" just
   means no vouchers yet: shown as the empty state, not an error. */
export function useBrandVoucherList(brandId) {
  const query = useVouchers({ brandId, page: 1, limit: 50 }, { retry: retryUnlessNotFound });
  const vouchers = useMemo(() => query.data?.data?.data ?? [], [query.data]);
  const loadError = query.error?.message ?? "";
  // Server total (may be more than the 50 loaded).
  const total = query.data?.data?.total ?? vouchers.length;
  return {
    vouchers,
    total,
    loading: query.isPending,
    error: isNotFoundMessage(loadError) ? "" : loadError,
    refetch: query.refetch,
  };
}
