import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getAllCustomers, getCustomerById } from "../services/CustomerApi";

/* Customer reads, cached. Returns the raw API response; `options` goes to
 * useQuery. Writes refresh ["customers"] via the shared interceptor. */

export function useCustomers(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => getAllCustomers(params),
    ...options,
  });
}

export function useCustomer(customerId, options = {}) {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => getCustomerById(customerId),
    enabled: Boolean(customerId),
    ...options,
  });
}
