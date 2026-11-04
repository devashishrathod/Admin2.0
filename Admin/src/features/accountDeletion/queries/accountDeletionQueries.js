import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getAccountDeletions } from "../services/AccountDeletionApi";

/* Account-deletion list, cached under the URL resource ["users"] so the
 * shared interceptor refreshes it after a restore / delete-now
 * (PATCH /users/admin/...). Returns the raw API response. */

export function useAccountDeletions(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.users.view("deletions", params),
    queryFn: () => getAccountDeletions(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}
