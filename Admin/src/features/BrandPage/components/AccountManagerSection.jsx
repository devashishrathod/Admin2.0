import React from "react";
import InfoItem from "./InfoItem";

const AccountManagerSection = ({ accountSetupManager }) => {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">
        Account Setup Manager
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="Employee ID" value={accountSetupManager.employeeId} />
        <InfoItem
          label="Employee Name"
          value={accountSetupManager.employeeName}
        />
        <InfoItem
          label="Mobile Number"
          value={accountSetupManager.mobileNumber}
        />
        <InfoItem
          label="Email Address"
          value={accountSetupManager.emailAddress}
        />
      </div>
    </section>
  );
};

export default AccountManagerSection;
