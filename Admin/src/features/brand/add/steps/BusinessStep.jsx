import { Field, TextInput, SelectInput, PhoneInput, ChoiceGroup, FormSection } from "../components/FormControls";
import { ENTITY_TYPES, REGISTRATION_STATUSES } from "../brandFormConfig";

export default function BusinessStep({ form, errors, setSection }) {
  const { owner, basicDetails } = form;
  const setBasic = (patch) => setSection("basicDetails", patch);

  return (
    <div className="space-y-8">
      <FormSection title="Owner" description="The vendor account is created on this WhatsApp number.">
        <Field label="Owner WhatsApp number" required error={errors["owner.whatsappNumber"]} className="sm:max-w-sm">
          <PhoneInput
            value={owner.whatsappNumber}
            onChange={(whatsappNumber) => setSection("owner", { whatsappNumber })}
            error={errors["owner.whatsappNumber"]}
          />
        </Field>
      </FormSection>

      <FormSection title="Business">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal business name" required error={errors["basicDetails.legalBusinessName"]} hint="As on PAN / GST certificate">
            <TextInput
              value={basicDetails.legalBusinessName}
              onChange={(e) => setBasic({ legalBusinessName: e.target.value })}
              placeholder="Kentucky Fried Chicken Pvt Ltd"
              error={errors["basicDetails.legalBusinessName"]}
            />
          </Field>
          <Field label="Brand name" required error={errors["basicDetails.brandName"]} hint="Shown to customers in the app">
            <TextInput
              value={basicDetails.brandName}
              onChange={(e) => setBasic({ brandName: e.target.value })}
              placeholder="KFC"
              error={errors["basicDetails.brandName"]}
            />
          </Field>
          <Field label="Business entity type" required error={errors["basicDetails.businessEntityType"]}>
            <SelectInput
              value={basicDetails.businessEntityType}
              onChange={(e) => setBasic({ businessEntityType: e.target.value })}
              options={ENTITY_TYPES}
              placeholder="Select entity type"
              error={errors["basicDetails.businessEntityType"]}
            />
          </Field>
          <Field
            label="Registration status"
            required
            group
            hint={
              basicDetails.businessRegistrationStatus === "REGISTERED"
                ? "PAN and GST will be collected in the next step"
                : "PAN & GST step will be skipped"
            }
          >
            <ChoiceGroup
              value={basicDetails.businessRegistrationStatus}
              onChange={(businessRegistrationStatus) => setBasic({ businessRegistrationStatus })}
              options={REGISTRATION_STATUSES}
            />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}
