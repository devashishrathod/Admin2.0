import { useState } from "react";
import { ArrowIcon, SearchIcon } from "./icons";

const inp = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition";

export default function Step3BankDetails({ onNext }) {
  const [bank, setBank]       = useState("");
  const [accName, setAccName] = useState("");
  const [accNo, setAccNo]     = useState("");
  const [ifsc, setIfsc]       = useState("");

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Add Bank Details</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        Provide accurate bank information for smooth settlements.
      </p>

      <div className="flex gap-5 mb-5">
        {/* Bank search */}
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">Choose Your Bank</label>
          <div className="relative">
            <input
              className={inp + " pr-10"}
              placeholder="eg: Yes Bank"
              value={bank}
              onChange={e => setBank(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </span>
          </div>
        </div>
        {/* Account name */}
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">Enter name on bank account</label>
          <input
            className={inp}
            placeholder="eg: ABC Solutions LLP"
            value={accName}
            onChange={e => setAccName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-5 mb-8">
        {/* Account number */}
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">Enter bank account number</label>
          <input
            className={inp}
            placeholder="eg: 0123456789901"
            value={accNo}
            onChange={e => setAccNo(e.target.value)}
          />
        </div>
        {/* IFSC */}
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">Enter bank IFSC code</label>
          <input
            className={inp}
            placeholder="eg: HDFC000001"
            value={ifsc}
            onChange={e => setIfsc(e.target.value.toUpperCase())}
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