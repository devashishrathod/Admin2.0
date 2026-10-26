import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import {
  getSettlements,
  getAllSettlements,
  getSettlementById,
  getAllSettlementTransactions,
  getPayoutHealth,
  getBrandSettlementDebt,
} from "../services/SettlementApi";

/* Settlement reads, cached. Returns the raw API response; `options` goes
 * to useQuery. Writes refresh ["settlements"] via the shared interceptor. */

export function useSettlements(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.settlements.list(params),
    queryFn: () => getSettlements(params),
    ...options,
  });
}

/** Every page merged into one list (see getAllSettlements). */
export function useAllSettlements(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.settlements.view("all", params),
    queryFn: () => getAllSettlements(params),
    ...options,
  });
}

/** One settlement — `data` carries settlement, legs, timeline, viewer. */
export function useSettlement(settlementId, options = {}) {
  return useQuery({
    queryKey: queryKeys.settlements.detail(settlementId),
    queryFn: () => getSettlementById(settlementId),
    enabled: Boolean(settlementId),
    ...options,
  });
}

/** Every statement line of one settlement (GET /settlements/:id/transactions, all pages). */
export function useSettlementTransactions(settlementId, options = {}) {
  return useQuery({
    queryKey: queryKeys.settlements.view("transactions", { settlementId }),
    queryFn: () => getAllSettlementTransactions(settlementId),
    enabled: Boolean(settlementId),
    ...options,
  });
}

/** Payout health signals (GET /transactions/admin/health). */
export function usePayoutHealth(options = {}) {
  return useQuery({
    queryKey: queryKeys.settlements.view("health"),
    queryFn: getPayoutHealth,
    ...options,
  });
}

/** One brand's settlement debt — fetched only when asked (`enabled`). */
export function useBrandSettlementDebt(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.settlements.view("debt", { brandId }),
    queryFn: () => getBrandSettlementDebt(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}
