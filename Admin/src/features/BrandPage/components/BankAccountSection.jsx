import React from "react";
import { CreditCard } from "lucide-react";
import BankAccountCard from "./BankAccountCard";

const BankAccountSection = ({
  bankAccountDetails,
  selectedAccountId,
  onSelectAccount,
  onAddBankAccount,
}) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        Bank Account Details
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {bankAccountDetails.subtitle}
      </p>

      <div className="mt-6 rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Active bank account
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {bankAccountDetails.activeAccountSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddBankAccount}
            className="flex shrink-0 items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <CreditCard size={15} />
            Add bank Account
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {bankAccountDetails.accounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={account}
              isSelected={
                selectedAccountId
                  ? account.id === selectedAccountId
                  : account.isPrimary
              }
              onSelect={onSelectAccount}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BankAccountSection;
