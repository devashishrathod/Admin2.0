// Some backend endpoints return a "not found" error (e.g. "No any
// voucherversion found") instead of an empty array when a list is genuinely
// empty. Treat those as an empty result — show the normal empty-state card,
// not a red error banner — while still surfacing real errors as errors.
export function isNotFoundMessage(message) {
  if (!message) return false;
  return /not found|no .*found/i.test(message);
}
