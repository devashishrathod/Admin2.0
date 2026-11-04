import { AUDIENCE_GROUPS, EMPTY_DRAFT, LIMITS, SCHEDULE, groupByKey } from "../notificationConfig";

/* -------------------------------------------------------------------------
 * Pure helpers for the composer: draft shape, audience → `target`,
 * paste-list parsing, validation and broadcast result summaries.
 * No React in here — everything takes plain values and returns plain values.
 * ---------------------------------------------------------------------- */

/* ---- Draft -------------------------------------------------------------- */

// Fills any field a stored (older) draft is missing, so the form never
// reads `undefined` after the draft shape changes.
export function normalizeDraft(raw = {}) {
  const a = raw.audience || {};
  return {
    ...EMPTY_DRAFT,
    ...raw,
    audience: {
      ...EMPTY_DRAFT.audience,
      ...a,
      filter: { ...EMPTY_DRAFT.audience.filter, ...a.filter },
      picked: { ...EMPTY_DRAFT.audience.picked, ...a.picked },
    },
    message: { ...EMPTY_DRAFT.message, ...raw.message },
  };
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ---- Directory rows ----------------------------------------------------- */

export const digitsOf = (v) => String(v || "").replace(/\D/g, "");
// Last 10 digits — "+91 98765 43210" and "9876543210" are the same number.
export const phoneKey = (v) => digitsOf(v).slice(-10);

export function initialsOf(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

const inRange = (iso, from, to) => {
  if (!from && !to) return true;
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return false;
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && t > new Date(`${to}T23:59:59`).getTime()) return false;
  return true;
};

export function matchesKeyword(row, keyword) {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const digits = digitsOf(q);
  return (
    row.name.toLowerCase().includes(q) ||
    (row.sub || "").toLowerCase().includes(q) ||
    (row.email || "").toLowerCase().includes(q) ||
    (row.uniqueId || "").toLowerCase().includes(q) ||
    (digits.length >= 3 && (row.phone || "").includes(digits))
  );
}

// filter = draft.audience.filter. Rows = one group's directory rows.
export function applyFilter(rows, filter) {
  return rows.filter(
    (r) =>
      (filter.status === "all" || (filter.status === "active") === r.active) &&
      matchesKeyword(r, filter.keyword) &&
      inRange(r.joinedAt, filter.from, filter.to) &&
      (!filter.hasEmail || Boolean(r.email))
  );
}

// True when the filter only narrows by "has email" (or nothing) — then the
// whole role can go as `roles` + `filters.hasEmail`, which the server
// resolves over every user instead of just the rows loaded here.
export const isRoleWideFilter = (f) => f.status === "all" && !f.keyword.trim() && !f.from && !f.to;

/* ---- Paste list --------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readEntry(part, out) {
  const s = part.trim();
  if (!s) return;
  if (s.includes("@")) {
    if (EMAIL_RE.test(s)) out.emails.add(s.toLowerCase());
    else out.unreadable.add(s);
    return;
  }
  const d = digitsOf(s);
  if (d.length === 10 || (d.length === 12 && d.startsWith("91")) || (d.length === 11 && d.startsWith("0"))) {
    out.numbers.add(d.slice(-10));
    return;
  }
  // "9876543210 9812345678" — several entries split by spaces.
  const words = s.split(/\s+/);
  if (words.length > 1) words.forEach((w) => readEntry(w, out));
  else out.unreadable.add(s);
}

/** Text from a sheet → unique emails / 10-digit numbers / anything else. */
export function parsePasteList(text = "") {
  const out = { emails: new Set(), numbers: new Set(), unreadable: new Set() };
  // Commas, semicolons, tabs and new lines always separate. Spaces only
  // separate when the chunk isn't one spaced-out number ("+91 98765 43210").
  text.split(/[\n,;\t]+/).forEach((chunk) => readEntry(chunk, out));
  return { emails: [...out.emails], numbers: [...out.numbers], unreadable: [...out.unreadable] };
}

/** Parsed paste → directory rows it points at (customers + outlet managers;
 *  vendor rows carry no contact details in the list API). */
export function matchPasted(parsed, directory) {
  const byEmail = new Map();
  const byPhone = new Map();
  ["customers", "outlets"].forEach((group) =>
    directory[group].rows.forEach((r) => {
      const row = { ...r, group };
      if (r.email) byEmail.set(r.email.toLowerCase(), row);
      if (r.phone) byPhone.set(r.phone, row);
    })
  );
  const matched = new Map();
  const missing = [];
  parsed.emails.forEach((e) => (byEmail.has(e) ? matched.set(byEmail.get(e).id, byEmail.get(e)) : missing.push(e)));
  parsed.numbers.forEach((n) => (byPhone.has(n) ? matched.set(byPhone.get(n).id, byPhone.get(n)) : missing.push(n)));
  return { matched: [...matched.values()], missing };
}

/* ---- Audience → target -------------------------------------------------- */

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function idsTarget(rowsByGroup) {
  const target = {};
  let count = 0;
  AUDIENCE_GROUPS.forEach((g) => {
    const ids = (rowsByGroup[g.key] || []).map((r) => r.id);
    if (ids.length) {
      target[g.idKey] = ids;
      count += ids.length;
    }
  });
  return count ? { target, count } : { target: null, count: 0 };
}

/**
 * The current audience as everything the composer needs:
 *   target   — `target` for POST /notifications/broadcast (null = no audience yet)
 *   estimate — local count, shown until the dry run answers (null = unknown)
 *   label    — one line for the Send card and History
 *   notes    — caveats worth showing (partial data, unmatched entries…)
 */
// roleCounts = { CUSTOMER: n, … } — per-role dry run, else the loaded total.
const sumRoles = (groups, roleCounts) => groups.reduce((n, g) => n + (roleCounts?.[g.role] ?? 0), 0);

export function resolveAudience(audience, directory, roleCounts) {
  const { mode } = audience;
  const notes = [];

  if (mode === "role") {
    if (audience.everyone) {
      return { target: { all: true }, estimate: sumRoles(AUDIENCE_GROUPS, roleCounts), label: "Everyone on the platform", notes };
    }
    const groups = AUDIENCE_GROUPS.filter((g) => audience.roles.includes(g.role));
    if (!groups.length) return { target: null, estimate: 0, label: "No role selected", notes };
    return {
      target: { roles: groups.map((g) => g.role) },
      estimate: sumRoles(groups, roleCounts),
      label: `All ${groups.map((g) => g.label.toLowerCase()).join(", ")}`,
      notes,
    };
  }

  if (mode === "filter") {
    const f = audience.filter;
    const group = groupByKey(f.group);
    const src = directory[group.key];
    const hasEmail = f.hasEmail ? { filters: { hasEmail: true } } : {};
    const parts = [group.label];
    if (f.status !== "all") parts.push(f.status);
    if (f.keyword.trim()) parts.push(`"${f.keyword.trim()}"`);
    if (f.from || f.to) parts.push(`joined ${f.from || "…"} → ${f.to || "now"}`);
    if (f.hasEmail) parts.push("with email");
    const label = parts.join(" · ");

    if (isRoleWideFilter(f)) {
      // "Has email" narrows server-side; the loaded rows give the estimate.
      const estimate = f.hasEmail ? applyFilter(src.rows, f).length : roleCounts?.[group.role] ?? src.total;
      return { target: { roles: [group.role], ...hasEmail }, estimate, label, notes };
    }
    const rows = applyFilter(src.rows, f);
    if (src.total > src.rows.length) {
      notes.push(`Filters run over the ${src.rows.length} most recent ${group.label.toLowerCase()} loaded here (of ${src.total}).`);
    }
    if (!rows.length) return { target: null, estimate: 0, label, notes };
    return { target: { [group.idKey]: rows.map((r) => r.id), ...hasEmail }, estimate: rows.length, label, notes };
  }

  if (mode === "list") {
    const { target, count } = idsTarget(audience.picked);
    return { target, estimate: count, label: count ? `${plural(count, "hand-picked recipient")}` : "Nobody picked yet", notes };
  }

  // paste
  const parsed = parsePasteList(audience.paste);
  const { matched, missing } = matchPasted(parsed, directory);
  if (missing.length) notes.push(`${plural(missing.length, "entry")} didn't match anyone and will be skipped.`);
  const byGroup = { customers: [], vendors: [], outlets: [] };
  matched.forEach((r) => byGroup[r.group].push(r));
  const { target, count } = idsTarget(byGroup);
  return { target, estimate: count, label: count ? `${plural(count, "pasted contact")}` : "No pasted contact matched", notes, parsed, matched, missing };
}

/* ---- Validation --------------------------------------------------------- */

export const isValidUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/** errors block sending; warnings are worth a look but don't. */
export function validateDraft(draft, audience) {
  const { title, body, imageUrl, deepLink } = draft.message;
  const errors = [];
  const warnings = [];
  if (!audience.target) errors.push("Pick who receives it.");
  if (audience.estimate > LIMITS.maxRecipients)
    errors.push(`One send can name at most ${LIMITS.maxRecipients.toLocaleString("en-IN")} people — narrow the audience.`);
  if (!title.trim()) errors.push("Add a title.");
  else if (title.length > LIMITS.title) errors.push(`Title is over ${LIMITS.title} characters.`);
  if (!body.trim()) errors.push("Add a message.");
  else if (body.length > LIMITS.body) errors.push(`Message is over ${LIMITS.body} characters.`);
  if (imageUrl.trim() && !isValidUrl(imageUrl.trim())) errors.push("Image URL must start with http:// or https://.");
  if (deepLink.length > LIMITS.deepLink) errors.push(`Deep link is over ${LIMITS.deepLink} characters.`);

  if (!draft.push && !draft.inApp) errors.push("Turn on at least one channel.");
  if (!draft.inApp)
    warnings.push("In-app off is saved in the draft only — the API has no switch for it yet, so the server still writes it.");

  if (draft.push) {
    warnings.push("Push skips recipients without a registered device.");
    if (title.length > LIMITS.pushTitleVisible) warnings.push("Long titles get cut off on the lock screen.");
    if (body.length > LIMITS.pushBodyVisible) warnings.push("Long messages get trimmed on the lock screen.");
  } else if (draft.inApp) {
    warnings.push("Push is off — this goes to the in-app bell (and email) only.");
  }
  return { errors, warnings };
}

/** Draft → POST /notifications/broadcast body. `draft.inApp` is not sent:
 *  the API has no field for it yet (IN_APP is always written). Add it here
 *  once the backend accepts one. */
export function buildPayload(draft, target) {
  const { title, body, imageUrl, deepLink, severity } = draft.message;
  return {
    title: title.trim(),
    body: body.trim(),
    target,
    severity,
    push: draft.push,
    dryRun: false,
    ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
    ...(deepLink.trim() ? { deepLink: deepLink.trim() } : {}),
  };
}

/* ---- Dry-run count ------------------------------------------------------ */

const COUNT_KEYS = ["resolved", "audienceSize", "audienceCount", "recipientCount", "recipients", "totalRecipients", "total", "count", "size"];

const numberIn = (obj) => {
  if (typeof obj === "number") return obj;
  if (Array.isArray(obj)) return obj.length;
  if (!obj || typeof obj !== "object") return null;
  for (const k of COUNT_KEYS) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
    if (Array.isArray(v)) return v.length;
  }
  return null;
};

