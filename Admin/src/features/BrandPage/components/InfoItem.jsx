import React from "react";

/**
 * InfoItem
 * A small label + value pair (e.g. "Merchant Token" / "A4FGIWJOIUN20"),
 * optionally with a trailing action link like "Change".
 */
const InfoItem = ({ label, value, action }) => {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-sm text-gray-800">{value}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default InfoItem;
