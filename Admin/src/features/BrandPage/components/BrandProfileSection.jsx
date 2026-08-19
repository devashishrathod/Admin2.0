import React from "react";
import InfoItem from "./InfoItem";
import { formatMobileNumber } from "../utils/BrandHelpers";

const BrandProfileSection = ({ profile, onChangeLogo }) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        Brand Profile
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="Merchant Token" value={profile.merchantToken} />
        <InfoItem label="Brand Name" value={profile.brandName} />
        <InfoItem label="Short Name" value={profile.shortName} />
        <InfoItem
          label="Brand Logo"
          value={profile.brandLogo?.fileName}
          action={{ label: "Change", onClick: onChangeLogo }}
        />

        <InfoItem label="Mail Id" value={profile.mailId} />
        <InfoItem
          label="Mobile No"
          value={formatMobileNumber(profile.mobileNo)}
        />
        <InfoItem label="Refer Code" value={profile.referCode} />
        <InfoItem label="Joining" value={profile.joining} />
      </div>
    </section>
  );
};

export default BrandProfileSection;
