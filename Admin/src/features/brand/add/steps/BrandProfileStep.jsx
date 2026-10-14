import { useEffect, useState } from "react";
import { Field, TextInput, TextArea, SelectInput, PhoneInput, ImagePicker, FormSection } from "../components/FormControls";
import { getCategories } from "../../../category/services/CategoryApi";
import { getSubCategories } from "../../../subcategory/services/SubCategoryApi";

const toOptions = (res) =>
  (res?.data?.data ?? []).map((c) => ({ value: c._id ?? c.id, label: c.name }));

export default function BrandProfileStep({ form, errors, setSection }) {
  const { brandDetails, basicDetails } = form;
  const setBrand = (patch) => setSection("brandDetails", patch);

  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  // Sub-categories are tagged with the category they were loaded for, so a
  // stale list never shows while the next category's list is loading.
  const [subCategories, setSubCategories] = useState({ categoryId: "", options: [] });

  useEffect(() => {
    getCategories({ page: 1, limit: 100 })
      .then((res) => setCategories(toOptions(res)))
      .catch((err) => setCategoryError(err.message));
  }, []);

  const { categoryId } = brandDetails;
  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    getSubCategories({ page: 1, limit: 100, categoryId })
      .then((res) => !cancelled && setSubCategories({ categoryId, options: toOptions(res) }))
      .catch((err) => !cancelled && setCategoryError(err.message));
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const subOptions = subCategories.categoryId === categoryId ? subCategories.options : [];
  const subLoading = Boolean(categoryId) && subCategories.categoryId !== categoryId;

  return (
    <div className="space-y-8">
      <FormSection title="Brand identity">
        <div className="flex items-start gap-5">
          <div>
            <ImagePicker
              file={brandDetails.logo}
              onChange={(logo) => setBrand({ logo })}
              error={errors["brandDetails.logo"]}
              label="Logo"
            />
            {errors["brandDetails.logo"] && (
              <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{errors["brandDetails.logo"]}</p>
            )}
          </div>
          <div className="min-w-0 pt-1">
            <p className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
              {basicDetails.brandName || "Brand name"}
            </p>
            <p className="mt-1 text-[12px] text-neutral-500">Square logo, PNG or JPG. Shown on the brand card and profile.</p>
          </div>
        </div>
        <Field label="Description" hint="One or two lines about what the brand offers">
          <TextArea
            value={brandDetails.description}
            onChange={(e) => setBrand({ description: e.target.value })}
            placeholder="Fried chicken and burgers."
            maxLength={300}
          />
        </Field>
      </FormSection>

      <FormSection title="Brand contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required error={errors["brandDetails.email"]}>
            <TextInput
              type="email"
              value={brandDetails.email}
              onChange={(e) => setBrand({ email: e.target.value.trim() })}
              placeholder="hello@kfc.com"
              error={errors["brandDetails.email"]}
            />
          </Field>
          <Field label="Mobile" required error={errors["brandDetails.mobile"]}>
            <PhoneInput
              value={brandDetails.mobile}
              onChange={(mobile) => setBrand({ mobile })}
              error={errors["brandDetails.mobile"]}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Category">
        {categoryError && <p className="text-[12px] text-red-600 dark:text-red-400">Couldn't load categories: {categoryError}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required error={errors["brandDetails.categoryId"]}>
            <SelectInput
              value={categoryId}
              onChange={(e) =>
                setBrand({
                  categoryId: e.target.value,
                  categoryName: e.target.selectedOptions[0]?.text ?? "",
                  subCategoryId: "",
                  subCategoryName: "",
                })
              }
              options={categories}
              placeholder="Select category"
              error={errors["brandDetails.categoryId"]}
            />
          </Field>
          <Field
            label="Sub-category"
            required
            error={errors["brandDetails.subCategoryId"]}
            hint={!categoryId ? "Pick a category first" : subLoading ? "Loading…" : undefined}
          >
            <SelectInput
              value={brandDetails.subCategoryId}
              onChange={(e) =>
                setBrand({ subCategoryId: e.target.value, subCategoryName: e.target.selectedOptions[0]?.text ?? "" })
              }
              options={subOptions}
              placeholder="Select sub-category"
              disabled={!categoryId || subLoading}
              error={errors["brandDetails.subCategoryId"]}
            />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}
