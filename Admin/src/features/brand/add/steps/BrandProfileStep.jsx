import { Field, TextInput, TextArea, SelectInput, PhoneInput, ImagePicker, FormSection } from "../components/FormControls";
import { useCategories } from "../../../category/queries/categoryQueries";
import { useSubCategories } from "../../../subcategory/queries/subCategoryQueries";

const toOptions = (res) =>
  (res?.data?.data ?? []).map((c) => ({ value: c._id ?? c.id, label: c.name }));
const NO_OPTIONS = [];

export default function BrandProfileStep({ form, errors, setSection }) {
  const { brandDetails, basicDetails } = form;
  const setBrand = (patch) => setSection("brandDetails", patch);

  const { categoryId } = brandDetails;
  const categoriesQuery = useCategories({ page: 1, limit: 100 }, { select: toOptions });
  // Keyed by category and no placeholder data, so a stale list never shows
  // while the next category's list is loading.
  const subCategoriesQuery = useSubCategories(
    { page: 1, limit: 100, categoryId },
    { enabled: Boolean(categoryId), select: toOptions }
  );
  const categories = categoriesQuery.data ?? NO_OPTIONS;
  const categoryError = categoriesQuery.error?.message || subCategoriesQuery.error?.message || "";

  const subOptions = (categoryId && subCategoriesQuery.data) || NO_OPTIONS;
  const subLoading = Boolean(categoryId) && subCategoriesQuery.isPending;

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
