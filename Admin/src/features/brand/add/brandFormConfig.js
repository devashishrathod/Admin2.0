/* -------------------------------------------------------------------------
 * brandFormConfig.js
 * Everything the Add Brand wizard needs that isn't UI: dropdown options,
 * the empty form, per-step validation and the multipart payload builder.
 * The form state mirrors the backend body section-by-section, so building
 * the request is mostly stripping UI-only fields (ids, files, confirm
 * account number) and filling the fixed values.
 * ---------------------------------------------------------------------- */

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const ENTITY_TYPES = [
  { value: "PRIVATE_LIMITED", label: "Private Limited Company" },
  { value: "LLP", label: "Limited Liability Partnership" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "SOLE_PROPRIETORSHIP", label: "Sole Proprietorship" },
];

export const REGISTRATION_STATUSES = [
  { value: "REGISTERED", label: "Registered" },
  { value: "UNREGISTERED", label: "Unregistered" },
];

// Unregistered businesses have no PAN/GST to collect — the GST & PAN step
// is skipped and neither block is sent.
export const isRegisteredBusiness = (form) => form.basicDetails.businessRegistrationStatus === "REGISTERED";

export const ACCOUNT_TYPES = [
  { value: "CURRENT", label: "Current" },
  { value: "SAVINGS", label: "Savings" },
];

// "CUSTOM" is the only section type confirmed so far (see showcaseApi.js).
export const SECTION_TYPES = [{ value: "CUSTOM", label: "Custom" }];

// Input sanitisers — applied on change so fields can never hold bad characters.
export const onlyDigits = (value, max) => value.replace(/\D/g, "").slice(0, max);
export const upperAlnum = (value, max) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max);

let uid = 0;
const newId = () => `${Date.now()}-${uid++}`;

export const createFeature = () => ({
  id: newId(),
  title: "",
  description: "",
  isActive: true,
  icon: null,
});

export const createAlbum = (sortOrder) => ({
  id: newId(),
  title: "",
  description: "",
  sortOrder,
  sectionType: "CUSTOM",
  isShowInVideoClips: false,
  files: [],
});

export function createInitialForm() {
  return {
    owner: { whatsappNumber: "" },
    basicDetails: {
      legalBusinessName: "",
      brandName: "",
      businessRegistrationStatus: "REGISTERED",
      businessEntityType: "",
    },
    pan: { pan: "" },
    gst: { gstNumber: "" },
    bank: {
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: "",
      beneficiaryName: "",
      accountType: "CURRENT",
      accountHolderName: "",
    },
    brandDetails: {
      email: "",
      mobile: "",
      description: "",
      categoryId: "",
      subCategoryId: "",
      logo: null,
      // UI-only: names kept for the Review step, not sent to the API.
      categoryName: "",
      subCategoryName: "",
    },
    outlet: { whatsappNumber: "", description: "" },
    location: {
      addressLine1: "",
      addressLine2: "",
      landmark: "",
      city: "",
      district: "",
      state: "",
      zipcode: "",
      country: "India",
    },
    workingHours: Object.fromEntries(
      DAYS.map((day) => [day, { start: "09:00", end: "22:00", isOpen: day !== "sunday" }])
    ),
    listingFeatures: [],
    showcase: [],
  };
}

/* -------------------------------------------------------------------------
 * Validation — each validator returns { "section.field": "message" }.
 * An empty object means the step is complete.
 * ---------------------------------------------------------------------- */
