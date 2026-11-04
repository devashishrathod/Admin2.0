import {
  Bell,
  Building2,
  ClipboardList,
  Filter,
  Gift,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Wrench,
  Mail,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Store,
  Users,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * Notifications composer — fixed lists and limits in one place.
 * Limits mirror the POST /notifications/broadcast validator
 * (super_admin_panel_api_doc #22) so the form rejects what the API would.
 * ---------------------------------------------------------------------- */

export const LIMITS = {
  title: 160,
  body: 1000,
  deepLink: 512,
  imageUrl: 1024,
  // Not API limits — roughly where a phone starts trimming the text.
  pushTitleVisible: 65,
  pushBodyVisible: 240,
  // AUDIENCE_LIMITS: max recipients named in one dispatch.
  maxRecipients: 5000,
  // Above this, the admin has to tick a confirmation before sending.
  confirmAbove: 500,
};

/* `mode`:
 *   toggle — admin turns it on/off (Push is sent as `push`; In-app has no
 *            API field yet, see buildPayload)
 *   always — the API always writes it (IN_APP)
 *   auto   — the API sends it when the recipient has an address and the
 *            channel is on in Settings; not chosen per send
 *   soon   — not wired on the backend yet */
export const CHANNELS = [
  { key: "push", label: "Push", icon: Smartphone, tint: "sky", mode: "toggle", description: "Lock-screen alert on their phone", note: "Needs a registered device" },
  { key: "inApp", label: "In-app", icon: Bell, tint: "violet", mode: "toggle", description: "Saved to the app's notification bell", note: "Bell inside the app" },
  { key: "email", label: "Email", icon: Mail, tint: "amber", mode: "auto", description: "Sent to people who have an email", note: "Follows Settings" },
  { key: "sms", label: "SMS", icon: MessageSquare, tint: "neutral", mode: "soon", description: "Waiting on SMS provider setup" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, tint: "neutral", mode: "soon", description: "Waiting on Meta template approval" },
];

/* The three audiences. `role` = ROLES enum for `target.roles`, `idKey` =
 * the `target` field that takes this group's ids. */
export const AUDIENCE_GROUPS = [
  { key: "customers", role: "CUSTOMER", idKey: "customerIds", label: "Customers", singular: "customer", icon: Users, tint: "emerald", description: "App users who browse and claim vouchers" },
  { key: "vendors", role: "VENDOR", idKey: "brandIds", label: "Vendors", singular: "vendor", icon: Store, tint: "sky", description: "Brand owners on the vendor panel" },
  { key: "outlets", role: "SUB_VENDOR", idKey: "subBrandIds", label: "Outlet managers", singular: "outlet manager", icon: Building2, tint: "violet", description: "Managers who run a single outlet" },
];

export const groupByKey = (key) => AUDIENCE_GROUPS.find((g) => g.key === key) || AUDIENCE_GROUPS[0];

export const AUDIENCE_MODES = [
  { key: "role", label: "By role", icon: Users, hint: "Send to everyone in one or more roles" },
  { key: "filter", label: "By filter", icon: Filter, hint: "Everyone matching a set of filters" },
  { key: "list", label: "Pick from list", icon: ListChecks, hint: "Hand-pick individual recipients" },
  { key: "paste", label: "Paste list", icon: ClipboardList, hint: "Paste numbers or emails from a sheet" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active only" },
  { value: "inactive", label: "Inactive only" },
];

export const SEVERITIES = [
  { value: "INFO", label: "Info", tint: "sky" },
  { value: "WARNING", label: "Warning", tint: "amber" },
  { value: "CRITICAL", label: "Critical", tint: "red" },
];

export const HISTORY_STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partly failed" },
  { value: "failed", label: "Failed" },
];

export const SCHEDULE = {
  // How often the scheduler checks for due sends.
  tickMs: 20_000,
  // Earliest pickable time, from now.
  minLeadMs: 5 * 60_000,
  // A send found this late (panel was closed) is marked "missed", not sent.
  graceMs: 6 * 60 * 60_000,
};

/* Ready-made templates shown above the admin's own. `audience` (optional)
 * is applied with the message, so "Use" also picks the right roles. */
export const STARTER_TEMPLATES = [
  {
    id: "starter-new-deals",
    name: "New deals live",
    category: "Promotion",
    icon: Sparkles,
    gradient: "from-emerald-500 via-emerald-400 to-teal-400",
    push: true,
    inApp: true,
    audience: { roles: ["CUSTOMER"] },
    message: {
      title: "Fresh deals just dropped near you 🎉",
      body: "New vouchers from brands you love are live on Trydood. Grab yours before they're gone!",
      imageUrl: "",
      deepLink: "/deals",
      severity: "INFO",
    },
  },
  {
    id: "starter-weekend",
    name: "Weekend offer reminder",
    category: "Engagement",
    icon: Gift,
    gradient: "from-pink-500 via-rose-400 to-orange-300",
    push: true,
    inApp: true,
    audience: { roles: ["CUSTOMER"] },
    message: {
      title: "Your weekend just got better",
      body: "Save more this weekend — exclusive voucher offers end Sunday midnight. Open Trydood to claim.",
      imageUrl: "",
      deepLink: "/vouchers",
      severity: "INFO",
    },
  },
  {
    id: "starter-maintenance",
    name: "Scheduled maintenance",
    category: "System",
    icon: Wrench,
    gradient: "from-amber-500 via-amber-400 to-yellow-300",
    push: true,
    inApp: true,
    audience: { roles: ["VENDOR", "SUB_VENDOR"] },
    message: {
      title: "Scheduled maintenance tonight",
      body: "The vendor panel will be unavailable from 2–4 AM IST for upgrades. Vouchers already live are not affected.",
      imageUrl: "",
      deepLink: "",
      severity: "WARNING",
    },
  },
  {
    id: "starter-action-needed",
    name: "Action needed",
    category: "Account",
    icon: ShieldAlert,
    gradient: "from-red-500 via-rose-500 to-pink-400",
    push: true,
    inApp: true,
    audience: { roles: ["VENDOR"] },
    message: {
      title: "Action needed: verify your bank details",
      body: "Settlements are on hold until your bank account is verified. Update it in the vendor panel to keep payouts flowing.",
      imageUrl: "",
      deepLink: "/dashboard/settings/bank",
      severity: "CRITICAL",
    },
  },
];

export const PICK_PAGE_SIZE = 8;
export const MAX_HISTORY = 200;

export const STORAGE_KEYS = {
  draft: "trydood-admin-notification-draft",
  history: "trydood-admin-notification-history",
  templates: "trydood-admin-notification-templates",
};

export const EMPTY_DRAFT = {
  push: true,
  inApp: true,
  audience: {
    mode: "role",
    roles: ["CUSTOMER"],
    everyone: false,
    filter: { group: "customers", status: "active", keyword: "", from: "", to: "", hasEmail: false },
    // Hand-picked rows per group: [{ id, name }]
    picked: { customers: [], vendors: [], outlets: [] },
    paste: "",
  },
  message: { title: "", body: "", imageUrl: "", deepLink: "", severity: "INFO" },
};
