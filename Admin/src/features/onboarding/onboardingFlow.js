/* -------------------------------------------------------------------------
 * Onboarding v2 — screen order, stepper, status normalizing and copy.
 * The server decides the current screen; this only describes the screens
 * and turns `GET /brands/onboarding/status` into what the UI needs.
 * ---------------------------------------------------------------------- */

// Every screen, in order, with its stepper group and lane.
// lane: null = both lanes · REGISTERED / UNREGISTERED = that KYC lane only.
export const SCREENS = [
  { key: "BUSINESS_NAME", label: "Business name", group: "Business" },
  { key: "BUSINESS_CATEGORY", label: "Category", group: "Business" },
  { key: "REGISTRATION_STATUS", label: "Registration", group: "Business" },
  { key: "REGISTRATION_ENTITY_TYPE", label: "Entity type", group: "KYC", lane: "REGISTERED" },
  { key: "KYC_DOCUMENTS", label: "KYC documents", group: "KYC", lane: "UNREGISTERED", skippable: true },
  { key: "PAN_VERIFICATION", label: "PAN", group: "KYC", skippable: true },
  { key: "GST_VERIFICATION", label: "GST", group: "KYC", lane: "REGISTERED", skippable: true },
  { key: "BANK_VERIFICATION", label: "Bank account", group: "KYC", skippable: true },
  { key: "PARTNERSHIP_DEED", label: "Partnership deed", group: "Agreement & plan" },
  { key: "SUBSCRIBE_PLAN", label: "Plan & billing", group: "Agreement & plan" },
  { key: "BRAND_BASIC_DETAILS", label: "Brand basics", group: "Brand setup" },
  { key: "BRAND_PROFESSIONAL_DETAILS", label: "Showcase & features", group: "Brand setup", skippable: true },
  { key: "OUTLET_DETAILS", label: "Outlets", group: "Brand setup" },
  { key: "ONBOARDING_REVIEW", label: "Review & submit", group: "Submit" },
];

// Screens after submit — not form steps.
export const AFTER_SUBMIT = ["UNDER_REVIEW", "DASHBOARD"];

export const screenMeta = (key) => SCREENS.find((s) => s.key === key) || null;

/** The screens that apply to this brand's KYC lane, in order. */
export function laneScreens(kycPath) {
  const lane = kycPath === "UNREGISTERED" ? "UNREGISTERED" : "REGISTERED";
  return SCREENS.filter((s) => !s.lane || s.lane === lane);
}

/* `status.steps` may come as a map { SCREEN: "DONE" } or a list
   [{ screen|key, status }] — accept both (the guide only names the values). */
function stepStatusMap(steps) {
  if (!steps) return {};
  if (Array.isArray(steps)) {
    return Object.fromEntries(steps.map((s) => [s.screen || s.key || s.name, s.status]).filter(([k]) => k));
  }
  return steps;
}

/** Normalizes the status payload so screens can rely on one shape. */
export function normalizeStatus(raw) {
  const data = raw?.data ?? raw ?? {};
  const status = data.status && typeof data.status === "object" ? { ...data, ...data.status } : data;
  return {
    currentScreen: status.currentScreen || data.currentScreen || "BUSINESS_NAME",
    kycPath: status.kycPath || (status.businessRegistrationStatus === "UNREGISTERED" ? "UNREGISTERED" : "REGISTERED"),
    editMode: status.editMode || null,
    steps: stepStatusMap(status.steps),
    items: status.items || {},
    deed: status.deed || null,
    editable: status.editable || {},
    submittedAt: status.submittedAt || status.onboarding?.submittedAt || null,
    raw: data,
  };
}

/** Stepper rows: DONE / SKIPPED / CURRENT / UPCOMING per screen of the lane. */
export function buildStepper(status, viewing) {
  const list = laneScreens(status.kycPath);
  const curIdx = list.findIndex((s) => s.key === status.currentScreen);
  const past = curIdx === -1 ? list.length : curIdx; // after submit → all past
  return list.map((s, i) => {
    const server = status.steps[s.key];
    let state = i < past ? "DONE" : i === past ? "CURRENT" : "UPCOMING";
    if (server === "SKIPPED") state = "SKIPPED";
    else if (server === "DONE" && state !== "CURRENT") state = "DONE";
    return { ...s, num: i + 1, state, isViewing: s.key === viewing, reachable: i <= past };
  });
}