/** Recipient count out of a dry-run response. The doc says
 *  `data.audience.resolved`, but the live server has answered in other
 *  shapes, so look in the usual places before giving up (null). */
export function countFromDryRun(res) {
  const d = res?.data?.data ?? res?.data ?? res ?? {};
  return numberIn(d.audience) ?? numberIn(d) ?? numberIn(res) ?? null;
}

/* ---- Results ------------------------------------------------------------ */

/** Broadcast response → flat numbers (missing blocks count as 0). */
export function summarizeBroadcast(res) {
  const d = res?.data?.data ?? res?.data ?? {};
  return {
    broadcastId: d.broadcastId || null,
    resolved: countFromDryRun(res) ?? 0,
    skipped: d.audience?.skipped ?? 0,
    inApp: d.inApp?.created ?? 0,
    push: { devices: d.push?.devices ?? 0, sent: d.push?.sent ?? 0, failed: d.push?.failed ?? 0 },
    email: { sent: d.email?.sent ?? 0, failed: d.email?.failed ?? 0, skipped: d.email?.skipped ?? 0 },
  };
}

export const failedCount = (stats) => (stats ? stats.push.failed + stats.email.failed : 0);

export const statusOf = (stats) => (failedCount(stats) > 0 ? "partial" : "sent");

