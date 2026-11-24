import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import { getAllBrands, getBrandDetails, getTopBrands, getProfileStrength } from "../services/BrandApi";
import { isNotFoundMessage } from "../../../utils/helpers";
import { mapBrandListItem } from "../brandMapper";
import { EMPTY_STAGE_COUNTS } from "../brandStage";

/* Brand reads, cached. Returns the raw API response; `options` goes to
 * useQuery. Writes to /brands (and /subBrands, /brandFeatures,
 * /subscribeds — see RELATED_RESOURCES) refresh ["brands"] automatically.
 *
 * The full live-brand list used across the app stays in BrandContext,
 * which is itself backed by the cache. */

/** `retry` option for a brand's own records (vouchers, settlements,
 *  payments…): several list endpoints answer "not found" for a brand with
 *  no rows yet — screens show that as empty, so retrying it only delays. */
export const retryUnlessNotFound = (failureCount, error) =>
  failureCount < 1 && !isNotFoundMessage(error?.message);

/** One page of the brand list — for dropdowns / pickers. */
export function useBrandsPage(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.list(params),
    queryFn: () => getAllBrands(params),
    ...options,
  });
}

const selectStagePage = (res) => {
  const d = res?.data ?? {};
  return {
    rows: (Array.isArray(d.data) ? d.data : []).map(mapBrandListItem),
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
    stageCounts: { ...EMPTY_STAGE_COUNTS, ...(d.stageCounts || {}) },
  };
};

/**
 * One server page of a brand tab (admin guide §3):
 * GET /brands/admin/get-all?onboardingStage=NEW|WAITING|LIVE&page&limit&…filters.
 * Returns { rows (mapped), total, totalPages, page, stageCounts }. Paging,
 * search and every filter run on the server — nothing is filtered here.
 */
export function useBrandStageList(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.list(params),
    queryFn: async () => {
      try {
        return await getAllBrands(params);
      } catch (err) {
        // A tab query answers an empty tab with 200 + []; the legacy no-stage
        // list still says 404 "No any brand found" — treat both as empty.
        if (err?.status === 404) return { data: { data: [], total: 0, totalPages: 1, page: params?.page ?? 1 } };
        throw err;
      }
    },
    select: selectStagePage,
    placeholderData: keepPreviousData,
    ...options,
  });
}

/** Tab badges for NEW / WAITING / LIVE (stageCounts) — one tiny request. */
export function useStageCounts(options = {}) {
  const query = useBrandStageList({ onboardingStage: "WAITING", page: 1, limit: 1 }, options);
  return { ...query, stageCounts: query.data?.stageCounts ?? EMPTY_STAGE_COUNTS };
}

export function useBrandDetails(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.detail(brandId),
    queryFn: () => getBrandDetails(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

/** GET /brands/profile-strength?brandId= — score, level, sections, badge blockers (#25j). */
export function useProfileStrength(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("profile-strength", { brandId }),
    queryFn: () => getProfileStrength(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

export function useTopBrands(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("top-brands", params),
    queryFn: () => getTopBrands(params),
    ...options,
  });
}
