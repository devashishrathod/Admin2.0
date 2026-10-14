import { Field, TextInput, TextArea, PhoneInput, FormSection } from "../components/FormControls";
import { onlyDigits } from "../brandFormConfig";

export default function OutletLocationStep({ form, errors, setSection }) {
  const { outlet, location, brandDetails } = form;
  const setLocation = (patch) => setSection("location", patch);

  const text = (key, { label, required, placeholder, className } = {}) => (
    <Field label={label} required={required} error={errors[`location.${key}`]} className={className}>
      <TextInput
        value={location[key]}
        onChange={(e) => setLocation({ [key]: e.target.value })}
        placeholder={placeholder}
        error={errors[`location.${key}`]}
      />
    </Field>
  );

  return (
    <div className="space-y-8">
      <FormSection title="First outlet" description="This becomes the brand's first active outlet.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Outlet WhatsApp number" required error={errors["outlet.whatsappNumber"]}>
            <PhoneInput
              value={outlet.whatsappNumber}
              onChange={(whatsappNumber) => setSection("outlet", { whatsappNumber })}
              error={errors["outlet.whatsappNumber"]}
            />
          </Field>
          <Field
            label="Outlet description"
            hint={brandDetails.description ? "Leave empty to use the brand description" : undefined}
            className="sm:col-span-2"
          >
            <TextArea
              rows={2}
              value={outlet.description}
              onChange={(e) => setSection("outlet", { description: e.target.value })}
              placeholder={brandDetails.description || "Fried chicken and burgers."}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("addressLine1", { label: "Address line 1", required: true, placeholder: "12, MG Road", className: "sm:col-span-2" })}
          {text("addressLine2", { label: "Address line 2", placeholder: "Floor, building (optional)" })}
          {text("landmark", { label: "Landmark", placeholder: "Near Metro Station" })}
          <Field label="Pincode" required error={errors["location.zipcode"]}>
            <TextInput
              inputMode="numeric"
              value={location.zipcode}
              onChange={(e) => setLocation({ zipcode: onlyDigits(e.target.value, 6) })}
              placeholder="560001"
              error={errors["location.zipcode"]}
            />
          </Field>
          {text("city", { label: "City", required: true, placeholder: "Bengaluru" })}
          {text("district", { label: "District", required: true, placeholder: "Bengaluru Urban" })}
          {text("state", { label: "State", required: true, placeholder: "Karnataka" })}
          {text("country", { label: "Country", required: true, placeholder: "India" })}
        </div>
      </FormSection>
    </div>
  );
}
