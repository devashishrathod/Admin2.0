// Field limits for the Category and Sub-Category forms. The backend allows
// 3–120 characters for a name; the panel caps it at 25 to keep tiles
// readable. The description max matches the API (300).
export const NAME_MIN = 3;
export const NAME_MAX = 25;
export const DESC_MAX = 300;

// All / Active / Inactive tab → the API's `isActive` query value.
export const STATUS_PARAM = { All: undefined, Active: true, Inactive: false };

// A 404 "No any … found" from getAll just means an empty result.
export const listTotal = (query) => {
  if (query.error) return /not found|no .*found/i.test(query.error.message || "") ? 0 : undefined;
  return query.data?.data?.total ?? (query.data ? 0 : undefined);
};
