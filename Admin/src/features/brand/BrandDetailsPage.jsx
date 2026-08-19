import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBrands } from "./BrandContext";
import { useConfirmDelete } from "./BrandShared";
import BrandDetails from "./BrandDetails";

/* -------------------------------------------------------------------------
 * BrandDetailsPage.jsx
 * Thin routing wrapper mounted at /brands/:id. It resolves the :id param
 * against the shared BrandContext, then hands the brand + handlers down to
 * the plain, non-router-aware <BrandDetails> component (BrandDetails.jsx
 * stays reusable / easy to test since it doesn't know about routing).
 * ---------------------------------------------------------------------- */

export default function BrandDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { brands, toggleActive, handleApprovalDecision, updateBrandDetails, deleteBrandById } =
    useBrands();

  const brand = brands.find((b) => String(b.id) === String(id));

  const deleteBrand = useConfirmDelete((b) => {
    deleteBrandById(b);
    navigate("/brands");
  });

  if (!brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center">
        <p className="text-[15px] font-semibold text-neutral-200">Brand not found</p>
        <p className="text-[13px] text-neutral-500">
          It may have been deleted, or the link is no longer valid.
        </p>
        <button
          onClick={() => navigate("/brands")}
          className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
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
      onBack={() => navigate("/brands")}
      onToggleActive={toggleActive}
      onDelete={deleteBrand}
      onUpdate={updateBrandDetails}
      onDecision={handleApprovalDecision}
    />
  );
}