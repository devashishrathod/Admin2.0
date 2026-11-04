import { useState } from "react";
import { BookmarkPlus, Check, Image as ImageIcon, Link2 } from "lucide-react";
import { LIMITS, SEVERITIES } from "../notificationConfig";
import { Button, Field, SectionCard, Segmented } from "./NotificationUi";
import { inputClass } from "./notificationStyles";

// Inline "name it and save" — no modal for a single text field.
function SaveTemplate({ disabled, onSave }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    setOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  if (!open)
    return (
      <Button variant="soft" size="sm" icon={saved ? Check : BookmarkPlus} disabled={disabled} onClick={() => setOpen(true)}>
        {saved ? "Saved" : "Save as template"}
      </Button>
    );
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Template name"
        className={`${inputClass} w-40 py-1.5 text-[12px]`}
      />
      <Button variant="primary" size="sm" onClick={submit} disabled={!name.trim()}>
        Save
      </Button>
      <Button size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

/* Step 3 — what they read. Counters show the API limit; hints say where a
 * phone starts trimming. */
export default function MessageEditor({ message, onChange, onSaveTemplate }) {
  const { title, body, imageUrl, deepLink, severity } = message;

  return (
    <SectionCard
      step={3}
      title="Message"
      subtitle="What they read."
      right={<SaveTemplate disabled={!title.trim() && !body.trim()} onSave={onSaveTemplate} />}
    >
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-300">Priority</span>
          <Segmented
            size="sm"
            value={severity}
            onChange={(v) => onChange({ severity: v })}
            options={SEVERITIES.map((s) => ({ key: s.value, label: s.label }))}
          />
        </div>

        <Field
          label="Title"
          hint={`Shown in bold — about ${LIMITS.pushTitleVisible} characters fit on a lock screen`}
          counter={title.length}
          max={LIMITS.title}
        >
          <input
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="New deals just dropped near you"
            className={inputClass}
          />
        </Field>

        <Field label="Message" hint="Long text gets trimmed on the lock screen" counter={body.length} max={LIMITS.body}>
          <textarea
            value={body}
            onChange={(e) => onChange({ body: e.target.value })}
            rows={4}
            placeholder="Fresh vouchers from brands you follow are live. Open Trydood to grab yours before they're gone."
            className={`${inputClass} resize-y`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Image URL (optional)" hint="Shown in the push and the in-app card">
            <div className="relative">
              <ImageIcon size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={imageUrl}
                onChange={(e) => onChange({ imageUrl: e.target.value })}
                placeholder="https://…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>
          <Field label="Opens screen (optional)" hint="Deep link the app opens on tap">
            <div className="relative">
              <Link2 size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={deepLink}
                onChange={(e) => onChange({ deepLink: e.target.value })}
                placeholder="/dashboard/subscription"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}
