import React from "react";
import { Sparkles, UploadCloud } from "lucide-react";

/**
 * ShowcaseMediaRow
 * One row of upload spec fields (labels/values) plus an action icon button
 * and an "Upload" button — used for both the "Images Details" and
 * "Video Details" rows inside a ShowcaseGroup.
 *
 * fields: array of { label, value }
 */
const ShowcaseMediaRow = ({ fields, onGenerate, onUpload }) => {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="text-[11px] font-medium text-gray-500">
              {field.label}
            </p>
            <p className="mt-1 text-sm text-gray-800">{field.value}</p>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onGenerate}
          aria-label="Generate with AI"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Sparkles size={16} />
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="flex h-9 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-black"
        >
          <UploadCloud size={15} />
          Upload
        </button>
      </div>
    </div>
  );
};

export default ShowcaseMediaRow;
