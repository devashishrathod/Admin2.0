import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBrands } from "./BrandContext";
import { useConfirmDelete } from "./BrandShared";
import BrandDetails from "./BrandDetails";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";

export default function BrandDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    allBrands: brands,
    loading,
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
    navigate(brand?.isDummy ? "/brand/dummy" : brand?.status === "Expired" ? "/brand/expired" : "/brand");
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
      <EmptyState
        variant="page"
        icon="brand"
        title="Brand not found"
        description="We couldn't find a brand with this link. It may have been deleted, or the link is no longer valid."
        action={{ label: "Back to Brands", icon: ArrowLeft, onClick: goBack }}
        secondaryAction={{ label: "Brand Waiting", onClick: () => navigate("/brand-waiting") }}
      />
    );
  }

  return (
    <BrandDetails
      brand={brand}
      onBack={goBack}
      onToggleActive={toggleActive}
      onDelete={deleteBrand}
      onUpdate={updateBrandDetails}
      onDecision={handleApprovalDecision}
      onSetTopBrand={setTopBrand}
    />
  );
}