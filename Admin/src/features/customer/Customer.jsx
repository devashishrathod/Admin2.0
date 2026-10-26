import { useState, useMemo } from "react";
import EmptyState from "../../components/common/EmptyState";
import {
  Search,
  Smartphone,
  Apple,
  CheckCircle2,
  XCircle,
  Wallet,
  Coins,
  Receipt,
  ChevronRight,
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Users,
  UserPlus,
  Star,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  Loader2,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useCustomers, useCustomer } from "./queries/customerQueries";
import StatTile from "../../components/common/StatTile";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import { MISSING, isMissing, orText } from "../../utils/helpers";

const money = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

const CHART_COLORS = ["#34d399", "#f59e0b", "#38bdf8", "#a78bfa", "#f87171", "#facc15", "#fb923c"];

function formatDateLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Capitalizes the first letter of every word ("gandev rathod" -> "Gandev
// Rathod") for display only — never touches the underlying value, so
// search/filtering still matches whatever casing the customer actually
// signed up with. Only touches letters right after a word boundary, so an
// id-shaped fallback name ("TC397763") is left exactly as-is instead of
// being lowercased.
function toTitleCase(str) {
  if (!str) return str;
  return String(str).replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}

function fmtRaw(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return "—";
  return String(v);
}

function fmtRawDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtRawMoney(v) {
  if (v === null || v === undefined) return "—";
  return money(Number(v) || 0);
}

// "8839999017" -> "+91 88399 99017". The real API returns a bare 10-digit
// WhatsApp number with no country code.
function formatPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 10) return raw || "—";
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

// "ANDROID" / "IOS" -> "Android" / "iOS" so it matches what PlatformBadge
// checks for; anything else (or missing, since `profile.devicePlatforms`
// is often empty) shows as "—" rather than a guessed platform.
function formatPlatform(raw) {
  const p = String(raw || "").toUpperCase();
  if (p === "ANDROID") return "Android";
  if (p === "IOS") return "iOS";
  return "—";
}

function formatAddress(primaryAddress) {
  if (!primaryAddress) return "—";
  if (typeof primaryAddress === "string") return primaryAddress;
  return [primaryAddress.city, primaryAddress.state].filter(Boolean).join(", ") || "—";
}

// Maps one customer from GET /customers/admin/get-all (or /:customerId)
// into the flat shape the cards and detail view use. Only fields the API
// actually returns — a customer who hasn't finished signup has no
// `fullName` / `email`, so the name falls back to their uniqueId
// ("#TC357962") and email stays null instead of being invented. `.raw`
// keeps the whole payload for the detail view's per-section tiles.
function normalizeCustomer(raw) {
  const account = raw.account || {};
  const profile = raw.profile || {};
  const claims = raw.claims || {};
  const refunds = raw.refunds || {};
  const disputes = raw.disputes || {};
  const isInactive = raw.isAccountActive === false || account.isActive === false;
  return {
    id: raw._id,
    name: raw.fullName || account.name || raw.uniqueId || raw._id || "—",
    uniqueId: raw.uniqueId || "—",
    email: raw.email || account.email || null,
    phone: formatPhone(raw.whatsappNumber || account.whatsappNumber),
    whatsappVerified: Boolean(account.isWhatsappVerified),
    isOnline: Boolean(account.isOnline),
    platform: formatPlatform(profile.devicePlatforms?.[0]),
    status: isInactive ? "Inactive" : "Active",
    signupCompleted: Boolean(raw.isSignUpCompleted),
    joined: formatDateLabel(raw.createdAt),
    lastActive: formatDateLabel(profile.lastSeenAt || account.updatedAt || raw.updatedAt),
    address: formatAddress(profile.primaryAddress),
    wallet: Number(account.walletBalance) || 0,
    coins: Number(account.tCoinsBalance) || 0,
    followers: Number(account.followerCount) || 0,
    following: Number(account.followingCount) || 0,
    totalClaims: Number(claims.totalClaims) || 0,
    netSpend: Number(claims.netSpend) || 0,
    totalSaved: Number(claims.totalSaved) || 0,
    lastClaimAt: claims.lastClaimAt ? formatDateLabel(claims.lastClaimAt) : null,
    refundRequests: Number(refunds.totalRequests) || 0,
    openRefunds: Number(refunds.openRequests) || 0,
    disputedPayments: Number(disputes.disputedPayments) || 0,
    hasVerifiedBank: Boolean(profile.hasVerifiedBankAccount),
    raw,
  };
}

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                  */
/* ------------------------------------------------------------------ */

