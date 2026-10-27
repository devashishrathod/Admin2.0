import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getRefundWorklist, getAllRefunds, getRefundById } from "../services/RefundApi";

/* Refund reads, cached. Returns the raw API response; `options` goes to
 * useQuery. Writes refresh ["refunds"] via the shared interceptor. */

export function useRefundWorklist(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.refunds.list(params),
    queryFn: () => getRefundWorklist(params),
    ...options,
  });
}

/** Every page merged into one list (see getAllRefunds). */
export function useAllRefunds(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.refunds.view("all", params),
    queryFn: () => getAllRefunds(params),
    ...options,
  });
}

/** One refund request — { refund, claim, timeline, viewer } under `data`. */
export function useRefund(refundRequestId, options = {}) {
  return useQuery({
    queryKey: queryKeys.refunds.detail(refundRequestId),
    queryFn: () => getRefundById(refundRequestId),
    enabled: Boolean(refundRequestId),
    ...options,
  });
}
