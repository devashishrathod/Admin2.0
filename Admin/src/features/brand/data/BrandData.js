/* -------------------------------------------------------------------------
 * BrandData.js
 * All mock data, static option lists and the CSV export helper live here so
 * that Brand.jsx (list page) and BrandDetails.jsx (details page) can both
 * import from a single source of truth.
 * ---------------------------------------------------------------------- */

export const INITIAL_BRANDS = [
  {
    id: 1,
    brandId: "#17f51b",
    brandName: "Jr Unisex Salon",
    tagline: "No one knows interiors better",
    emoji: "J",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=Jr-Unisex-Salon&backgroundType=gradientLinear",
    followers: 1,
    location: "Kanpur, Uttar Pradesh",
    category: "Beauty & Personal Care",
    liveSince: "2026",
    active: true,
    status: "Active",
    rejectionReason: "",

    subBrandCount: "1/1",
    outlets: [
      {
        name: "Jr Unisex Salon - Mall Road",
        address: "Shop 12, Mall Road, Kanpur",
        status: "Active",
      },
    ],

    contactPhone: "+91 98765 43210",
    contactEmail: "hello@jrunisexsalon.com",

    planPrice: "₹1,999",
    planType: "Annual",
    subscriptionPlan: "Basic",
    subscriptionTerm: "1 Year",
    expiredInDays: 357,
    remainderPercent: 92,

    ownerName: "Rohan Mehta",
    gstNumber: "09ABCDE1234F1Z5",
    gstVerified: true,
    panNumber: "ABCDE1234F",
    panVerified: true,
    bankVerified: true,
    bankName: "HDFC Bank",
    accountHolder: "Jr Unisex Salon Pvt Ltd",

    about:
      "A modern unisex salon chain focused on premium grooming experiences, contemporary interiors and friendly service.",
    website: "www.jrunisexsalon.com",
    tags: ["Salon", "Grooming", "Unisex", "Premium"],
    shortName: "JrSalon",
    businessType: "Sole Proprietorship",
    businessStatus: "GST Registered",
    merchantToken: "mch_17f51b_9xQ2vD4kLm",
    ambiencePhotos: [
      "https://picsum.photos/seed/jr-salon-1/480/320",
      "https://picsum.photos/seed/jr-salon-2/480/320",
      "https://picsum.photos/seed/jr-salon-3/480/320",
    ],
    ambienceVideo: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",

    listings: [
      { name: "Haircut & Styling", price: "₹399", status: "Active" },
      { name: "Beard Grooming", price: "₹249", status: "Active" },
      { name: "Facial & Cleanup", price: "₹899", status: "Inactive" },
    ],

    settlements: [
      { id: "STL-8821", date: "2026-07-05", amount: "₹12,400", status: "Paid" },
      { id: "STL-8790", date: "2026-06-28", amount: "₹9,150", status: "Paid" },
      { id: "STL-8765", date: "2026-06-21", amount: "₹6,300", status: "Pending" },
    ],

    reviews: [
      { author: "Ananya S.", rating: 5, comment: "Great service and clean interiors.", date: "2026-07-02" },
      { author: "Rahul V.", rating: 4, comment: "Good haircut, slightly long wait.", date: "2026-06-20" },
    ],

    invoices: [
      { id: "INV-2026-014", date: "2026-01-15", amount: "₹1,999", status: "Paid" },
      { id: "INV-2025-014", date: "2025-01-15", amount: "₹1,799", status: "Paid" },
    ],
  },
  {
    id: 2,
    brandId: "#22ac93",
    brandName: "Spice Route Kitchen",
    tagline: "Flavours from every corner of India",
    emoji: "S",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=Spice-Route-Kitchen&backgroundType=gradientLinear",
    followers: 340,
    location: "Lucknow, Uttar Pradesh",
    category: "Food & Beverage",
    liveSince: "2025",
    active: true,
    status: "Active",
    rejectionReason: "",

    subBrandCount: "1/1",
    outlets: [
      {
        name: "Spice Route - Hazratganj",
        address: "14 Hazratganj Market, Lucknow",
        status: "Active",
      },
    ],

    contactPhone: "+91 91234 56789",
    contactEmail: "contact@spiceroute.in",

    planPrice: "₹2,999",
    planType: "Annual",
    subscriptionPlan: "Advance",
    subscriptionTerm: "1 Year",
    expiredInDays: 210,
    remainderPercent: 58,

    ownerName: "Ayesha Khan",
    gstNumber: "09PQRSX5678K1Z2",
    gstVerified: true,
    panNumber: "PQRSX5678K",
    panVerified: true,
    bankVerified: true,
    bankName: "ICICI Bank",
    accountHolder: "Spice Route Foods",

    about:
      "Regional Indian kitchen serving authentic recipes with a focus on fresh, seasonal ingredients.",
    website: "www.spiceroutekitchen.in",
    tags: ["Restaurant", "North Indian", "Family Dining"],
    shortName: "SpiceRoute",
    businessType: "Partnership",
    businessStatus: "GST Registered",
    merchantToken: "mch_22ac93_7pR9wZ1nQe",
    ambiencePhotos: [
      "https://picsum.photos/seed/spice-route-1/480/320",
      "https://picsum.photos/seed/spice-route-2/480/320",
      "https://picsum.photos/seed/spice-route-3/480/320",
    ],
    ambienceVideo: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",

    listings: [
      { name: "Thali (Veg)", price: "₹249", status: "Active" },
      { name: "Butter Chicken", price: "₹329", status: "Active" },
    ],

    settlements: [
      { id: "STL-7710", date: "2026-07-08", amount: "₹18,900", status: "Paid" },
      { id: "STL-7699", date: "2026-06-30", amount: "₹15,220", status: "Paid" },
    ],

    reviews: [
      { author: "Manish K.", rating: 5, comment: "Best butter chicken in town.", date: "2026-07-01" },
    ],

    invoices: [{ id: "INV-2026-009", date: "2026-01-09", amount: "₹1,999", status: "Paid" }],
  },
  {
    id: 3,
    brandId: "#39be47",
    brandName: "GlowUp Cosmetics",
    tagline: "Beauty, simplified",
    emoji: "G",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=GlowUp-Cosmetics&backgroundType=gradientLinear",
    followers: 88,
    location: "Noida, Uttar Pradesh",
    category: "Beauty & Personal Care",
    liveSince: "2026",
    active: false,
    status: "Pending",
    rejectionReason: "",

    subBrandCount: "1/1",
    outlets: [
      {
        name: "GlowUp - Sector 18",
        address: "Shop 4, Sector 18, Noida",
        status: "Pending",
      },
    ],

    contactPhone: "+91 90000 11223",
    contactEmail: "support@glowupcosmetics.com",

    planPrice: "₹3,999",
    planType: "Annual",
    subscriptionPlan: "Pro",
    subscriptionTerm: "1 Year",
    expiredInDays: 365,
    remainderPercent: 100,

    ownerName: "Neha Sharma",
    gstNumber: "09LMNOP9012G1Z8",
    gstVerified: true,
    panNumber: "LMNOP9012G",
    panVerified: false,
    bankVerified: true,
    bankName: "Axis Bank",
    accountHolder: "GlowUp Cosmetics LLP",

    about: "Clean-label cosmetics brand with a curated skincare and makeup line.",
    website: "www.glowupcosmetics.com",
    tags: ["Cosmetics", "Skincare", "D2C"],
    shortName: "GlowUp",
    businessType: "Limited Liability Partnership",
    businessStatus: "GST Registered",
    merchantToken: "mch_39be47_3kT8yB6vXs",
    ambiencePhotos: [
      "https://picsum.photos/seed/glowup-1/480/320",
      "https://picsum.photos/seed/glowup-2/480/320",
    ],
    ambienceVideo: null,

    listings: [{ name: "Starter Skincare Kit", price: "₹1,299", status: "Active" }],

    settlements: [],

    reviews: [],

    invoices: [{ id: "INV-2026-021", date: "2026-07-11", amount: "₹9,999", status: "Pending" }],
  },
  {
    id: 4,
    brandId: "#45df02",
    brandName: "TechHub Electronics",
    tagline: "Gadgets you can trust",
    emoji: "T",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=TechHub-Electronics&backgroundType=gradientLinear",
    followers: 512,
    location: "Kanpur, Uttar Pradesh",
    category: "Electronics",
    liveSince: "2024",
    active: false,
    status: "Rejected",
    rejectionReason: "Bank account details could not be verified with the submitted PAN.",

    subBrandCount: "1/2",
    outlets: [
      { name: "TechHub - Civil Lines", address: "22 Civil Lines, Kanpur", status: "Rejected" },
    ],

    contactPhone: "+91 99887 76655",
    contactEmail: "care@techhub.in",

    planPrice: "₹4,999",
    planType: "Annual",
    subscriptionPlan: "Pro Lite",
    subscriptionTerm: "1 Year",
    expiredInDays: 0,
    remainderPercent: 0,

    ownerName: "Vikram Singh",
    gstNumber: "09TUVWX3456H1Z1",
    gstVerified: true,
    panNumber: "TUVWX3456H",
    panVerified: true,
    bankVerified: false,
    bankName: "SBI",
    accountHolder: "TechHub Electronics",

    about: "Consumer electronics retailer specialising in mobiles, audio and accessories.",
    website: "www.techhub.in",
    tags: ["Electronics", "Retail"],
    shortName: "TechHub",
    businessType: "Private Limited Company",
    businessStatus: "GST Registered",
    merchantToken: "mch_45df02_5hN2cF8jRt",
    ambiencePhotos: [
      "https://picsum.photos/seed/techhub-1/480/320",
      "https://picsum.photos/seed/techhub-2/480/320",
      "https://picsum.photos/seed/techhub-3/480/320",
    ],
    ambienceVideo: null,

    listings: [{ name: "Screen Protection Service", price: "₹199", status: "Inactive" }],

    settlements: [{ id: "STL-6600", date: "2026-05-14", amount: "₹4,100", status: "Failed" }],

    reviews: [{ author: "Sonal G.", rating: 2, comment: "Order got delayed.", date: "2026-05-01" }],

    invoices: [{ id: "INV-2026-002", date: "2026-01-02", amount: "₹4,999", status: "Overdue" }],
  },

  /* -----------------------------------------------------------------------
   * Incomplete onboarding — brand owner started the "Add Brand" flow but
   * dropped off (logged out / cut the flow) somewhere between Step 1 and
   * final payment, so the brand never went live. These surface under the
   * "UnderListing" tab instead of Active / Pending / Rejected.
   * -------------------------------------------------------------------- */
  {
    id: 5,
    brandId: "#58lm91",
    brandName: "Urban Bites Cafe",
    tagline: "Coffee, comfort food & co-working",
    emoji: "U",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=Urban-Bites-Cafe&backgroundType=gradientLinear",
    followers: 0,
    location: "Kanpur, Uttar Pradesh",
    category: "Food & Beverage",
    liveSince: "2026",
    active: false,
    status: "Draft",
    rejectionReason: "",

    onboardingComplete: false,
    onboardingStep: "Bank Verification",
    onboardingStepIndex: 5,
    onboardingTotalSteps: 8,
    lastActiveOn: "2026-07-09",

    subBrandCount: "0/0",
    outlets: [],

    contactPhone: "+91 90011 22334",
    contactEmail: "owner@urbanbites.in",

    planPrice: "—",
    planType: "—",
    subscriptionPlan: "—",
    subscriptionTerm: "—",
    expiredInDays: 0,
    remainderPercent: 0,

    ownerName: "Karan Das",
    gstNumber: "09KDZXP7788L1Z4",
    gstVerified: true,
    panNumber: "KDZXP7788L",
    panVerified: true,
    bankVerified: false,
    bankName: "—",
    accountHolder: "—",

    about: "Onboarding started but not completed. Owner exited after PAN & GST verification, before bank verification was finished.",
    website: "—",
    tags: [],
    shortName: "UrbanBites",
    businessType: "Food & Beverage",
    businessStatus: "GST Registered",
    merchantToken: "mch_58lm91_1aZ7oK3sVn",
    ambiencePhotos: [],
    ambienceVideo: null,

    listings: [],
    settlements: [],
    reviews: [],
    invoices: [],
  },
  {
    id: 6,
    brandId: "#63np44",
    brandName: "Pawsome Pet Studio",
    tagline: "Grooming & care for your best friend",
    emoji: "P",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=Pawsome-Pet-Studio&backgroundType=gradientLinear",
    followers: 0,
    location: "Lucknow, Uttar Pradesh",
    category: "Pet Care",
    liveSince: "2026",
    active: false,
    status: "Draft",
    rejectionReason: "",

    onboardingComplete: false,
    onboardingStep: "Plan & Payment",
    onboardingStepIndex: 7,
    onboardingTotalSteps: 8,
    lastActiveOn: "2026-07-12",

    subBrandCount: "1/1",
    outlets: [
      {
        name: "Pawsome Pet Studio - Gomti Nagar",
        address: "Shop 9, Gomti Nagar, Lucknow",
        status: "Draft",
      },
    ],

    contactPhone: "+91 98123 44556",
    contactEmail: "hello@pawsomepets.in",

    planPrice: "₹4,999",
    planType: "Annual",
    subscriptionPlan: "Pro Lite",
    subscriptionTerm: "1 Year",
    expiredInDays: 0,
    remainderPercent: 0,

    ownerName: "Simran Kaur",
    gstNumber: "09SKPQ2233M1Z9",
    gstVerified: true,
    panNumber: "SKPQ2233M",
    panVerified: true,
    bankVerified: true,
    bankName: "Kotak Mahindra Bank",
    accountHolder: "Pawsome Pet Studio",

    about: "Onboarding reached the plan selection & payment step. Payment was attempted but the session was cut before it completed.",
    website: "www.pawsomepets.in",
    tags: ["Pet Grooming", "Pet Care"],
    shortName: "Pawsome",
    businessType: "Pet Care",
    businessStatus: "GST Registered",
    merchantToken: "mch_63np44_4dW6qP2xHr",
    ambiencePhotos: [
      "https://picsum.photos/seed/pawsome-1/480/320",
      "https://picsum.photos/seed/pawsome-2/480/320",
    ],
    ambienceVideo: null,

    listings: [],
    settlements: [],
    reviews: [],
    invoices: [],
  },
];

