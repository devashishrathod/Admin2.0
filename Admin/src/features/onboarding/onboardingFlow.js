/* -------------------------------------------------------------------------
 * Onboarding v2 — screens, stepper, status normalizing and copy.
 * The server decides the current screen and which screens apply to the
 * brand (`status.groups`); this only labels them and turns
 * `GET /brands/onboarding/status` into what the UI needs.
 *
 * Shapes follow the stage captures in the vendor panel repo
 * (VenderPanel/docs/onboarding-v2-baseline — GST, NO_GST, UNREGISTERED runs).
 * ---------------------------------------------------------------------- */

// Server group keys (status.groups[].key) → stepper headings.
export const GROUP_LABELS = {
  BASIC_DETAILS: "Basic details",
  BUSINESS_VERIFICATION: "Business verification",
  PAYOUT: "Payout",
  AGREEMENT_PLAN: "Agreement & plan",
  BRAND_OUTLET: "Brand & outlets",
  SUBMIT: "Submit",
};

// Every screen the panel can show. `group` is only the fallback when the
// status has no groups; `skippable` = POST /brands/onboarding/skip accepts it.
export const SCREENS = [
  { key: "BRAND_NAME", label: "Brand name", group: "BASIC_DETAILS" },
  { key: "BUSINESS_CATEGORY", label: "Category", group: "BASIC_DETAILS" },
  { key: "REGISTRATION_STATUS", label: "Business status", group: "BASIC_DETAILS" },
  { key: "GST_VERIFICATION", label: "GST", group: "BUSINESS_VERIFICATION" },
  { key: "PAN_VERIFICATION", label: "PAN", group: "BUSINESS_VERIFICATION" },
  { key: "REGISTRATION_ENTITY_TYPE", label: "Business type", group: "BUSINESS_VERIFICATION" },
  { key: "OWNER_VERIFICATION", label: "Owner verification", group: "BUSINESS_VERIFICATION" },
  { key: "KYC_DOCUMENTS", label: "Business documents", group: "BUSINESS_VERIFICATION", skippable: true },
  { key: "BANK_VERIFICATION", label: "Bank account", group: "PAYOUT", skippable: true },
  { key: "PARTNERSHIP_DEED", label: "Partnership deed", group: "AGREEMENT_PLAN" },
  { key: "SUBSCRIBE_PLAN", label: "Plan & billing", group: "AGREEMENT_PLAN" },
  { key: "BRAND_BASIC_DETAILS", label: "Brand basics", group: "BRAND_OUTLET" },
  { key: "BRAND_PROFESSIONAL_DETAILS", label: "Showcase & features", group: "BRAND_OUTLET", skippable: true },
  { key: "OUTLET_DETAILS", label: "Outlets", group: "BRAND_OUTLET" },
  { key: "ONBOARDING_REVIEW", label: "Review & submit", group: "SUBMIT" },
];

// Screens after submit — not form steps.
export const AFTER_SUBMIT = ["UNDER_REVIEW", "DASHBOARD"];

export const screenMeta = (key) => SCREENS.find((s) => s.key === key) || null;

/* kycPath (chosen on REGISTRATION_STATUS) decides the verification screens.
   Lists match the stage status.groups for each path; used before the first
   status load and when a status comes without groups. */
export const KYC_PATHS = [
  {
    value: "GST",
    label: "Has GST",
    description: "Registered business with a GST number.",
    next: "GST → PAN → business type → documents",
  },
  {
    value: "NO_GST",
    label: "Registered, no GST",
    description: "Registered company, LLP, partnership, trust or society without GST.",
    next: "PAN → business type → documents",
  },
  {
    value: "UNREGISTERED",
    label: "Not registered",
    description: "A local shop without GST or company registration.",
    next: "Owner ID → documents",
  },
];
export const kycPathLabel = (path) => KYC_PATHS.find((p) => p.value === path)?.label || "Not chosen yet";

