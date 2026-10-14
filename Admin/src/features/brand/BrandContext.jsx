import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import {
  getAllBrands,
  getBrandDetails,
  updateBrandStatus,
  updateTopBrand,
} from "./services/BrandApi";
import { mapBrandListItem, mapBrandDetail } from "./brandMapper";
import { getPlanById } from "../plan/services/planApi";
import { useAuthStore } from "../auth/store/authStore";
import { isTokenValid } from "../auth/session";

/* -------------------------------------------------------------------------
 * BrandContext.jsx
 * Now backed by the real admin API instead of mock data. Public interface
 * (brands, toggleActive, handleApprovalDecision, updateBrandDetails,
 * deleteBrandById, addBrand) is unchanged so BrandDetailsPage / any other
 * consumer doesn't need edits. Added: loading/error state and
 * refreshBrandDetail(id) to pull the fully-populated single-brand payload
 * (pan/gst/bank/outlet) that the list endpoint doesn't return.
 * ---------------------------------------------------------------------- */

const BrandContext = createContext(null);

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

export function BrandProvider({ children }) {
  // Every brand from the list endpoint; `brands` below is the live subset.
  const [allBrands, setBrands] = useState([]);
  const brands = useMemo(() => allBrands.filter(isLiveBrand), [allBrands]);
  const dummyBrands = useMemo(() => allBrands.filter((b) => b.isDummy), [allBrands]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* `silent` = background refresh after an update: no loading spinner, and
     fresh list rows are merged into what's loaded instead of replacing it,
     so detail-only fields (pan/gst/outlets) of an open brand survive. */
  const fetchBrands = useCallback(async ({ page = 1, limit = 50, search = "", status, silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await getAllBrands({ page, limit, search, status });
      const rows = [...(res?.data?.data || res?.data || [])];
      // The list is paginated (e.g. 52 brands → 2 pages of 50) — pull the
      // remaining pages too, or every brand past the first page is missing.
      const totalPages = res?.data?.totalPages ?? 1;
      if (totalPages > page) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - page }, (_, i) =>
            getAllBrands({ page: page + i + 1, limit, search, status })
          )
        );
        rest.forEach((r) => rows.push(...(r?.data?.data || [])));
      }
      const list = rows.map(mapBrandListItem);
      setBrands((prev) =>
        silent
          ? list.map((fresh) => {
              const old = prev.find((b) => b.id === fresh.id);
              return old ? mergeKnown(old, fresh) : fresh;
            })
          : list
      );
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // BrandProvider wraps every route, the login screen included — only load
  // once there's a valid token, and load again right after a fresh login.
  // (Fetching with no token 401'd on the login page.)
  const accessToken = useAuthStore((s) => s.accessToken);
  const loggedIn = isTokenValid(accessToken);
  useEffect(() => {
    if (loggedIn) fetchBrands();
    else setBrands([]);
  }, [loggedIn, accessToken, fetchBrands]);

  /* Pulls the fully-populated single-brand payload (pan/gst/bank/outlet)
     and merges it into local state — call this when opening a brand's
     detail page, since the list endpoint doesn't return that detail. */
  const refreshBrandDetail = useCallback(async (id) => {
    try {
      const res = await getBrandDetails(id);
      const detailed = mapBrandDetail(res?.data || res);

      // /brands/get only returns the subscribed record's `subscriptionId`,
      // not an expanded plan — look the plan up so "Plan" doesn't show as a
      // dash everywhere it's displayed (header chip, Subscription tab).
      const subscriptionId = detailed.subscriptionDetail?.subscriptionId;
      if (subscriptionId && subscriptionId !== "—" && detailed.subscriptionPlan === "—") {
        try {
          const planRes = await getPlanById(subscriptionId);
          const planData = planRes?.data?.plan ?? planRes?.data ?? planRes?.plan ?? planRes;
          if (planData?.name) detailed.subscriptionPlan = planData.name;
        } catch {
          // Best-effort — keep the dash if the plan lookup fails.
        }
      }

      setBrands((prev) => {
        const exists = prev.some((b) => b.id === detailed.id);
        return exists
          ? prev.map((b) => (b.id === detailed.id ? mergeKnown(b, detailed) : b))
          : [detailed, ...prev];
      });
      return detailed;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /* Activate/Deactivate toggle. Sends both `isActive` (true/false based on
     the new state) and `hideFromCustomers` (always false) explicitly, as
     required by the backend. */
  /* After any successful update: pull the server's version of this brand
     and quietly refresh the list (counts, other brands' top order, …), so
     every screen shows the real data without a page reload. */
  const syncAfterUpdate = useCallback(
    (brandId) => Promise.all([refreshBrandDetail(brandId), fetchBrands({ silent: true })]),
    [refreshBrandDetail, fetchBrands]
  );

  const toggleActive = useCallback(async (brand) => {
    const nextActive = !brand.active;
    const nextStatus = nextActive ? "ACTIVE" : "INACTIVE";

    // optimistic update — `status` too, so the status badge flips at once
    setBrands((prev) =>
      prev.map((b) =>
        b.id === brand.id ? { ...b, active: nextActive, status: nextActive ? "Active" : "Deactive" } : b
      )
    );
    try {
      await updateBrandStatus(brand.id, nextStatus, "", nextActive, false);
      syncAfterUpdate(brand.id);
    } catch (err) {
      // roll back on failure
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, active: brand.active, status: brand.status } : b))
      );
      setError(err.message);
    }
  }, [syncAfterUpdate]);

  /* Approve -> status: "Active", active: true, rejectionReason cleared.
     Reject  -> status: "Rejected", active: false, rejectionReason stored.
     Untouched — updateBrandStatus derives `isActive` from `apiStatus`
     internally and always sends `hideFromCustomers: false` by default. */
  const handleApprovalDecision = useCallback(async (brand, newStatus, reason = "") => {
    const apiStatus = newStatus === "Active" ? "APPROVED" : "REJECTED";
    setBrands((prev) =>
      prev.map((b) =>
        b.id === brand.id
          ? {
              ...b,
              status: newStatus,
              active: newStatus === "Active",
              rejectionReason: newStatus === "Rejected" ? reason : "",
            }
          : b
      )
    );
    try {
      await updateBrandStatus(brand.id, apiStatus, reason);
      syncAfterUpdate(brand.id);
    } catch (err) {
      // roll back on failure
      setBrands((prev) =>
        prev.map((b) =>
          b.id === brand.id
            ? { ...b, status: brand.status, active: brand.active, rejectionReason: brand.rejectionReason }
            : b
        )
      );
      setError(err.message);
    }
  }, [syncAfterUpdate]);

  /* No "update brand details" endpoint has been provided yet — this stays
     local-only until one exists. */
  const updateBrandDetails = useCallback((brandIdToUpdate, updates) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === brandIdToUpdate ? { ...b, ...updates } : b))
    );
  }, []);

  const setTopBrand = useCallback(async (brand, { isTopBrand, topOrder }) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, isTopBrand, topOrder } : b))
    );
    try {
      await updateTopBrand(brand.id, { isTopBrand, topOrder });
      // The server may re-rank other top brands — the silent list refresh
      // picks those orders up.
      syncAfterUpdate(brand.id);
    } catch (err) {
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, isTopBrand: brand.isTopBrand, topOrder: brand.topOrder } : b))
      );
      // Rethrow so the Top Brand modal shows the error instead of closing
      // as if the save worked.
      throw err;
    }
  }, [syncAfterUpdate]);

  /* No delete endpoint has been provided yet — local-only for now. */
  const deleteBrandById = useCallback((brand) => {
    setBrands((prev) => prev.filter((b) => b.id !== brand.id));
  }, []);

  const addBrand = useCallback((newBrand) => {
    setBrands((prev) => [newBrand, ...prev]);
  }, []);

  const value = {
    brands,
    allBrands,
    dummyBrands,
    loading,
    error,
    fetchBrands,
    refreshBrandDetail,
    syncAfterUpdate,
    toggleActive,
    handleApprovalDecision,
    updateBrandDetails,
    setTopBrand,
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