const PATTERNS = {
  mobile: /^[6-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  gst: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  accountNumber: /^\d{9,18}$/,
  zipcode: /^[1-9]\d{5}$/,
};

const isBlank = (value) => !String(value ?? "").trim();

function check(errors, key, value, { required = true, pattern, message } = {}) {
  if (isBlank(value)) {
    if (required) errors[key] = "This field is required";
    return;
  }
  if (pattern && !pattern.test(value)) errors[key] = message;
}

function validateBusiness({ owner, basicDetails }) {
  const e = {};
  check(e, "owner.whatsappNumber", owner.whatsappNumber, { pattern: PATTERNS.mobile, message: "Enter a valid 10-digit mobile number" });
  check(e, "basicDetails.legalBusinessName", basicDetails.legalBusinessName);
  check(e, "basicDetails.brandName", basicDetails.brandName);
  check(e, "basicDetails.businessEntityType", basicDetails.businessEntityType);
  return e;
}

function validateGstPan({ pan, gst }) {
  const e = {};
  check(e, "pan.pan", pan.pan, { pattern: PATTERNS.pan, message: "PAN should look like ABCDE1234F" });
  check(e, "gst.gstNumber", gst.gstNumber, {
    pattern: PATTERNS.gst,
    message: "GSTIN should look like 29ABCDE1234F1Z5",
  });
  // Characters 3–12 of a GSTIN are the holder's PAN.
  if (!e["gst.gstNumber"] && !e["pan.pan"] && gst.gstNumber && gst.gstNumber.slice(2, 12) !== pan.pan) {
    e["gst.gstNumber"] = "This GSTIN doesn't belong to the PAN entered above";
  }
  return e;
}

function validateBank({ bank }) {
  const e = {};
  check(e, "bank.accountNumber", bank.accountNumber, { pattern: PATTERNS.accountNumber, message: "Account number should be 9–18 digits" });
  check(e, "bank.confirmAccountNumber", bank.confirmAccountNumber);
  if (!e["bank.confirmAccountNumber"] && bank.confirmAccountNumber !== bank.accountNumber) {
    e["bank.confirmAccountNumber"] = "Account numbers don't match";
  }
  check(e, "bank.ifscCode", bank.ifscCode, { pattern: PATTERNS.ifsc, message: "IFSC should look like HDFC0001234" });
  check(e, "bank.beneficiaryName", bank.beneficiaryName);
  check(e, "bank.accountHolderName", bank.accountHolderName);
  return e;
}

function validateBrandProfile({ brandDetails }) {
  const e = {};
  if (!brandDetails.logo) e["brandDetails.logo"] = "Upload the brand logo";
  check(e, "brandDetails.email", brandDetails.email, { pattern: PATTERNS.email, message: "Enter a valid email address" });
  check(e, "brandDetails.mobile", brandDetails.mobile, { pattern: PATTERNS.mobile, message: "Enter a valid 10-digit mobile number" });
  check(e, "brandDetails.categoryId", brandDetails.categoryId);
  check(e, "brandDetails.subCategoryId", brandDetails.subCategoryId);
  return e;
}

function validateOutlet({ outlet, location }) {
  const e = {};
  check(e, "outlet.whatsappNumber", outlet.whatsappNumber, { pattern: PATTERNS.mobile, message: "Enter a valid 10-digit mobile number" });
  check(e, "location.addressLine1", location.addressLine1);
  check(e, "location.city", location.city);
  check(e, "location.district", location.district);
  check(e, "location.state", location.state);
  check(e, "location.zipcode", location.zipcode, { pattern: PATTERNS.zipcode, message: "Enter a valid 6-digit pincode" });
  check(e, "location.country", location.country);
  return e;
}

function validateHours({ workingHours }) {
  const e = {};
  DAYS.forEach((day) => {
    const { isOpen, start, end } = workingHours[day];
    if (!isOpen) return;
    if (!start || !end) e[`workingHours.${day}`] = "Set both opening and closing time";
    else if (start >= end) e[`workingHours.${day}`] = "Closing time must be after opening time";
  });
  return e;
}

function validateFeatures({ listingFeatures }) {
  const e = {};
  listingFeatures.forEach((f, i) => {
    check(e, `listingFeatures.${i}.title`, f.title);
    if (!f.icon) e[`listingFeatures.${i}.icon`] = "Icon required";
  });
  return e;
}

function validateShowcase({ showcase }) {
  const e = {};
  showcase.forEach((s, i) => {
    check(e, `showcase.${i}.title`, s.title);
    if (!s.files.length) e[`showcase.${i}.files`] = "Add at least one photo or video";
  });
  return e;
}

export const VALIDATORS = {
  business: validateBusiness,
  gstPan: validateGstPan,
  bank: validateBank,
  brandProfile: validateBrandProfile,
  outlet: validateOutlet,
  hours: validateHours,
  features: validateFeatures,
  showcase: validateShowcase,
  review: () => ({}),
};

/* -------------------------------------------------------------------------
 * Request body. Files can't live inside JSON, so the body goes as a
 * `data` JSON string and every file as its own multipart part.
 * NOTE: confirm the file keys with the backend before going live.
 * ---------------------------------------------------------------------- */
export function buildBrandPayload(form) {
  // eslint-disable-next-line no-unused-vars
  const { confirmAccountNumber, ...bank } = form.bank;
  // eslint-disable-next-line no-unused-vars
  const { logo, categoryName, subCategoryName, ...brandDetails } = form.brandDetails;
  return {
    owner: { whatsappNumber: form.owner.whatsappNumber, role: "VENDOR" },
    basicDetails: form.basicDetails,
    ...(isRegisteredBusiness(form)
      ? { pan: { pan: form.pan.pan }, gst: { gstNumber: form.gst.gstNumber } }
      : {}),
    bank,
    brandDetails: {
      ...brandDetails,
      brandName: form.basicDetails.brandName,
      isOnboarding: true,
    },
    outlet: {
      outletType: "OUTLET",
      whatsappNumber: form.outlet.whatsappNumber,
      isFirstOutlet: true,
      description: form.outlet.description.trim() || brandDetails.description,
      isActive: true,
    },
    location: form.location,
    workingHours: form.workingHours,
    // eslint-disable-next-line no-unused-vars
    listingFeatures: form.listingFeatures.map(({ id, icon, ...feature }) => feature),
    // eslint-disable-next-line no-unused-vars
    showcase: form.showcase.map(({ id, files, ...album }) => album),
  };
}

export function buildBrandFormData(form) {
  const fd = new FormData();
  fd.append("data", JSON.stringify(buildBrandPayload(form)));
  if (form.brandDetails.logo) fd.append("logo", form.brandDetails.logo);
  form.listingFeatures.forEach((feature, i) => {
    if (feature.icon) fd.append(`listingFeatures[${i}].icon`, feature.icon);
  });
  form.showcase.forEach((album, i) => {
    album.files.forEach((file) => fd.append(`showcase[${i}].files`, file));
  });
  return fd;
}