export const STATUS_TABS = ["All", "Complete Listing", "UnderListing"];

/* Subscription plans offered — used to label brand cards and to power the plan filter */
export const PLANS = [
  { name: "Basic", price: "₹1,999" },
  { name: "Advance", price: "₹2,999" },
  { name: "Pro", price: "₹3,999" },
  { name: "Pro Lite", price: "₹4,999" },
];

/* Options used by the "Add Listing" / "Edit Brand" forms */
export const BUSINESS_STATUSES = ["GST Registered", "GST Pending", "Proprietorship", "Partnership", "Private Limited", "LLP", "Other"];
export const BUSINESS_TYPES = [
  "Retail",
  "Food & Beverage",
  "Beauty & Personal Care",
  "Electronics",
  "Pet Care",
  "Services",
  "Sole Proprietorship",
  "Partnership",
  "Private Limited Company",
  "Limited Liability Partnership",
  "Other",
];
export const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Trydood Account", "Other"];

export const DETAIL_TABS = [
  "Overview",
  "Brand Info",
  "Ambience",
  "Sub-Brand",
  // "Listings",
  "Settlements",
  "Review",
  "Subscription",
  "System Verification",
  "Account Details",
];

/* Order of onboarding steps, used to show progress for incomplete brands */
export const ONBOARDING_STEPS = [
  "Brand Name & Short Description",
  "Business Status",
  "Business Type",
  "PAN Verification",
  "GST Verification",
  "Bank Verification",
  "Outlet, Logo & Other Details",
  "Plan & Payment",
];