const LANE_VERIFICATION = {
  GST: ["GST_VERIFICATION", "PAN_VERIFICATION", "REGISTRATION_ENTITY_TYPE", "KYC_DOCUMENTS"],
  NO_GST: ["PAN_VERIFICATION", "REGISTRATION_ENTITY_TYPE", "KYC_DOCUMENTS"],
  UNREGISTERED: ["OWNER_VERIFICATION", "KYC_DOCUMENTS"],
};

/** The screens for a kycPath, in order (fallback when the status has no groups). */
export function laneScreens(kycPath) {
  const verification = (LANE_VERIFICATION[kycPath] || LANE_VERIFICATION.GST).map(screenMeta);
  const basics = SCREENS.filter((s) => s.group === "BASIC_DETAILS");
  const rest = SCREENS.filter((s) => s.group !== "BASIC_DETAILS" && s.group !== "BUSINESS_VERIFICATION");
  return [...basics, ...verification, ...rest];
}

/** Normalizes the status payload so screens can rely on one shape. */
export function normalizeStatus(raw) {
  const data = raw?.data ?? raw ?? {};
  const groups = Array.isArray(data.groups) ? data.groups : [];
  // Ordered screen list + per-screen server status (DONE / SKIPPED / MISSING).
  const order = [];
  const steps = {};
  groups.forEach((g) =>
    (g.screens || []).forEach((s) => {
      order.push({ key: s.screen, group: g.key });
      steps[s.screen] = s.status;
    })
  );
  const verification = data.verification || {};
  return {
    brandId: data.brandId || null,
    currentScreen: data.currentScreen || "BRAND_NAME",
    kycPath: data.kycPath || null,
    editMode: data.editMode || null, // FIRST_PASS · LOCKED · REMEDIATION
    editLock: data.editLock || null,
    order,
    steps,
    progress: data.progress || null,
    items: data.items || {},
    editable: data.editable || {},
    deed: data.deed || null,
    verification,
    systemChecks: data.systemChecks || [],
    hasBillingAddress: Boolean(data.hasBillingAddress),
    profileStrength: data.profileStrength || null,
    limits: data.limits || {},
    submittedAt: verification.submittedAt || null,
    raw: data,
  };
}

/** Stepper rows: DONE / SKIPPED / CURRENT / UPCOMING for the brand's screens. */
export function buildStepper(status, viewing) {
  const fromServer = status.order.length
    ? [...status.order, { key: "ONBOARDING_REVIEW", group: "SUBMIT" }]
    : laneScreens(status.kycPath).map((s) => ({ key: s.key, group: s.group }));
  const list = fromServer.map((s) => ({ ...(screenMeta(s.key) || { key: s.key, label: s.key }), group: GROUP_LABELS[s.group] || s.group }));
  const curIdx = list.findIndex((s) => s.key === status.currentScreen);
  const past = curIdx === -1 ? list.length : curIdx; // after submit → all past
  return list.map((s, i) => {
    const server = status.steps[s.key];
    let state = i < past ? "DONE" : i === past ? "CURRENT" : "UPCOMING";
    if (server === "SKIPPED" && state !== "CURRENT") state = "SKIPPED";
    else if (server === "DONE" && state !== "CURRENT") state = "DONE";
    return { ...s, num: i + 1, state, isViewing: s.key === viewing, reachable: i <= past };
  });
}

