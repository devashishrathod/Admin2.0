import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  Tags,
  Layers,
  BadgeCheck,
  UserPlus,
  Hourglass,
  Clock,
  PencilLine,
  ImageUp,
  CalendarX,
  TimerOff,
  CreditCard,
  Repeat,
  Gift,
  Ticket,
  ArrowLeftRight,
  Undo2,
  HandCoins,
  // Megaphone, // used by the Feature Campaign link (commented out below)
  Image,
  MonitorPlay,
  Percent,
  Bell,
  HelpCircle,
  TrendingUp,
  FlaskConical,
  Rocket,
} from "lucide-react";

// Grouped nav — each group renders with an uppercase label (hidden when
// collapsed). Ordered the way an admin works through the platform: the big
// picture and the money first, the catalog structure, then brands and
// vouchers (each in lifecycle order: new → waiting for approval → live),
// plans, customers, marketing, reports, and system config last.
export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "analysis-all", label: "Analytics", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    label: "Payments",
    items: [
      { id: "transaction", label: "Transactions", icon: ArrowLeftRight, path: "/transaction" },
      { id: "refund", label: "Refunds", icon: Undo2, path: "/refund" },
      { id: "settlements", label: "Settlements", icon: HandCoins, path: "/settlements" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { id: "main-category", label: "Main Category", icon: Tags, path: "/main-category" },
      { id: "sub-category", label: "Sub Category", icon: Layers, path: "/sub-category" },
    ],
  },
  {
    label: "Brands",
    items: [
      { id: "new-onboarding", label: "New Onboarding", icon: UserPlus, path: "/new-onboarding" },
      { id: "brand-waiting", label: "Brand Waiting", icon: Hourglass, path: "/brand-waiting" },
      { id: "brand", label: "Live Brands", icon: BadgeCheck, path: "/brand" },
      { id: "brand-real-dummy", label: "RD Brands", icon: Rocket, path: "/brand/real-dummy" },
      { id: "brand-expired", label: "Expired Brands", icon: CalendarX, path: "/brand/expired" },
      { id: "brand-dummy", label: "D Brands", icon: FlaskConical, path: "/brand/dummy" },

    ],
  },
  {
    label: "Vouchers",
    items: [
      { id: "voucher-drafts", label: "Draft Vouchers", icon: PencilLine, path: "/voucher-drafts" },
      { id: "voucher-waiting", label: "Voucher Waiting", icon: Clock, path: "/voucher-waiting" },
      { id: "voucher-banners", label: "Banner Approval", icon: ImageUp, path: "/voucher-banners" },
      { id: "voucher-listing", label: "Live Vouchers", icon: Gift, path: "/vendor-listing" },
      { id: "voucher-expired", label: "Expired Vouchers", icon: TimerOff, path: "/voucher-expired" },
      { id: "voucher-dummy", label: "D Vouchers", icon: FlaskConical, path: "/voucher-dummy" },
    ],
  },
  {
    label: "Plans",
    items: [
      { id: "vendor-plan", label: "Vendor Plans", icon: CreditCard, path: "/vendor-plan" },
      { id: "subscriptions", label: "Subscriptions", icon: Repeat, path: "/subscriptions" },
      { id: "subscriptions-dummy", label: "D Subscriptions", icon: FlaskConical, path: "/subscriptions/dummy" },
      // Hidden from the sidebar for now — page and route still exist.
      // (Re-add the Wallet icon import when un-commenting.)
      // { id: "user-plan", label: "Customer Plans", icon: Wallet, path: "/user-plan" },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customer", label: "Customers", icon: Users, path: "/customer" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "banner", label: "Banners", icon: Image, path: "/banner" },
      { id: "promotional-ticker", label: "Promotional Ticker", icon: MonitorPlay, path: "/promotional-ticker" },
      // { id: "settings", label: "Feature Campaign", icon: Megaphone, path: "/feature_campaign" },
      { id: "promo-code", label: "Promo Codes", icon: Percent, path: "/promo-code" },
    ],
  },
  {
    label: "Reports",
    items: [
      // Hidden from the sidebar for now — pages and routes still exist.
      // (Re-add the ClipboardList / PieChart icon imports when un-commenting.)
      // { id: "analysis-report-catalog", label: "Vendor Report", icon: ClipboardList, path: "/analysis-report-vendor" },
      // { id: "analysis-report-customer", label: "Customer Report", icon: PieChart, path: "/analysis-report-customer" },
      { id: "promo-code-reports", label: "Promo Code Report", icon: TrendingUp, path: "/promo-code/reports" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
      { id: "faq", label: "FAQ", icon: HelpCircle, path: "/faq" },
      { id: "accessibility", label: "Accessibility", icon: Ticket, path: "/assebility" },
      { id: "app-settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];
