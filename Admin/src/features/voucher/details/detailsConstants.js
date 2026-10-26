import { FileText, CheckCircle2, XCircle, UploadCloud, Clock } from "lucide-react";

// Shared look-up tables for the voucher details sections (moved unchanged
// from VoucherDetails.jsx).

// Banner review status (bannerStatus) → pill label / colour.
export const BANNER_STATUS_TONES = { PENDING: "amber", APPROVED: "emerald", REJECTED: "red" };
export function bannerStatusLabel(banner) {
  if (banner?.status === "PENDING") return "Pending review";
  if (banner?.status === "APPROVED") return "Approved";
  if (banner?.status === "REJECTED") return "Rejected";
  return banner?.current?.url ? "Live" : "No banner";
}

export const HISTORY_ICONS = {
  Created: FileText,
  Submitted: FileText,
  Approved: CheckCircle2,
  Rejected: XCircle,
  Published: UploadCloud,
  Paused: Clock,
  Expired: Clock,
  Archived: Clock,
};

export const HISTORY_COLORS = {
  Created: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
  Submitted: "text-sky-600 dark:text-sky-400 bg-sky-400/10",
  Approved: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
  Rejected: "text-red-600 dark:text-red-400 bg-red-500/10",
  Published: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
  Paused: "text-orange-600 dark:text-orange-400 bg-orange-400/10",
  Expired: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
  Archived: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
};

// A fixed, non-cycled categorical order (blue, orange, teal, amber, pink,
// green, violet, red) — so each offer / each version gets its own distinct
// color instead of blending together, and the same slot index always means
// the same hue. Classes are written out in full (not built from a template
// string) since Tailwind only picks up literal class names it can find in
// source, not ones assembled at runtime.
export const ACCENT_STYLES = [
  { dot: "bg-blue-500", left: "border-blue-400" },
  { dot: "bg-orange-500", left: "border-orange-400" },
  { dot: "bg-teal-500", left: "border-teal-400" },
  { dot: "bg-amber-500", left: "border-amber-400" },
  { dot: "bg-pink-500", left: "border-pink-400" },
  { dot: "bg-green-500", left: "border-green-400" },
  { dot: "bg-violet-500", left: "border-violet-400" },
  { dot: "bg-red-500", left: "border-red-400" },
];

// "UNDER_REVIEW" → "Under Review"
export function statusLabel(status) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
