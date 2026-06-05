// ── Plan data — single source of truth ───────────────────────────────────────
export const PLANS = [
  {
    id: "basic",
    label: "Basic",
    price: 1999,
    originalPrice: 4000,
    discount: 50,
    priceInWords: "One thousand nine hundred ninety nine Rupees Only",
    // pie icon fill: quarter
    iconFill: 0.25,
  },
  {
    id: "advanced",
    label: "Advanced",
    price: 2999,
    originalPrice: 6000,
    discount: 50,
    priceInWords: "Two thousand nine hundred ninety nine Rupees Only",
    iconFill: 0.50,
  },
  {
    id: "pro-lite",
    label: "Pro Lite",
    price: 3999,
    originalPrice: 8000,
    discount: 50,
    priceInWords: "Three thousand nine hundred ninety nine Rupees Only",
    iconFill: 0.75,
  },
  {
    id: "pro-plus",
    label: "Pro Plus",
    price: 4999,
    originalPrice: 10000,
    discount: 50,
    priceInWords: "Four thousand nine hundred ninety nine Rupees Only",
    iconFill: 1,
  },
];

// ── Comparison table rows ─────────────────────────────────────────────────────
export const COMPARISON_ROWS = [
  {
    feature: "Plan Valid",
    icon: "calendar",
    values: ["12 / Month", "12 / Month", "12 / Month", "12 / Month"],
  },
  {
    feature: "Transactions",
    icon: "transaction",
    values: ["Unlimited", "Unlimited", "Unlimited", "Unlimited"],
  },
  {
    feature: "Settlements",
    icon: "settlement",
    values: ["On - Time", "On - Time", "On - Time", "On - Time"],
  },
  {
    feature: "Sub Brand",
    icon: "brand",
    values: ["01", "15", "25", "Unlimited"],
  },
  {
    feature: "Franchise",
    icon: "franchise",
    values: [false, true, true, true],
  },
  {
    feature: "Deal Pack",
    icon: "deal",
    values: [false, true, true, true],
  },
  {
    feature: "Voucher",
    icon: "voucher",
    values: [false, false, true, true],
  },
  {
    feature: "Priority Support",
    icon: "support",
    values: [false, false, true, true],
  },
];