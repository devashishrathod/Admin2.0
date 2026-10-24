import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Store,
  Building2,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  ChevronDown,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  EyeOff,
  Search,
  X,
  Navigation,
  Tag,
  Star,
  ShieldCheck,
  LogIn,
  FileText,
} from "lucide-react";
import { EmptyState, VerifiedMark, inputClass } from "../../BrandShared";
import { ChangeNumberModal, Modal, ModalActions, Notice } from "../../BrandAdminExtras";
import { getBrandOutlets, getLocation, resendOutletOtp, verifyOutletOtp } from "../../services/BrandApi";
import { queryKeys } from "../../../../lib/query";
import Loader from "../../../../components/common/Loader";
import { CopyButton } from "../components/Bento";
import { glassClass, innerTile, tints, has } from "../components/bentoStyles";
import ValueOr from "../../../../components/common/ValueOr";
import { isMissing, MISSING } from "../../../../utils/helpers";

/* -------------------------------------------------------------------------
 * Sub-Brand tab — every outlet of the brand as expandable bento cards.
 *   GET /subBrands/get-all?brandId (#29): storeId, uniqueId, outletType,
 *     whatsappNumber, email, description, joinedDate, isActive,
 *     manager { isWhatsappVerified, isActive }, locationId, workHoursId
 *   GET /locations/get/:locationId (#33): full address — fetched only when
 *     a card is expanded.
 *   Work hours have no admin GET; they come with the brand detail's main
 *   outlet only, so they show on that card.
 * Outlets carry no photos in the API — brand photos live in Showcase Media.
 * Actions: Edit (#30), Change number (#28a), Resend code (#28).
 * ---------------------------------------------------------------------- */

const humanize = (v) =>
  String(v || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "—";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

function Chip({ tint = "neutral", icon: Icon, children }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tints[tint]}`}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}

// Small label/value tile inside an expanded card.
function Fact({ icon: Icon, label, value, mono = false, copy = false, empty = MISSING.generic }) {
  return (
    <div className={`${innerTile} min-w-0 px-3 py-2`}>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        <Icon size={10} />
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1">
        <p className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100 ${mono ? "font-mono text-[11.5px] normal-case" : ""}`}>
          <ValueOr value={has(value) ? value : null} fallback={empty} />
        </p>
        {copy && has(value) && <CopyButton value={value} label={label.toLowerCase()} />}
      </div>
    </div>
  );
}

/* ---- Address (lazy) --------------------------------------------------- */

// Normalises either a raw /locations row or the detail mapper's location.
function toAddress(loc, geoText) {
  if (!loc) return null;
  const coords = loc.geo?.coordinates;
  const latLng = coords?.length === 2 ? `${coords[1]}, ${coords[0]}` : has(geoText) ? geoText : null;
  return {
    line1: loc.addressLine1,
    line2: loc.addressLine2,
    landmark: loc.landmark,
    city: loc.city,
    district: loc.district,
    state: loc.state,
    zipcode: loc.zipcode,
    country: loc.country,
    formatted: loc.formattedAddress,
    type: loc.addressType,
    isDefault: loc.isDefault,
    latLng,
  };
}

