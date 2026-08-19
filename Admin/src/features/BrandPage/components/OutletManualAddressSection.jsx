import React from "react";
import InfoItem from "./InfoItem";

const OutletManualAddressSection = ({ manualLocation }) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        Outlet Manual Location &amp; Address
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem
          label="Outlet Manual Address"
          value={manualLocation.outletManualAddress}
        />
      </div>
    </section>
  );
};

export default OutletManualAddressSection;
