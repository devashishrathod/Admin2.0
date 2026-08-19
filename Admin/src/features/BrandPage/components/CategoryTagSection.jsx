import React from "react";
import InfoItem from "./InfoItem";

const CategoryTagSection = ({ categoryTagLine }) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        Category Tag Line
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        {categoryTagLine.helperText}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {categoryTagLine.tags.map((tag) => (
          <InfoItem
            key={tag.id}
            label={`Tag Count ${tag.id}`}
            value={tag.label}
          />
        ))}
      </div>
    </section>
  );
};

export default CategoryTagSection;
