// Date-window helpers shared by the finance overview widgets
// (Transactions / Settlement / Refund). Rows carry a "YYYY-MM-DD" date
// string built with toISOString().slice(0, 10), so window bounds use the
// same UTC slice and plain string comparison lines up.

export function dayKey(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Rows whose date falls within [fromDaysAgo .. toDaysAgo], inclusive.
export function inWindow(rows, fromDaysAgo, toDaysAgo, getDate = (r) => r.date) {
  const start = dayKey(fromDaysAgo);
  const end = dayKey(toDaysAgo);
  return rows.filter((r) => {
    const d = getDate(r);
    return d && d >= start && d <= end;
  });
}

// Relative change in %. `null` means "no baseline" (shown as "New"),
// so a jump from 0 isn't rendered as an infinite percentage.
export function pctChange(cur, prev) {
  if (!prev) return cur ? null : 0;
  return ((cur - prev) / prev) * 100;
}

// Summarize the latest 7 days against the 7 before them.
export function weekOverWeek(rows, summarize, getDate) {
  return {
    cur: summarize(inWindow(rows, 6, 0, getDate)),
    prev: summarize(inWindow(rows, 13, 7, getDate)),
  };
}

export const compactInr = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};
