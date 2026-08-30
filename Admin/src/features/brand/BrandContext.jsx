import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  getAllBrands,
  getBrandDetails,
  updateBrandStatus,
  updateTopBrand,
} from "./services/brandApi";
import { mapBrandListItem, mapBrandDetail } from "./brandMapper";

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

export function BrandProvider({ children }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBrands = useCallback(async ({ page = 1, limit = 50, search = "", status } = {}) => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllBrands({ page, limit, search, status });
      const list = res?.data?.data || res?.data || [];
      // Pending (not-yet-reviewed) brands belong to the New Onboarding
      // review flow, not the main Brand list/analytics — exclude them here
      // so they never show up anywhere BrandContext is consumed.
      setBrands(list.map(mapBrandListItem).filter((b) => b.status !== "Pending"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  /* Pulls the fully-populated single-brand payload (pan/gst/bank/outlet)
     and merges it into local state — call this when opening a brand's
     detail page, since the list endpoint doesn't return that detail. */
  const refreshBrandDetail = useCallback(async (id) => {
    try {
      const res = await getBrandDetails(id);
      const detailed = mapBrandDetail(res?.data || res);
      setBrands((prev) => {
        const exists = prev.some((b) => b.id === detailed.id);
        return exists
          ? prev.map((b) => (b.id === detailed.id ? { ...b, ...detailed } : b))
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
  const toggleActive = useCallback(async (brand) => {
    const nextActive = !brand.active;
    const nextStatus = nextActive ? "ACTIVE" : "INACTIVE";

    // optimistic update
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, active: nextActive } : b))
    );
    try {
      await updateBrandStatus(brand.id, nextStatus, "", nextActive, false);
    } catch (err) {
      // roll back on failure
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, active: brand.active } : b))
      );
      setError(err.message);
    }
  }, []);

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
    } catch (err) {
      setError(err.message);
    }
  }, []);

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
    } catch (err) {
      setError(err.message);
    }
  }, []);

  /* No delete endpoint has been provided yet — local-only for now. */
  const deleteBrandById = useCallback((brand) => {
    setBrands((prev) => prev.filter((b) => b.id !== brand.id));
  }, []);

  const addBrand = useCallback((newBrand) => {
    setBrands((prev) => [newBrand, ...prev]);
  }, []);

  const value = {
    brands,
    loading,
    error,
    fetchBrands,
    refreshBrandDetail,
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