// Shared math for the finance overviews (Transactions, Refunds,
// Settlements): the chart's day window from the page's date filter, daily
// totals over it, week-over-week trends, and the validated chart colours.
// Plain module (no JSX) so it can export constants and helpers.

import { localDateStr, pctChange, weekOverWeek } from "./overviewStats";

// Validated categorical slot 1 (light / dark) + chart chrome — the same
// palette the Subscriptions overview uses.
export const FIN_SERIES = { light: "#2a78d6", dark: "#3987e5" };
export const FIN_CHART = {
  light: { grid: "#ececea", axis: "#898781", surface: "#ffffff" },
  dark: { grid: "#262626", axis: "#898781", surface: "#171717" },
};
// Reserved status colours — always shown with an icon + label.
export const FIN_STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  info: "#2a78d6",
  violet: "#8b5cf6",
  neutral: "#898781",
};

const DEFAULT_DAYS = 14;
const MAX_DAYS = 62; // a longer custom range makes unreadable bars

// Bento grid spans (12 columns on wide screens): 4 KPIs · chart 6 / donut 3
// / rows 3 · two lists 6 / 6.
export const SPAN = {
  kpi: "col-span-1 lg:col-span-3",
  chart: "col-span-2 lg:col-span-6",
  side: "col-span-2 sm:col-span-1 lg:col-span-3",
  half: "col-span-2 lg:col-span-6",
};

// Overview scope line: "12 Aug – 20 Aug 2026", "From 12 Aug 2026", "All dates".
export function rangeLabel(dateFrom, dateTo) {
  const f = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (dateFrom && dateTo) return dateFrom === dateTo ? f(dateFrom) : `${f(dateFrom)} – ${f(dateTo)}`;
  if (dateFrom) return `From ${f(dateFrom)}`;
  if (dateTo) return `Up to ${f(dateTo)}`;
  return "All dates";
}

// Every digit, Indian grouping, paise — "₹1,23,456.50" (KPI tiles, tooltips).
export const fullInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pctOf =(n, total) => (total ? Math.round((n / total) * 100) : 0);
export const sumBy = (rows, get) => rows.reduce((s, r) => s + (Number(get(r)) || 0), 0);

// "YYYY-MM-DD" days to chart: the selected range (capped), else the last 14.
export function chartDays(dateFrom, dateTo) {
  const end = dateTo ? new Date(dateTo + "T00:00:00") : new Date();
  const start = dateFrom ? new Date(dateFrom + "T00:00:00") : new Date(end);
  if (!dateFrom) start.setDate(start.getDate() - (DEFAULT_DAYS - 1));
  const days = [];
  for (let d = new Date(start); d <= end && days.length < MAX_DAYS; d.setDate(d.getDate() + 1)) {
    days.push(localDateStr(d));
  }
  return days;
}

// [{ key, label, value, count }] per day, plus the period total and best day.
export function dailySeries(rows, { getDate, getValue, dateFrom, dateTo }) {
  const days = chartDays(dateFrom, dateTo);
  const slots = new Map(days.map((d) => [d, { value: 0, count: 0 }]));
  rows.forEach((r) => {
    const slot = slots.get(getDate(r));
    if (!slot) return;
    slot.value += Number(getValue(r)) || 0;
    slot.count += 1;
  });
  const daily = days.map((d) => ({
    key: d,
    label: new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    ...slots.get(d),
  }));
  const total = daily.reduce((s, d) => s + d.value, 0);
  const best = daily.reduce((a, d) => (d.value > a.value ? d : a), daily[0] || { value: 0 });
  return { daily, total, best };
}

// Week-over-week change per metric — only when no date range is set
// (a fixed range has no meaningful "previous 7 days"). `summarize(rows)`
// returns { count, ...metrics }; `points` lists rate metrics compared as a
// percentage-point difference instead of a relative change (null = no
// previous week to compare with, shown as "New").
export function weekTrends(rows, summarize, { getDate, dateFrom, dateTo, points = [] } = {}) {
  if (dateFrom || dateTo) return null;
  const { cur, prev } = weekOverWeek(rows, summarize, getDate);
  const pointChange = (k) => (prev.count ? cur[k] - prev[k] : cur.count ? null : 0);
  return Object.fromEntries(Object.keys(cur).map((k) => [k, points.includes(k) ? pointChange(k) : pctChange(cur[k], prev[k])]));
}
