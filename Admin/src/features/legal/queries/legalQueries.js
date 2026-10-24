import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { privacyPoliciesApi, termsAndConditionsApi } from "../services/LegalApi";

/* Legal doc reads (Terms & Conditions / Privacy Policy), cached. `kind` is
 * "terms" or "privacy", same as LegalDocsPanel's prop — it picks both the
 * API and the key root, so each resource's writes refresh only its own
 * lists via the shared interceptor. Hooks return the raw API response;
 * `options` goes to useQuery. */

function legalResource(kind) {
  return kind === "privacy"
    ? { api: privacyPoliciesApi, keys: queryKeys.privacyPolicies }
    : { api: termsAndConditionsApi, keys: queryKeys.termsAndConditions };
}

export function useLegalDocs(kind, params = {}, options = {}) {
  const { api, keys } = legalResource(kind);
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.getAll(params),
    ...options,
  });
}

export function useLegalDoc(kind, id, options = {}) {
  const { api, keys } = legalResource(kind);
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.getById(id),
    enabled: Boolean(id),
    ...options,
  });
}
