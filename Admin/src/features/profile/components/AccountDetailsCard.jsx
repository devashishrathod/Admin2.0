import { useState } from "react";
import { Check, Copy, Fingerprint } from "lucide-react";
import { SectionCard } from "../../notification/components/NotificationUi";
import { innerTile } from "../../notification/components/notificationStyles";
import { ROLE_LABELS, formatDate } from "../profileUtils";

function CopyRow({ label, value, mono = false }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked — nothing to do; the value is on screen.
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-[11.5px] text-neutral-500">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <span className={`truncate text-[12.5px] font-semibold normal-case text-neutral-800 dark:text-neutral-100 ${mono ? "font-mono" : ""}`}>
          {value || "—"}
        </span>
        {value && mono && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${label}`}
            title="Copy"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-emerald-600 dark:hover:bg-neutral-800"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        )}
      </span>
    </div>
  );
}

/* Read-only account facts from GET /users/get — the IDs support asks for. */
export default function AccountDetailsCard({ profile }) {
  return (
    <SectionCard icon={Fingerprint} title="Account" subtitle="Read-only details">
      <div className={`divide-y divide-neutral-200/70 rounded-2xl px-3 dark:divide-neutral-800 ${innerTile}`}>
        <CopyRow label="User ID" value={profile.uniqueId} mono />
        <CopyRow label="Username" value={profile.username} mono />
        <CopyRow label="Referral code" value={profile.referralCode} mono />
        <CopyRow label="Role" value={ROLE_LABELS[profile.role] || profile.role} />
        <CopyRow label="Signs in with" value={profile.loginType ? profile.loginType.toLowerCase() : ""} />
        <CopyRow label="Joined" value={formatDate(profile.createdAt, true)} />
      </div>
    </SectionCard>
  );
}
