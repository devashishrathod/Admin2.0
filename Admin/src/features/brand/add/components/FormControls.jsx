import { useEffect, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { onlyDigits } from "../brandFormConfig";

/* -------------------------------------------------------------------------
 * Small form building blocks shared by every Add Brand step.
 * ---------------------------------------------------------------------- */

const controlBase =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:text-neutral-100";

const controlTone = (error) =>
  error
    ? "border-red-400 focus:ring-red-400/20 dark:border-red-500/60"
    : "border-neutral-200 focus:border-emerald-400 focus:ring-emerald-400/20 dark:border-neutral-800";

/* Label + control + hint/error. `group` renders a <div> instead of a
   <label> for controls made of several buttons (a <label> would forward
   clicks to the first button). */
export function Field({ label, required, error, hint, group, className = "", children }) {
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper className={`block ${className}`} {...(group ? { role: "group", "aria-label": label } : {})}>
      {label && (
        <span className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 block text-[11.5px] text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11.5px] text-neutral-500">{hint}</span>
      ) : null}
    </Wrapper>
  );
}

export function TextInput({ error, className = "", ...props }) {
  return <input aria-invalid={Boolean(error)} className={`${controlBase} ${controlTone(error)} ${className}`} {...props} />;
}

export function TextArea({ error, className = "", rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={Boolean(error)}
      className={`${controlBase} ${controlTone(error)} resize-none ${className}`}
      {...props}
    />
  );
}

export function SelectInput({ error, options, placeholder = "Select", className = "", ...props }) {
  return (
    <select aria-invalid={Boolean(error)} className={`${controlBase} ${controlTone(error)} ${className}`} {...props}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* 10-digit Indian mobile with a fixed +91 prefix. */
export function PhoneInput({ value, onChange, error, ...props }) {
  return (
    <div
      className={`flex items-center overflow-hidden rounded-xl border bg-white transition-colors focus-within:ring-2 dark:bg-neutral-900 ${
        error
          ? "border-red-400 focus-within:ring-red-400/20 dark:border-red-500/60"
          : "border-neutral-200 focus-within:border-emerald-400 focus-within:ring-emerald-400/20 dark:border-neutral-800"
      }`}
    >
      <span className="border-r border-neutral-200 px-3 text-[13px] text-neutral-500 dark:border-neutral-800">+91</span>
      <input
        inputMode="numeric"
        aria-invalid={Boolean(error)}
        value={value}
        onChange={(e) => onChange(onlyDigits(e.target.value, 10))}
        placeholder="9876543210"
        className="w-full bg-transparent px-3 py-2.5 text-[13.5px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100"
        {...props}
      />
    </div>
  );
}

/* Segmented radio — for short, fixed choices (account type, GST status). */
export function ChoiceGroup({ value, onChange, options }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            value === o.value
              ? "bg-emerald-400 text-neutral-950"
              : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* Preview for a local File. The object URL is created and revoked inside
   the same effect so it stays valid under StrictMode's double mount. */
export function FileThumb({ file, className = "" }) {
  const ref = useRef(null);
  const isVideo = file.type?.startsWith("video/");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return isVideo ? (
    <video ref={ref} muted playsInline className={`object-cover ${className}`} />
  ) : (
    <img ref={ref} alt={file.name} className={`object-cover ${className}`} />
  );
}

/* Single image picker with preview — used for the logo and feature icons. */
export function ImagePicker({ file, onChange, error, size = "lg", label = "Upload" }) {
  const inputRef = useRef(null);
  const box = size === "lg" ? "h-24 w-24 rounded-2xl" : "h-14 w-14 rounded-xl";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex items-center justify-center overflow-hidden border border-dashed transition-colors ${box} ${
          error
            ? "border-red-400 bg-red-500/5 text-red-500"
            : "border-neutral-300 bg-neutral-50 text-neutral-400 hover:border-emerald-400 hover:text-emerald-500 dark:border-neutral-700 dark:bg-neutral-800/50"
        }`}
        aria-label={file ? `Change ${label}` : label}
      >
        {file ? (
          <FileThumb file={file} className="h-full w-full" />
        ) : (
          <span className="flex flex-col items-center gap-1">
            <ImagePlus size={size === "lg" ? 20 : 16} />
            {size === "lg" && <span className="text-[10.5px] font-medium">{label}</span>}
          </span>
        )}
      </button>
      {file && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove ${label}`}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white shadow dark:bg-neutral-100 dark:text-neutral-900"
        >
          <X size={11} />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onChange(picked);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* Titled group of fields inside a step. */
export function FormSection({ title, description, children }) {
  return (
    <section className="space-y-4">
      {title && (
        <div>
          <h3 className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
          {description && <p className="mt-0.5 text-[12px] text-neutral-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