function AddressBlock({ outlet, mainOutlet }) {
  // The brand detail already carries the main outlet's address — no fetch.
  const known = mainOutlet?.location ? toAddress(mainOutlet.location, mainOutlet.geo) : null;
  const query = useQuery({
    queryKey: queryKeys.subBrands.view("location", { id: outlet.locationId }),
    queryFn: () => getLocation(outlet.locationId),
    enabled: !known && Boolean(outlet.locationId),
    staleTime: 5 * 60 * 1000,
  });
  const addr = known || toAddress(query.data);

  if (!known && !outlet.locationId) return <p className="text-[12px] text-neutral-400">No address linked to this outlet.</p>;
  if (!known && query.isPending) return <Loader label="Loading address…" />;
  if (!known && query.error)
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-red-600 dark:text-red-400">
        <AlertTriangle size={13} /> {query.error.message}
      </p>
    );
  if (!addr) return <p className="text-[12px] text-neutral-400">Address not found.</p>;

  const full =
    (has(addr.formatted) && addr.formatted) ||
    [addr.line1, addr.line2, addr.city, addr.state, addr.zipcode].filter(has).map(titleCase).join(", ");
  const mapsHref = addr.latLng ? `https://www.google.com/maps?q=${encodeURIComponent(addr.latLng)}` : null;

  return (
    <div>
      <div className={`${innerTile} flex items-start gap-3 p-3`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tints.sky}`}>
          <MapPin size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium leading-relaxed text-neutral-800 dark:text-neutral-200"><ValueOr value={full} fallback="Address not added" /></p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {has(addr.type) && <Chip>{humanize(addr.type)}</Chip>}
            {addr.isDefault && <Chip tint="emerald">Default</Chip>}
          </div>
        </div>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1 rounded-full bg-sky-400/10 px-3 py-1.5 text-[11.5px] font-semibold text-sky-600 transition-colors hover:bg-sky-400/20 dark:text-sky-400"
          >
            <Navigation size={12} /> Map
          </a>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact icon={MapPin} label="City" value={titleCase(addr.city)} empty="Not added" />
        <Fact icon={MapPin} label="District" value={titleCase(addr.district)} empty="Not added" />
        <Fact icon={MapPin} label="State" value={titleCase(addr.state)} empty="Not added" />
        <Fact icon={MapPin} label="Zipcode" value={addr.zipcode} empty="Not added" />
        {has(addr.landmark) && <Fact icon={Tag} label="Landmark" value={addr.landmark} />}
        {addr.latLng && <Fact icon={Navigation} label="Coordinates" value={addr.latLng} mono copy />}
      </div>
    </div>
  );
}

/* ---- Modals ----------------------------------------------------------- */

// Resend the manager's code — repeats POST /subBrands/signUp-with-whatsapp
// (#28), which for an unverified outlet only resends (no new outlet/slot).
function ResendCodeModal({ brandId, outlet, onClose, onSent }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const send = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await resendOutletOtp(brandId, outlet.whatsappNumber);
      // Straight into the code-entry modal, with the resend timer running.
      onSent(res?.message || "Code sent to the outlet manager.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="Resend verification code" subtitle={outlet.storeId || outlet.uniqueId} onClose={onClose}>
      <div className={`${innerTile} flex items-center gap-3 p-3`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tints.sky}`}>
          <Send size={15} />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">+91 {outlet.whatsappNumber}</p>
          <p className="text-[11.5px] text-neutral-500">A new 6-digit code goes to this WhatsApp number.</p>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] text-neutral-500">One code per 60 seconds, up to 5 per hour. No new outlet or plan slot is used.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={send} submitting={submitting} label="Send code" />
    </Modal>
  );
}

// Resend is throttled to one code per 60 s (doc #4 / #28).
const RESEND_COOLDOWN = 60;

