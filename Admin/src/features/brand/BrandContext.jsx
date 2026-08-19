import React, { createContext, useContext, useState, useCallback } from "react";
import { INITIAL_BRANDS } from "./data/BrandData";

/* -------------------------------------------------------------------------
 * BrandContext.jsx
 * Brand state now needs to be visible to two separate routes — the list
 * page at /brands and the details page at /brands/:id — so it's lifted out
 * of Brand.jsx and into a small context provider. Wrap your routes with
 * <BrandProvider> once (e.g. in app.js) and both pages pull from useBrands().
 * ---------------------------------------------------------------------- */

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const [brands, setBrands] = useState(INITIAL_BRANDS);

  const toggleActive = useCallback((brand) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, active: !b.active } : b))
    );
  }, []);

  /* Approve -> status: "Active", active: true, rejectionReason cleared.
     Reject  -> status: "Rejected", active: false, rejectionReason stored. */
  const handleApprovalDecision = useCallback((brand, newStatus, reason = "") => {
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
  }, []);

  const updateBrandDetails = useCallback((brandIdToUpdate, updates) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === brandIdToUpdate ? { ...b, ...updates } : b))
    );
  }, []);

  const deleteBrandById = useCallback((brand) => {
    setBrands((prev) => prev.filter((b) => b.id !== brand.id));
  }, []);

  const addBrand = useCallback((newBrand) => {
    setBrands((prev) => [newBrand, ...prev]);
  }, []);

  const value = {
    brands,
    toggleActive,
    handleApprovalDecision,
    updateBrandDetails,
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