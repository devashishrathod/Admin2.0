import { useState } from "react";
import { errorText } from "./onboardingFlow";

/**
 * Runs one save/verify/skip call for a step: tracks which action is busy,
 * turns OnboardingErrors into readable text, and on success hands the
 * response to `onDone` (the page then re-reads the server's status).
 *
 *   const { run, busy, error } = useStepAction(onAdvance);
 *   run("save", () => addBasicDetails(...))
 */
export function useStepAction(onDone) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const run = async (key, fn, { advance = true } = {}) => {
    setBusy(key);
    setError("");
    try {
      const res = await fn();
      if (advance && onDone) await onDone(res);
      return res;
    } catch (err) {
      setError(errorText(err));
      // The vendor / another admin moved the brand on — re-read the status.
      if (err?.code === "ONBOARDING_SCREEN_MISMATCH" && onDone) await onDone(null);
      return null;
    } finally {
      setBusy(null);
    }
  };

  return { run, busy, error, setError };
}
