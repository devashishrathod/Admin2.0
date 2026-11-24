import { useState } from "react";
import { errorText } from "./onboardingFlow";

/**
 * Runs one save/verify/skip call for a step: tracks which action is busy,
 * turns ApiErrors into readable text, and on success hands the response to
 * `onDone` (the page then re-reads the server's status).
 *
 *   const { run, busy, error, errorInfo } = useStepAction(onAdvance);
 *   run("save", () => addBasicDetails(...))
 *
 * `errorInfo` is the ApiError itself, for screens that act on its
 * `code` / `details` (ENTITY_FROM_GST → acceptedEntityTypes, …).
 */
export function useStepAction(onDone) {
  const [busy, setBusy] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  const run = async (key, fn, { advance = true } = {}) => {
    setBusy(key);
    setErrorInfo(null);
    try {
      const res = await fn();
      if (advance && onDone) await onDone(res);
      return res;
    } catch (err) {
      setErrorInfo(err);
      // The vendor / another admin moved the brand on — re-read the status.
      if (err?.code === "ONBOARDING_SCREEN_MISMATCH" && onDone) await onDone(null);
      return null;
    } finally {
      setBusy(null);
    }
  };

  return {
    run,
    busy,
    error: errorInfo ? errorText(errorInfo) : "",
    errorInfo,
    setError: (message) => setErrorInfo(message ? { message } : null),
  };
}
