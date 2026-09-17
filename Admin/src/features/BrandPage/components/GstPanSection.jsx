import React from "react";
import InfoItem from "./InfoItem";

const GstPanSection = ({ gstPanInformation }) => {
  const isActive = gstPanInformation.gstStatus?.toLowerCase() === "active";

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        GST &amp; PAN Information
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {gstPanInformation.subtitle}
      </p>

      <div className="mt-5 rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-6">
          <InfoItem label="Brand name" value={gstPanInformation.brandName} />
          <div className="lg:col-span-2">
            <InfoItem label="Address" value={gstPanInformation.address} />
          </div>
          <InfoItem label="GSTIN" value={gstPanInformation.gstin} />
          <InfoItem label="Pan Details" value={gstPanInformation.panDetails} />
          <InfoItem
            label="Taxpayer type"
            value={gstPanInformation.taxpayerType}
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              GST status
            </p>
            <p
              className={`mt-1 text-sm font-medium ${
                isActive ? "text-emerald-500" : "text-gray-500"
              }`}
            >
              {gstPanInformation.gstStatus}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GstPanSection;
