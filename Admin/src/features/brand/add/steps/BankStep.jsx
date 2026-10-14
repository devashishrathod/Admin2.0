import { Field, TextInput, ChoiceGroup, FormSection } from "../components/FormControls";
import { ACCOUNT_TYPES, onlyDigits, upperAlnum } from "../brandFormConfig";

export default function BankStep({ form, errors, setSection }) {
  const { bank, basicDetails } = form;
  const setBank = (patch) => setSection("bank", patch);
  const legalName = basicDetails.legalBusinessName.trim();

  return (
    <FormSection title="Settlement account" description="Payouts for this brand are settled to this account.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account number" required error={errors["bank.accountNumber"]}>
          <TextInput
            type="password"
            autoComplete="off"
            inputMode="numeric"
            value={bank.accountNumber}
            onChange={(e) => setBank({ accountNumber: onlyDigits(e.target.value, 18) })}
            placeholder="123456789012"
            error={errors["bank.accountNumber"]}
          />
        </Field>
        <Field label="Confirm account number" required error={errors["bank.confirmAccountNumber"]}>
          <TextInput
            autoComplete="off"
            inputMode="numeric"
            value={bank.confirmAccountNumber}
            onChange={(e) => setBank({ confirmAccountNumber: onlyDigits(e.target.value, 18) })}
            onPaste={(e) => e.preventDefault()}
            placeholder="Re-enter account number"
            error={errors["bank.confirmAccountNumber"]}
          />
        </Field>
        <Field label="IFSC code" required error={errors["bank.ifscCode"]}>
          <TextInput
            value={bank.ifscCode}
            onChange={(e) => setBank({ ifscCode: upperAlnum(e.target.value, 11) })}
            placeholder="HDFC0001234"
            className="font-mono tracking-wider"
            error={errors["bank.ifscCode"]}
          />
        </Field>
        <Field label="Account type" required group>
          <ChoiceGroup value={bank.accountType} onChange={(accountType) => setBank({ accountType })} options={ACCOUNT_TYPES} />
        </Field>
        <Field label="Beneficiary name" required error={errors["bank.beneficiaryName"]}>
          <TextInput
            value={bank.beneficiaryName}
            onChange={(e) => setBank({ beneficiaryName: e.target.value })}
            placeholder={legalName || "Kentucky Fried Chicken Pvt Ltd"}
            error={errors["bank.beneficiaryName"]}
          />
        </Field>
        <Field label="Account holder name" required error={errors["bank.accountHolderName"]} hint="Exactly as printed on the bank record">
          <TextInput
            value={bank.accountHolderName}
            onChange={(e) => setBank({ accountHolderName: e.target.value.toUpperCase() })}
            placeholder={legalName.toUpperCase() || "KENTUCKY FRIED CHICKEN PVT LTD"}
            error={errors["bank.accountHolderName"]}
          />
        </Field>
      </div>
      {legalName && !bank.beneficiaryName && (
        <button
          type="button"
          onClick={() => setBank({ beneficiaryName: legalName, accountHolderName: legalName.toUpperCase() })}
          className="text-[12px] font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Use legal business name for both
        </button>
      )}
    </FormSection>
  );
}