/* ---- Copy for error codes ------------------------------------------ */
export const ERROR_HELP = {
  ONBOARDING_SCREEN_MISMATCH: "The vendor or another admin changed this brand meanwhile. Refreshed to the latest step.",
  ONBOARDING_STEP_INCOMPLETE: "Some required details are missing on this step.",
  ONBOARDING_LOCKED: "Onboarding is locked while the brand is under review.",
  LEGAL_FIELD_LOCKED: "This legal detail is locked after approval.",
  SCREEN_NOT_SKIPPABLE: "This step can't be skipped.",
  SUBCATEGORY_LIMIT: "Too many subcategories picked.",
  BRANCH_SWITCH_GST_SAVED: "A GST number is saved — correct the GST first, then switch the business status.",
  VERIFICATION_NOT_FOUND: "That verification expired or wasn't found. Verify again.",
  DOCUMENT_IN_USE: "This PAN / GST / bank account is already used by another brand on Trydood.",
  PAN_NOT_IN_GSTIN: "On the GST path the PAN must be the one inside the GSTIN.",
  PROVIDER_ERROR: "The verification provider couldn't check this right now. Try again in a while.",
  VENDOR_ALREADY_EXISTS: "A vendor already exists on this WhatsApp number — find the brand in the lists.",
  BILLING_ADDRESS_REQUIRED: "Save the billing address first, then grant the plan.",
  BILLING_STATE_GSTIN_MISMATCH: "The billing address state must match the GSTIN's state.",
  BILLING_ADDRESS_NOT_DELETABLE: "The billing address can't be deleted.",
  DEED_PROOF_REQUIRED: "Upload the signed deed copy as proof.",
  OUTLET_NOT_VERIFIED: "This outlet's WhatsApp number isn't verified yet. Address and hours open after that.",
  OUTLET_ALREADY_VERIFIED: "This outlet is already registered and verified on that number.",
  WHATSAPP_UNCHANGED: "That is already this outlet's WhatsApp number.",
  // Admin guide §15 — the rest of the codes the wizard can meet.
  REGISTRATION_STATUS_LOCKED: "The business status is locked for the vendor — as admin, change it from this screen (it saves as an edit).",
  GSTIN_NOT_ACTIVE: "This GSTIN isn't active. Pick \"Registered, no GST\" as the business status instead.",
  ENTITY_FROM_GST: "On the GST path the business type must match the GST constitution.",
  KYC_DOCUMENT_LIMIT: "The document limit for this brand is reached.",
  OWNER_NUMBER_NOT_VERIFIED: "The owner hasn't verified their WhatsApp yet (they never signed in). Use the outlet manager's number and their code instead.",
  VERIFICATION_FAILED: "That check failed and a failed result is never saved. Verify again with the right number.",
  DETAIL_ALREADY_PROVIDED: "This detail is already saved for the brand.",
  OWNER_ID_DOCUMENT: "The owner's ID can't be changed here — use the owner verification step.",
  OWNER_PAN_NOT_PERSONAL: "Not registered needs the owner's personal PAN (4th letter P). For a company / firm PAN pick \"Registered, no GST\".",
  KYC_FILE_TYPE: "Only PDF, JPG or PNG files are accepted.",
  KYC_IMAGE_TOO_SMALL: "The image is too small — its short side must be at least 800 px.",
  KYC_STORAGE_UNAVAILABLE: "Document storage is unavailable right now. Try again in a while.",
  FEATURE_LIMIT: "The active feature limit for this brand is reached.",
  DEED_ALREADY_ACCEPTED: "The vendor accepted the deed themselves — no offline deed is needed.",
  USE_BILLING_ADDRESS_ENDPOINT: "The brand's address is its billing address — edit it in the billing form.",
};

// "missing" codes from 422 ONBOARDING_STEP_INCOMPLETE → readable labels.
const MISSING_LABELS = {
  DOCUMENT: "at least one business document",
  LOGO: "a logo",
  EMAIL: "a business email",
  MOBILE: "a contact number",
  OUTLET: "at least one outlet",
  LEGAL_NAMES: "the legal / brand name",
  CATEGORY: "the category",
  REGISTRATION: "the business status",
  BILLING_ADDRESS: "the billing address",
  LIVE_PLAN: "an active plan",
};
export function describeMissing(missing = []) {
  return missing
    .map((m) => {
      const [code, id] = String(m).split(":");
      const short = id ? `…${id.slice(-6)}` : "";
      if (code === "OUTLET_LOCATION") return `an address for outlet ${short}`;
      if (code === "OUTLET_WORK_HOURS") return `opening hours for outlet ${short}`;
      if (code === "OUTLET_NOT_VERIFIED") return `WhatsApp verification for outlet ${short}`;
      return MISSING_LABELS[code] || code.toLowerCase().replace(/_/g, " ");
    })
    .join(", ");
}

