import { Field, MiniStat, Notice } from "../NotificationUi";
import { inputClass } from "../notificationStyles";

/* Paste list — emails / mobile numbers from a sheet, matched against the
 * loaded customers and outlet managers. Only matches are sent; the rest are
 * listed so the admin can see what got skipped. */
export default function PasteAudience({ value, onChange, resolved }) {
  const parsed = resolved.parsed || { emails: [], numbers: [], unreadable: [] };
  const matched = resolved.matched || [];
  const missing = resolved.missing || [];
  const hasInput = value.trim().length > 0;

  return (
    <div className="space-y-3">
      <Field label="Emails or mobile numbers" hint="Separate with a comma or new line. Duplicates are dropped automatically.">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder={"9876543210, 9812345678\nasha@example.com\n+91 98765 43210"}
          className={`${inputClass} resize-y font-mono text-[12.5px]`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat value={parsed.emails.length} label="emails" tint="emerald" />
        <MiniStat value={parsed.numbers.length} label="numbers" tint="sky" />
        <MiniStat value={parsed.unreadable.length} label="unreadable" />
        <MiniStat value={matched.length} label="matched people" tint="violet" />
      </div>

      {hasInput && missing.length > 0 && (
        <Notice tone="warning">
          {missing.length} not found among loaded customers and outlet managers:{" "}
          <span className="break-all font-mono normal-case">{missing.slice(0, 6).join(", ")}</span>
          {missing.length > 6 && ` +${missing.length - 6} more`}
        </Notice>
      )}
      {parsed.unreadable.length > 0 && (
        <Notice tone="error">
          Couldn't read: <span className="break-all font-mono normal-case">{parsed.unreadable.slice(0, 6).join(", ")}</span>
          {parsed.unreadable.length > 6 && ` +${parsed.unreadable.length - 6} more`}
        </Notice>
      )}
    </div>
  );
}
