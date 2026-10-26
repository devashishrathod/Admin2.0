import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllBrands,
  getBrandDetails,
  updateBrandStatus,
  setBrandAccess,
  setBrandComingSoon,
  updateTopBrand,
} from "./services/BrandApi";
import { mapBrandListItem, mapBrandDetail } from "./brandMapper";
import { getPlanById } from "../plan/services/planApi";
import { useAuthStore } from "../auth/store/authStore";
import { isTokenValid } from "../auth/session";
import { queryKeys } from "../../lib/query";

/* -------------------------------------------------------------------------
 * BrandContext.jsx
 * Backed by the real admin API, cached with TanStack Query. Public
 * interface (brands, toggleActive, handleApprovalDecision,
 * updateBrandDetails, deleteBrandById, addBrand, …) is unchanged so
 * BrandDetailsPage / any other consumer doesn't need edits.
 *
 * The full brand list (every page, mapped through mapBrandListItem) lives
 * in the query cache under ALL_BRANDS_KEY. Any successful /brands write
 * (and /subBrands, /brandFeatures, /subscribeds) invalidates it through
 * the shared axios interceptor, so it refetches by itself. Local edits
 * (optimistic toggles, detail merges) write straight into that cache entry.
 * refreshBrandDetail(id) pulls the fully-populated single-brand payload
 * (pan/gst/bank/outlet) that the list endpoint doesn't return.
 * ---------------------------------------------------------------------- */

const BrandContext = createContext(null);

const ALL_BRANDS_KEY = queryKeys.brands.view("all-pages");
const PAGE_LIMIT = 50;
// Cap on concurrent page requests so large brand lists don't burst the API.
const MAX_CONCURRENT_PAGES = 5;
const NO_BRANDS = [];

const UNAPPROVED_STATUSES = new Set(["Pending", "Rejected", "Revoked"]);

// Live = approved by an admin. Approval wins over the vendor's onboarding
// flag — some approved brands still have vendor.isOnBoardingCompleted false.
// Pending brands live on Brand Waiting / New Onboarding, rejected ones on
// New Onboarding. Dummy (isDummy) brands never go live — they only show
// on the Dummy Brands page.
const isLiveBrand = (b) => !b.isDummy && !UNAPPROVED_STATUSES.has(b.status);

// Merges a freshly fetched brand over the loaded one. List and detail
// payloads each leave some fields empty ("—", null, []) that the other one
// fills — e.g. the detail payload can return category unexpanded, the list
// has no outlets — so those placeholders must not overwrite real values.
const mergeKnown = (old, fresh) => ({
  ...old,
  ...Object.fromEntries(
    Object.entries(fresh).filter(([, v]) => v !== "—" && v != null && !(Array.isArray(v) && v.length === 0))
  ),
});

// Fresh list rows merged over the cached ones, so detail-only fields
// (pan/gst/outlets) of an opened brand survive a background refetch.
// `keepOthers` also keeps cached brands missing from `fresh` (used for the
// partial page-1 list, where the rest simply hasn't arrived yet).
const mergeList = (prev = [], fresh, { keepOthers = false } = {}) => {
  const byId = new Map(prev.map((b) => [b.id, b]));
  const merged = fresh.map((b) => (byId.has(b.id) ? mergeKnown(byId.get(b.id), b) : b));
  if (!keepOthers) return merged;
  const freshIds = new Set(fresh.map((b) => b.id));
  return [...merged, ...prev.filter((b) => !freshIds.has(b.id))];
};

/* Loads every page of the brand list — all pages are needed for complete
   client-side filters and overview counts. Page 1 first, then the rest in
   batches of MAX_CONCURRENT_PAGES. */
async function fetchAllBrandPages(queryClient, signal) {
  const res = await getAllBrands({ page: 1, limit: PAGE_LIMIT });
  const rows = [...(res?.data?.data || res?.data || [])];
  const totalPages = res?.data?.totalPages ?? 1;

  // First load (nothing, or less than a page, cached yet): put page 1 in
  // the cache now, so every screen renders while the remaining pages load
  // instead of blocking on the last one. Background refetches skip this —
  // they'd briefly shrink a full list down to one page. A cancelled fetch
  // (logout clears the cache) must not write anything back.
  const cachedCount = queryClient.getQueryData(ALL_BRANDS_KEY)?.length ?? 0;
  if (totalPages > 1 && cachedCount < rows.length && !signal.aborted) {
    const firstPage = rows.map(mapBrandListItem);
    queryClient.setQueryData(ALL_BRANDS_KEY, (prev) => mergeList(prev, firstPage, { keepOthers: true }));
  }

  for (let batchStart = 2; batchStart <= totalPages; batchStart += MAX_CONCURRENT_PAGES) {
    if (signal.aborted) break; // superseded / logged out — the result is discarded anyway
    const batchEnd = Math.min(totalPages, batchStart + MAX_CONCURRENT_PAGES - 1);
    const batch = await Promise.all(
      Array.from({ length: batchEnd - batchStart + 1 }, (_, i) =>
        getAllBrands({ page: batchStart + i, limit: PAGE_LIMIT })
      )
    );
    batch.forEach((r) => rows.push(...(r?.data?.data || [])));
  }

  return mergeList(queryClient.getQueryData(ALL_BRANDS_KEY), rows.map(mapBrandListItem));
}

