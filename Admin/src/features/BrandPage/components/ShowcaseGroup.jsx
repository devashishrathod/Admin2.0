import React from "react";
import ShowcaseMediaRow from "./ShowcaseMediaRow";

const ShowcaseGroup = ({ group, guidelinesLink, onUpload }) => {
  const imageFields = [
    { label: "Images Details", value: group.imageDetails.aspectRatio },
    { label: "Upload size limits", value: group.imageDetails.uploadSizeLimit },
  ];

  const videoFields = [
    { label: "Video Details", value: group.videoDetails.size },
    { label: "Upload size limits", value: group.videoDetails.uploadSizeLimit },
    { label: "Format", value: group.videoDetails.format },
    { label: "Duration", value: group.videoDetails.duration },
  ];

  return (
    <div className="rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {group.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{group.subtitle}</p>
        </div>
        <a
          href={guidelinesLink}
          className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
        >
          Images & Video guidelines
        </a>
      </div>

      <div className="mt-4 space-y-3">
        <ShowcaseMediaRow
          fields={imageFields}
          onUpload={() => onUpload(group.id, "image")}
        />
        <ShowcaseMediaRow
          fields={videoFields}
          onUpload={() => onUpload(group.id, "video")}
        />
      </div>
    </div>
  );
};

export default ShowcaseGroup;
