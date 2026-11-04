import { useRef } from "react";

/* Six boxes for a one-time code. Typing moves to the next box, Backspace
 * goes back, and pasting a whole code fills every box. `value` is the code
 * as a string ("4829" while half-typed). */
export default function OtpCodeInput({ value, onChange, length = 6, disabled = false, autoFocus = true }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, length));
  };

  const handleChange = (i, raw) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return setAt(i, "");
    if (clean.length > 1) {
      // Pasted / autofilled several digits into one box.
      onChange((digits.slice(0, i).join("") + clean).slice(0, length));
      refs.current[Math.min(length - 1, i + clean.length)]?.focus();
      return;
    }
    setAt(i, clean);
    refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="grid w-full max-w-[19rem] grid-cols-6 gap-1.5 sm:gap-2" role="group" aria-label="Verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={`h-11 w-full min-w-0 rounded-xl border bg-white text-center text-[17px] font-bold tabular-nums text-neutral-900 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/15 disabled:opacity-50 dark:bg-neutral-900 dark:text-neutral-50 ${
            d ? "border-emerald-400/70" : "border-neutral-200 dark:border-neutral-700"
          }`}
        />
      ))}
    </div>
  );
}
