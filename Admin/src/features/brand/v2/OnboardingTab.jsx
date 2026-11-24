import OnboardingSummaryCard from "./OnboardingSummaryCard";
import SystemVerifyCard from "./SystemVerifyCard";
import VerificationTimeline from "./VerificationTimeline";
import KycDocumentsCard from "./KycDocumentsCard";
import BillingAddressCard from "./BillingAddressCard";

/* -------------------------------------------------------------------------
 * Brand detail → "Onboarding & KYC" tab (admin guide §4): one column of
 * server-driven sections. Data: GET /brands/onboarding/status, GET
 * /brands/get and GET /brands/verifications/history (all ?brandId=).
 * D (dummy) brands are view-only.
 * ---------------------------------------------------------------------- */
export default function OnboardingTab({ brand, readOnly = false }) {
  return (
    <div className="space-y-4">
      <OnboardingSummaryCard brandId={brand.id} />
      <SystemVerifyCard brandId={brand.id} />
      <KycDocumentsCard brandId={brand.id} readOnly={readOnly} />
      <BillingAddressCard brandId={brand.id} readOnly={readOnly} />
      <VerificationTimeline brandId={brand.id} />
    </div>
  );
}
