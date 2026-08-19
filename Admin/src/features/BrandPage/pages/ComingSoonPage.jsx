import React from "react";

const ComingSoonPage = ({ label }) => {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
      <p className="text-sm text-gray-400">
        {label ? `"${label}" section` : "This section"} hasn't been built yet.
      </p>
    </div>
  );
};

export default ComingSoonPage;
