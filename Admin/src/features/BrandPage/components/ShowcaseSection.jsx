import React from "react";
import ShowcaseGroup from "./ShowcaseGroup";

const ShowcaseSection = ({ showcase, onUpload, onAddMore }) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        Showcase
      </h2>
      <p className="mt-1 text-sm text-gray-500">{showcase.subtitle}</p>

      <div className="mt-5 space-y-5">
        {showcase.groups.map((group) => (
          <ShowcaseGroup
            key={group.id}
            group={group}
            guidelinesLink={showcase.guidelinesLink}
            onUpload={onUpload}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddMore}
        className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Add More Showcase
      </button>
    </section>
  );
};

export default ShowcaseSection;
