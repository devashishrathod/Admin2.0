import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getPlans, getPlanById, getPlanFeatures, getPlanComparison } from "../services/planApi";

/* Subscription-plan reads (URL resource /subscriptions), cached. Returns
 * the raw API response; `options` goes to useQuery. Writes refresh
 * ["subscriptions"] via the shared interceptor — that covers the feature
 * master and the comparison too, since they live under /subscriptions. */

export function usePlans(options = {}) {
  return useQuery({
    queryKey: queryKeys.plans.list(),
    queryFn: () => getPlans(),
    ...options,
  });
}

export function usePlan(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.plans.detail(id),
    queryFn: () => getPlanById(id),
    enabled: Boolean(id),
    ...options,
  });
}

/** Feature master (#75f) — every plan feature in display order. */
export function usePlanFeatures(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.plans.view("features", params),
    queryFn: () => getPlanFeatures(params),
    ...options,
  });
}

/** The vendor-facing comparison grid (#75e). */
export function usePlanComparison(includeInactive = true, options = {}) {
  return useQuery({
    queryKey: queryKeys.plans.view("compare", { includeInactive }),
    queryFn: () => getPlanComparison(includeInactive),
    ...options,
  });
}
