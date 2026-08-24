
import React, { useState } from "react";
import {
  Search,
  LayoutGrid,
  List,
  MapPin,
  Store,
  ArrowLeft,
  Phone,
  Mail,
  Users,
  Star,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Download,
  ShieldCheck,
  BadgeCheck,
  Landmark,
  Tag,
  Globe,
  ChevronRight,
  Trash2,
  FileDown,
  AlertTriangle,
  SlidersHorizontal,
  Check,
  X,
  Copy,
  Image as ImageIcon,
  KeyRound,
  Briefcase,
  Activity,
  PlayCircle,
} from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";

/* -------------------------------------------------------------------------
 * Mock data
 * ---------------------------------------------------------------------- */

const INITIAL_BRANDS = [
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
    status: "Expired",

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
    expiredInDays: 0,
    remainderPercent: 0,

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
    status: "Expired",

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
  {
    id: 5,
    brandId: "#71qz18",
    brandName: "Zenith Furniture Co.",
    tagline: "Furniture that fits your life",
    emoji: "Z",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=Zenith-Furniture-Co&backgroundType=gradientLinear",
    followers: 176,
    location: "Kanpur, Uttar Pradesh",
    category: "Home & Furniture",
    liveSince: "2025",
    active: false,
    status: "Deactive",

    subBrandCount: "1/1",
    outlets: [
      {
        name: "Zenith Furniture - Kakadeo",
        address: "18 Kakadeo Market, Kanpur",
        status: "Inactive",
      },
    ],

    contactPhone: "+91 97654 32109",
    contactEmail: "sales@zenithfurniture.in",

    planPrice: "₹1,999",
    planType: "Annual",
    subscriptionPlan: "Basic",
    subscriptionTerm: "1 Year",
    expiredInDays: 128,
    remainderPercent: 35,

    ownerName: "Anil Kapoor",
    gstNumber: "09ZFCQZ1122P1Z6",
    gstVerified: true,
    panNumber: "ZFCQZ1122P",
    panVerified: true,
    bankVerified: true,
    bankName: "Punjab National Bank",
    accountHolder: "Zenith Furniture Co.",

    about:
      "Custom and ready-made furniture store. Temporarily paused listing while the owner restocks inventory.",
    website: "www.zenithfurniture.in",
    tags: ["Furniture", "Home Decor"],
    shortName: "Zenith",
    businessType: "Sole Proprietorship",
    businessStatus: "GST Registered",
    merchantToken: "mch_71qz18_2mV4xD9pLw",
    ambiencePhotos: [
      "https://picsum.photos/seed/zenith-1/480/320",
      "https://picsum.photos/seed/zenith-2/480/320",
    ],
    ambienceVideo: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",

    listings: [
      { name: "3-Seater Sofa", price: "₹18,999", status: "Inactive" },
      { name: "Dining Table Set", price: "₹22,499", status: "Inactive" },
    ],

    settlements: [
      { id: "STL-5510", date: "2026-04-20", amount: "₹8,700", status: "Paid" },
    ],

    reviews: [
      { author: "Priya D.", rating: 4, comment: "Good quality, delivery took a while.", date: "2026-04-10" },
    ],

    invoices: [{ id: "INV-2026-006", date: "2026-01-06", amount: "₹1,999", status: "Paid" }],
  },
  {
    id: 6,
    brandId: "#84rt56",
    brandName: "Bright Bake House",
    tagline: "Fresh bakes, baked daily",
    emoji: "B",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=Bright-Bake-House&backgroundType=gradientLinear",
    followers: 62,
    location: "Lucknow, Uttar Pradesh",
    category: "Food & Beverage",
    liveSince: "2026",
    active: false,
    status: "Deactive",

    subBrandCount: "1/1",
    outlets: [
      {
        name: "Bright Bake House - Aliganj",
        address: "6 Aliganj Sector D, Lucknow",
        status: "Inactive",
      },
    ],

    contactPhone: "+91 96543 21098",
    contactEmail: "orders@brightbakehouse.in",

    planPrice: "₹2,999",
    planType: "Annual",
    subscriptionPlan: "Advance",
    subscriptionTerm: "1 Year",
    expiredInDays: 264,
    remainderPercent: 72,

    ownerName: "Fatima Ali",
    gstNumber: "09BBHAL3344Q1Z3",
    gstVerified: true,
    panNumber: "BBHAL3344Q",
    panVerified: true,
    bankVerified: false,
    bankName: "Bank of Baroda",
    accountHolder: "Bright Bake House",

    about:
      "Neighbourhood bakery known for artisan breads and custom cakes. Deactivated by owner for a short break.",
    website: "www.brightbakehouse.in",
    tags: ["Bakery", "Cakes", "Desserts"],
    shortName: "BrightBake",
    businessType: "Sole Proprietorship",
    businessStatus: "GST Pending",
    merchantToken: "mch_84rt56_6qW1sJ3yUk",
    ambiencePhotos: [
      "https://picsum.photos/seed/bright-bake-1/480/320",
      "https://picsum.photos/seed/bright-bake-2/480/320",
    ],
    ambienceVideo: null,

    listings: [
      { name: "Chocolate Truffle Cake", price: "₹649", status: "Inactive" },
      { name: "Sourdough Loaf", price: "₹199", status: "Inactive" },
    ],

    settlements: [],

    reviews: [
      { author: "Devansh R.", rating: 5, comment: "Best cakes in the city, hands down.", date: "2026-03-18" },
    ],

    invoices: [{ id: "INV-2026-011", date: "2026-01-11", amount: "₹2,999", status: "Paid" }],
  },
  {
    id: 7,
    brandId: "#96wv73",
    brandName: "Metro Fitness Club",
    tagline: "Train smart, live strong",
    emoji: "M",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=Metro-Fitness-Club&backgroundType=gradientLinear",
    followers: 243,
    location: "Kanpur, Uttar Pradesh",
    category: "Health & Fitness",
    liveSince: "2024",
    active: false,
    status: "Expired",

    subBrandCount: "1/1",
    outlets: [
      {
        name: "Metro Fitness Club - Swaroop Nagar",
        address: "9 Swaroop Nagar, Kanpur",
        status: "Inactive",
      },
    ],

    contactPhone: "+91 95432 10987",
    contactEmail: "info@metrofitnessclub.in",

    planPrice: "₹1,999",
    planType: "Annual",
    subscriptionPlan: "Basic",
    subscriptionTerm: "1 Year",
    expiredInDays: 0,
    remainderPercent: 0,

    ownerName: "Deepak Yadav",
    gstNumber: "09MFCYD5566R1Z0",
    gstVerified: true,
    panNumber: "MFCYD5566R",
    panVerified: true,
    bankVerified: true,
    bankName: "Union Bank of India",
    accountHolder: "Metro Fitness Club",

    about:
      "Full-service gym and fitness studio offering strength training, group classes and personal coaching.",
    website: "www.metrofitnessclub.in",
    tags: ["Gym", "Fitness", "Personal Training"],
    shortName: "MetroFit",
    businessType: "Partnership",
    businessStatus: "GST Registered",
    merchantToken: "mch_96wv73_8bL5nH2fZq",
    ambiencePhotos: [
      "https://picsum.photos/seed/metro-fit-1/480/320",
      "https://picsum.photos/seed/metro-fit-2/480/320",
      "https://picsum.photos/seed/metro-fit-3/480/320",
    ],
    ambienceVideo: null,

    listings: [
      { name: "Monthly Membership", price: "₹1,499", status: "Inactive" },
      { name: "Personal Training (4 sessions)", price: "₹3,499", status: "Inactive" },
    ],

    settlements: [
      { id: "STL-4420", date: "2026-02-11", amount: "₹5,200", status: "Paid" },
    ],

    reviews: [
      { author: "Karan M.", rating: 3, comment: "Good equipment but membership lapsed with no renewal reminder.", date: "2026-02-01" },
    ],

    invoices: [{ id: "INV-2025-011", date: "2025-01-11", amount: "₹1,999", status: "Overdue" }],
  },
];

