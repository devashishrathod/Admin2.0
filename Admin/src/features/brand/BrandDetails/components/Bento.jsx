import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { tints } from "./bentoStyles";

// Card title row: tinted icon chip + title (+ subtitle), optional action.
export function CardHeader({ icon: Icon, tint = "emerald", title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tints[tint]}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-neutral-900 dark:text-neutral-50">{title}</p>
          {subtitle && <p className="truncate text-[11px] text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Small copy-to-clipboard button; shows a tick for a moment after copying.
export function CopyButton({ value, label = "value" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(String(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}
