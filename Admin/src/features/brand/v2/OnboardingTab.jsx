import OnboardingSummaryCard from "./OnboardingSummaryCard";
import SystemVerifyCard from "./SystemVerifyCard";
import VerificationTimeline from "./VerificationTimeline";
import KycDocumentsCard from "./KycDocumentsCard";
import BillingAddressCard from "./BillingAddressCard";
import DeedCard from "./DeedCard";
import BadgeCard from "./BadgeCard";
import ReviewCard from "./ReviewCard";
import LegalBasicsCard from "./LegalBasicsCard";
import KycRecordsCard from "./KycRecordsCard";

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
      <ReviewCard brandId={brand.id} readOnly={readOnly} />
      <SystemVerifyCard brandId={brand.id} />
      <LegalBasicsCard brandId={brand.id} readOnly={readOnly} />
      <KycRecordsCard brandId={brand.id} readOnly={readOnly} />
      <KycDocumentsCard brandId={brand.id} readOnly={readOnly} />
      <BillingAddressCard brandId={brand.id} readOnly={readOnly} />
      <DeedCard brandId={brand.id} readOnly={readOnly} />
      <BadgeCard brand={brand} readOnly={readOnly} />
      <VerificationTimeline brandId={brand.id} />
    </div>
  );
}
