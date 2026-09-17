/**
 * Promo code enums and limits — mirrors the backend's own
 * server/constants/promoCode.js exactly, so the admin form can never send
 * a value the Joi validator would reject.
 *
 * A promo code discount is applied on top of the plan's own discount, to
 * the already-discounted subtotal — never to the list price.
 */

export const PROMO_DISCOUNT_TYPES = Object.freeze({
  PERCENT: "PERCENT",
  FLAT: "FLAT",
});

// Who a code is for. The same collection serves two checkouts that must
// never see each other's codes — a vendor subscription discount and a
// customer voucher-claim discount. Defaults to VENDOR on write.
export const PROMO_AUDIENCE = Object.freeze({
  VENDOR: "VENDOR",
  CUSTOMER: "CUSTOMER",
});

// What a customer-side discount is subtracted from — NET_BILL is the
// vendor's supply after the voucher offer, CONVENIENCE_FEE is Trydood's
// own fee.
export const PROMO_APPLIES_TO = Object.freeze({
  NET_BILL: "NET_BILL",
  CONVENIENCE_FEE: "CONVENIENCE_FEE",
});

// Who funds a customer-side discount. VENDOR and SHARED take money out of
// a specific vendor's pocket, so a code using either must be scoped with
// brandIds (enforced server-side in assertCoherent — validated here too).
export const PROMO_COST_BEARING_MODE = Object.freeze({
  PLATFORM: "PLATFORM",
  VENDOR: "VENDOR",
  SHARED: "SHARED",
});

// Which checkout actions a code may be used for (vendor-subscription
// side). An empty list on the code document means "any".
export const PROMO_APPLICABLE_ACTIONS = Object.freeze({
  NEW: "NEW",
  RENEW: "RENEW",
  UPGRADE: "UPGRADE",
  DOWNGRADE: "DOWNGRADE",
});

// A code is claimed in three steps so an abandoned checkout cannot burn a
// single-use code. Shown on the details page's recent-usages table.
export const PROMO_USAGE_STATUS = Object.freeze({
  RESERVED: "RESERVED",
  CONSUMED: "CONSUMED",
  RELEASED: "RELEASED",
});

export const PROMO_CODE_LIMITS = Object.freeze({
  MIN_CODE_LENGTH: 3,
  MAX_CODE_LENGTH: 40,
  MAX_DESCRIPTION_LENGTH: 300,
  RESERVATION_TTL_MINUTES: 30,
});

// Effective status, computed server-side from validFrom/validTill — not
// something the admin sets directly.
export const PROMO_STATUSES = Object.freeze({
  LIVE: "LIVE",
  SCHEDULED: "SCHEDULED",
  EXPIRED: "EXPIRED",
});

// Campaign reporting caps — not used by this page yet, kept here so a
// future report screen doesn't drift from the backend's own limits.
export const REPORT_GROUP_BY = Object.freeze({ DAY: "day", MONTH: "month" });
export const REPORT_LIMITS = Object.freeze({
  MAX_CODES: 100,
  MAX_BRANDS: 25,
  MAX_PERIODS: 400,
});

/* -------------------------------------------------------------------------
 * UI label maps — one place for every enum's display text.
 * ---------------------------------------------------------------------- */

export const DISCOUNT_TYPE_LABELS = {
  [PROMO_DISCOUNT_TYPES.PERCENT]: "Percent",
  [PROMO_DISCOUNT_TYPES.FLAT]: "Flat",
};

export const AUDIENCE_LABELS = {
  [PROMO_AUDIENCE.VENDOR]: "Vendor (subscription checkout)",
  [PROMO_AUDIENCE.CUSTOMER]: "Customer (voucher claim checkout)",
};

export const APPLIES_TO_LABELS = {
  [PROMO_APPLIES_TO.NET_BILL]: "Net Bill (vendor's supply)",
  [PROMO_APPLIES_TO.CONVENIENCE_FEE]: "Convenience Fee (platform's fee)",
};

export const COST_BEARING_LABELS = {
  [PROMO_COST_BEARING_MODE.PLATFORM]: "Platform pays",
  [PROMO_COST_BEARING_MODE.VENDOR]: "Vendor pays",
  [PROMO_COST_BEARING_MODE.SHARED]: "Shared",
};

export const APPLICABLE_ACTION_LABELS = {
  [PROMO_APPLICABLE_ACTIONS.NEW]: "New",
  [PROMO_APPLICABLE_ACTIONS.RENEW]: "Renew",
  [PROMO_APPLICABLE_ACTIONS.UPGRADE]: "Upgrade",
  [PROMO_APPLICABLE_ACTIONS.DOWNGRADE]: "Downgrade",
};