// Verify the manager — the admin types the code the manager received
// (POST /auth/verify-otp-whatsapp, role SUB_VENDOR). `sentMessage` is set
// when a code was just sent: the resend timer starts at 60 s.
function VerifyOutletModal({ brandId, outlet, sentMessage, onClose, onSaved }) {
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(sentMessage || "");
  const [sentAt, setSentAt] = useState(() => (sentMessage ? Date.now() : null));
  const [now, setNow] = useState(() => Date.now());
  const valid = /^\d{6}$/.test(otp);

  // Tick once a second while the cooldown runs.
  const left = sentAt ? Math.max(0, RESEND_COOLDOWN - Math.floor((now - sentAt) / 1000)) : 0;
  useEffect(() => {
    if (!left) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [left]);
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  const verify = async () => {
    setSubmitting(true);
    setError("");
    setInfo("");
    try {
      const res = await verifyOutletOtp(outlet.whatsappNumber, otp);
      onSaved(res?.message && res.message !== "OTP verified successfully" ? res.message : "Outlet manager verified.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError("");
    setInfo("");
    try {
      const res = await resendOutletOtp(brandId, outlet.whatsappNumber);
      setInfo(res?.message || "A new code was sent.");
      setOtp("");
      setSentAt(Date.now());
      setNow(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal title="Enter verification code" subtitle={`${outlet.storeId || outlet.uniqueId} · +91 ${outlet.whatsappNumber}`} onClose={onClose}>
      {/* Sent status + timer */}
      <div className={`${innerTile} mb-3 flex items-center gap-3 px-3 py-2.5`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sentAt ? tints.emerald : tints.sky}`}>
          {sentAt ? <CheckCircle2 size={15} /> : <Send size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">
            {sentAt ? `Code sent to +91 ${outlet.whatsappNumber}` : `Code goes to +91 ${outlet.whatsappNumber}`}
          </p>
          <p className="text-[11px] text-neutral-500">
            {sentAt
              ? `Sent at ${new Date(sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Ask the manager for the 6-digit code on their WhatsApp"}
          </p>
        </div>
        {left > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 font-mono text-[12px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            <Clock size={12} />
            {mmss}
          </span>
        )}
      </div>
      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && valid && !submitting && verify()}
        inputMode="numeric"
        autoFocus
        placeholder="••••••"
        aria-label="6-digit code"
        className={`${inputClass} mt-3 text-center font-mono text-[20px] tracking-[0.5em]`}
      />
      <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px]">
        <span className="text-neutral-500">5 wrong tries delete the code</span>
        {left > 0 ? (
          <span className="text-neutral-500">
            Resend in <b className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">{mmss}</b>
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending || outlet.manager?.isActive === false}
            className="flex items-center gap-1 font-semibold text-sky-600 hover:underline disabled:opacity-40 dark:text-sky-400"
          >
            {resending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} {sentAt ? "Resend code" : "Send code"}
          </button>
        )}
      </div>
      {info && <Notice tone="ok">{info}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={verify} disabled={!valid} submitting={submitting} label="Verify" />
    </Modal>
  );
}

/* ---- Outlet card ------------------------------------------------------ */

function OutletCard({ outlet, mainOutlet, index, readOnly, expanded, onToggle, onVerify, onChangeNumber, onResend }) {
  const verified = outlet.manager?.isWhatsappVerified === true;
  const loginOff = outlet.manager?.isActive === false;
  const hidden = outlet.isActive === false;
  const isFranchise = outlet.outletType === "FRANCHISE";
  const name = outlet.storeId || outlet.uniqueId || `Outlet ${index + 1}`;
  const joined = fmtDate(outlet.joinedDate || outlet.createdAt);

  return (
    <div className={`${glassClass} overflow-hidden transition-shadow ${expanded ? "!bg-white/80 dark:!bg-neutral-900/80" : ""} ${hidden ? "opacity-85" : ""}`}>
      {/* Header — always visible, click to expand */}
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-3 p-4 text-left">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isFranchise ? tints.violet : tints.emerald}`}>
          {isFranchise ? <Building2 size={18} /> : <Store size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-[14px] font-bold normal-case text-neutral-900 dark:text-neutral-50">{name}</p>
            {mainOutlet && <Chip tint="amber" icon={Star}>Main</Chip>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Chip tint={isFranchise ? "violet" : "emerald"}>{humanize(outlet.outletType || "OUTLET")}</Chip>
            <Chip tint={hidden ? "neutral" : "sky"} icon={hidden ? EyeOff : CheckCircle2}>{hidden ? "Hidden" : "Active"}</Chip>
            <Chip tint={verified ? "emerald" : "amber"} icon={verified ? ShieldCheck : Clock}>{verified ? "Manager verified" : "Awaiting code"}</Chip>
            {loginOff && <Chip tint="red" icon={LogIn}>Login off</Chip>}
          </div>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300"><ValueOr value={outlet.whatsappNumber ? `+91 ${outlet.whatsappNumber}` : null} fallback={MISSING.phone} /></p>
          <p className="text-[11px] text-neutral-400">{isMissing(joined) ? "Join date not set" : `Joined ${joined}`}</p>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Details */}
      {expanded && (
        <div className="space-y-4 border-t border-neutral-200/60 p-4 dark:border-white/5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Fact icon={Tag} label="Store ID" value={outlet.storeId} copy empty={MISSING.id} />
            <Fact icon={Tag} label="Unique ID" value={outlet.uniqueId} copy empty={MISSING.id} />
            <Fact icon={Phone} label="WhatsApp" value={outlet.whatsappNumber ? `+91 ${outlet.whatsappNumber}` : null} copy empty={MISSING.phone} />
            <Fact icon={CalendarDays} label="Joined" value={joined} empty={MISSING.date} />
          </div>

          {/* Manager account */}
          <div className={`${innerTile} grid gap-3 p-3 sm:grid-cols-3`}>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Manager email</p>
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] font-semibold normal-case text-neutral-800 dark:text-neutral-100">
                <Mail size={12} className="shrink-0 text-neutral-400" />
                <span className="truncate"><ValueOr value={has(outlet.email) ? outlet.email : null} fallback={MISSING.email} /></span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">WhatsApp</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">
                {verified ? "Verified" : "Not verified"}
                <VerifiedMark verified={verified} />
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Sign-in</p>
              <p className={`mt-0.5 text-[12.5px] font-semibold ${loginOff ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {loginOff ? "Login off" : "Allowed"}
              </p>
            </div>
          </div>

          {has(outlet.description) && (
            <p className="flex items-start gap-2 text-[12.5px] normal-case leading-relaxed text-neutral-600 dark:text-neutral-300">
              <FileText size={13} className="mt-0.5 shrink-0 text-neutral-400" />
              {outlet.description}
            </p>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Address</p>
            <AddressBlock outlet={outlet} mainOutlet={mainOutlet} />
          </div>

          {mainOutlet?.workHours?.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Work hours</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                {mainOutlet.workHours.map((d) => (
                  <div
                    key={d.day}
                    className={`rounded-xl px-2.5 py-2 text-[11px] ${
                      d.isOpen ? `${tints.emerald}` : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800/70 dark:text-neutral-500"
                    }`}
                  >
                    <p className="font-semibold">{d.day}</p>
                    <p className="opacity-80">{d.hours}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions — only while the manager hasn't verified (doc #28,
              #28a, #4). Once verified the number is a live login and can
              only be changed by the manager themselves. */}
          {!readOnly && outlet._id && !verified && (
            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200/60 pt-3 dark:border-white/5">
              {/* Edit outlet (PUT /subBrands/update) — commented out for now.
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
              >
                <Pencil size={12} /> Edit outlet
              </button>
              */}
              <button
                onClick={onVerify}
                disabled={loginOff}
                title={loginOff ? "Manager login is off — reactivate first" : "Enter the manager's code"}
                className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-3.5 py-1.5 text-[12px] font-semibold text-neutral-950 shadow-sm transition-colors hover:bg-emerald-300 disabled:opacity-40"
              >
                <ShieldCheck size={12} /> Verify outlet
              </button>
              <button
                onClick={onResend}
                disabled={loginOff}
                title={loginOff ? "Manager login is off — reactivate first" : "Resend code"}
                className="flex items-center gap-1.5 rounded-full bg-sky-400/10 px-3.5 py-1.5 text-[12px] font-semibold text-sky-600 transition-colors hover:bg-sky-400/20 disabled:opacity-40 dark:text-sky-400"
              >
                <Send size={12} /> Resend code
              </button>
              <button
                onClick={onChangeNumber}
                className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-1.5 text-[12px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <Phone size={12} /> Change number
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Tab -------------------------------------------------------------- */

const FILTERS = [
  ["all", "All"],
  ["outlet", "Outlets"],
  ["franchise", "Franchises"],
  ["pending", "Awaiting code"],
  ["hidden", "Hidden"],
];

const matches = (o, f) =>
  f === "outlet"
    ? o.outletType !== "FRANCHISE"
    : f === "franchise"
    ? o.outletType === "FRANCHISE"
    : f === "pending"
    ? o.manager?.isWhatsappVerified !== true
    : f === "hidden"
    ? o.isActive === false
    : true;

export default function SubBrandTab({ brand, readOnly = false }) {
  const query = useQuery({
    queryKey: queryKeys.subBrands.list({ brandId: brand.id }),
    queryFn: () => getBrandOutlets(brand.id),
    enabled: Boolean(brand.id),
  });
  const outlets = useMemo(() => query.data ?? [], [query.data]);
  const main = brand.outlets?.[0];

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState(() => new Set());
  const [modal, setModal] = useState(null); // { kind: "verify" | "resend" | "number", outlet }
  const [message, setMessage] = useState(null); // { tone, text }

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(([k]) => [k, outlets.filter((o) => matches(o, k)).length])),
    [outlets]
  );
  const q = search.trim().toLowerCase();
  const shown = outlets.filter(
    (o) =>
      matches(o, filter) &&
      (!q || [o.storeId, o.uniqueId, o.whatsappNumber, o.email].some((v) => String(v || "").toLowerCase().includes(q)))
  );

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allOpen = shown.length > 0 && shown.every((o) => openIds.has(o._id));

  const done = (text, tone = "ok") => {
    setModal(null);
    setMessage({ tone, text });
    query.refetch();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tints.emerald}`}>
            <Store size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">Outlets & franchises</h3>
            <p className="text-[12px] text-neutral-500">Tap an outlet to see its full details</p>
          </div>
        </div>
        {shown.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenIds(allOpen ? new Set() : new Set(shown.map((o) => o._id)))}
            className={`${glassClass} flex h-9 w-fit items-center gap-1.5 !rounded-full px-3.5 text-[12px] font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white`}
          >
            <ChevronDown size={13} className={allOpen ? "rotate-180" : ""} />
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {query.isPending ? (
        <Loader label="Loading outlets…" />
      ) : query.error ? (
        <p className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <AlertTriangle size={14} /> {query.error.message}
        </p>
      ) : outlets.length === 0 ? (
        <EmptyState label="No outlets added yet." />
      ) : (
        <>
          {/* Filter tabs + search */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className={`${glassClass} no-scrollbar flex w-fit max-w-full items-center gap-1 overflow-x-auto !rounded-full p-1`}>
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                    filter === key ? "bg-emerald-400 text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  {label} <span className="opacity-60">{counts[key]}</span>
                </button>
              ))}
            </div>
            <label className={`${glassClass} flex h-9 items-center gap-2 !rounded-full px-3.5 sm:w-64`}>
              <Search size={14} className="shrink-0 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search store ID, number, email"
                className="w-full bg-transparent text-[12.5px] text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-neutral-400 hover:text-neutral-700">
                  <X size={13} />
                </button>
              )}
            </label>
          </div>

          {message && (
            <p
              className={`mb-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] ${
                message.tone === "error"
                  ? "bg-red-500/5 text-red-600 dark:text-red-400"
                  : message.tone === "warn"
                  ? "bg-amber-400/10 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {message.tone !== "ok" ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
              {message.text}
            </p>
          )}

          {shown.length === 0 ? (
            <div className={`${glassClass} py-12 text-center text-[12.5px] text-neutral-500`}>No outlets match this filter.</div>
          ) : (
            <div className="space-y-3">
              {shown.map((o, i) => (
                <OutletCard
                  key={o._id || i}
                  outlet={o}
                  index={i}
                  mainOutlet={main && has(main.uniqueId) && main.uniqueId === o.uniqueId ? main : null}
                  readOnly={readOnly}
                  expanded={openIds.has(o._id)}
                  onToggle={() => toggle(o._id)}
                  onVerify={() => setModal({ kind: "verify", outlet: o })}
                  onResend={() => setModal({ kind: "resend", outlet: o })}
                  onChangeNumber={() => setModal({ kind: "number", outlet: o })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit outlet modal — commented out with its button.
      {modal?.kind === "edit" && <EditOutletModal outlet={modal.outlet} onClose={() => setModal(null)} onSaved={done} />} */}
      {modal?.kind === "verify" && (
        <VerifyOutletModal
          key={`${modal.outlet._id}-${modal.sentMessage || ""}`}
          brandId={brand.id}
          outlet={modal.outlet}
          sentMessage={modal.sentMessage}
          onClose={() => setModal(null)}
          onSaved={done}
        />
      )}
      {modal?.kind === "resend" && (
        <ResendCodeModal
          brandId={brand.id}
          outlet={modal.outlet}
          onClose={() => setModal(null)}
          onSent={(text) => setModal({ kind: "verify", outlet: modal.outlet, sentMessage: text })}
        />
      )}
      {/* A changed number gets a fresh code → straight to code entry. */}
      {modal?.kind === "number" && (
        <ChangeNumberModal
          outlet={modal.outlet}
          onClose={() => setModal(null)}
          onSaved={(text, { whatsappNumber, otpSent } = {}) => {
            query.refetch();
            if (otpSent === false) return done(text, "warn");
            setModal({ kind: "verify", outlet: { ...modal.outlet, whatsappNumber: whatsappNumber || modal.outlet.whatsappNumber }, sentMessage: text });
          }}
        />
      )}
    </div>
  );
}
