import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { createOnboardingBrand } from "./services/onboardingApi";
import { useOnboardingStatus, useOnboardingBrand } from "./queries/onboardingQueries";
import { normalizeStatus, buildStepper, screenMeta, laneScreens, AFTER_SUBMIT, errorText, WHATSAPP_RE } from "./onboardingFlow";
import { ScreenShell, Field, Note, PrimaryButton, inputCls } from "./ui";
import { BusinessNameScreen, BusinessCategoryScreen, RegistrationStatusScreen, EntityTypeScreen } from "./screens/IdentityScreens";
import { KycDocumentsScreen, PanScreen, GstScreen, BankScreen } from "./screens/KycScreens";
import { DeedScreen, SubscribePlanScreen } from "./screens/AgreementScreens";
import { BrandBasicsScreen, ProfessionalScreen, OutletsScreen } from "./screens/BrandSetupScreens";
import { ReviewScreen, UnderReviewScreen } from "./screens/ReviewScreens";
import Loader from "../../components/common/Loader";

/* -------------------------------------------------------------------------
 * Admin · Add brand (Onboarding v2)
 *   /brand/onboard           → step 1: WhatsApp number (+ brand name) → create
 *   /brand/onboard/:brandId  → stepper + the screen the server says is current
 * Every call passes ?brandId=; the server decides currentScreen, so after each
 * save we just re-read the status.
 * ---------------------------------------------------------------------- */

const SCREEN_COMPONENTS = {
  BUSINESS_NAME: BusinessNameScreen,
  BUSINESS_CATEGORY: BusinessCategoryScreen,
  REGISTRATION_STATUS: RegistrationStatusScreen,
  REGISTRATION_ENTITY_TYPE: EntityTypeScreen,
  KYC_DOCUMENTS: KycDocumentsScreen,
  PAN_VERIFICATION: PanScreen,
  GST_VERIFICATION: GstScreen,
  BANK_VERIFICATION: BankScreen,
  PARTNERSHIP_DEED: DeedScreen,
  SUBSCRIBE_PLAN: SubscribePlanScreen,
  BRAND_BASIC_DETAILS: BrandBasicsScreen,
  BRAND_PROFESSIONAL_DETAILS: ProfessionalScreen,
  OUTLET_DETAILS: OutletsScreen,
  ONBOARDING_REVIEW: ReviewScreen,
};

// Once the plan is granted, the screens before it are locked (guide: no going back to payment).
const LOCK_BEFORE = ["BRAND_BASIC_DETAILS", "BRAND_PROFESSIONAL_DETAILS", "OUTLET_DETAILS", "ONBOARDING_REVIEW"];

/* ---- Step 1 · create ---------------------------------------------- */
function CreateBrandStep() {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ok = WHATSAPP_RE.test(number) && (!name.trim() || name.trim().length >= 2);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await createOnboardingBrand({ whatsappNumber: number, brandName: name.trim() || undefined });
      const d = res?.data ?? res;
      const id = d?.brandId || d?.brand?._id || d?._id;
      if (!id) throw new Error("The server didn't return a brandId.");
      navigate(`/brand/onboard/${id}`, { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  // Preview of the whole flow: this step is current, the rest come after create.
  // The KYC steps shown are the registered lane; "Not registered" swaps them on step 4.
  const preview = [
    { key: "OWNER", label: "Owner number", group: "Business", num: 1, state: "CURRENT", isViewing: true, reachable: true },
    ...laneScreens("REGISTERED").map((s, i) => ({ ...s, num: i + 2, state: "UPCOMING", isViewing: false, reachable: false })),
  ];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-3">
        <Stepper rows={preview} onPick={() => {}} />
        <p className="m-0 px-1 text-[12px] leading-snug text-[#5B616E]">
          KYC steps depend on the registration answer — a business that isn't registered gets KYC documents instead of entity type and GST.
        </p>
      </div>
    <form onSubmit={create} className="min-w-0">
      <ScreenShell
        eyebrow={`Step 1 of ${preview.length} · Business`}
        title="Add a new brand"
        intro="Enter the owner's WhatsApp number. A vendor account is created on it and the owner can log in with it later to continue or manage the brand."
        error={error}
        footer={
          <>
            <div />
            <PrimaryButton type="submit" busy={busy} disabled={!ok}>Create & start onboarding</PrimaryButton>
          </>
        }
      >
        <Field label="Owner's WhatsApp number" hint="10 digits · starts with 6–9" error={number && !WHATSAPP_RE.test(number) ? "Enter a valid 10-digit number" : ""}>
          <div className="flex">
            <span className="inline-flex h-11 items-center rounded-l-lg border border-r-0 border-[#CFD1CA] bg-[#F7F7F4] px-3 text-[15px] text-[#5B616E] dark:border-neutral-700 dark:bg-neutral-900">+91</span>
            <input className={`${inputCls} rounded-l-none`} type="tel" inputMode="numeric" maxLength={10} autoFocus value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} />
          </div>
        </Field>
        <Field label="Brand name" optional hint="Can be filled on the next screen too">
          <input className={inputCls} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cafe Mocha" />
        </Field>
        <Note tone="muted">If a vendor already exists on this number, find their brand in New Onboarding or Brand Waiting instead.</Note>
        <Note tone="info">Next: business name → category → registration, then KYC, agreement & plan, brand setup and submit.</Note>
      </ScreenShell>
    </form>
    </div>
  );
}

