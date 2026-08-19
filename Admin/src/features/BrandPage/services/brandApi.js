// brandApi.js
// Service layer responsible for talking to the backend for everything Brand-Page related.
// Swap BASE_URL / endpoints for your real API. Falls back to local mock data (Branddata.js)
// so the UI keeps working during development or if the request fails.

import Branddata from "../data/Branddata";

const BASE_URL = "/api/brand";

/**
 * Fetches the full brand profile for a given merchant.
 * @param {string} merchantToken
 * @returns {Promise<object>} brand profile data
 */
export const getBrandProfile = async (merchantToken) => {
  try {
    const response = await fetch(`${BASE_URL}/${merchantToken}/profile`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(
      "brandApi: falling back to mock Branddata (API unavailable).",
      error.message
    );
    return Branddata;
  }
};

/**
 * Updates editable brand profile fields (brand name, short name, mail id, mobile no, etc).
 * @param {string} merchantToken
 * @param {object} updates - partial profile fields to update
 */
export const updateBrandProfile = async (merchantToken, updates) => {
  const response = await fetch(`${BASE_URL}/${merchantToken}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error(`Update failed: ${response.status}`);
  return await response.json();
};

/**
 * Uploads/replaces the brand logo image.
 * @param {string} merchantToken
 * @param {File} file
 */
export const uploadBrandLogo = async (merchantToken, file) => {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await fetch(`${BASE_URL}/${merchantToken}/logo`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error(`Logo upload failed: ${response.status}`);
  return await response.json();
};

/**
 * Fetches outlet location & address info (map coordinates, transaction address,
 * manual address, GST address, and the assigned account setup manager).
 * @param {string} merchantToken
 */
export const getOutletLocation = async (merchantToken) => {
  try {
    const response = await fetch(`${BASE_URL}/${merchantToken}/outlet-location`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(
      "brandApi: falling back to mock outlet location data (API unavailable).",
      error.message
    );
    return Branddata.outletLocation;
  }
};

/**
 * Updates the outlet's manual address, GST address, or coordinates.
 * @param {string} merchantToken
 * @param {object} updates - partial outletLocation fields to update
 */
export const updateOutletLocation = async (merchantToken, updates) => {
  const response = await fetch(`${BASE_URL}/${merchantToken}/outlet-location`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error(`Update failed: ${response.status}`);
  return await response.json();
};

/**
 * Fetches category info + tagline tags for the brand.
 * @param {string} merchantToken
 */
export const getBrandCategoryInfo = async (merchantToken) => {
  try {
    const response = await fetch(`${BASE_URL}/${merchantToken}/category`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(
      "brandApi: falling back to mock category data (API unavailable).",
      error.message
    );
    return {
      category: Branddata.category,
      categoryTagLine: Branddata.categoryTagLine,
    };
  }
};
