import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getVouchers, getAllVoucherVersions, getVoucherById } from "../services/VoucherApi";

/* Voucher reads, cached. Returns the raw API response; `options` goes to
 * useQuery. Writes refresh ["vouchers"] via the shared interceptor. */

/** One page of vouchers (versions), filtered by `params`. */
export function useVouchers(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.vouchers.list(params),
    queryFn: () => getVouchers(params),
    ...options,
  });
}

/** Every voucher version (all pages) matching `params`. */
export function useAllVoucherVersions(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.vouchers.view("all-versions", params),
    queryFn: () => getAllVoucherVersions(params),
    ...options,
  });
}

export function useVoucher(voucherId, options = {}) {
  return useQuery({
    queryKey: queryKeys.vouchers.detail(voucherId),
    queryFn: () => getVoucherById(voucherId),
    enabled: Boolean(voucherId),
    ...options,
  });
}
