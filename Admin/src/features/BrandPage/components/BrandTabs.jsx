import React from "react";
import { BRAND_TABS } from "../utils/BrandHelpers";

const BrandTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 border-b border-gray-200">
      {BRAND_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-blue-600" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BrandTabs;