// The flags the status PUT answered with, when its response carries them
// — applied right away so the list shows the server's answer, not a guess.
function savedAccess(res) {
  const d = res?.data ?? {};
  const brandDoc = d.brand ?? d;
  const out = {};
  if (typeof brandDoc.isActive === "boolean") out.active = brandDoc.isActive;
  if (typeof brandDoc.hideFromCustomers === "boolean") out.hiddenFromCustomers = brandDoc.hideFromCustomers;
  else if (typeof brandDoc.isVisibleToCustomers === "boolean") out.hiddenFromCustomers = !brandDoc.isVisibleToCustomers;
  return out;
}

export function BrandProvider({ children }) {
  const queryClient = useQueryClient();

  // BrandProvider wraps every route, the login screen included — only load
  // once there's a valid token. (Fetching with no token 401'd on the login
  // page.) Logout clears the whole cache, so a fresh login loads anew.
  const accessToken = useAuthStore((s) => s.accessToken);
  const loggedIn = isTokenValid(accessToken);

  const brandsQuery = useQuery({
    queryKey: ALL_BRANDS_KEY,
    queryFn: ({ signal }) => fetchAllBrandPages(queryClient, signal),
    enabled: loggedIn,
    // This refetch downloads EVERY page, so don't redo it on each tab focus
    // after the default 30s. Brand writes still refresh it at once (shared
    // interceptor); this only spaces out the "came back to the tab" pulls.
    staleTime: 5 * 60 * 1000,
  });

  // Every brand from the list endpoint; `brands` below is the live subset.
  const allBrands = brandsQuery.data ?? NO_BRANDS;
  const brands = useMemo(() => allBrands.filter(isLiveBrand), [allBrands]);
  const dummyBrands = useMemo(() => allBrands.filter((b) => b.isDummy), [allBrands]);
  const loading = brandsQuery.isPending;
  // True while pages after the first (or a background refresh) are still
  // arriving behind data that's already shown.
  const loadingMore = brandsQuery.isFetching && !brandsQuery.isPending;
  // Failed actions (toggle, approve, detail pull) report here too.
  const [actionError, setActionError] = useState("");
  const error = actionError || brandsQuery.error?.message || "";

  // Applies `update` to the cached list. Skipped while nothing is loaded
  // yet — writing [] would end the initial loading state early.
  const patchBrands = useCallback(
    (update) => queryClient.setQueryData(ALL_BRANDS_KEY, (prev) => (prev ? update(prev) : prev)),
    [queryClient]
  );
  const patchBrand = useCallback(
    (id, fields) => patchBrands((prev) => prev.map((b) => (b.id === id ? { ...b, ...fields } : b))),
    [patchBrands]
  );

  /* Refetches the whole list in the background (data stays on screen).
     Joins a refetch already in flight — writes already trigger one through
     the interceptor — instead of restarting it. `silent` is accepted for
     the old call sites; every refresh is silent now. The promise resolves
     once the fresh list is in. */
  const fetchBrands = useCallback(() => {
    setActionError("");
    return queryClient.invalidateQueries({ queryKey: ALL_BRANDS_KEY }, { cancelRefetch: false });
  }, [queryClient]);

  /* Pulls the fully-populated single-brand payload (pan/gst/bank/outlet)
     and merges it into the cached list — call this when opening a brand's
     detail page, since the list endpoint doesn't return that detail. */
  const refreshBrandDetail = useCallback(async (id) => {
    try {
      // Always a fresh pull (staleTime 0); concurrent calls share one request.
      const res = await queryClient.query({
        queryKey: queryKeys.brands.detail(id),
        queryFn: () => getBrandDetails(id),
        staleTime: 0,
      });
      const detailed = mapBrandDetail(res?.data || res);

      // /brands/get only returns the subscribed record's `subscriptionId`,
      // not an expanded plan — look the plan up so "Plan" doesn't show as a
      // dash everywhere it's displayed (header chip, Subscription tab).
      const subscriptionId = detailed.subscriptionDetail?.subscriptionId;
      if (subscriptionId && subscriptionId !== "—" && detailed.subscriptionPlan === "—") {
        try {
          const planRes = await queryClient.query({
            queryKey: queryKeys.plans.detail(subscriptionId),
            queryFn: () => getPlanById(subscriptionId),
          });
          const planData = planRes?.data?.plan ?? planRes?.data ?? planRes?.plan ?? planRes;
          if (planData?.name) detailed.subscriptionPlan = planData.name;
        } catch {
          // Best-effort — keep the dash if the plan lookup fails.
        }
      }

      // Unlike patchBrands this also writes before the list has loaded, so
      // a directly opened detail page can show its brand right away.
      queryClient.setQueryData(ALL_BRANDS_KEY, (prev = []) => {
        const exists = prev.some((b) => b.id === detailed.id);
        return exists
          ? prev.map((b) => (b.id === detailed.id ? mergeKnown(b, detailed) : b))
          : [detailed, ...prev];
      });
      return detailed;
    } catch (err) {
      setActionError(err.message);
      return null;
    }
  }, [queryClient]);

  /* After any successful update: pull the server's version of this brand
     (detail-only fields aren't covered by the interceptor's list refresh)
     and wait for the list refresh, so every screen shows the real data
     without a page reload. */
  const syncAfterUpdate = useCallback(
    (brandId) => Promise.all([refreshBrandDetail(brandId), fetchBrands()]),
    [refreshBrandDetail, fetchBrands]
  );

  /* Activate/Deactivate toggle — PUT /brands/admin/:brandId/status with
     { isActive, hideFromCustomers } (doc body). Activating keeps the brand's
     current visibility; deactivating uses the confirm modal's "Also hide"
     choice. An expired brand stays "Expired" — the plan, not this switch,
     decides that. Waits for the refresh so every screen ends on the
     server's values. */
  const toggleActive = useCallback(async (brand, hideFromCustomers) => {
    // Allowed on dummy brands too — Active/Inactive is one of their two actions.
    const nextActive = !brand.active;
    const nextHidden = nextActive ? Boolean(brand.hiddenFromCustomers) : Boolean(hideFromCustomers);
    const nextStatus = brand.status === "Expired" ? "Expired" : nextActive ? "Active" : "Deactive";

    setActionError("");
    // optimistic update — `status` too, so the status badge flips at once
    patchBrand(brand.id, { active: nextActive, status: nextStatus, hiddenFromCustomers: nextHidden });
    try {
      const res = await setBrandAccess(brand.id, { isActive: nextActive, hideFromCustomers: nextHidden });
      const saved = savedAccess(res);
      if (Object.keys(saved).length) patchBrand(brand.id, saved);
      await syncAfterUpdate(brand.id);
    } catch (err) {
      // roll back on failure (a failed request doesn't refetch anything)
      patchBrand(brand.id, { active: brand.active, status: brand.status, hiddenFromCustomers: brand.hiddenFromCustomers });
      setActionError(err.message);
    }
  }, [patchBrand, syncAfterUpdate]);

  /* "Hide from customers" switch — independent of active/inactive (API doc
     "Brands — status aur curation"): same PUT with the brand's current
     isActive + the new hideFromCustomers. */
  const setHiddenFromCustomers = useCallback(async (brand, hide) => {
    // Allowed on dummy brands too — Hide from customers is their other action.
    setActionError("");
    patchBrand(brand.id, { hiddenFromCustomers: hide });
    try {
      const res = await setBrandAccess(brand.id, { isActive: Boolean(brand.active), hideFromCustomers: hide });
      const saved = savedAccess(res);
      if (Object.keys(saved).length) patchBrand(brand.id, saved);
      await syncAfterUpdate(brand.id);
    } catch (err) {
      patchBrand(brand.id, { hiddenFromCustomers: brand.hiddenFromCustomers });
      setActionError(err.message);
    }
  }, [patchBrand, syncAfterUpdate]);

  /* Approve -> status: "Active", active: true, rejectionReason cleared.
     Reject  -> status: "Rejected", active: false, rejectionReason stored.
     Untouched — updateBrandStatus derives `isActive` from `apiStatus`
     internally and always sends `hideFromCustomers: false` by default. */
  const handleApprovalDecision = useCallback(async (brand, newStatus, reason = "") => {
    if (brand?.isDummy) return; // dummy brands are view-only
    const apiStatus = newStatus === "Active" ? "APPROVED" : "REJECTED";
    patchBrand(brand.id, {
      status: newStatus,
      active: newStatus === "Active",
      rejectionReason: newStatus === "Rejected" ? reason : "",
    });
    // "Already in the requested state" means the backend already has this
    // decision — that's the outcome we wanted, so it counts as success
    // whether it comes back as a 200 body or as an error response.
    const alreadyDone = (message) => /already in the requested state/i.test(message || "");
    try {
      let response;
      try {
        response = await updateBrandStatus(brand.id, apiStatus, reason);
      } catch (err) {
        if (!alreadyDone(err.message)) throw err;
      }
      const result = response?.data ?? response;
      if (result?.success === false && !alreadyDone(result.message)) {
        throw new Error(result.message || "Unable to update brand approval status.");
      }
      // Also covers the "already done" error path, which the interceptor
      // never sees as a successful write.
      await syncAfterUpdate(brand.id);
      return true;
    } catch (err) {
      // roll back on failure
      patchBrand(brand.id, { status: brand.status, active: brand.active, rejectionReason: brand.rejectionReason });
      setActionError(err.message);
      return false;
    }
  }, [patchBrand, syncAfterUpdate]);

  /* No "update brand details" endpoint has been provided yet — this stays
     local-only (cache only) until one exists, so the next list refresh
     shows the server's values again. */
  const updateBrandDetails = useCallback((brandIdToUpdate, updates) => {
    patchBrands((prev) =>
      // Dummy brands are view-only — their details never change here.
      prev.map((b) => (b.id === brandIdToUpdate && !b.isDummy ? { ...b, ...updates } : b))
    );
  }, [patchBrands]);

  const setTopBrand = useCallback(async (brand, { isTopBrand, topOrder }) => {
    if (brand?.isDummy) throw new Error("D brands are view-only.");
    patchBrand(brand.id, { isTopBrand, topOrder });
    try {
      await updateTopBrand(brand.id, { isTopBrand, topOrder });
      // The server may re-rank other top brands — the list refresh picks
      // those orders up.
      syncAfterUpdate(brand.id);
    } catch (err) {
      patchBrand(brand.id, { isTopBrand: brand.isTopBrand, topOrder: brand.topOrder });
      // Rethrow so the Top Brand modal shows the error instead of closing
      // as if the save worked.
      throw err;
    }
  }, [patchBrand, syncAfterUpdate]);

  /* "Coming soon" on a real, approved brand — PUT /brands/admin/real-dummy/:id.
     ON needs an internal note; OFF clears it. Applies the server's answer,
     then refreshes; throws so the modal can show the error. */
  const setComingSoon = useCallback(async (brand, { isRealDummy, note }) => {
    if (brand?.isDummy) throw new Error("This is a dummy brand. Only real brands can be marked as RD brand.");
    const before = { isRealDummy: brand.isRealDummy, realDummyNote: brand.realDummyNote, realDummyUpdatedAt: brand.realDummyUpdatedAt };
    patchBrand(brand.id, { isRealDummy, realDummyNote: isRealDummy ? note.trim() : null });
    try {
      const res = await setBrandComingSoon(brand.id, { isRealDummy, note });
      const d = res?.data || {};
      patchBrand(brand.id, {
        isRealDummy: typeof d.isRealDummy === "boolean" ? d.isRealDummy : isRealDummy,
        realDummyNote: d.realDummyNote ?? (isRealDummy ? note.trim() : null),
        realDummyUpdatedAt: d.realDummyUpdatedAt || new Date().toISOString(),
      });
      syncAfterUpdate(brand.id);
      return res;
    } catch (err) {
      patchBrand(brand.id, before);
      throw err;
    }
  }, [patchBrand, syncAfterUpdate]);

  /* No delete endpoint has been provided yet — local-only (cache only) for now. */
  const deleteBrandById = useCallback((brand) => {
    if (brand?.isDummy) return; // dummy brands are view-only
    patchBrands((prev) => prev.filter((b) => b.id !== brand.id));
  }, [patchBrands]);

  const addBrand = useCallback((newBrand) => {
    queryClient.setQueryData(ALL_BRANDS_KEY, (prev = []) => [newBrand, ...prev]);
  }, [queryClient]);

  const value = {
    brands,
    allBrands,
    dummyBrands,
    loading,
    loadingMore,
    error,
    fetchBrands,
    refreshBrandDetail,
    syncAfterUpdate,
    toggleActive,
    setHiddenFromCustomers,
    handleApprovalDecision,
    updateBrandDetails,
    setTopBrand,
    setComingSoon,
    deleteBrandById,
    addBrand,
  };

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrands() {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error("useBrands must be used inside a <BrandProvider>");
  }
  return ctx;
}
