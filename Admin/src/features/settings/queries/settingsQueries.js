import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getSettings } from "../services/SettingsApi";

/* Settings read, cached. There's one settings document (no list), kept
 * under ["settings", "current"]. Returns the raw API response; `options`
 * goes to useQuery. Writes refresh ["settings"] via the shared interceptor. */

/** Query options for the settings document — shared by useSettings and
 *  the imperative queryClient.query in Settings.jsx's save. */
export function settingsQueryOptions() {
  return {
    queryKey: queryKeys.settings.view("current"),
    queryFn: getSettings,
  };
}

export function useSettings(options = {}) {
  return useQuery({
    ...settingsQueryOptions(),
    ...options,
  });
}
