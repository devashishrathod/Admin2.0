import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useBrands } from "./BrandContext";
import { useConfirmDelete } from "./BrandShared";
import BrandDetails from "./BrandDetails/BrandDetails";
import NotFoundPage from "../../components/common/NotFoundPage";
import Loader from "../../components/common/Loader";

export default function BrandDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    allBrands: brands,
    loading,
    error,
    refreshBrandDetail,
    toggleActive,
    handleApprovalDecision,
    updateBrandDetails,
    deleteBrandById,
    setTopBrand,
  } = useBrands();

  const brand = brands.find((b) => String(b.id) === String(id));

  // Back returns to wherever the admin came from (Live / Expired / Dummy
  // Brands, Dashboard…). Only when the page was opened directly (no in-app
  // history) does it fall back to the list this brand belongs to.
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate(brand?.isDummy ? "/brand/dummy" : brand?.isRealDummy ? "/brand/real-dummy" : brand?.status === "Expired" ? "/brand/expired" : "/brand");
  };

  // List rows are lightweight — pull the fully-populated brand (pan/gst/
  // bank/outlet) once the detail page opens.
  useEffect(() => {
    if (id) refreshBrandDetail(id);
  }, [id, refreshBrandDetail]);

  const deleteBrand = useConfirmDelete((b) => {
    deleteBrandById(b);
    navigate("/brand");
  });

  // Still loading the brand list — don't flash "not found" before it arrives.
  if (!brand && loading) {
    return (
      <Loader variant="page" label="Loading brand…" />
    );
  }

  if (!brand) {
    return (
      <NotFoundPage
        title="Brand not found"
        icon="brand"
        description="We couldn't find a brand with this link. It may have been deleted, or the link is no longer valid."
        backLabel="Back to Brands"
        onBack={goBack}
      />
    );
  }

  return (
    <>
      {/* Failed actions (activate/deactivate, hide, approve) roll back the
          switch — say why, instead of it just snapping back. */}
      {error && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        </div>
      )}
      <BrandDetails
        brand={brand}
        onBack={goBack}
        onToggleActive={toggleActive}
        onDelete={deleteBrand}
        onUpdate={updateBrandDetails}
        onDecision={handleApprovalDecision}
        onSetTopBrand={setTopBrand}
      />
    </>
  );
}