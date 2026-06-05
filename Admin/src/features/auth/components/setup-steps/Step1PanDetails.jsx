import { useState, useRef } from "react";
import { ArrowIcon, UploadIcon } from "./icons";

const inp = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition";

export default function Step1PanDetails({ onNext }) {
  const [pan, setPan]         = useState("");
  const [company, setCompany] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Permanent Account Number</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        Required for business registration, banking, and tax purposes.
      </p>

      {/* Two inputs */}
      <div className="flex gap-5 mb-5">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">Enter Your Pan</label>
          <input
            className={inp}
            placeholder="A B C D E 1 2 3 4 F"
            value={pan}
            onChange={e => setPan(e.target.value.toUpperCase())}
            maxLength={10}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">
            Enter Your PAN Name / Your Company's Name
          </label>
          <input
            className={inp}
            placeholder="Pvt Ltd, LLP, Sole Proprietor, Partnership Firm, Public Limited Company, OPC"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
        </div>
      </div>

      {/* Upload */}
      <div className="mb-8">
        <label className="block text-sm text-gray-600 mb-2">Upload Your PAN Card</label>
        <div
          onClick={() => fileRef.current.click()}
          className="w-full px-4 py-4 border border-gray-200 rounded-lg flex items-center gap-3 cursor-pointer hover:border-emerald-400 transition"
        >
          <UploadIcon />
          <div>
            <p className="text-sm text-emerald-500 font-medium">
              {fileName || "Upload document"}
            </p>
            <p className="text-xs text-gray-300 mt-0.5">Max 5MB · JPEG, JPG, PNG, PDF</p>
          </div>
          <input
            ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
            onChange={e => e.target.files[0] && setFileName(e.target.files[0].name)}
          />
        </div>
      </div>

      <button
        onClick={onNext}
        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition"
      >
        Continue <ArrowIcon />
      </button>
    </div>
  );
}