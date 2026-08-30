import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBrands } from "./BrandContext";
import { useConfirmDelete } from "./BrandShared";
import BrandDetails from "./BrandDetails";

export default function BrandDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    brands,
    refreshBrandDetail,
    toggleActive,
    handleApprovalDecision,
    updateBrandDetails,
    deleteBrandById,
    setTopBrand,
  } = useBrands();

  const brand = brands.find((b) => String(b.id) === String(id));

  // List rows are lightweight — pull the fully-populated brand (pan/gst/
  // bank/outlet) once the detail page opens.
  useEffect(() => {
    if (id) refreshBrandDetail(id);
  }, [id, refreshBrandDetail]);

  const deleteBrand = useConfirmDelete((b) => {
    deleteBrandById(b);
    navigate("/brand");
  });

  if (!brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6 text-center dark:bg-neutral-950">
        <p className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-200">Brand not found</p>
        <p className="text-[13px] text-neutral-500">
          It may have been deleted, or the link is no longer valid.
        </p>
        <button
          onClick={() => navigate("/brand")}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
        >
          <ArrowLeft size={13} />
          Back to Brands
        </button>
      </div>
    );
  }

  return (
    <BrandDetails
      brand={brand}
      onBack={() => navigate("/brand")}
      onToggleActive={toggleActive}
      onDelete={deleteBrand}
      onUpdate={updateBrandDetails}
      onDecision={handleApprovalDecision}
      onSetTopBrand={setTopBrand}
    />
  );
}