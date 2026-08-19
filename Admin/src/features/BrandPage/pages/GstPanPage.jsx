import React from "react";

import GstPanSection from "../components/GstPanSection";
import Branddata from "../data/Branddata";

/**
 * GstPanPage
 * "GST & PAN Information" tab — brand's registered address, GSTIN,
 * PAN details, taxpayer type, and current GST status.
 */
const GstPanPage = () => {
  const { gstPanInformation } = Branddata;

  return <GstPanSection gstPanInformation={gstPanInformation} />;
};

export default GstPanPage;
