import React from "react";

const BrandHeader = ({ brandName, merchantToken }) => {
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900">{brandName}</h1>
      <p className="mt-1 text-xs text-gray-500">
        Merchant Token : {merchantToken}
      </p>
    </div>
  );
};

export default BrandHeader;
