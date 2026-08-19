import React, { useState } from "react";

import BankAccountSection from "../components/BankAccountSection";
import Branddata from "../data/Branddata";

/**
 * BankAccountPage
 * "Bank Account Details" tab — active bank account list, selectable
 * primary account, and an "Add bank Account" action.
 */
const BankAccountPage = () => {
  const { bankAccountDetails } = Branddata;
  const primaryAccount = bankAccountDetails.accounts.find((a) => a.isPrimary);
  const [selectedAccountId, setSelectedAccountId] = useState(
    primaryAccount?.id ?? bankAccountDetails.accounts[0]?.id
  );

  const handleAddBankAccount = () => {
    // Wire this up to services/brandApi.js -> an addBankAccount(...) call
    console.log("Add bank Account clicked");
  };

  return (
    <BankAccountSection
      bankAccountDetails={bankAccountDetails}
      selectedAccountId={selectedAccountId}
      onSelectAccount={setSelectedAccountId}
      onAddBankAccount={handleAddBankAccount}
    />
  );
};

export default BankAccountPage;
