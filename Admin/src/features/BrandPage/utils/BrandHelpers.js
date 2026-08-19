// BrandHelpers.js
// Small, pure helper functions & shared constants used across the Brand Page feature.

// Tabs shown in the Brand Page nav bar.
export const BRAND_TABS = [
  { id: "brand-profile", label: "Brand Profile" },
  { id: "description", label: "Description" },
  { id: "showcase-details", label: "Showcase Details" },
  { id: "bank-account-details", label: "Bank Account Details" },
  { id: "listing-features", label: "Listing Features" },
  { id: "business-hours", label: "Business Hours" },
  { id: "gst-pan-information", label: "GST & PAN Information" },
  { id: "scan-qr-code", label: "Scan QR Code" },
  { id: "outlet-location", label: "Outlet Location" },
];

/**
 * Formats a raw mobile number string into a consistent "+91 XXXXXXXXXX" style.
 * Falls back to the raw value if it doesn't look like a plain digit string.
 */
export const formatMobileNumber = (value = "") => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }
  return value;
};

/**
 * Lowercases + trims an email for consistent display/comparison.
 */
export const normalizeEmail = (email = "") => email.trim().toLowerCase();

/**
 * Returns initials from a brand name, e.g. "Yoga Education And Research" -> "YE"
 */
export const getBrandInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const initials = words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return initials;
};

/**
 * Basic validation used before submitting brand profile edits.
 * Returns an object of { fieldName: errorMessage } — empty object means valid.
 */
export const validateBrandProfile = (profile = {}) => {
  const errors = {};

  if (!profile.brandName || !profile.brandName.trim()) {
    errors.brandName = "Brand name is required.";
  }
  if (!profile.shortName || !profile.shortName.trim()) {
    errors.shortName = "Short name is required.";
  }
  if (!profile.mailId || !/^\S+@\S+\.\S+$/.test(profile.mailId)) {
    errors.mailId = "A valid email address is required.";
  }
  if (!profile.mobileNo || profile.mobileNo.replace(/\D/g, "").length < 10) {
    errors.mobileNo = "A valid mobile number is required.";
  }

  return errors;
};
