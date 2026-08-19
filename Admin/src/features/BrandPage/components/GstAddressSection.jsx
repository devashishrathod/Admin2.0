import React from "react";
import InfoItem from "./InfoItem";

const GstAddressSection = ({ gstAddress }) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        GST Mentioned Address
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="Address" value={gstAddress.address} />
      </div>
    </section>
  );
};

export default GstAddressSection;
