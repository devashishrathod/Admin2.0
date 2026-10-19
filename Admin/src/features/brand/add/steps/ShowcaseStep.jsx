import { useRef } from "react";
import { Plus, Trash2, Images, X, PlayCircle } from "lucide-react";
import ToggleSwitch from "../../../../components/common/ToggleSwitch";
import { Field, TextInput, SelectInput, FileThumb, FormSection } from "../components/FormControls";
import { createAlbum, SECTION_TYPES, onlyDigits } from "../brandFormConfig";

function AlbumCard({ album, index, errors, onChange, onRemove }) {
  const inputRef = useRef(null);
  const filesError = errors[`showcase.${index}.files`];

  const addFiles = (fileList) => onChange({ files: [...album.files, ...Array.from(fileList)] });
  const removeFile = (i) => onChange({ files: album.files.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400">Album {index + 1}</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove album ${album.title || index + 1}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_160px_100px]">
        <Field label="Title" required error={errors[`showcase.${index}.title`]}>
          <TextInput
            value={album.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Gallery"
            maxLength={20}
            error={errors[`showcase.${index}.title`]}
          />
          <span className="mt-1 block text-right text-[10.5px] text-neutral-400">{album.title.length}/20</span>
        </Field>
        <Field label="Section type">
          <SelectInput
            value={album.sectionType}
            onChange={(e) => onChange({ sectionType: e.target.value || "CUSTOM" })}
            options={SECTION_TYPES}
          />
        </Field>
        <Field label="Sort order">
          <TextInput
            inputMode="numeric"
            value={album.sortOrder}
            onChange={(e) => onChange({ sortOrder: Number(onlyDigits(e.target.value, 3)) || 1 })}
          />
        </Field>
      </div>

      <Field label="Description">
        <TextInput value={album.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Optional" />
      </Field>

      <div className="flex items-center gap-2.5">
        <ToggleSwitch
          checked={album.isShowInVideoClips}
          onChange={() => onChange({ isShowInVideoClips: !album.isShowInVideoClips })}
        />
        <span className="text-[12.5px] text-neutral-700 dark:text-neutral-300">Show videos from this album in Clips</span>
      </div>

      <div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6">
          {album.files.map((file, i) => (
            <div
              key={`${file.name}-${file.lastModified}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800"
            >
              <FileThumb file={file} className="h-full w-full" />
              {file.type?.startsWith("video/") && (
                <PlayCircle size={20} className="pointer-events-none absolute inset-0 m-auto text-white drop-shadow" />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[11px] font-medium transition-colors ${
              filesError
                ? "border-red-400 bg-red-500/5 text-red-500"
                : "border-neutral-300 text-neutral-400 hover:border-emerald-400 hover:text-emerald-500 dark:border-neutral-700"
            }`}
          >
            <Plus size={18} />
            Add files
          </button>
        </div>
        <p className={`mt-1.5 text-[11.5px] ${filesError ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>
          {filesError || `${album.files.length} file${album.files.length === 1 ? "" : "s"} · images or videos, drag & drop works too`}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default function ShowcaseStep({ form, errors, setSection }) {
  const { showcase } = form;
  const setAlbums = (fn) => setSection("showcase", fn);

  return (
    <FormSection title="Showcase" description="Photo and video albums shown on the brand profile. Optional.">
      {showcase.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-500">
            <Images size={18} />
          </span>
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">No albums yet</p>
          <p className="text-[12px] text-neutral-500">Add a Gallery, Menu or Ambience album, or skip for now.</p>
        </div>
      )}

      <div className="space-y-3">
        {showcase.map((album, i) => (
          <AlbumCard
            key={album.id}
            album={album}
            index={i}
            errors={errors}
            onChange={(patch) => setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, ...patch } : a)))}
            onRemove={() => setAlbums((prev) => prev.filter((a) => a.id !== album.id))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setAlbums((prev) => [...prev, createAlbum(prev.length + 1)])}
        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400"
      >
        <Plus size={14} />
        Add album
      </button>
    </FormSection>
  );
}
