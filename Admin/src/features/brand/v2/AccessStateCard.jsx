import { Power, Eye, EyeOff } from "lucide-react";
import { V2Card, Chip, KV } from "./shared";
import { fmtDateTime } from "./util";

/* -------------------------------------------------------------------------
 * Vendor account + customer switch — the LATEST state (admin guide §13).
 * PUT /brands/admin/:brandId/status writes its history to BrandStatusHistory,
 * which has no read API yet (backend: after release), so deactivate / hide
 * never show in the verification timeline. Until then this card reads the
 * brand list row (#25a): isAccountActive, accountDeactivatedAt,
 * accountDeactivationReason, accountActivatedAt, isVisibleToCustomers,
 * customerVisibilityUpdatedAt. The server clears the deactivation date and
 * reason when the account is activated again. Switches: page header.
 * ---------------------------------------------------------------------- */
export default function AccessStateCard({ brand }) {
  const a = brand.accountAccess || null;
  const accountActive = a?.isAccountActive ?? brand.active;
  const visible = a?.isVisibleToCustomers ?? (brand.hiddenFromCustomers == null ? null : !brand.hiddenFromCustomers);

  return (
    <V2Card icon={Power} tint={accountActive === false ? "red" : "sky"} title="Account & visibility" subtitle="Latest state — switch them at the top of the page">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Chip tone={accountActive === false ? "red" : "emerald"}>{accountActive === false ? "Vendor account deactivated" : "Vendor account active"}</Chip>
        {visible != null && (
          <Chip tone={visible ? "emerald" : "amber"}>
            {visible ? <Eye size={11} /> : <EyeOff size={11} />}
            {visible ? "Visible to customers" : "Hidden from customers"}
          </Chip>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {accountActive === false ? (
          <>
            <KV label="Deactivated" value={fmtDateTime(a?.deactivatedAt)} empty="—" />
            <div className="sm:col-span-2">
              <KV label="Reason" value={a?.deactivationReason} empty="No reason recorded">
                {a?.deactivationReason ? <span className="whitespace-normal font-medium">{a.deactivationReason}</span> : null}
              </KV>
            </div>
          </>
        ) : (
          <KV label="Last activated" value={fmtDateTime(a?.activatedAt)} empty="Never switched off" />
        )}
        <KV label="Customer switch changed" value={fmtDateTime(a?.visibilityUpdatedAt)} empty="Never changed" />
      </div>
      <p className="mt-3 text-[11.5px] text-neutral-500">
        Deactivate and hide changes aren&apos;t in the timeline yet — only the latest state is shown here.
        {!a && " Loading it from the brand list…"}
      </p>
    </V2Card>
  );
}