/** One readable line for an ApiError (lib/apiError.js). */
export function errorText(err) {
  if (!err) return "";
  if (err.code === "ONBOARDING_STEP_INCOMPLETE" && err.details?.missing?.length) {
    return `Still needed: ${describeMissing(err.details.missing)}.`;
  }
  return ERROR_HELP[err.code] ? `${ERROR_HELP[err.code]} (${err.message})` : err.message;
}

/* ---- Options ------------------------------------------------------- */

export const ENTITY_TYPES = [
  { value: "PROPRIETORSHIP", label: "Proprietorship", hint: "One owner runs the business" },
  { value: "PARTNERSHIP", label: "Partnership", hint: "Two or more partners" },
  { value: "LLP", label: "LLP", hint: "Limited liability partnership" },
  { value: "PRIVATE_LIMITED", label: "Private Limited", hint: "Private limited company (Pvt Ltd)" },
  { value: "PUBLIC_LIMITED", label: "Public Limited", hint: "Public limited company (Ltd)" },
  { value: "ONE_PERSON_COMPANY", label: "One Person Company", hint: "OPC" },
  { value: "TRUST", label: "Trust", hint: "Registered trust" },
  { value: "NGO", label: "NGO", hint: "Non-profit organisation" },
  { value: "SOCIETY", label: "Society", hint: "Registered society" },
  { value: "OTHERS", label: "Others", hint: "Any other structure" },
];
export const entityLabel = (v) => ENTITY_TYPES.find((t) => t.value === v)?.label || v || "";

// Business document `docType` codes. GET /brands/onboarding/documents
// returns `hints` (codes suggested for the category); anything else is OTHER.
export const DOC_TYPE_LABELS = {
  FSSAI: "FSSAI licence",
  DRUG_LICENCE: "Drug licence",
  SHOP_ESTABLISHMENT: "Shop & Establishment",
  TRADE_LICENCE: "Trade licence",
  UDYAM: "Udyam registration",
  SHOP_PHOTO: "Shop photo",
  ELECTRICITY_BILL: "Electricity bill",
  RENT_AGREEMENT: "Rent agreement",
  OTHER: "Other",
};
export const docTypeLabel = (t) => (t ? DOC_TYPE_LABELS[t] || t : "");

// owner-verification `idType` values (not-registered path). Aadhaar must be masked.
export const OWNER_ID_TYPES = [
  { value: "AADHAAR", label: "Aadhaar (masked)" },
  { value: "DRIVING_LICENCE", label: "Driving licence" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VOTER_ID", label: "Voter ID" },
];

export const BANK_ACCOUNT_TYPES = [
  { value: "SAVINGS", label: "Savings" },
  { value: "CURRENT", label: "Current" },
  { value: "NRE", label: "NRE" },
  { value: "NRO", label: "NRO" },
  { value: "OD", label: "OD" },
  { value: "CC", label: "CC" },
  { value: "OTHER", label: "Other" },
];

// POST /subscribeds/admin/grant `paymentMode` — exactly what the backend accepts:
// FREE | CASH | BANK_TRANSFER | CHEQUE | UPI_OFFLINE (same list as SubscriptionCenter).
export const GRANT_PAYMENT_MODES = [
  { value: "FREE", label: "Free / complimentary" },
  { value: "BANK_TRANSFER", label: "Offline — Bank transfer (NEFT / IMPS / RTGS)" },
  { value: "UPI_OFFLINE", label: "Offline — UPI (collected outside the app)" },
  { value: "CASH", label: "Offline — Cash" },
  { value: "CHEQUE", label: "Offline — Cheque" },
];
// Grant note 3–500 characters; reference number optional, up to 80.
export const GRANT_RULES = { noteMin: 3, noteMax: 500, referenceMax: 80 };

// Offline deed note (#25g): 2–1000 characters.
export const DEED_NOTE = { min: 2, max: 1000 };

// File rules the server applies to KYC files (checked here only to save a failed upload).
export const DOCUMENT_RULES = {
  maxSizeBytes: 5 * 1024 * 1024,
  accept: ".pdf,.jpg,.jpeg,.png",
  types: /^(application\/pdf|image\/jpe?g|image\/png)$/i,
  minTitle: 2,
  maxTitle: 80,
};

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