/* Reasons a super admin can pick from (or override) when rejecting a listing */
export const REJECTION_REASONS = [
  "Incomplete or unclear documents",
  "GST number could not be verified",
  "PAN number could not be verified",
  "Bank account details do not match",
  "Duplicate brand listing",
  "Policy / category not allowed",
  "Other",
];

/* -------------------------------------------------------------------------
 * CSV export helper
 * ---------------------------------------------------------------------- */

export function exportBrandsToCsv(brandList) {
  if (!brandList?.length) return;

  const headers = [
    "Brand Id",
    "Brand Name",
    "Category",
    "Location",
    "Status",
    "Rejection Reason",
    "Onboarding",
    "Sub-Brand",
    "Owner",
    "Phone",
    "Email",
    "GST Number",
    "PAN Number",
    "Plan",
  ];

  const rows = brandList.map((b) => [
    b.brandId,
    b.brandName,
    b.category,
    b.location,
    b.status,
    b.status === "Rejected" ? b.rejectionReason || "—" : "",
    b.onboardingComplete === false ? `Incomplete – ${b.onboardingStep}` : "Complete",
    b.subBrandCount,
    b.ownerName,
    b.contactPhone,
    b.contactEmail,
    b.gstNumber,
    b.panNumber,
    b.subscriptionPlan,
  ]);

  const escapeCell = (cell) => {
    const value = String(cell ?? "");
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `brands-${dateStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}