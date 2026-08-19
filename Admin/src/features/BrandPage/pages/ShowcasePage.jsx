import React from "react";

import ShowcaseSection from "../components/ShowcaseSection";
import Branddata from "../data/Branddata";

/**
 * ShowcasePage
 * "Showcase Details" tab — Ambience / Gallery / Menu / Event image & video
 * upload specs, each with an AI-generate action and an Upload action.
 */
const ShowcasePage = () => {
  const { showcase } = Branddata;

  const handleUpload = (groupId, mediaType) => {
    // Wire this up to services/brandApi.js -> an uploadShowcaseMedia(...) call
    console.log(`Upload clicked for "${groupId}" (${mediaType})`);
  };

  const handleAddMore = () => {
    console.log("Add More Showcase clicked");
  };

  return (
    <ShowcaseSection
      showcase={showcase}
      onUpload={handleUpload}
      onAddMore={handleAddMore}
    />
  );
};

export default ShowcasePage;