const STATUS_TABS = ["All", "Active Brand", "Deactive Brand", "Expired Brand"];

/* A brand counts as "expired" once its plan's remaining days hit zero —
   but only if it actually had a real plan (skips brands still in draft). */
const isExpiredBrand = (b) => b.planPrice !== "—" && b.expiredInDays <= 0;

/* Single source of truth for a brand's tab category — used everywhere a
   status pill is shown so the label always matches which tab it lives in. */
const getBrandStatusLabel = (b) => {
  if (isExpiredBrand(b)) return "Expired";
  return b.active ? "Active" : "Deactive";
};

/* Subscription plans offered — used to label brand cards and to power the plan filter */
const PLANS = [
  { name: "Basic", price: "₹1,999" },
  { name: "Advance", price: "₹2,999" },
  { name: "Pro", price: "₹3,999" },
  { name: "Pro Lite", price: "₹4,999" },
];

const DETAIL_TABS = [
  "Overview",
  "Brand Info",
  "Sub-Brand",
  "Listings",
  "Settlements",
  "Review",
  "Subscription Invoice",
  "Account Details",
];

/* -------------------------------------------------------------------------
 * CSV export helper
 * ---------------------------------------------------------------------- */

function exportBrandsToCsv(brandList) {
  if (!brandList?.length) return;

  const headers = [
    "Brand Id",
    "Brand Name",
    "Category",
    "Location",
    "Status",
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

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

function BrandAvatar({ brand, size = "md" }) {
  const sizes = {
    sm: "h-9 w-9 text-[13px] rounded-lg",
    md: "h-11 w-11 text-[16px] rounded-xl",
    lg: "h-14 w-14 text-[20px] rounded-2xl",
  };
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-orange-500 font-semibold text-white ${sizes[size]}`}
    >
      {brand.logo ? (
        <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
      ) : (
        <span>{brand.emoji || brand.brandName?.charAt(0)}</span>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      aria-label="Toggle brand active state"
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-emerald-400" : "bg-neutral-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="flex items-center gap-2 text-[12.5px] text-neutral-500">
        {Icon && <Icon size={13} />}
        {label}
      </span>
      <span className="text-[13.5px] font-medium text-neutral-200">{value}</span>
    </div>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-neutral-800 bg-neutral-900 p-5 ${className}`}>
      {title && (
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/* Shared row used for GST / PAN / Bank verification style items */
function VerificationRow({ icon: Icon, label, value, verified }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <Icon size={15} className="text-neutral-500" />
        <div>
          <p className="text-[11px] text-neutral-500">{label}</p>
          <p className="text-[13px] font-medium text-neutral-200">{value}</p>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
          verified ? "bg-emerald-400/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        }`}
      >
        {verified ? "Verified" : "Unverified"}
      </span>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-10 text-center text-[13px] text-neutral-500">
      {label}
    </div>
  );
}

/* Brand-level status pill — reflects the same Active / Deactive / Expired
   category the brand is filed under in the tabs, so the badge on a card,
   the table row, and the detail header always agree with each other. */
const BRAND_STATUS_STYLES = {
  Active: { pill: "bg-emerald-400/10 text-emerald-400", dot: "bg-emerald-400" },
  Deactive: { pill: "bg-neutral-700/40 text-neutral-400", dot: "bg-neutral-500" },
  Expired: { pill: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
};

function BrandStatusBadge({ brand }) {
  const label = getBrandStatusLabel(brand);
  const style = BRAND_STATUS_STYLES[label];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

/* Confirm-then-run wrapper for destructive actions */
function useConfirmDelete(onConfirm) {
  return (brand) => {
    const ok = window.confirm(
      `Delete "${brand.brandName}"? This will permanently remove the brand and cannot be undone.`
    );
    if (ok) onConfirm(brand);
  };
}

/* -------------------------------------------------------------------------
 * Brand card (list view) — brand-only data, no GST / PAN / bank
 * ---------------------------------------------------------------------- */

const STATUS_ACCENTS = {
  Active: "from-emerald-400/25 via-emerald-400/0",
  Pending: "from-amber-400/25 via-amber-400/0",
  Rejected: "from-red-400/25 via-red-400/0",
};

function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-800/80 bg-neutral-950/60 px-2.5 py-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
        <Icon size={12} />
      </span>
      <div className="leading-tight">
        <p className="text-[12.5px] font-semibold text-neutral-200">{value}</p>
        <p className="text-[9.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function BrandCard({ brand, onOpen, onDelete }) {
  const accent = STATUS_ACCENTS[brand.status] || "from-neutral-500/20 via-neutral-500/0";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-lg hover:shadow-black/30">
      {/* Ambient accent glow */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accent} opacity-70`}
      />

      <button
        onClick={() => onDelete(brand)}
        aria-label={`Delete ${brand.brandName}`}
        className="absolute right-3.5 top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950/80 text-neutral-500 opacity-0 backdrop-blur transition-all hover:border-red-500/40 hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>

      <button onClick={() => onOpen(brand)} className="relative flex flex-col text-left p-4">
        <div className="mb-3 flex items-start justify-between pr-8">
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl ring-2 ring-neutral-950">
              <BrandAvatar brand={brand} />
            </div>
            <div>
              <h3 className="text-[14.5px] font-semibold leading-tight text-neutral-50">
                {brand.brandName}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                <MapPin size={10} />
                {brand.location}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <BrandStatusBadge brand={brand} />
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
            {brand.category}
          </span>
        </div>

        <p className="mb-3.5 line-clamp-1 text-[12px] text-neutral-500">
          {brand.tagline || "No description added yet"}
        </p>

        <div className="mb-3.5 grid grid-cols-2 gap-2">
          <StatChip icon={Users} value={brand.followers} label="Followers" />
          <StatChip icon={Store} value={brand.subBrandCount} label="Outlets" />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-neutral-950/60 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-neutral-400">
            <CreditCard size={12} className="text-neutral-500" />
            {brand.subscriptionPlan} Plan
            <span className="text-neutral-600">·</span>
            <span className="font-semibold text-neutral-300">{brand.planPrice}</span>
          </span>
          <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-400 transition-transform group-hover:translate-x-0.5">
            View <ChevronRight size={13} />
          </span>
        </div>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Brand details — full page with tab navigation
 * ---------------------------------------------------------------------- */

function OverviewTab({ brand }) {
  return (
    <div className="space-y-4">
      {/* Quick stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewStat icon={Tag} label="Brand Id" value={brand.brandId} />
        <OverviewStat icon={Store} label="Sub Brand" value={`${brand.subBrandCount} Outlets`} />
        <OverviewStat icon={CreditCard} label="Plan Price" value={brand.planPrice} strike />
        <OverviewStat icon={Building2} label="Plan Type" value={brand.planType} />
        <OverviewStat icon={Tag} label="Category" value={brand.category} />
        <OverviewStat icon={BadgeCheck} label="Plan" value={brand.subscriptionPlan} />
        <OverviewStat icon={Calendar} label="Term" value={brand.subscriptionTerm} />
        <OverviewStat
          icon={Calendar}
          label="Expiry"
          value={`${brand.expiredInDays} days to go`}
        />
      </div>

      <SectionCard title="Contact">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-neutral-300">{brand.contactPhone}</p>
            <p className="mt-0.5 text-[13px] text-neutral-300">{brand.contactEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${brand.contactPhone}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 transition-colors hover:bg-emerald-400/20"
              aria-label="Call brand"
            >
              <Phone size={14} />
            </a>
            <a
              href={`mailto:${brand.contactEmail}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 transition-colors hover:bg-emerald-400/20"
              aria-label="Email brand"
            >
              <Mail size={14} />
            </a>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-neutral-500">Renewal Window</p>
          <p className="text-[12px] font-semibold text-neutral-300">
            {brand.remainderPercent}%
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
            style={{ width: `${brand.remainderPercent}%` }}
          />
        </div>
      </SectionCard>

      <div className="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
        <span className="flex items-center overflow-hidden rounded-lg text-[13px] font-extrabold tracking-tight">
          <span className="bg-pink-500 px-1.5 py-0.5 text-white">S</span>
          <span className="bg-purple-500 px-1.5 py-0.5 text-white">M</span>
          <span className="bg-blue-500 px-1.5 py-0.5 text-white">A</span>
          <span className="bg-amber-500 px-1.5 py-0.5 text-white">R</span>
          <span className="bg-emerald-500 px-1.5 py-0.5 text-white">T</span>
        </span>
        <span className="text-[13px] font-semibold text-neutral-300">1K</span>
      </div>
    </div>
  );
}

function OverviewStat({ icon: Icon, label, value, strike = false }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3.5">
      <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400">
        <Icon size={14} />
      </span>
      <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13.5px] font-semibold text-neutral-100 ${
          strike ? "line-through decoration-neutral-600" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MerchantTokenCard({ token }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const masked = token ? `${token.slice(0, 8)}••••••••${token.slice(-4)}` : "—";

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable — fail silently, button just won't confirm.
    }
  };

  return (
    <SectionCard title="Merchant Token">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <KeyRound size={15} className="shrink-0 text-neutral-500" />
          <p className="truncate font-mono text-[12.5px] text-neutral-200">
            {revealed ? token : masked}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setRevealed((r) => !r)}
            className="rounded-lg border border-neutral-700 px-2.5 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            {revealed ? "Hide" : "Show"}
          </button>
          <button
            onClick={handleCopy}
            aria-label="Copy merchant token"
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
              copied
                ? "border-emerald-500/50 bg-emerald-400/10 text-emerald-400"
                : "border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        Used to authenticate this brand's API and payment integrations. Keep it private.
      </p>
    </SectionCard>
  );
}

function BrandInfoTab({ brand }) {
  return (
    <div className="space-y-4">
      <SectionCard title="About">
        <p className="text-[13.5px] leading-relaxed text-neutral-300">{brand.about}</p>
      </SectionCard>

      <SectionCard title="Brand Identity">
        <div className="divide-y divide-neutral-800">
          <InfoRow icon={Tag} label="Brand Name" value={brand.brandName} />
          <InfoRow icon={Tag} label="Short Name" value={brand.shortName || "—"} />
          <InfoRow icon={Building2} label="Category" value={brand.category} />
          <InfoRow icon={Calendar} label="Live Since" value={brand.liveSince} />
          <InfoRow icon={Globe} label="Website" value={brand.website} />
          <InfoRow icon={MapPin} label="Location" value={brand.location} />
        </div>
      </SectionCard>

      <SectionCard title="Business Details">
        <div className="divide-y divide-neutral-800">
          <InfoRow icon={Briefcase} label="Business Type" value={brand.businessType || "—"} />
          <InfoRow icon={Activity} label="Business Status" value={brand.businessStatus || "—"} />
        </div>
      </SectionCard>

      <SectionCard title="Tax & Bank Verification">
        <div className="space-y-2">
          <VerificationRow
            icon={ShieldCheck}
            label="GST Number"
            value={brand.gstNumber}
            verified={brand.gstVerified}
          />
          <VerificationRow
            icon={BadgeCheck}
            label="PAN Number"
            value={brand.panNumber}
            verified={brand.panVerified}
          />
          <VerificationRow
            icon={Landmark}
            label={`Bank Account · ${brand.bankName}`}
            value={brand.accountHolder}
            verified={brand.bankVerified}
          />
        </div>
      </SectionCard>

      <MerchantTokenCard token={brand.merchantToken} />

      <SectionCard title="Brand Photo / Logo">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-800">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-500">
                <ImageIcon size={18} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-neutral-200">Primary logo</p>
            <p className="text-[11.5px] text-neutral-500">Shown on cards, invoices and the brand header.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Ambience Photos">
        {brand.ambiencePhotos?.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {brand.ambiencePhotos.map((src, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl bg-neutral-800">
                <img
                  src={src}
                  alt={`${brand.brandName} ambience ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-neutral-500">No ambience photos uploaded yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Ambience Video">
        {brand.ambienceVideo ? (
          <video
            src={brand.ambienceVideo}
            controls
            className="w-full rounded-xl bg-neutral-950"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-800 py-8 text-center">
            <PlayCircle size={20} className="text-neutral-600" />
            <p className="text-[12.5px] text-neutral-500">No ambience video uploaded yet.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Tags">
        {brand.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {brand.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-[12px] text-neutral-300"
              >
                <Tag size={11} />
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-neutral-500">No tags added yet.</p>
        )}
      </SectionCard>
    </div>
  );
}

function SubBrandTab({ brand }) {
  if (!brand.outlets?.length) return <EmptyState label="No outlets added yet." />;
  return (
    <div className="space-y-3">
      {brand.outlets.map((outlet, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex items-start gap-3">
            <Store size={16} className="mt-0.5 shrink-0 text-neutral-500" />
            <div>
              <p className="text-[13.5px] font-medium text-neutral-200">{outlet.name}</p>
              <p className="mt-0.5 text-[12px] text-neutral-500">{outlet.address}</p>
            </div>
          </div>
          <StatusBadge status={outlet.status} activeLabel="Active" />
        </div>
      ))}
    </div>
  );
}

function ListingsTab({ brand }) {
  if (!brand.listings?.length) return <EmptyState label="No listings yet." />;
  return (
    <div className="space-y-3">
      {brand.listings.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div>
            <p className="text-[13.5px] font-medium text-neutral-200">{item.name}</p>
            <p className="mt-0.5 text-[12px] text-neutral-500">{item.price}</p>
          </div>
          <StatusBadge status={item.status} activeLabel="Active" />
        </div>
      ))}
    </div>
  );
}

function SettlementsTab({ brand }) {
  if (!brand.settlements?.length) return <EmptyState label="No settlements recorded." />;
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-neutral-900 text-[11.5px] uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Settlement ID</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 bg-neutral-950">
          {brand.settlements.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 text-neutral-300">{s.id}</td>
              <td className="px-4 py-3 text-neutral-500">{s.date}</td>
              <td className="px-4 py-3 font-medium text-neutral-200">{s.amount}</td>
              <td className="px-4 py-3 text-right">
                <StatusBadge status={s.status} activeLabel="Paid" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewTab({ brand }) {
  if (!brand.reviews?.length) return <EmptyState label="No reviews yet." />;
  return (
    <div className="space-y-3">
      {brand.reviews.map((r, i) => (
        <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-medium text-neutral-200">{r.author}</p>
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={12} fill={s < r.rating ? "currentColor" : "none"} />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[13px] text-neutral-400">{r.comment}</p>
          <p className="mt-1.5 text-[11.5px] text-neutral-600">{r.date}</p>
        </div>
      ))}
    </div>
  );
}

function SubscriptionInvoiceTab({ brand }) {
  if (!brand.invoices?.length) return <EmptyState label="No invoices generated yet." />;
  return (
    <div className="space-y-3">
      {brand.invoices.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-neutral-500" />
            <div>
              <p className="text-[13.5px] font-medium text-neutral-200">{inv.id}</p>
              <p className="mt-0.5 text-[12px] text-neutral-500">{inv.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-neutral-300">{inv.amount}</span>
            <StatusBadge status={inv.status} activeLabel="Paid" />
            <button
              aria-label="Download invoice"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
            >
              <Download size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountDetailsTab({ brand }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Owner">
        <InfoRow icon={Users} label="Owner Name" value={brand.ownerName} />
      </SectionCard>

      <SectionCard title="Business Verification">
        <div className="space-y-2">
          <VerificationRow
            icon={ShieldCheck}
            label="GST Number"
            value={brand.gstNumber}
            verified={brand.gstVerified}
          />
          <VerificationRow
            icon={BadgeCheck}
            label="PAN Number"
            value={brand.panNumber}
            verified={brand.panVerified}
          />
          <VerificationRow
            icon={Landmark}
            label={`Bank Account · ${brand.bankName}`}
            value={brand.accountHolder}
            verified={brand.bankVerified}
          />
        </div>
      </SectionCard>

      <SectionCard title="Contact">
        <div className="divide-y divide-neutral-800">
          <InfoRow icon={Phone} label="Phone" value={brand.contactPhone} />
          <InfoRow icon={Mail} label="Email" value={brand.contactEmail} />
        </div>
      </SectionCard>
    </div>
  );
}

function BrandDetails({ brand, onBack, onToggleActive, onDelete }) {
  const [tab, setTab] = useState("Overview");

  const tabContent = {
    Overview: <OverviewTab brand={brand} />,
    "Brand Info": <BrandInfoTab brand={brand} />,
    "Sub-Brand": <SubBrandTab brand={brand} />,
    Listings: <ListingsTab brand={brand} />,
    Settlements: <SettlementsTab brand={brand} />,
    Review: <ReviewTab brand={brand} />,
    "Subscription Invoice": <SubscriptionInvoiceTab brand={brand} />,
    "Account Details": <AccountDetailsTab brand={brand} />,
  };

  const accent = STATUS_ACCENTS[brand.status] || "from-neutral-500/20 via-neutral-500/0";

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
          >
            <ArrowLeft size={13} />
            Back to Brands
          </button>

          <button
            onClick={() => onDelete(brand)}
            className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 size={13} />
            Delete Brand
          </button>
        </div>

        {/* Header card */}
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accent} opacity-70`}
          />

          <div className="relative flex items-start justify-between gap-4 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl ring-4 ring-neutral-950">
                <BrandAvatar brand={brand} size="lg" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[19px] font-semibold text-neutral-50">{brand.brandName}</h1>
                  <BrandStatusBadge brand={brand} />
                </div>
                <p className="mt-1 text-[13px] text-neutral-500">{brand.tagline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-neutral-500">
                  <span className="flex items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1">
                    <MapPin size={11} />
                    {brand.location}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1 text-emerald-400">
                    <Users size={11} />
                    {brand.followers} followers
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1">
                    <Tag size={11} />
                    {brand.brandId}
                  </span>
                </div>
              </div>
            </div>
            <ToggleSwitch checked={brand.active} onChange={() => onToggleActive(brand)} />
          </div>

          {/* Segmented pill tabs */}
          <div className="relative border-t border-neutral-800/80 px-4 py-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {DETAIL_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    tab === t
                      ? "bg-emerald-400 text-neutral-950"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {tabContent[tab]}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — list (grid / table) + navigation into details
 * ---------------------------------------------------------------------- */

export default function Brand() {
  const [brands, setBrands] = useState(INITIAL_BRANDS);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  const [view, setView] = useState("grid"); // "grid" | "table"
  const [openBrandId, setOpenBrandId] = useState(null);
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [planMenuOpen, setPlanMenuOpen] = useState(false);

  const openBrand = brands.find((b) => b.id === openBrandId) || null;

  const filtered = brands.filter((b) => {
    const matchesSearch =
      b.brandName.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      statusTab === "All"
        ? true
        : statusTab === "Active Brand"
        ? b.active && !isExpiredBrand(b)
        : statusTab === "Deactive Brand"
        ? !b.active && !isExpiredBrand(b)
        : statusTab === "Expired Brand"
        ? isExpiredBrand(b)
        : true;

    const matchesPlan = planFilter === "All Plans" || b.subscriptionPlan === planFilter;

    return matchesSearch && matchesTab && matchesPlan;
  });

  /* Plan-wise breakdown of expired brands — always computed off the full
     list (not `filtered`) so the counts stay stable as search/plan filters change. */
  const expiredByPlan = brands
    .filter(isExpiredBrand)
    .reduce((acc, b) => {
      acc[b.subscriptionPlan] = (acc[b.subscriptionPlan] || 0) + 1;
      return acc;
    }, {});

  const toggleActive = (brand) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, active: !b.active } : b))
    );
  };

  const deleteBrand = useConfirmDelete((brand) => {
    setBrands((prev) => prev.filter((b) => b.id !== brand.id));
    setOpenBrandId((prevId) => (prevId === brand.id ? null : prevId));
  });

  const handleExport = () => exportBrandsToCsv(filtered);

  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-16",
      render: (_row, index) => <span className="text-neutral-500">{index + 1}</span>,
    },
    {
      key: "brand",
      label: "Brand",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <BrandAvatar brand={row} size="sm" />
          <div>
            <p className="font-medium text-neutral-50">{row.brandName}</p>
            <p className="text-[11.5px] text-neutral-500">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (row) => <span className="text-neutral-400">{row.location}</span>,
    },
    {
      key: "outlets",
      label: "Sub-Brand",
      align: "center",
      render: (row) => <span className="text-neutral-300">{row.subBrandCount}</span>,
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) => (
        <div>
          <p className="text-neutral-300">{row.subscriptionPlan}</p>
          {row.planPrice && row.planPrice !== "—" && (
            <p className="text-[11px] text-neutral-500">{row.planPrice}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <BrandStatusBadge brand={row} />,
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setOpenBrandId(row.id)}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-[12.5px] font-medium text-neutral-300 transition-colors hover:border-emerald-400/60 hover:text-emerald-400"
          >
            View
          </button>
          <button
            onClick={() => deleteBrand(row)}
            aria-label={`Delete ${row.brandName}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  if (openBrand) {
    return (
      <BrandDetails
        brand={openBrand}
        onBack={() => setOpenBrandId(null)}
        onToggleActive={toggleActive}
        onDelete={deleteBrand}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">Brands</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Browse onboarded brands and open a brand to see its full profile.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={handleExport}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-[12.5px] font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileDown size={14} />
              Export
            </button>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "grid"
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "table"
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Status tabs + Search */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const count =
                tab === "All"
                  ? brands.length
                  : tab === "Active Brand"
                  ? brands.filter((b) => b.active && !isExpiredBrand(b)).length
                  : tab === "Deactive Brand"
                  ? brands.filter((b) => !b.active && !isExpiredBrand(b)).length
                  : brands.filter((b) => isExpiredBrand(b)).length;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    statusTab === tab
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab}
                  <span
                    className={`rounded-full px-1.5 text-[10.5px] ${
                      statusTab === tab ? "bg-emerald-400/20" : "bg-neutral-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
              <Search size={16} className="shrink-0 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand, location, category..."
                className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            {/* Plan filter */}
            <div className="relative">
              <button
                onClick={() => setPlanMenuOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                  planFilter !== "All Plans"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                    : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                <SlidersHorizontal size={14} />
                {planFilter === "All Plans" ? "Filter by Plan" : planFilter}
                {planFilter !== "All Plans" && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlanFilter("All Plans");
                    }}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 hover:bg-emerald-400/30"
                    aria-label="Clear plan filter"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>

              {planMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setPlanMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40">
                    <button
                      onClick={() => {
                        setPlanFilter("All Plans");
                        setPlanMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-300 transition-colors hover:bg-neutral-800"
                    >
                      All Plans
                      {planFilter === "All Plans" && <Check size={14} className="text-emerald-400" />}
                    </button>
                    <div className="h-px bg-neutral-800" />
                    {PLANS.map((plan) => (
                      <button
                        key={plan.name}
                        onClick={() => {
                          setPlanFilter(plan.name);
                          setPlanMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-300 transition-colors hover:bg-neutral-800"
                      >
                        <span>
                          {plan.name}
                          <span className="ml-1.5 text-[11px] text-neutral-500">{plan.price}</span>
                        </span>
                        {planFilter === plan.name && <Check size={14} className="text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Plan-wise expired breakdown — only relevant once you're looking at expired brands */}
        {statusTab === "Expired Brand" && Object.keys(expiredByPlan).length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-red-400">
              <AlertTriangle size={13} />
              Expired by plan:
            </span>
            {PLANS.map((plan) => {
              const count = expiredByPlan[plan.name];
              if (!count) return null;
              const isSelected = planFilter === plan.name;
              return (
                <button
                  key={plan.name}
                  onClick={() => setPlanFilter(isSelected ? "All Plans" : plan.name)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ${
                    isSelected
                      ? "border-red-400/50 bg-red-400/15 text-red-300"
                      : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                  }`}
                >
                  {plan.name}
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      isSelected ? "bg-red-400/25" : "bg-neutral-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Grid or Table */}
        {view === "grid" ? (
          filtered.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-10 text-center text-neutral-500">
              No brands found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onOpen={(b) => setOpenBrandId(b.id)}
                  onDelete={deleteBrand}
                />
              ))}
            </div>
          )
        ) : (
          <Table columns={columns} data={filtered} emptyMessage="No brands found." />
        )}
      </div>
    </div>
  );
}