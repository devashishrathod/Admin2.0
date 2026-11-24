import OnboardingSummaryCard from "./OnboardingSummaryCard";

/* -------------------------------------------------------------------------
 * Brand detail → "Onboarding & KYC" tab (admin guide §4): one column of
 * server-driven sections. Data: GET /brands/onboarding/status, GET
 * /brands/get and GET /brands/verifications/history (all ?brandId=).
 * D (dummy) brands are view-only.
 * ---------------------------------------------------------------------- */
export default function OnboardingTab({ brand }) {
  return (
    <div className="space-y-4">
      <OnboardingSummaryCard brandId={brand.id} />
    </div>
  );
}