/* ---- Stepper (left column) ---------------------------------------- */
function Stepper({ rows, onPick }) {
  const total = rows.length;
  const done = rows.filter((r) => r.state === "DONE" || r.state === "SKIPPED").length;
  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-[#E2E3DE] bg-white p-5 lg:sticky lg:top-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[#5B616E]">Progress · {Math.min(done + 1, total)} of {total}</span>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#EDEEE9] dark:bg-neutral-800">
          <div className="h-full rounded-full bg-[#0B6E5A] transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      <ol className="m-0 flex list-none flex-col p-0">
        {rows.map((r, i) => {
          const header = i === 0 || rows[i - 1].group !== r.group ? r.group : null;
          const clickable = r.reachable && !r.locked;
          return (
            <li key={r.key}>
              {header && <span className="mb-1 mt-3 block text-[11.5px] font-semibold uppercase tracking-wide text-[#9AA0A9] first:mt-0">{header}</span>}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onPick(r.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[14px] transition ${
                  r.isViewing ? "bg-[#F3FAF7] dark:bg-emerald-400/5" : clickable ? "hover:bg-[#F5F5F2] dark:hover:bg-neutral-800" : ""
                } ${!clickable ? "cursor-default" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                    r.state === "DONE"
                      ? "bg-[#0B6E5A] text-white"
                      : r.state === "SKIPPED"
                        ? "bg-[#FFF4E0] text-[#7A4800]"
                        : r.state === "CURRENT"
                          ? "border-2 border-[#0B6E5A] text-[#0B6E5A]"
                          : "border border-[#CFD1CA] text-[#9AA0A9]"
                  }`}
                >
                  {r.state === "DONE" ? <Check size={13} strokeWidth={3} /> : r.num}
                </span>
                <span className={`min-w-0 flex-1 truncate ${r.state === "UPCOMING" ? "text-[#9AA0A9]" : "text-[#15171C] dark:text-neutral-100"} ${r.isViewing ? "font-semibold" : ""}`}>
                  {r.label}
                </span>
                {r.state === "SKIPPED" && <span className="rounded-full bg-[#FFF4E0] px-2 py-0.5 text-[11px] font-semibold text-[#7A4800]">Skipped</span>}
                {r.skippable && r.state === "UPCOMING" && <span className="text-[11px] text-[#9AA0A9]">Optional</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/* ---- Wizard -------------------------------------------------------- */
function OnboardingWizard({ brandId }) {
  const navigate = useNavigate();
  // The screen being shown; null = follow the server's currentScreen.
  const [picked, setPicked] = useState(null);
  const [version, setVersion] = useState(0); // remounts the screen after each reload

  // No refetch on window focus: a server-side screen change would swap the
  // screen (and drop what the admin is typing). Screens prefill their forms
  // once on mount, so brand updates after a background refetch are safe.
  const statusQuery = useOnboardingStatus(brandId, { refetchOnWindowFocus: false });
  // The brand is optional extra detail — the wizard still works without it.
  const brandQuery = useOnboardingBrand(brandId, { refetchOnWindowFocus: false });
  const status = useMemo(() => (statusQuery.data ? normalizeStatus(statusQuery.data) : null), [statusQuery.data]);
  const brand = useMemo(() => {
    const bd = brandQuery.data?.data ?? brandQuery.data;
    return bd?.brand ?? bd ?? null;
  }, [brandQuery.data]);
  const loadError = statusQuery.error ? errorText(statusQuery.error) : "";
  const viewing = picked ?? status?.currentScreen ?? null;

  // After every save the next screen comes from the server's fresh status,
  // so wait for it here. The interceptor has already started that refetch
  // (onboarding writes are under /brands); cancelRefetch: false joins it.
  const load = async () => {
    const [s] = await Promise.all([
      statusQuery.refetch({ cancelRefetch: false }),
      brandQuery.refetch({ cancelRefetch: false }),
    ]);
    if (s.isSuccess) {
      setPicked(normalizeStatus(s.data).currentScreen);
      setVersion((v) => v + 1);
    }
  };

  const loading = statusQuery.isPending || brandQuery.isPending || (!status && statusQuery.isFetching);
  if (loading) {
    return (
      <Loader variant="page" label="Loading onboarding…" />
    );
  }
  if (!status) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-3">
        <Note tone="error">{loadError || "Couldn't load this brand's onboarding."}</Note>
        <PrimaryButton onClick={load}><RefreshCw size={14} /> Try again</PrimaryButton>
      </div>
    );
  }

  const afterSubmit = AFTER_SUBMIT.includes(status.currentScreen);
  const planDone = LOCK_BEFORE.includes(status.currentScreen) || afterSubmit;
  const rows = buildStepper(status, viewing).map((r) => ({
    ...r,
    // after the plan is granted, earlier steps are read-only for this flow
    locked: afterSubmit || (planDone && !LOCK_BEFORE.includes(r.key)),
  }));

  const lane = laneScreens(status.kycPath).map((s) => s.key);
  const viewIdx = lane.indexOf(viewing);
  const prevKey = viewIdx > 0 ? lane[viewIdx - 1] : null;
  const canGoBack = prevKey && !(planDone && !LOCK_BEFORE.includes(prevKey));

  const Screen = SCREEN_COMPONENTS[viewing];
  const meta = screenMeta(viewing);
  const row = rows.find((r) => r.key === viewing);
  const eyebrow = meta ? `Step ${row?.num ?? ""} of ${rows.length} · ${meta.group}${viewing !== status.currentScreen ? " · editing" : ""}` : "";

  const brandTitle = brand?.brandName || brand?.legalBusinessName || "New brand";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[13px] text-[#5B616E]">Onboarding · {status.kycPath === "UNREGISTERED" ? "Not registered" : "Registered"} lane</span>
          <h1 className="m-0 text-[22px] font-semibold tracking-tight text-[#15171C] dark:text-neutral-50">{brandTitle}</h1>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFD1CA] px-3 py-2 text-[13px] font-medium hover:bg-[#F5F5F2] dark:border-neutral-700 dark:hover:bg-neutral-800">
          <RefreshCw size={13} /> Refresh status
        </button>
      </div>

      {status.editMode && (
        <Note tone="warn">Sent back by the verification team ({String(status.editMode).toLowerCase().replace(/_/g, " ")}). Fix the marked steps and submit again.</Note>
      )}
      {loadError && <Note tone="error">{loadError}</Note>}

      <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
        <Stepper rows={rows} onPick={setPicked} />
        <div className="min-w-0">
          {afterSubmit ? (
            <UnderReviewScreen status={status} onOpenBrand={() => navigate(`/brands/${brandId}`)} onOpenWaiting={() => navigate("/brand-waiting")} />
          ) : Screen ? (
            <Screen
              key={`${viewing}-${version}`}
              brandId={brandId}
              brand={brand}
              status={status}
              eyebrow={eyebrow}
              onAdvance={load}
              onBack={canGoBack ? () => setPicked(prevKey) : undefined}
              onGoTo={setPicked}
            />
          ) : (
            <Note tone="warn">Unknown screen “{viewing}” from the server.</Note>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminOnboarding() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  return (
    <div className="min-h-full p-4 text-[#15171C] sm:p-6 dark:text-neutral-100">
      <button type="button" onClick={() => navigate("/new-onboarding")} className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#5B616E] hover:text-[#15171C] dark:hover:text-white">
        <ArrowLeft size={15} /> New Onboarding
      </button>
      {brandId ? <OnboardingWizard key={brandId} brandId={brandId} /> : <CreateBrandStep />}
    </div>
  );
}
