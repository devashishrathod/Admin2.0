import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { useBillingAddress } from "../../onboarding/queries/onboardingQueries";
import Loader from "../../../components/common/Loader";
import { Notice } from "../BrandAdminExtras";
import BillingAddressForm from "./BillingAddressForm";
import { V2Card, Chip, KV, Btn } from "./shared";
import { fmtDateTime, v2ErrorText } from "./util";

/* -------------------------------------------------------------------------
 * Billing address (admin guide §8, #25e / #25f): read
 * GET /brands/billing-address?brandId= → { billingAddress,
 * suggestedAddress, gstAddress, gstin, gstStateCode }, edit any time.
 * No delete button — the API has none (409 BILLING_ADDRESS_NOT_DELETABLE).
 * ---------------------------------------------------------------------- */

export default function BillingAddressCard({ brandId, readOnly = false }) {
  const query = useBillingAddress(brandId, { select: (res) => res?.data ?? null });
  const data = query.data;
  const saved = data?.billingAddress ?? null;
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  return (
    <V2Card
      icon={MapPin}
      tint="amber"
      title="Billing address"
      subtitle="Bill-to on every invoice, grant and statement"
      action={
        !readOnly &&
        data &&
        !editing && (
          <Btn
            tone={saved ? "ghost" : "dark"}
            onClick={() => {
              setNotice("");
              setEditing(true);
            }}
          >
            <Pencil size={12} /> {saved ? "Edit" : "Add billing address"}
          </Btn>
        )
      }
    >
      {query.isPending ? (
        <Loader variant="inline" label="Loading the billing address…" />
      ) : query.error ? (
        <Notice tone="error">{v2ErrorText(query.error)}</Notice>
      ) : editing ? (
        <BillingAddressForm
          brandId={brandId}
          initial={saved || data?.suggestedAddress}
          gstAddress={data?.gstAddress}
          gstin={data?.gstin}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setNotice("Billing address saved.");
          }}
        />
      ) : saved ? (
        <>
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
            {saved.formattedAddress ||
              [saved.addressLine1, saved.addressLine2, saved.landmark, saved.city, saved.district, saved.state, saved.zipcode].filter(Boolean).join(", ")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KV label="State" value={saved.state ? `${saved.state}${saved.stateCode ? ` (${saved.stateCode})` : ""}` : null} />
            <KV label="GSTIN" value={data.gstin} empty="No GST" mono />
            <KV label="Coordinates" value={Array.isArray(saved.coordinates) ? saved.coordinates.join(", ") : null} mono />
            <KV label="Updated" value={fmtDateTime(saved.updatedAt)} />
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-neutral-600 dark:text-neutral-400">
          <Chip tone="amber">Missing</Chip>
          No billing address yet — a plan grant needs one.
          {data?.suggestedAddress && <span className="text-neutral-500">The form starts from the {data.suggestedAddress.source === "GST" ? "GST" : "PAN"} address.</span>}
        </div>
      )}
      {notice && <Notice>{notice}</Notice>}
    </V2Card>
  );
}
