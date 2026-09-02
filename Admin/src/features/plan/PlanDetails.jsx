import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Star,
  ThumbsUp,
  ThumbsDown,
  ListChecks,
  CheckCircle2,
  XCircle,
  Store,
  LayoutGrid,
  Ticket,
  Gift,
  Headphones,
  Calendar,
} from "lucide-react";
import { getPlanById } from "./services/planApi";
import { normalizePlan } from "./Plan";
import { RingStat } from "../brand/BrandShared";

/* -------------------------------------------------------------------------
 * PlanDetails — read-only, full-page view of a single subscription plan.
 * Fetched live via GET /subscriptions/get/:id (getPlanById), separate from
 * the lightweight cards on the main Plan page.
 * ---------------------------------------------------------------------- */

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        status === "Active"
          ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
      }`}
    >
      {status}
    </span>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      {title && (
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      )}
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="flex items-center gap-2 text-[12.5px] text-neutral-500">
        {Icon && <Icon size={13} />}
        {label}
      </span>
      <span className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

export default function PlanDetails({ planId, onBack }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getPlanById(planId);
        const raw = res?.data?.plan ?? res?.data ?? res?.plan ?? res;
        if (!cancelled) setPlan(normalizePlan(raw));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back to plans"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:shadow-black/20 dark:hover:text-neutral-100"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-[22px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {plan?.name || "Plan Details"}
            </h1>
          </div>

          {!loading && !error && plan && (
            <div className="flex flex-wrap items-center gap-2.5">
              <RingStat
                pct={plan.status === "Active" ? 100 : 0}
                label="Plan Status"
                caption={plan.status}
                tint={plan.status === "Active" ? "emerald" : "red"}
              />
              <RingStat
                pct={plan.entitlements.vouchers.isEnabled ? 100 : 0}
                label="Vouchers"
                caption={plan.entitlements.vouchers.isEnabled ? "Enabled" : "Disabled"}
                tint="sky"
              />
              <RingStat
                pct={plan.entitlements.prioritySupport.isEnabled ? 100 : 0}
                label="Priority Support"
                caption={plan.entitlements.prioritySupport.isEnabled ? "Enabled" : "Disabled"}
                tint="violet"
              />
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading plan…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            Failed to load plan: {error}
          </div>
        )}

        {!loading && !error && plan && (
          <div className="space-y-4">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              {plan.popular && (
                <span className="absolute right-6 top-6 flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10.5px] font-semibold text-neutral-950">
                  <Star size={10} fill="currentColor" />
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold text-neutral-900 dark:text-neutral-50">{plan.name}</h1>
                <StatusBadge status={plan.status} />
              </div>
              <p className="mt-1 text-[13px] text-neutral-500">{plan.description || "No description added."}</p>

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <span className="text-[32px] font-bold text-neutral-900 dark:text-neutral-50">
                  ₹{Number(plan.price || 0).toLocaleString("en-IN")}
                </span>
                <span className="mb-1 rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {plan.type === "MONTHLY" ? "Monthly" : "Yearly"}
                </span>
                {plan.strikePrice ? (
                  <span className="mb-1 text-[14px] text-neutral-500 line-through">
                    ₹{Number(plan.strikePrice).toLocaleString("en-IN")}
                  </span>
                ) : null}
                {Number(plan.discountPercent) > 0 ? (
                  <span className="mb-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {plan.discountType === "PERCENT"
                      ? `${plan.discountPercent}% OFF`
                      : `₹${plan.discountPercent} OFF`}
                  </span>
                ) : null}
              </div>

              {plan.durationInDays ? (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-neutral-500">
                  <Calendar size={12} />
                  Valid for {plan.durationInDays} days
                </p>
              ) : null}
            </div>

            {/* Benefits / Limitations */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Benefits">
                {plan.benefits.length ? (
                  <ul className="space-y-2">
                    {plan.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                        <ThumbsUp size={13} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-neutral-500">No benefits added.</p>
                )}
              </SectionCard>

              <SectionCard title="Limitations">
                {plan.limitations.length ? (
                  <ul className="space-y-2">
                    {plan.limitations.map((l, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                        <ThumbsDown size={13} className="mt-0.5 shrink-0 text-red-500/80 dark:text-red-400/80" />
                        {l}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-neutral-500">No limitations added.</p>
                )}
              </SectionCard>
            </div>

            {/* Features */}
            <SectionCard title="Features">
              {plan.features.length ? (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {plan.features.map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-2.5">
                      <span className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                        <ListChecks size={13} className="text-neutral-500" />
                        {f.title || "—"}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12.5px] text-neutral-500">{f.value || "—"}</span>
                        {f.available ? (
                          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle size={15} className="text-red-500/70 dark:text-red-400/70" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-neutral-500">No features added.</p>
              )}
            </SectionCard>

            {/* Entitlements */}
            <SectionCard title="Entitlements">
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <InfoRow
                  icon={Store}
                  label="Sub Brands"
                  value={plan.entitlements.subBrands.isUnlimited ? "Unlimited" : plan.entitlements.subBrands.limit}
                />
                <InfoRow
                  icon={LayoutGrid}
                  label="Franchises"
                  value={plan.entitlements.franchises.isUnlimited ? "Unlimited" : plan.entitlements.franchises.limit}
                />
                <InfoRow
                  icon={Ticket}
                  label="Vouchers"
                  value={plan.entitlements.vouchers.isEnabled ? "Enabled" : "Disabled"}
                />
                <InfoRow
                  icon={Gift}
                  label="Deal Pack"
                  value={plan.entitlements.dealPack.isEnabled ? "Enabled" : "Disabled"}
                />
                <InfoRow
                  icon={Headphones}
                  label="Priority Support"
                  value={plan.entitlements.prioritySupport.isEnabled ? "Enabled" : "Disabled"}
                />
                <InfoRow
                  icon={LayoutGrid}
                  label="Showcase"
                  value={plan.entitlements.showcase.isEnabled ? "Enabled" : "Disabled"}
                />
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
