import React from "react";

import ListingFeaturesSection from "../components/ListingFeaturesSection";
import Branddata from "../data/Branddata";

/**
 * ListingFeaturesPage
 * "Listing Features" tab — table of amenities/features with view,
 * refresh, delete row actions and an "Add" action.
 */
const ListingFeaturesPage = () => {
  const { listingFeatures } = Branddata;

  const handleAdd = () => console.log("Add listing feature clicked");
  const handleView = (id) => console.log("View icon clicked for", id);
  const handleRefresh = (id) => console.log("Refresh clicked for", id);
  const handleDelete = (id) => console.log("Delete clicked for", id);

  return (
    <ListingFeaturesSection
      listingFeatures={listingFeatures}
      onAdd={handleAdd}
      onView={handleView}
      onRefresh={handleRefresh}
      onDelete={handleDelete}
    />
  );
};

export default ListingFeaturesPage;
