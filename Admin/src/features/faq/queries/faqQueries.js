import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getFaqs } from "../services/FaqApi";

/* FAQ reads, cached. Returns the raw API response; `options` goes to
 * useQuery. Writes refresh ["faqs"] via the shared interceptor. */

export function useFaqs(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.faqs.list(params),
    queryFn: () => getFaqs(params),
    ...options,
  });
}
