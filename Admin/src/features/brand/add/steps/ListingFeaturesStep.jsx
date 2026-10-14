import { Plus, Trash2, Sparkles } from "lucide-react";
import ToggleSwitch from "../../../../components/common/ToggleSwitch";
import { Field, TextInput, ImagePicker, FormSection } from "../components/FormControls";
import { createFeature } from "../brandFormConfig";

export default function ListingFeaturesStep({ form, errors, setSection }) {
  const { listingFeatures } = form;

  const setFeatures = (fn) => setSection("listingFeatures", fn);
  const updateFeature = (id, patch) => setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeFeature = (id) => setFeatures((prev) => prev.filter((f) => f.id !== id));
  const addFeature = () => setFeatures((prev) => [...prev, createFeature()]);

  return (
    <FormSection
      title="Listing features"
      description="Amenities shown on the outlet listing, like Free Parking or Pet Friendly. Optional."
    >
      {listingFeatures.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-500">
            <Sparkles size={18} />
          </span>
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">No features added</p>
          <p className="text-[12px] text-neutral-500">You can skip this step and add features later.</p>
        </div>
      )}

      <div className="space-y-3">
        {listingFeatures.map((feature, i) => (
          <div key={feature.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-start gap-4">
              <div>
                <ImagePicker
                  size="sm"
                  label="Icon"
                  file={feature.icon}
                  onChange={(icon) => updateFeature(feature.id, { icon })}
                  error={errors[`listingFeatures.${i}.icon`]}
                />
                {errors[`listingFeatures.${i}.icon`] && (
                  <p className="mt-1 text-[10.5px] text-red-600 dark:text-red-400">Required</p>
                )}
              </div>
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <Field label="Title" required error={errors[`listingFeatures.${i}.title`]}>
                  <TextInput
                    value={feature.title}
                    onChange={(e) => updateFeature(feature.id, { title: e.target.value })}
                    placeholder="Free Parking"
                    error={errors[`listingFeatures.${i}.title`]}
                  />
                </Field>
                <Field label="Description">
                  <TextInput
                    value={feature.description}
                    onChange={(e) => updateFeature(feature.id, { description: e.target.value })}
                    placeholder="Optional"
                  />
                </Field>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button
                  type="button"
                  onClick={() => removeFeature(feature.id)}
                  aria-label={`Remove ${feature.title || "feature"}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
                <ToggleSwitch
                  checked={feature.isActive}
                  onChange={() => updateFeature(feature.id, { isActive: !feature.isActive })}
                  title={feature.isActive ? "Active" : "Inactive"}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addFeature}
        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400"
      >
        <Plus size={14} />
        Add feature
      </button>
    </FormSection>
  );
}
