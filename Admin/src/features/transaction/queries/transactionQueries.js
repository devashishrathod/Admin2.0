import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import {
  getVoucherClaimPayments,
  getAllVoucherClaimPayments,
  getVoucherClaimById,
} from "../services/TransactionApi";

/* Transaction (voucher-claim) reads, cached under ["voucher-claims"].
 * Returns the raw API response; `options` goes to useQuery. Refund,
 * settlement and /transactions writes refresh these too (RELATED_RESOURCES). */

export function useVoucherClaimPayments(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.voucherClaims.view("payments", params),
    queryFn: () => getVoucherClaimPayments(params),
    ...options,
  });
}

// Every page merged into one list (see getAllVoucherClaimPayments).
export function useAllVoucherClaimPayments(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.voucherClaims.view("payments-all", params),
    queryFn: () => getAllVoucherClaimPayments(params),
    ...options,
  });
}

export function useVoucherClaim(claimId, options = {}) {
  return useQuery({
    queryKey: queryKeys.voucherClaims.detail(claimId),
    queryFn: () => getVoucherClaimById(claimId),
    enabled: Boolean(claimId),
    ...options,
  });
}
