import React from "react";

const ComingSoonPage = ({ label }) => {
  return (
    <div className="rounded-xl py-16 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <p className="text-sm text-gray-400">
        {label ? `"${label}" section` : "This section"} hasn't been built yet.
      </p>
    </div>
  );
};

export default ComingSoonPage;
