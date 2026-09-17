import React from "react";

const BankAccountCard = ({ account, isSelected, onSelect }) => {
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        onClick={() => onSelect(account.id)}
        className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-left"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            isSelected ? "border-blue-600" : "border-gray-300"
          }`}
        >
          {isSelected && (
            <span className="h-2 w-2 rounded-full bg-blue-600" />
          )}
        </span>
        <div>
          <p className="text-sm font-semibold capitalize text-gray-900">
            {account.bankName}
          </p>
          <p
            className={`text-xs ${
              isSelected ? "text-blue-600" : "text-gray-400"
            }`}
          >
            {isSelected ? "Primary Account" : "Not Selected"}
          </p>
        </div>
      </button>

      <div className="grid grid-cols-1 gap-x-10 gap-y-3 px-5 py-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Name on bank account
          </p>
          <p className="mt-1 text-sm text-gray-800">
            {account.nameOnAccount}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Account number
          </p>
          <p className="mt-1 text-sm text-gray-800">
            {account.accountNumber}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            IFSC code
          </p>
          <p className="mt-1 text-sm text-gray-800">{account.ifscCode}</p>
        </div>
      </div>
    </div>
  );
};

export default BankAccountCard;
