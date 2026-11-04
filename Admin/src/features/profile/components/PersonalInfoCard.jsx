import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Camera, RotateCcw, Save, Trash2, UserRound } from "lucide-react";
import { Button, Field, IconInput, Notice, SectionCard } from "../../notification/components/NotificationUi";
import { updateMyProfile } from "../services/ProfileApi";
import { refreshMyProfile, profileImageOf } from "../queries/profileQueries";
import { initialsOf, toDateInput } from "../profileUtils";

const MAX_IMAGE_MB = 5;

/* Name, date of birth and photo → PUT /users/update (doc #14). Email is
 * changed in "Contact & verification" instead, so it gets verified; mobile
 * and WhatsApp can't be written here at all. Only changed fields are sent.
 * A fresh profile from the server resets the form (but keeps the status
 * message, so "Profile updated" stays visible after the refetch). */
export default function PersonalInfoCard({ profile }) {
  const initial = useMemo(() => ({ fullName: profile.name || "", dob: toDateInput(profile.dob) }), [profile]);
  const [form, setForm] = useState(initial);
  const [image, setImage] = useState(null); // File
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { tone, text }
  const fileRef = useRef(null);

  // Reset the form when the saved values change — done during render
  // (React's "adjust state on prop change" pattern), not in an effect.
  const [shownInitial, setShownInitial] = useState(initial);
  if (shownInitial !== initial) {
    setShownInitial(initial);
    setForm(initial);
  }

  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const name = form.fullName.trim();
  const nameError = name.length < 2 ? "At least 2 characters." : name.length > 100 ? "At most 100 characters." : "";
  const dirty = name !== initial.fullName.trim() || form.dob !== initial.dob || Boolean(image);
  const currentImage = preview || profileImageOf(profile);

  const pickImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setStatus({ tone: "error", text: "Pick an image file (JPG, PNG or WebP)." });
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setStatus({ tone: "error", text: `The photo must be under ${MAX_IMAGE_MB} MB.` });
    setStatus(null);
    setImage(file);
  };

  const reset = () => {
    setForm(initial);
    setImage(null);
    setStatus(null);
  };

  const save = async () => {
    if (nameError || !dirty || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await updateMyProfile({
        ...(name !== initial.fullName.trim() ? { fullName: name } : {}),
        ...(form.dob !== initial.dob ? { dob: form.dob } : {}),
        ...(image ? { image } : {}),
      });
      setImage(null);
      await refreshMyProfile();
      setStatus({ tone: "success", text: res?.message || "Profile updated." });
    } catch (err) {
      setStatus({ tone: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={UserRound} title="Personal info" subtitle="How you show up across the admin panel">
      <div className="flex flex-col gap-5 sm:flex-row">
        {/* Photo */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative h-24 w-24 overflow-hidden rounded-2xl"
            aria-label="Change photo"
          >
            {currentImage ? (
              <img src={currentImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-emerald-500/10 text-[28px] font-bold text-emerald-700 dark:text-emerald-300">
                {initialsOf(form.fullName || profile.name)}
              </span>
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-[10.5px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={16} /> Change
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
          {image ? (
            <button type="button" onClick={() => setImage(null)} className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-red-500">
              <Trash2 size={11} /> Remove new photo
            </button>
          ) : (
            <span className="text-[10.5px] normal-case text-neutral-400">JPG, PNG · max {MAX_IMAGE_MB} MB</span>
          )}
        </div>

        {/* Fields */}
        <div className="min-w-0 flex-1 space-y-3.5">
          <Field label="Full name" hint={nameError || "Shown in the header and on everything you send"} counter={form.fullName.length} max={100}>
            <IconInput
              icon={UserRound}
              value={form.fullName}
              onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
              placeholder="Your name"
              aria-invalid={Boolean(nameError)}
            />
          </Field>
          <Field label="Date of birth" hint="Optional">
            <IconInput
              icon={CalendarDays}
              type="date"
              value={form.dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(v) => setForm((f) => ({ ...f, dob: v }))}
            />
          </Field>
        </div>
      </div>

      {status && (
        <Notice tone={status.tone} className="mt-4">
          {status.text}
        </Notice>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200/70 pt-4 dark:border-neutral-800">
        {dirty && <span className="w-full text-[11.5px] normal-case text-amber-600 sm:mr-auto sm:w-auto dark:text-amber-400">Unsaved changes</span>}
        <Button icon={RotateCcw} onClick={reset} disabled={!dirty || saving}>
          Reset
        </Button>
        <Button variant="primary" icon={Save} loading={saving} onClick={save} disabled={!dirty || Boolean(nameError)}>
          Save changes
        </Button>
      </div>
    </SectionCard>
  );
}