function StatusPill({ status }) {
  const active = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        active
          ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
      }`}
    >
      {active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {status}
    </span>
  );
}

function PlatformBadge({ platform }) {
  const isAndroid = platform === "Android";
  const isIos = platform === "iOS";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isAndroid
          ? "bg-lime-400/10 text-lime-600 dark:text-lime-400"
          : isIos
          ? "bg-sky-400/10 text-sky-600 dark:text-sky-400"
          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
      }`}
    >
      {isAndroid ? <Smartphone size={12} /> : isIos ? <Apple size={12} /> : null}
      {orText(platform, "No device")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer card (list view)                                          */
/* ------------------------------------------------------------------ */

// Card accent follows the platform — Android green, iOS blue — so the two
// look visibly different at a glance, matching PlatformBadge's own colors.
const CUSTOMER_PLATFORM_ACCENTS = {
  Android: "from-lime-400/25 via-lime-400/0",
  iOS: "from-sky-400/25 via-sky-400/0",
};

// Avatar tint follows the same platform accent so the badge, the top glow
// and the avatar all read as one coherent color story per card.
const CUSTOMER_AVATAR_BG = {
  Android: "bg-gradient-to-br from-lime-400/30 to-emerald-400/10 dark:from-lime-400/20 dark:to-emerald-400/5",
  iOS: "bg-gradient-to-br from-sky-400/30 to-blue-400/10 dark:from-sky-400/20 dark:to-blue-400/5",
};

function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1.5 py-2 text-center">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
        <Icon size={13} />
      </span>
      <p className="truncate text-[12.5px] font-semibold leading-tight text-neutral-800 dark:text-neutral-200">{value}</p>
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{label}</p>
    </div>
  );
}

// Green dot when the API reports the customer's app as online right now.
function OnlineDot({ online }) {
  return (
    <span
      title={online ? "Online now" : "Offline"}
      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${
        online ? "bg-emerald-400" : "bg-neutral-300 dark:bg-neutral-600"
      }`}
    />
  );
}

const CARD_FLAG_TONES = {
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-400/10 text-red-600 dark:text-red-400",
  neutral: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-400",
};

// Small status flag on a card (signup pending, open refunds, disputes…).
function CardFlag({ tone = "neutral", children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${CARD_FLAG_TONES[tone]}`}>
      {children}
    </span>
  );
}

