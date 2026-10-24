/* -------------------------------------------------------------------------
 * Shared by the brand card (Brand list) and the brand details Overview, so
 * both show exactly the same facts the same way.
 * ---------------------------------------------------------------------- */

export const ONBOARDING_FLAG_LABELS = [
  ["hasPan", "PAN"],
  ["hasGst", "GST"],
  ["hasBank", "Bank"],
  ["hasLocation", "Location"],
  ["hasWorkHours", "Work hours"],
  ["hasFirstOutlet", "First outlet"],
  ["hasSystemVerification", "System verification"],
  ["hasAcceptedPartnershipDeed", "Partnership deed"],
];

// Enum words kept upper-case when the entity type key is prettified.
export const ENTITY_ACRONYMS = new Set(["LLP", "OPC", "HUF", "NGO"]);

export const compactCount = (n) => {
  const v = Number(n) || 0;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v;
};

/** Everything the brand card derives from a brand, in one place. */
export function brandCardFacts(brand) {
  // Total outlets: the list's outletCount, else sub-brand + franchise usage.
  const outletCount =
    brand.outletCount ??
    ((brand.usage?.subBrands?.used ?? 0) + (brand.usage?.franchises?.used ?? 0) ||
      Number(String(brand.subBrandCount ?? "").split("/")[0]) ||
      0);
  const hasPlan = Boolean(brand.subscriptionPlan && brand.subscriptionPlan !== "—");
  const flags = brand.onboardingFlags || {};
  const onboardingDone = ONBOARDING_FLAG_LABELS.filter(([k]) => flags[k]).length;
  const onboardingMissing = ONBOARDING_FLAG_LABELS.length - onboardingDone;
  // businessRegistrationStatus "REGISTERED" (mapper also gives "GST Registered").
  const isRegistered = brand.registrationKey ? brand.registrationKey === "REGISTERED" : brand.businessStatus === "GST Registered";
  // "REGISTERED" → "Registered", "UNREGISTERED" → "Unregistered".
  const registrationLabel = brand.registrationKey
    ? brand.registrationKey.charAt(0) + brand.registrationKey.slice(1).toLowerCase().replace(/_/g, " ")
    : isRegistered
    ? "Registered"
    : "Unregistered";
  // Full entity type straight from the enum key: "PRIVATE_LIMITED" → "Private Limited".
  const entityTypeLabel = brand.entityTypeKey
    ? brand.entityTypeKey
        .split("_")
        .map((w) => (ENTITY_ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
        .join(" ")
    : brand.businessType && brand.businessType !== "—"
    ? brand.businessType
    : "";
  const subCategory = brand.subCategory && brand.subCategory !== brand.category ? brand.subCategory : "";
  const merchantId = brand.merchantToken && brand.merchantToken !== "—" ? brand.merchantToken : null;

  return {
    outletCount,
    hasPlan,
    flags,
    onboardingDone,
    onboardingMissing,
    isRegistered,
    registrationLabel,
    entityTypeLabel,
    subCategory,
    merchantId,
  };
}
