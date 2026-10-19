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

      {listingFeatures.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-neutral-50 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-950/50 dark:text-neutral-400">
                <th className="w-16 px-4 py-3">S.No</th>
                <th className="w-24 px-4 py-3">Icon</th>
                <th className="w-[24%] px-4 py-3">Title <span className="text-red-500">*</span></th>
                <th className="w-[34%] px-4 py-3">Description</th>
                <th className="w-32 px-4 py-3">Status</th>
                <th className="w-20 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listingFeatures.map((feature, i) => (
                <tr key={feature.id} className="border-t border-neutral-100 align-top dark:border-neutral-800">
                  <td className="px-4 py-4 text-[13px] text-neutral-500">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-4 py-4">
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
                  </td>
                  <td className="px-4 py-4">
                    <Field
                      required
                      error={errors[`listingFeatures.${i}.title`]}
                      hint={`${feature.title.length}/20`}
                    >
                      <TextInput
                        aria-label={`Feature ${i + 1} title`}
                        value={feature.title}
                        onChange={(e) => updateFeature(feature.id, { title: e.target.value })}
                        placeholder="Free Parking"
                        maxLength={20}
                        error={errors[`listingFeatures.${i}.title`]}
                      />
                    </Field>
                  </td>
                  <td className="px-4 py-4">
                    <Field hint={`${feature.description.length}/300`}>
                      <TextInput
                        aria-label={`Feature ${i + 1} description`}
                        value={feature.description}
                        onChange={(e) => updateFeature(feature.id, { description: e.target.value })}
                        placeholder="Optional"
                        maxLength={300}
                      />
                    </Field>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2.5 pt-2">
                      <ToggleSwitch
                        checked={feature.isActive}
                        onChange={() => updateFeature(feature.id, { isActive: !feature.isActive })}
                        title={feature.isActive ? "Active" : "Inactive"}
                      />
                      <span className={`rounded-full px-2 py-1 text-[10.5px] font-semibold ${
                        feature.isActive
                          ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}>
                        {feature.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => removeFeature(feature.id)}
                      aria-label={`Remove ${feature.title || "feature"}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addFeature}
        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400"
      >
        <Plus size={14} />
        Add listing feature
      </button>
    </FormSection>
  );
}
