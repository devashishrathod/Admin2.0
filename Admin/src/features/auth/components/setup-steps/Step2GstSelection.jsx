import { useState } from "react";
import { ArrowIcon } from "./icons";

const GST_DATA = {
  brand:   "Yoga Education And Research Pvt Ltd",
  address: "New No. 9 (Old No. 23), Plot No. 4383, 4th Floor, X Block 5th Street, Annanagar West, Chennai - 600040",
  gstin:   "09AAKFZ221NZZA",
  type:    "Regular",
  status:  "Active",
};

export default function Step2GstSelection({ onNext }) {
  const [selected, setSelected] = useState(false);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">GST Verification Process</h2>
      <p className="text-sm text-gray-400 mt-1">
        Select GST accounts to onboard on Trydood, you can configure these while creating listings later.
      </p>
      <p className="text-sm text-gray-400 mb-6">
        Please note, we only support Regular and Active GSTs to onboard as partners.
      </p>

      {/* GST Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
        <div className="grid grid-cols-[2rem_1fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div />
          <span className="text-xs font-semibold text-gray-600">Brand name</span>
          <span className="text-xs font-semibold text-gray-600">Address</span>
          <span className="text-xs font-semibold text-gray-600">GSTIN</span>
          <span className="text-xs font-semibold text-gray-600">Taxpayer type</span>
          <span className="text-xs font-semibold text-gray-600">GST status</span>
        </div>
        <div className="grid grid-cols-[2rem_1fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-start">
          <input
            type="checkbox" checked={selected}
            onChange={e => setSelected(e.target.checked)}
            className="mt-1 w-4 h-4 accent-emerald-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700">{GST_DATA.brand}</span>
          <span className="text-xs text-gray-500 leading-relaxed">{GST_DATA.address}</span>
          <span className="text-sm text-gray-700">{GST_DATA.gstin}</span>
          <span className="text-sm text-gray-700">{GST_DATA.type}</span>
          <span className="text-sm font-semibold text-emerald-500">{GST_DATA.status}</span>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!selected}
        className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition
          ${selected
            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
      >
        Continue <ArrowIcon />
      </button>
    </div>
  );
}