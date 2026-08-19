import React from "react";
import InfoItem from "./InfoItem";

const OutletAddressSection = ({ locationAndAddress }) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        Outlet Location &amp; Address
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem
          label="Map Pin-location & Address"
          value={locationAndAddress.mapPinLocationAddress}
        />
        <InfoItem
          label="Transaction Address"
          value={locationAndAddress.transactionAddress}
        />
        <InfoItem label="Latitude" value={locationAndAddress.latitude} />
        <InfoItem label="Longitude" value={locationAndAddress.longitude} />
      </div>
    </section>
  );
};

export default OutletAddressSection;
