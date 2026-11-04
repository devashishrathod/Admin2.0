/* Small helpers shared by the profile screens. */

export const ROLE_LABELS = { ADMIN: "Admin", SUPER_ADMIN: "Super admin", SUB_ADMIN: "Sub admin" };

export const initialsOf = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

// "9800000000" → "+91 98000 00000"
export const formatPhone = (raw) => {
  const d = String(raw || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : raw || "";
};

export const tenDigits = (raw) => String(raw || "").replace(/\D/g, "").slice(-10);

export const formatDate = (iso, withTime = false) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};

// ISO / date string → "YYYY-MM-DD" for <input type="date">.
export const toDateInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Password rules from POST /auth/set-password (doc #9). */
export const PASSWORD_RULES = [
  { key: "len", label: "8–72 characters", test: (p) => p.length >= 8 && p.length <= 72 },
  { key: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "A number", test: (p) => /\d/.test(p) },
];

/** 0–4: how many rules pass, plus a bonus for length/symbols (meter only). */
export function passwordScore(p) {
  if (!p) return 0;
  const base = PASSWORD_RULES.filter((r) => r.test(p)).length;
  const bonus = (p.length >= 12 ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
  return Math.min(5, base + bonus);
}
