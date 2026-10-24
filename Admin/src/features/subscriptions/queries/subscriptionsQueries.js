import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getAllSubscriptionPages } from "../services/SubscriptionsApi";

/* Brands' purchased plans (URL resource /subscribeds), cached. Returns
 * what the service returns; `options` goes to useQuery. Writes refresh
 * ["subscribeds"] via the shared interceptor. */

/** Every page matching `params`, flattened to one array of rows. */
export function useAllSubscriptionPages(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.subscribeds.view("all-pages", params),
    queryFn: () => getAllSubscriptionPages(params),
    ...options,
  });
}
