/* -------------------------------------------------------------------------
 * Query keys — the names cached server data is stored under.
 *
 * RULE: every key starts with its API resource, i.e. the first segment of
 * the endpoint URL:
 *
 *   GET /showcase/section/get-all   →  ["showcase", ...]
 *   GET /brands/admin/get-all       →  ["brands", ...]
 *
 * 
 * invalidateAfterWrite.js relies on this: a successful
 * POST /showcase/section/:id/add-media invalidates everything under
 * ["showcase"], so every showcase query refetches. Invalidation matches by
 * prefix — ["showcase"] also hits ["showcase", "brand", "123"].
 *
 * Always build keys through these helpers, never inline arrays in
 * components, so a key can't be misspelled and stay silently stale.
 *
 * Adding a feature: add one line below, then a queries file for it (see
 * features/brand/queries/showcaseQueries.js for the pattern).
 * ---------------------------------------------------------------------- */

/* The same four shapes for every resource:
 *   all              ["brands"]                        — invalidate everything
 *   list(params)     ["brands", "list", {page, …}]     — a list / page of rows
 *   detail(id)       ["brands", "detail", id]          — one row
 *   view(name, p)    ["brands", "top-brands", {…}]     — any other read of the
 *                                                       resource (reports,
 *                                                       history, stats, …)
 * `params` objects are part of the key: different filters = separate cache
 * entries, and changing a filter fetches (or reuses) the matching one. */
function resourceKeys(root) {
  return {
    all: [root],
    list: (params = {}) => [root, "list", params],
    detail: (id) => [root, "detail", id],
    view: (name, params = {}) => [root, name, params],
  };
}

export const queryKeys = {
  // URL resource in the comment when it differs from the name.
  brands: resourceKeys("brands"),
  brandFeatures: resourceKeys("brandFeatures"),
  subBrands: resourceKeys("subBrands"),
  showcase: {
    ...resourceKeys("showcase"),
    // Every album of one brand, each with its media.
    brand: (brandId) => ["showcase", "brand", brandId],
  },
  vouchers: resourceKeys("vouchers"),
  voucherClaims: resourceKeys("voucher-claims"), // Transactions
  customers: resourceKeys("customers"),
  banners: resourceKeys("banners"),
  categories: resourceKeys("categories"),
  subCategories: resourceKeys("subCategories"),
  faqs: resourceKeys("faqs"),
  settings: resourceKeys("settings"),
  plans: resourceKeys("subscriptions"), // subscription plans
  subscribeds: resourceKeys("subscribeds"), // brands' purchased plans
  refunds: resourceKeys("refunds"),
  settlements: resourceKeys("settlements"),
  promoCodes: resourceKeys("promoCodes"),
  promotionalTickers: resourceKeys("promotionalTickers"),
  notifications: resourceKeys("notifications"),
  termsAndConditions: resourceKeys("terms-and-conditions"),
  privacyPolicies: resourceKeys("privacy-and-policies"),
};