// First letter of the name for the avatar — "#" for an id-shaped fallback
// name of a customer who hasn't finished signup.
const initialOf = (name) => (isMissing(name) ? "?" : String(name).replace(/^#/, "").charAt(0).toUpperCase() || "?");

// Read-only: the backend has no customer update / delete / status API, so
// the card only opens the detail view.
function UserCard({ customer, onOpen }) {
  const accent = CUSTOMER_PLATFORM_ACCENTS[customer.platform] || "from-neutral-400/20 via-neutral-400/0";
  const avatarBg = CUSTOMER_AVATAR_BG[customer.platform] || "bg-neutral-200 dark:bg-neutral-800";
  const displayName = toTitleCase(orText(customer.name, MISSING.name));

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-neutral-200 hover:shadow-lg hover:shadow-black/10 dark:border-neutral-800/60 dark:bg-neutral-900 dark:shadow-black/20 dark:hover:border-neutral-700 dark:hover:shadow-black/30">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accent} opacity-70`} />

      <button
        type="button"
        onClick={() => onOpen(customer)}
        className="relative flex cursor-pointer flex-col p-4 text-left"
      >
        <div className="mb-3.5 flex w-full items-center gap-3">
          <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[17px] font-semibold text-neutral-700 shadow-sm ring-2 ring-white dark:text-neutral-200 dark:ring-neutral-900 ${avatarBg}`}>
            {initialOf(customer.name)}
            <OnlineDot online={customer.isOnline} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
              {displayName}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-neutral-500">
              <ValueOr value={customer.phone} fallback={MISSING.phone} />
              {customer.whatsappVerified && (
                <BadgeCheck size={12} className="shrink-0 text-emerald-500" title="WhatsApp verified" />
              )}
            </p>
            <p className="truncate font-mono text-[10.5px] text-neutral-400 dark:text-neutral-500"><ValueOr value={customer.uniqueId} fallback={MISSING.id} /></p>
          </div>
        </div>

        <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
          <StatusPill status={customer.status} />
          <PlatformBadge platform={customer.platform} />
          {!customer.signupCompleted && <CardFlag tone="amber">Signup pending</CardFlag>}
          {/* Things an admin should act on — shown only when they apply. */}
          {customer.openRefunds > 0 && (
            <CardFlag tone="amber">
              {customer.openRefunds} open refund{customer.openRefunds === 1 ? "" : "s"}
            </CardFlag>
          )}
          {customer.disputedPayments > 0 && (
            <CardFlag tone="red">
              {customer.disputedPayments} disputed
            </CardFlag>
          )}
          {customer.refundRequests > 0 && !customer.hasVerifiedBank && <CardFlag tone="neutral">No verified bank</CardFlag>}
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-neutral-50/70 dark:bg-neutral-950/40">
          <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800">
            <StatChip icon={Receipt} value={customer.totalClaims} label="Claims" />
            <StatChip icon={ArrowUpCircle} value={money(customer.netSpend)} label="Net Spend" />
            <StatChip icon={Wallet} value={money(customer.wallet)} label="Wallet" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
            <StatChip icon={Coins} value={customer.coins} label="T-Coins" />
            <StatChip icon={Sparkles} value={money(customer.totalSaved)} label="Saved" />
            <StatChip icon={ArrowDownCircle} value={customer.refundRequests} label="Refunds" />
          </div>
        </div>
        {customer.lastClaimAt && (
          <p className="mt-2 w-full text-[11px] text-neutral-500">Last claim {customer.lastClaimAt}</p>
        )}
        <div className="mb-3.5" />

        <div className="flex w-full items-center justify-between gap-2 border-t border-neutral-100 px-0.5 pt-3 dark:border-neutral-800/60">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-neutral-500">
            <CalendarDays size={12} className="shrink-0" />
            {isMissing(customer.joined) ? "Join date not set" : `Joined ${customer.joined}`}
          </span>
          <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-neutral-500">
            <Clock size={11} className="shrink-0" />
            {isMissing(customer.lastActive) ? "Never seen" : `Seen ${customer.lastActive}`}
            <ChevronRight size={15} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer detail — every section the API returns                    */
/* ------------------------------------------------------------------ */

// Read-only: GET /customers/admin/:customerId is the only customer API
// besides the list, so nothing here edits the customer.
function CustomerDetail({ customer, detailLoading, onBack }) {
  const avatarBg = CUSTOMER_AVATAR_BG[customer.platform] || "bg-neutral-200 dark:bg-neutral-800";
  const detailCoverAccent =
    customer.platform === "Android"
      ? "from-lime-400/30 via-emerald-400/10"
      : customer.platform === "iOS"
      ? "from-sky-400/30 via-blue-400/10"
      : "from-neutral-300/25 via-neutral-300/0";
  const prefs = customer.raw?.account?.notificationPreferences;

  // Real chart data — built only from the raw API's claims/refunds counters,
  // shown only when the customer actually has that activity (never a chart
  // full of fabricated zeros).
  const claims = customer.raw?.claims;
  const claimsBreakdown = claims
    ? [
        { name: "Redeemed", value: Number(claims.redeemedClaims) || 0 },
        { name: "Paid", value: Number(claims.paidClaims) || 0 },
        { name: "Pending", value: Number(claims.pendingClaims) || 0 },
        { name: "Failed", value: Number(claims.failedClaims) || 0 },
        { name: "Cancelled", value: Number(claims.cancelledClaims) || 0 },
        { name: "Expired", value: Number(claims.expiredClaims) || 0 },
        { name: "Refunded", value: Number(claims.refundedClaims) || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const spendOverview = claims
    ? [
        { name: "Gross Spend", value: Number(claims.grossSpend) || 0 },
        { name: "Net Spend", value: Number(claims.netSpend) || 0 },
        { name: "Total Saved", value: Number(claims.totalSaved) || 0 },
        { name: "Total Billed", value: Number(claims.totalBilled) || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const refunds = customer.raw?.refunds;
  const refundsBreakdown = refunds
    ? [
        { name: "Completed", value: Number(refunds.completedRequests) || 0 },
        { name: "Open", value: Number(refunds.openRequests) || 0 },
        { name: "Refused", value: Number(refunds.refusedRequests) || 0 },
        { name: "Failed", value: Number(refunds.failedRequests) || 0 },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ArrowLeft size={15} />
          Back to customers
        </button>
        {detailLoading && (
          <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            <Loader2 size={13} className="animate-spin" />
            Refreshing…
          </span>
        )}
      </div>

      {/* Identity strip — cover banner with the avatar overlapping it;
          every other field lives in the bento tiles below. */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className={`h-16 bg-gradient-to-r ${detailCoverAccent} to-transparent`} />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className={`relative -mt-9 flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl text-[26px] font-semibold text-neutral-700 shadow-md ring-4 ring-white dark:text-neutral-200 dark:ring-neutral-900 ${avatarBg}`}>
            {initialOf(customer.name)}
            <OnlineDot online={customer.isOnline} />
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[19px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                {toTitleCase(orText(customer.name, MISSING.name))}
              </h2>
              {customer.status === "Active" && <BadgeCheck size={17} className="shrink-0 text-emerald-400" />}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-neutral-500">
              {orText(customer.uniqueId, MISSING.id)} · {orText(customer.phone, MISSING.phone)}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <StatusPill status={customer.status} />
              <PlatformBadge platform={customer.platform} />
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  customer.isOnline
                    ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                }`}
              >
                {customer.isOnline ? "Online" : "Offline"}
              </span>
              {!customer.signupCompleted && (
                <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Signup pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
          {/* Contact card + quick-glance account tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 row-span-2 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-neutral-900 dark:text-neutral-50">
                <ShieldCheck size={15} className="text-neutral-500 dark:text-neutral-400" />
                Contact & Account
              </h3>
              <div className="space-y-2.5">
                <InfoRow
                  icon={<Phone size={13} />}
                  label="WhatsApp"
                  value={isMissing(customer.phone) ? null : `${customer.phone}${customer.whatsappVerified ? " · Verified" : ""}`}
                  fallback={MISSING.phone}
                />
                {customer.email && <InfoRow icon={<Mail size={13} />} label="Email" value={customer.email} />}
                <InfoRow
                  icon={customer.platform === "Android" ? <Smartphone size={13} /> : customer.platform === "iOS" ? <Apple size={13} /> : <ShieldCheck size={13} />}
                  label="Platform"
                  value={customer.platform}
                  fallback="Not recorded"
                />
                <InfoRow icon={<CalendarDays size={13} />} label="Joined" value={customer.joined} fallback={MISSING.date} />
                <InfoRow icon={<Clock size={13} />} label="Last Seen" value={fmtRawDate(customer.raw?.profile?.lastSeenAt)} fallback="Not recorded" />
                <InfoRow icon={<ShieldCheck size={13} />} label="Address" value={customer.address} fallback={MISSING.location} />
              </div>
            </div>

            <DetailTile icon={<Wallet size={12} />} label="Wallet" value={money(customer.wallet)} />
            <DetailTile icon={<Coins size={12} />} label="T-Coins" value={customer.coins} />
            <DetailTile icon={<Users size={12} />} label="Followers" value={customer.followers} />
            <DetailTile icon={<UserPlus size={12} />} label="Following" value={customer.following} />
            <DetailTile icon={<Star size={12} />} label="Reviews" value={fmtRaw(customer.raw?.account?.reviewCount)} />
            <DetailTile icon={<BadgeCheck size={12} />} label="Referral Code" value={fmtRaw(customer.raw?.account?.referralCode)} fallback={MISSING.id} />
            <DetailTile icon={<UserPlus size={12} />} label="Referrals" value={fmtRaw(customer.raw?.account?.referralCount)} />
            <DetailTile icon={<Receipt size={12} />} label="Total Claims" value={customer.totalClaims} />
          </div>

          {customer.raw && (
            <>
              <BentoSection icon={<BadgeCheck size={15} />} title="Account & Identity">
                <DetailTile label="Unique ID" value={fmtRaw(customer.raw.uniqueId)} fallback={MISSING.id} />
                <DetailTile label="Account ID" value={fmtRaw(customer.raw.account?.uniqueId)} fallback={MISSING.id} />
                <DetailTile label="Role" value={fmtRaw(customer.raw.account?.role)} fallback={MISSING.date} />
                <DetailTile label="Login Type" value={fmtRaw(customer.raw.account?.loginType)} fallback={MISSING.method} />
                <DetailTile label="Signup Completed" value={fmtRaw(customer.raw.isSignUpCompleted)} />
                <DetailTile label="Onboarding Completed" value={fmtRaw(customer.raw.account?.isOnBoardingCompleted)} />
                <DetailTile label="WhatsApp Verified" value={fmtRaw(customer.raw.account?.isWhatsappVerified)} />
                <DetailTile label="Email Verified" value={fmtRaw(customer.raw.account?.isEmailVerified)} />
                <DetailTile label="Mobile Verified" value={fmtRaw(customer.raw.account?.isMobileVerified)} />
                <DetailTile label="Logged In" value={fmtRaw(customer.raw.account?.isLoggedIn)} />
                <DetailTile label="Online Now" value={fmtRaw(customer.raw.account?.isOnline)} />
                <DetailTile label="Account Active" value={fmtRaw(customer.raw.isAccountActive)} />
                <DetailTile label="Profile Active" value={fmtRaw(customer.raw.isProfileActive)} />
                <DetailTile label="Created At" value={fmtRawDate(customer.raw.createdAt)} fallback={MISSING.date} />
                <DetailTile label="Updated At" value={fmtRawDate(customer.raw.updatedAt)} fallback={MISSING.date} />
              </BentoSection>

              <BentoSection icon={<Mail size={15} />} title="Notification Preferences">
                <DetailTile label="Push" value={fmtRaw(prefs?.push)} />
                <DetailTile label="WhatsApp" value={fmtRaw(prefs?.whatsapp)} />
                <DetailTile label="Email" value={fmtRaw(prefs?.email)} />
              </BentoSection>

              <BentoSection icon={<Receipt size={15} />} title="Claims Summary">
                {claimsBreakdown.length > 0 && (
                  <div className="col-span-2 row-span-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <p className="mb-1 text-[11px] font-medium text-neutral-500">Claims Breakdown</p>
                    <div className="relative h-37.5">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={claimsBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3}>
                            {claimsBreakdown.map((d, i) => (
                              <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">
                          {customer.raw.claims.totalClaims}
                        </span>
                        <span className="text-[9px] text-neutral-500">Total Claims</span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                      {claimsBreakdown.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-500">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {d.name} ({d.value})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {spendOverview.length > 0 && (
                  <div className="col-span-2 row-span-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <p className="mb-1 text-[11px] font-medium text-neutral-500">Spend Overview</p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={spendOverview} layout="vertical" margin={{ left: 8, right: 12 }}>
                          <XAxis type="number" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10.5, fill: "#737373" }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => [money(v), "Amount"]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                          <Bar dataKey="value" fill="var(--color-emerald-400)" radius={[0, 6, 6, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <DetailTile label="Total Claims" value={fmtRaw(customer.raw.claims?.totalClaims)} />
                <DetailTile label="Redeemed" value={fmtRaw(customer.raw.claims?.redeemedClaims)} />
                <DetailTile label="Paid" value={fmtRaw(customer.raw.claims?.paidClaims)} />
                <DetailTile label="Pending" value={fmtRaw(customer.raw.claims?.pendingClaims)} />
                <DetailTile label="Failed" value={fmtRaw(customer.raw.claims?.failedClaims)} />
                <DetailTile label="Cancelled" value={fmtRaw(customer.raw.claims?.cancelledClaims)} />
                <DetailTile label="Expired" value={fmtRaw(customer.raw.claims?.expiredClaims)} />
                <DetailTile label="Refunded" value={fmtRaw(customer.raw.claims?.refundedClaims)} />
                <DetailTile label="Total Billed" value={fmtRawMoney(customer.raw.claims?.totalBilled)} />
                <DetailTile label="Gross Spend" value={fmtRawMoney(customer.raw.claims?.grossSpend)} />
                <DetailTile label="Total Saved" value={fmtRawMoney(customer.raw.claims?.totalSaved)} />
                <DetailTile label="Net Spend" value={fmtRawMoney(customer.raw.claims?.netSpend)} />
                <DetailTile label="Avg. Claim Value" value={fmtRawMoney(customer.raw.claims?.averageClaimValue)} />
                <DetailTile label="First Claim At" value={fmtRawDate(customer.raw.claims?.firstClaimAt)} fallback="Not yet" />
                <DetailTile label="Last Claim At" value={fmtRawDate(customer.raw.claims?.lastClaimAt)} fallback="Not yet" />
                <DetailTile label="Last Paid At" value={fmtRawDate(customer.raw.claims?.lastPaidAt)} fallback="Not yet" />
              </BentoSection>

              <BentoSection icon={<ArrowDownCircle size={15} />} title="Refunds Summary">
                {refundsBreakdown.length > 0 && (
                  <div className="col-span-2 row-span-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                    <p className="mb-1 text-[11px] font-medium text-neutral-500">Refunds Breakdown</p>
                    <div className="relative h-37.5">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={refundsBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3}>
                            {refundsBreakdown.map((d, i) => (
                              <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">
                          {customer.raw.refunds.totalRequests}
                        </span>
                        <span className="text-[9px] text-neutral-500">Requests</span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                      {refundsBreakdown.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-500">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {d.name} ({d.value})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <DetailTile label="Total Requests" value={fmtRaw(customer.raw.refunds?.totalRequests)} />
                <DetailTile label="Open" value={fmtRaw(customer.raw.refunds?.openRequests)} />
                <DetailTile label="Completed" value={fmtRaw(customer.raw.refunds?.completedRequests)} />
                <DetailTile label="Refused" value={fmtRaw(customer.raw.refunds?.refusedRequests)} />
                <DetailTile label="Failed" value={fmtRaw(customer.raw.refunds?.failedRequests)} />
                <DetailTile label="Awaiting Bank Details" value={fmtRaw(customer.raw.refunds?.awaitingBankDetails)} />
                <DetailTile label="Refunded Amount" value={fmtRawMoney(customer.raw.refunds?.refundedAmount)} />
                <DetailTile label="Last Request At" value={fmtRawDate(customer.raw.refunds?.lastRequestAt)} fallback="Not yet" />
              </BentoSection>

              <BentoSection icon={<ShieldAlert size={15} />} title="Disputes">
                <DetailTile label="Disputed Payments" value={fmtRaw(customer.raw.disputes?.disputedPayments)} />
                <DetailTile label="Disputed Amount" value={fmtRawMoney(customer.raw.disputes?.disputedAmount)} />
                <DetailTile label="Last Disputed At" value={fmtRawDate(customer.raw.disputes?.lastDisputedAt)} fallback="Not yet" />
              </BentoSection>

              <BentoSection icon={<Sparkles size={15} />} title="Engagement">
                <DetailTile label="Following Count" value={fmtRaw(customer.raw.engagement?.followingCount)} />
                <DetailTile label="Avoided Brands" value={fmtRaw(customer.raw.engagement?.avoidedBrandsCount)} />
                <DetailTile label="Promo Redemptions" value={fmtRaw(customer.raw.engagement?.promoRedemptions)} />
                <DetailTile label="Promo Discount Availed" value={fmtRawMoney(customer.raw.engagement?.promoDiscountAvailed)} />
                <DetailTile label="Open Promo Reservations" value={fmtRaw(customer.raw.engagement?.promoReservationsOpen)} />
              </BentoSection>

              <BentoSection icon={<Smartphone size={15} />} title="Profile & Devices">
                <DetailTile label="Address Count" value={fmtRaw(customer.raw.profile?.addressCount)} />
                <DetailTile label="Primary Address" value={fmtRaw(customer.raw.profile?.primaryAddress)} fallback={MISSING.location} />
                <DetailTile label="Bank Accounts" value={fmtRaw(customer.raw.profile?.bankAccountCount)} />
                <DetailTile label="Verified Bank Account" value={fmtRaw(customer.raw.profile?.hasVerifiedBankAccount)} />
                <DetailTile label="Active Devices" value={fmtRaw(customer.raw.profile?.activeDeviceCount)} />
                <DetailTile label="Device Platforms" value={fmtRaw(customer.raw.profile?.devicePlatforms)} fallback="Not recorded" />
                <DetailTile label="Last Seen At" value={fmtRawDate(customer.raw.profile?.lastSeenAt)} fallback="Not recorded" />
              </BentoSection>
            </>
          )}
        </div>
    </div>
  );
}

function InfoRow({ icon, label, value, fallback = MISSING.generic }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200/70 pb-3 last:border-0 last:pb-0 dark:border-neutral-800/70">
      <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
        {icon}
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200"><ValueOr value={value} fallback={fallback} /></span>
    </div>
  );
}

// Card wrapper for one section of the User Info tab's full raw-API dump.
// Card wrapper for one bento section of the User Info tab — a titled card
// whose children (DetailTile tiles, and occasionally a chart tile) lay out
// in a responsive tile grid.
function BentoSection({ icon, title, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  );
}

// One bento tile — label on top, value below. Used for every raw-API field
// so nothing from the response is ever left undisplayed.
function DetailTile({ icon, label, value, fallback = MISSING.generic }) {
  return (
    <div className="flex flex-col justify-between gap-1.5 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
      <span className="flex items-center gap-1 text-[10px] text-neutral-500">
        {icon}
        {label}
      </span>
      <span
        className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-50"
        title={typeof value === "string" && !isMissing(value) ? value : undefined}
      >
        <ValueOr value={value} fallback={fallback} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

// One 100-row page; search, filters and pagination are client-side.
const CUSTOMER_LIST_PARAMS = { page: 1, limit: 100 };

function FilterChip({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
        active
          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          : "border-neutral-200 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      }`}
    >
      {label}
      <span className="text-[11px] opacity-70">{count}</span>
    </button>
  );
}

export default function Customer() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");

  const [selectedId, setSelectedId] = useState(null);

  const { data: listRes, isPending: loading, error, refetch: refetchCustomers } = useCustomers(CUSTOMER_LIST_PARAMS);
  const loadError = error?.message ?? "";

  // List rows are lightweight — pull the fully-populated customer once the
  // detail view opens, same pattern as BrandDetailsPage's refreshBrandDetail.
  // If it fails, the lightweight list row keeps showing.
  const { data: detailRes, isFetching: detailLoading } = useCustomer(selectedId);
  const handleOpenCustomer = (customer) => setSelectedId(customer.id);

  const customers = useMemo(() => {
    const rawDetail = detailRes?.data?.customer ?? detailRes?.data ?? detailRes;
    const detailed = rawDetail ? normalizeCustomer(rawDetail) : null;
    return (listRes?.data?.data ?? listRes?.data ?? [])
      .map(normalizeCustomer)
      .map((c) => (detailed && c.id === detailed.id ? { ...c, ...detailed } : c));
  }, [listRes, detailRes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return customers.filter((c) => {
      // Most customers have no email or name yet — search the phone
      // (digits only, so "+91 62968" matches) and customer ID too.
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.uniqueId.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (digits.length > 0 && c.phone.replace(/\D/g, "").includes(digits));
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesPlatform = platformFilter === "All" || c.platform === platformFilter;
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [customers, search, statusFilter, platformFilter]);

  const PAGE_SIZE = 9;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedCustomer = customers.find((c) => c.id === selectedId) || null;

  const counts = useMemo(
    () => ({
      all: customers.length,
      active: customers.filter((c) => c.status === "Active").length,
      inactive: customers.filter((c) => c.status === "Inactive").length,
      android: customers.filter((c) => c.platform === "Android").length,
      ios: customers.filter((c) => c.platform === "iOS").length,
      newThisMonth: customers.filter((c) => {
        const d = c.raw?.createdAt ? new Date(c.raw.createdAt) : null;
        const now = new Date();
        return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length,
    }),
    [customers]
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {selectedCustomer ? (
          <CustomerDetail
            customer={selectedCustomer}
            detailLoading={detailLoading}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Customers</h1>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Every customer on the Trydood app, with their claims, spend and activity.
                </p>
              </div>

            </div>

            {/* KPI tiles — clicking one filters the list (same tiles as Live Vouchers). */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile
                icon={Users}
                label="Total Customers"
                value={counts.all}
                hint={`${counts.newThisMonth} joined this month`}
                tint="emerald"
                active={statusFilter === "All" && platformFilter === "All"}
                onClick={() => { setStatusFilter("All"); setPlatformFilter("All"); setPage(1); }}
              />
              <StatTile
                icon={CheckCircle2}
                label="Active"
                value={counts.active}
                hint="Can use the app"
                tint="sky"
                active={statusFilter === "Active"}
                onClick={() => { setStatusFilter(statusFilter === "Active" ? "All" : "Active"); setPage(1); }}
              />
              <StatTile
                icon={XCircle}
                label="Inactive"
                value={counts.inactive}
                hint="Account switched off"
                tint="neutral"
                active={statusFilter === "Inactive"}
                onClick={() => { setStatusFilter(statusFilter === "Inactive" ? "All" : "Inactive"); setPage(1); }}
              />
              <StatTile
                icon={Smartphone}
                label="Android"
                value={counts.android}
                hint="Android app users"
                tint="violet"
                active={platformFilter === "Android"}
                onClick={() => { setPlatformFilter(platformFilter === "Android" ? "All" : "Android"); setPage(1); }}
              />
              <StatTile
                icon={Apple}
                label="iOS"
                value={counts.ios}
                hint="iPhone app users"
                tint="amber"
                active={platformFilter === "iOS"}
                onClick={() => { setPlatformFilter(platformFilter === "iOS" ? "All" : "iOS"); setPage(1); }}
              />
            </div>

            {/* Search + filters */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:max-w-xs dark:border-neutral-800 dark:bg-neutral-900">
                <Search size={16} className="shrink-0 text-neutral-500" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, phone or ID..."
                  className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FilterChip label="All" count={counts.all} active={statusFilter === "All" && platformFilter === "All"} onClick={() => { setStatusFilter("All"); setPlatformFilter("All"); setPage(1); }} />
                <FilterChip label="Active" count={counts.active} active={statusFilter === "Active"} onClick={() => { setStatusFilter(statusFilter === "Active" ? "All" : "Active"); setPage(1); }} />
                <FilterChip label="Inactive" count={counts.inactive} active={statusFilter === "Inactive"} onClick={() => { setStatusFilter(statusFilter === "Inactive" ? "All" : "Inactive"); setPage(1); }} />
                <FilterChip label="Android" count={counts.android} active={platformFilter === "Android"} onClick={() => { setPlatformFilter(platformFilter === "Android" ? "All" : "Android"); setPage(1); }} />
                <FilterChip label="iOS" count={counts.ios} active={platformFilter === "iOS"} onClick={() => { setPlatformFilter(platformFilter === "iOS" ? "All" : "iOS"); setPage(1); }} />
              </div>
            </div>

            {/* Cards grid */}
            {loading ? (
              <Loader label="Loading customers…" />
            ) : loadError ? (
              <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <EmptyState
                  tone="error"
                  icon="error"
                  title="Couldn't load customers"
                  description={loadError}
                  action={{ label: "Try again", icon: RefreshCw, onClick: () => refetchCustomers() }}
                />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <EmptyState
                  icon={customers.length ? "search" : "customer"}
                  title={customers.length ? "No customers match these filters" : "No customers yet"}
                  description={
                    customers.length
                      ? "Try a different name, phone number, customer ID or filter."
                      : "Customers appear here as soon as people sign up in the Trydood app."
                  }
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pageRows.map((c) => (
                    <UserCard key={c.id} customer={c} onOpen={handleOpenCustomer} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-[12.5px] text-neutral-500">
                      Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                      {filtered.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        aria-label="Previous page"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
                            n === safePage
                              ? "bg-emerald-400 text-neutral-950"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        aria-label="Next page"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}