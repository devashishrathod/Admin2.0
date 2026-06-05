import { useState } from "react";
  import { useNavigate } from "react-router-dom";

export default function Step5PartnerContract() {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900">Partner Agreement</h2>
      <p className="text-xs text-gray-400 mt-1 mb-8">
        Agreement outlining roles, terms, and responsibilities between partners.
      </p>

      {/* Card */}
      <div className="border border-gray-200 rounded-xl p-6 mb-8 bg-white shadow-sm max-w-xl">
        <h3 className="text-sm font-bold text-gray-900 mb-2">
          Accept Partnership Deed Agreement
        </h3>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          You're nearly there! Agree to the digital contract to finish onboarding with Trydood.
        </p>

        {/* DocuSign link */}
        <a
          href="https://community.docusign.com/salesforce-30/url-link-with-the-docusign-agreement-1353"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline break-all"
        >
          https://community.docusign.com/salesforce-30/url-link-with-the-docusign-agreement-1353
        </a>

        {/* Checkbox — inside card, below link */}
        <label className="flex items-start gap-3 cursor-pointer mt-5 pt-4 border-t border-gray-100">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-600">
            I have read and agree to the{" "}
            <span className="text-emerald-500 font-semibold hover:underline cursor-pointer">
              Trydood Partner Agreement
            </span>{" "}
            and all associated terms and conditions.
          </span>
        </label>
      </div>

      {/* Subscription Plan button */}
      <button
        onClick={() => navigate('/subscription')}
        disabled={!agreed}
        className={`px-5 py-2 text-xs font-medium rounded-md border transition-all duration-200
          ${agreed
            ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
            : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
          }`}
      >
        Subscription Plan
      </button>
    </div>
  );
}