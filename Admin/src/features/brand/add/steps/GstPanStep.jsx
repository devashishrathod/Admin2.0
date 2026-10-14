import { Field, TextInput, FormSection } from "../components/FormControls";
import { upperAlnum } from "../brandFormConfig";

// Only shown for registered businesses — AddBrand skips it otherwise.
export default function GstPanStep({ form, errors, setSection }) {
  const { pan, gst } = form;

  return (
    <div className="space-y-8">
      <FormSection title="PAN">
        <Field label="PAN number" required error={errors["pan.pan"]} className="sm:max-w-sm">
          <TextInput
            value={pan.pan}
            onChange={(e) => setSection("pan", { pan: upperAlnum(e.target.value, 10) })}
            placeholder="ABCDE1234F"
            className="font-mono tracking-wider"
            error={errors["pan.pan"]}
          />
        </Field>
      </FormSection>

      <FormSection title="GST">
        <Field
          label="GSTIN"
          required
          error={errors["gst.gstNumber"]}
          hint="Characters 3–12 must match the PAN above"
          className="sm:max-w-sm"
        >
          <TextInput
            value={gst.gstNumber}
            onChange={(e) => setSection("gst", { gstNumber: upperAlnum(e.target.value, 15) })}
            placeholder="29ABCDE1234F1Z5"
            className="font-mono tracking-wider"
            error={errors["gst.gstNumber"]}
          />
        </Field>
      </FormSection>
    </div>
  );
}