// A retry with `broadcastId` only goes to the ones that missed it, so its
// sent counts add up and its failures replace the old ones.
export function mergeRetry(prev, next) {
  return {
    ...prev,
    inApp: prev.inApp + next.inApp,
    push: { devices: prev.push.devices, sent: prev.push.sent + next.push.sent, failed: next.push.failed },
    email: { sent: prev.email.sent + next.email.sent, failed: next.email.failed, skipped: prev.email.skipped },
  };
}

/** Totals for the KPI tiles across every history entry. */
export function historyTotals(entries) {
  const t = { sends: 0, resolved: 0, inApp: 0, delivered: 0, attempted: 0, failed: 0, needsRetry: 0, scheduled: 0 };
  entries.forEach((e) => {
    if (e.status === "scheduled") t.scheduled += 1;
    if (e.status === "partial" || e.status === "failed") t.needsRetry += 1;
    if (["sent", "partial", "failed"].includes(e.status)) t.sends += 1;
    if (!e.stats) return;
    const s = e.stats;
    t.resolved += s.resolved;
    t.inApp += s.inApp;
    t.delivered += s.push.sent + s.email.sent;
    t.attempted += s.push.sent + s.push.failed + s.email.sent + s.email.failed;
    t.failed += failedCount(s);
  });
  t.deliveredPct = t.attempted ? Math.round((t.delivered / t.attempted) * 100) : 0;
  return t;
}

/* ---- Scheduling --------------------------------------------------------- */

/** "" when fine, otherwise why `value` can't be used. */
export function scheduleError(value) {
  if (!value) return "Pick a date and time.";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "That date doesn't look right.";
  if (t - Date.now() < SCHEDULE.minLeadMs) return `Pick a time at least ${SCHEDULE.minLeadMs / 60_000} minutes from now.`;
  return "";
}

/** "1,240" for a server-checked count, "~1,240" for an estimate, "—" if unknown. */
export function formatCount(n, exact = true) {
  if (n == null) return "—";
  return `${exact ? "" : "~"}${Number(n).toLocaleString("en-IN")}`;
}

export function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
