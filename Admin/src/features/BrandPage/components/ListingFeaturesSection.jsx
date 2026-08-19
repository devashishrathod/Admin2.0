import React from "react";
import { RefreshCcw, Trash2 } from "lucide-react";

const ListingFeaturesSection = ({
  listingFeatures,
  onAdd,
  onView,
  onRefresh,
  onDelete,
}) => {
  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Listing Features
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {listingFeatures.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3">S.NO</th>
              <th className="px-5 py-3">Icon Png</th>
              <th className="px-5 py-3">LF Name</th>
              <th className="px-5 py-3">CreateOn</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listingFeatures.features.map((feature) => (
              <tr
                key={feature.id}
                className="border-b border-gray-50 last:border-b-0"
              >
                <td className="px-5 py-4 text-gray-800">{feature.sNo}</td>
                <td className="px-5 py-4">
                  <span className="text-gray-800">{feature.iconFileName}</span>{" "}
                  <button
                    type="button"
                    onClick={() => onView(feature.id)}
                    className="text-blue-600 hover:underline"
                  >
                    · View
                  </button>
                </td>
                <td className="px-5 py-4 text-gray-800">{feature.lfName}</td>
                <td className="px-5 py-4 text-gray-500">
                  {feature.createdOn}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onRefresh(feature.id)}
                      aria-label="Refresh"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <RefreshCcw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(feature.id)}
                      aria-label="Delete"
                      className="text-rose-500 hover:text-rose-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ListingFeaturesSection;