/* ---- Copy for error codes (guide §14) ------------------------------ */
export const ERROR_HELP = {
  ONBOARDING_SCREEN_MISMATCH: "The vendor or another admin changed this brand meanwhile. Refreshed to the latest step.",
  ONBOARDING_STEP_INCOMPLETE: "Some required details are missing on this step.",
  SCREEN_NOT_SKIPPABLE: "This step can't be skipped.",
  BRANCH_SWITCH_GST_SAVED: "A GST number is saved — correct the GST first, then switch to Not registered.",
  VERIFICATION_NOT_FOUND: "That verification expired or wasn't found. Verify again.",
  DOCUMENT_IN_USE: "This PAN / GST / bank account is already used by another brand on Trydood.",
  VENDOR_ALREADY_EXISTS: "A vendor already exists on this WhatsApp number — find the brand in the lists.",
  BILLING_ADDRESS_REQUIRED: "Save the billing address first, then grant the plan.",
  BILLING_STATE_GSTIN_MISMATCH: "The billing address state must match the GSTIN's state.",
  BILLING_ADDRESS_NOT_DELETABLE: "The billing address can't be deleted.",
  DEED_PROOF_REQUIRED: "Upload the signed deed copy as proof.",
};

// "missing" codes from 422 ONBOARDING_STEP_INCOMPLETE → readable labels.
const MISSING_LABELS = {
  DOCUMENT: "at least one KYC document",
  LOGO: "a logo",
  OUTLET: "at least one outlet",
  LEGAL_NAMES: "the legal / brand name",
  CATEGORY: "the category",
  REGISTRATION: "the registration status",
  BILLING_ADDRESS: "the billing address",
  LIVE_PLAN: "an active plan",
};
export function describeMissing(missing = []) {
  return missing
    .map((m) => {
      const [code, id] = String(m).split(":");
      if (code === "OUTLET_LOCATION") return `an address for outlet ${id}`;
      if (code === "OUTLET_WORK_HOURS") return `opening hours for outlet ${id}`;
      return MISSING_LABELS[code] || code.toLowerCase().replace(/_/g, " ");
    })
    .join(", ");
}

/** One readable line for an OnboardingError. */
export function errorText(err) {
  if (!err) return "";
  if (err.code === "ONBOARDING_STEP_INCOMPLETE" && err.details?.missing?.length) {
    return `Still needed: ${describeMissing(err.details.missing)}.`;
  }
  return ERROR_HELP[err.code] ? `${ERROR_HELP[err.code]} (${err.message})` : err.message;
}

/* ---- Options ------------------------------------------------------- */

export const ENTITY_TYPES = [
  { value: "PROPRIETORSHIP", label: "Proprietorship", hint: "One owner, business in the owner's name" },
  { value: "PARTNERSHIP", label: "Partnership", hint: "Two or more partners with a partnership deed" },
  { value: "LLP", label: "LLP", hint: "Limited liability partnership" },
  { value: "PRIVATE_LIMITED", label: "Private Limited", hint: "Private limited company (Pvt Ltd)" },
  { value: "PUBLIC_LIMITED", label: "Public Limited", hint: "Public limited company (Ltd)" },
  { value: "ONE_PERSON_COMPANY", label: "One Person Company", hint: "OPC" },
  { value: "TRUST", label: "Trust", hint: "" },
  { value: "NGO", label: "NGO", hint: "" },
  { value: "SOCIETY", label: "Society", hint: "" },
  { value: "OTHERS", label: "Others", hint: "" },
];

// KYC document slots (guide §7). docType values are NOT CONFIRMED by the
// guide (it only names the documents) — adjust to the backend enum.
export const DOC_SLOTS = [
  {
    slot: "OWNER_ID",
    title: "Owner ID",
    hint: "Aadhaar (masked — only last 4 digits visible), PAN card, Voter ID, Driving licence or Passport",
    types: [
      ["AADHAAR_MASKED", "Aadhaar (masked)"],
      ["PAN_CARD", "PAN card"],
      ["VOTER_ID", "Voter ID"],
      ["DRIVING_LICENCE", "Driving licence"],
      ["PASSPORT", "Passport"],
    ],
  },
  {
    slot: "BUSINESS_LICENSE",
    title: "Business licence",
    hint: "FSSAI, Drug licence, Udyam (MSME), Shop & Establishment or Trade licence",
    types: [
      ["FSSAI", "FSSAI registration"],
      ["DRUG_LICENCE", "Drug licence"],
      ["UDYAM", "Udyam (MSME)"],
      ["SHOP_ESTABLISHMENT", "Shop & Establishment"],
      ["TRADE_LICENCE", "Trade licence"],
    ],
  },
  {
    slot: "SHOP_PROOF",
    title: "Shop proof",
    hint: "Shop photo with signboard, electricity bill or rent agreement",
    types: [
      ["SHOP_PHOTO", "Shop photo with signboard"],
      ["ELECTRICITY_BILL", "Electricity bill"],
      ["RENT_AGREEMENT", "Rent agreement"],
    ],
  },
];

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_RE = /^\d{9,18}$/;
export const WHATSAPP_RE = /^[6-9]\d{9}$/;
export const PIN_RE = /^\d{6}$/;
