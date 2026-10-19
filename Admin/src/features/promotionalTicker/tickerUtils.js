import { REDIRECT_TYPES } from "./services/PromotionalTickerApi";

export function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseRedirect(ticker) {
  let redirect = ticker.redirect;
  if (typeof redirect === "string") {
    try {
      redirect = JSON.parse(redirect);
    } catch {
      redirect = { type: REDIRECT_TYPES.NONE };
    }
  }
  return redirect || { type: REDIRECT_TYPES.NONE };
}

export function redirectSummary(redirect, categories = [], brands = []) {
  if (!redirect || redirect.type === REDIRECT_TYPES.NONE) return "No redirect";
  if (redirect.type === REDIRECT_TYPES.EXTERNAL_URL) return redirect.url || "External URL";
  if (redirect.type === REDIRECT_TYPES.CATEGORY) {
    const category = categories.find((item) => item.id === redirect.targetId);
    return `Category: ${category?.name || redirect.targetId}`;
  }
  if (redirect.type === REDIRECT_TYPES.BRAND) {
    const brand = brands.find((item) => item.id === redirect.targetId);
    return `Brand: ${brand?.name || redirect.targetId}`;
  }
  return `${redirect.type}: ${redirect.targetId}`;
}

export function apiToRow(ticker) {
  const iconUrl = ticker.icon?.url ?? (typeof ticker.icon === "string" ? ticker.icon : "");
  return {
    id: ticker._id ?? ticker.id,
    title: ticker.title || "Untitled ticker",
    icon: iconUrl,
    redirect: parseRedirect(ticker),
    displayOrder: ticker.displayOrder ?? 0,
    startDate: ticker.startDate,
    endDate: ticker.endDate,
    daysLeft: ticker.endDate ? (new Date(ticker.endDate).getTime() - Date.now()) / 86400000 : null,
    startsInDays: ticker.startDate ? (new Date(ticker.startDate).getTime() - Date.now()) / 86400000 : null,
    isActive: Boolean(ticker.isActive),
    status: ticker.isActive ? "Active" : "Inactive",
    createdAt: ticker.createdAt,
  };
}
