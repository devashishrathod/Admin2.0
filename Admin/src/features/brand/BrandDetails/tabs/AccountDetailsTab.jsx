import {
  MapPin,
  Phone,
  Mail,
  Users,
  CreditCard,
  Calendar,
  ShieldCheck,
  BadgeCheck,
  Landmark,
  Tag,
  Globe,
  Briefcase,
  Activity,
} from "lucide-react";
import {
  InfoRow,
  VerificationRow,
  DetailTile,
  SectionCard,
  CollapsibleSectionCard,
  VerifiedMark,
  WithVerified,
} from "../../BrandShared";
import OverviewStat from "../components/OverviewStat";
import ValueOr from "../../../../components/common/ValueOr";
import { isMissing, MISSING } from "../../../../utils/helpers";

export default function AccountDetailsTab({ brand }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
        <div className="col-span-2 row-span-2 rounded-3xl border border-white/80 bg-white/65 p-5 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Brand &amp; Contact</p>
          <div className="space-y-0">
            <InfoRow icon={Users} label="Legal Name" value={brand.ownerName} empty={MISSING.name} />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={
                <WithVerified verified={Boolean(brand.vendorUser?.isMobileVerified)}>
                  <ValueOr value={brand.contactPhone} fallback={MISSING.phone} />
                </WithVerified>
              }
            />
            <InfoRow
              icon={Mail}
              label="Email"
              value={
                <WithVerified verified={Boolean(brand.vendorUser?.isEmailVerified)}>
                  <span className="normal-case">
                    <ValueOr value={brand.contactEmail} fallback={MISSING.email} />
                  </span>
                </WithVerified>
              }
            />
          </div>
        </div>
        <OverviewStat icon={ShieldCheck} label="GST Status" value={<VerifiedMark verified={brand.gstVerified} showText />} />
        <OverviewStat icon={BadgeCheck} label="PAN Status" value={<VerifiedMark verified={brand.panVerified} showText />} />
        <OverviewStat icon={Landmark} label="Bank Status" value={<VerifiedMark verified={brand.bankVerified} showText />} />
        <OverviewStat icon={Tag} label="Bank Name" value={<ValueOr value={brand.bankName} fallback="Not added" />} />
      </div>

      <SectionCard title="Business Verification">
        <div className="space-y-2">
          <VerificationRow
            icon={ShieldCheck}
            label="GST Number"
            value={brand.gstNumber}
            verified={brand.gstVerified}
            empty="Not added"
          />
          <VerificationRow
            icon={BadgeCheck}
            label="PAN Number"
            value={brand.panNumber}
            verified={brand.panVerified}
            empty="Not added"
          />
          <VerificationRow
            icon={Landmark}
            label={isMissing(brand.bankName) ? "Bank Account" : `Bank Account · ${brand.bankName}`}
            value={brand.accountHolder}
            verified={brand.bankVerified}
            empty="Not added"
          />
        </div>
      </SectionCard>

      {brand.panNumber && brand.panNumber !== "—" && (
        <CollapsibleSectionCard title="PAN Details" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailTile icon={BadgeCheck} label="PAN Number" value={brand.panNumber} />
            <DetailTile icon={Tag} label="PAN Type" value={brand.panType} />
            <DetailTile icon={Users} label="Full Name" value={brand.panFullName} />
            <DetailTile icon={Globe} label="Country" value={brand.panCountry} />
            <DetailTile icon={ShieldCheck} label="Verification Message" value={brand.panVerificationMessage} />
            <DetailTile icon={ShieldCheck} label="Verification Provider" value={brand.panVerificationProvider} />
            <DetailTile icon={Calendar} label="Verified At" value={brand.panVerifiedAtDisplay} empty={MISSING.date} />
          </div>
        </CollapsibleSectionCard>
      )}

      {brand.gstNumber && brand.gstNumber !== "—" && (
        <CollapsibleSectionCard title="GST Details" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailTile icon={ShieldCheck} label="GST Number" value={brand.gstNumber} />
            <DetailTile icon={Tag} label="Legal Name" value={brand.gstLegalName} />
            <DetailTile icon={Tag} label="Trade Name" value={brand.gstTradeName} />
            <DetailTile icon={Briefcase} label="Constitution" value={brand.gstConstitution} />
            <DetailTile icon={Activity} label="Taxpayer Type" value={brand.gstTaxpayerType} />
            <DetailTile
              icon={Calendar}
              label="Registration Date"
              value={brand.gstRegistrationDate ? new Date(brand.gstRegistrationDate).toLocaleDateString("en-IN") : null}
              empty={MISSING.date}
            />
            <DetailTile icon={ShieldCheck} label="Registration Status" value={brand.gstRegistrationStatus} />
            {brand.gstNatureOfBusiness?.length > 0 && (
              <DetailTile icon={Briefcase} label="Nature of Business" value={brand.gstNatureOfBusiness.join(", ")} />
            )}
            <DetailTile icon={Landmark} label="Jurisdiction" value={brand.gstStateJurisdiction} />
            <DetailTile icon={MapPin} label="Registered Address" value={brand.gstAddress} />
            <DetailTile icon={ShieldCheck} label="Verification Message" value={brand.gstVerificationMessage} />
            <DetailTile icon={ShieldCheck} label="Verification Provider" value={brand.gstVerificationProvider} />
            <DetailTile icon={Calendar} label="Verified At" value={brand.gstVerifiedAtDisplay} empty={MISSING.date} />
          </div>
        </CollapsibleSectionCard>
      )}

      {brand.bankName && brand.bankName !== "—" && (
        <CollapsibleSectionCard title="Bank Details" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailTile icon={Landmark} label="Bank Name" value={brand.bankName} />
            <DetailTile icon={Users} label="Account Holder" value={brand.accountHolder} />
            <DetailTile icon={Landmark} label="Branch" value={brand.bankBranch} />
            <DetailTile icon={CreditCard} label="Account Number" value={brand.maskedAccountNumber} empty="Not added" />
            <DetailTile icon={CreditCard} label="IFSC Code" value={brand.ifscCode} empty="Not added" />
            <DetailTile icon={CreditCard} label="Account Type" value={brand.accountType} />
            <DetailTile icon={MapPin} label="Bank Address" value={brand.bankAddress} />
            <DetailTile icon={Activity} label="Payment Mode" value={brand.bankPaymentMode} />
            <DetailTile icon={ShieldCheck} label="Recommended Action" value={brand.bankRecommendedAction} />
            <DetailTile icon={ShieldCheck} label="Verification Message" value={brand.bankVerificationMessage} />
            <DetailTile icon={ShieldCheck} label="Verification Provider" value={brand.bankVerificationProvider} />
            <DetailTile icon={Calendar} label="Verified At" value={brand.bankVerifiedAtDisplay} empty={MISSING.date} />
          </div>
        </CollapsibleSectionCard>
      )}
    </div>
  );
}
