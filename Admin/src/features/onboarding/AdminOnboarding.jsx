import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeIndianRupee,
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileSignature,
  FileText,
  Handshake,
  ImageIcon,
  Landmark,
  LayoutGrid,
  MapPin,
  Phone,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  UserCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
import { createOnboardingBrand } from "./services/onboardingApi";
import { useOnboardingStatus, useOnboardingBrand } from "./queries/onboardingQueries";
import { normalizeStatus, buildStepper, laneScreens, kycPathLabel, AFTER_SUBMIT, GROUP_LABELS, errorText, WHATSAPP_RE } from "./onboardingFlow";
import { ScreenShell, StepProvider, Field, Note, PrimaryButton, SecondaryButton, Section, cardCls, inputCls } from "./ui";
import { BrandNameScreen, BusinessCategoryScreen, RegistrationStatusScreen, EntityTypeScreen } from "./screens/IdentityScreens";
import { KycDocumentsScreen, PanScreen, GstScreen, OwnerVerificationScreen, BankScreen } from "./screens/KycScreens";
import { DeedScreen, SubscribePlanScreen } from "./screens/AgreementScreens";
import { BrandBasicsScreen, ProfessionalScreen } from "./screens/BrandSetupScreens";
import { OutletsScreen } from "./screens/OutletScreens";
import { ReviewScreen, UnderReviewScreen } from "./screens/ReviewScreens";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";

/* -------------------------------------------------------------------------
 * Admin · Add brand (Onboarding v2)
 *   /brand/onboard           → owner number (+ brand name) → create
 *   /brand/onboard/:brandId  → header (brand, progress, phases, steps) + the
 *                              screen the server says is current
 * Every call passes ?brandId=; the server decides currentScreen, so after each
 * save we just re-read the status. No side column: the phases and the steps
 * of the open phase sit in the header, the screen gets the full width.
 * ---------------------------------------------------------------------- */

const SCREEN_COMPONENTS = {
  BRAND_NAME: BrandNameScreen,
  BUSINESS_CATEGORY: BusinessCategoryScreen,
  REGISTRATION_STATUS: RegistrationStatusScreen,
  GST_VERIFICATION: GstScreen,
  PAN_VERIFICATION: PanScreen,
  REGISTRATION_ENTITY_TYPE: EntityTypeScreen,
  OWNER_VERIFICATION: OwnerVerificationScreen,
  KYC_DOCUMENTS: KycDocumentsScreen,
  BANK_VERIFICATION: BankScreen,
  PARTNERSHIP_DEED: DeedScreen,
  SUBSCRIBE_PLAN: SubscribePlanScreen,
  BRAND_BASIC_DETAILS: BrandBasicsScreen,
  BRAND_PROFESSIONAL_DETAILS: ProfessionalScreen,
  OUTLET_DETAILS: OutletsScreen,
  ONBOARDING_REVIEW: ReviewScreen,
};

const SCREEN_ICONS = {
  BRAND_NAME: Tag,
  BUSINESS_CATEGORY: LayoutGrid,
  REGISTRATION_STATUS: Building2,
  GST_VERIFICATION: Receipt,
  PAN_VERIFICATION: CreditCard,
  REGISTRATION_ENTITY_TYPE: Briefcase,
  OWNER_VERIFICATION: UserCheck,
  KYC_DOCUMENTS: FileText,
  BANK_VERIFICATION: Landmark,
  PARTNERSHIP_DEED: FileSignature,
  SUBSCRIBE_PLAN: BadgeIndianRupee,
  BRAND_BASIC_DETAILS: ImageIcon,
  BRAND_PROFESSIONAL_DETAILS: Sparkles,
  OUTLET_DETAILS: MapPin,
  ONBOARDING_REVIEW: ClipboardCheck,
};

const PHASE_ICONS = {
  [GROUP_LABELS.BASIC_DETAILS]: Tag,
  [GROUP_LABELS.BUSINESS_VERIFICATION]: ShieldCheck,
  [GROUP_LABELS.PAYOUT]: Wallet,
  [GROUP_LABELS.AGREEMENT_PLAN]: Handshake,
  [GROUP_LABELS.BRAND_OUTLET]: Store,
  [GROUP_LABELS.SUBMIT]: Send,
};

/** Stepper rows → phases (one per group), in order. */
function toPhases(rows, viewing) {
  const phases = [];
  rows.forEach((r) => {
    let p = phases.find((x) => x.label === r.group);
    if (!p) {
      p = { label: r.group, rows: [] };
      phases.push(p);
    }
    p.rows.push(r);
  });
  return phases.map((p) => {
    const done = p.rows.filter((r) => r.state === "DONE" || r.state === "SKIPPED").length;
    const current = p.rows.some((r) => r.state === "CURRENT");
    const open = p.rows.filter((r) => r.reachable && !r.locked);
    return {
      ...p,
      done,
      total: p.rows.length,
      state: current ? "current" : done === p.rows.length ? "done" : "upcoming",
      viewing: p.rows.some((r) => r.key === viewing),
      // A phase opens on its current step, else its first open one.
      target: (p.rows.find((r) => r.state === "CURRENT" && r.reachable && !r.locked) || open[0])?.key || null,
    };
  });
}

/* ---- Header pieces ------------------------------------------------- */

function ProgressRing({ percent, size = 44 }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% done`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-neutral-200 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="stroke-emerald-600 transition-[stroke-dashoffset] duration-500 dark:stroke-emerald-400"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11.5px] font-semibold text-neutral-900 dark:text-neutral-50">{value}%</span>
    </div>
  );
}

/**
 * The six phases as one horizontal stepper: circles joined by a line that
 * turns green up to the last finished phase, the name under each circle
 * (circles only on a phone). A phase opens on its current step.
 */
function PhaseTrack({ phases, onPick }) {
  return (
    <ol className="m-0 grid list-none p-0" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))` }}>
      {phases.map((p, i) => {
        const Icon = PHASE_ICONS[p.label] || ClipboardCheck;
        const clickable = Boolean(p.target && onPick);
        const lineDone = i > 0 && phases[i - 1].state === "done";
        const circle =
          p.state === "done"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : p.state === "current"
              ? "border-emerald-600 bg-white text-emerald-700 dark:bg-neutral-900 dark:text-emerald-400"
              : "border-neutral-300 bg-white text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500";
        return (
          <li key={p.label} className="relative flex min-w-0 flex-col items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-[15px] h-0.5 w-full -translate-y-1/2 ${lineDone ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-700"}`}
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onPick(p.target)}
              aria-current={p.viewing ? "step" : undefined}
              title={`${p.label} · ${p.done} of ${p.total} done`}
              className={`group relative z-10 flex w-full min-w-0 flex-col items-center gap-1 rounded-lg px-1 text-center focus-visible:outline-none ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 transition group-focus-visible:ring-[3px] group-focus-visible:ring-emerald-600/30 ${circle} ${
                  p.viewing ? "shadow-[0_0_0_4px_rgba(5,150,105,0.15)]" : clickable ? "group-hover:shadow-[0_0_0_3px_rgba(5,150,105,0.1)]" : ""
                }`}
              >
                {p.state === "done" ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
              </span>
              <span
                className={`hidden text-[12px] leading-tight sm:block ${
                  p.viewing
                    ? "font-semibold text-neutral-900 dark:text-neutral-50"
                    : p.state === "upcoming"
                      ? "font-medium text-neutral-400 dark:text-neutral-500"
                      : "font-medium text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {p.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** The steps of the phase being viewed, numbered within the phase, joined by arrows. */
function PhaseSteps({ phase, index, count, onPick }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="shrink-0 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
        Phase {index + 1} of {count} · <span className="text-neutral-800 dark:text-neutral-200">{phase.label}</span>
      </span>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-0.5 gap-y-1.5 p-0">
        {phase.rows.map((r, i) => {
          const clickable = Boolean(onPick) && r.reachable && !r.locked;
          const dot = r.isViewing
            ? "bg-white/25 text-white dark:bg-neutral-900/15 dark:text-neutral-900"
            : r.state === "DONE"
              ? "bg-emerald-600 text-white"
              : r.state === "SKIPPED"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300"
                : r.state === "CURRENT"
                  ? "border-[1.5px] border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500";
          return (
            <li key={r.key} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight size={13} aria-hidden="true" className="shrink-0 text-neutral-300 dark:text-neutral-600" />}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onPick(r.key)}
                aria-current={r.isViewing ? "step" : undefined}
                className={`inline-flex min-h-7 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[12.5px] font-medium transition ${
                  r.isViewing
                    ? "bg-emerald-700 text-white dark:bg-emerald-500 dark:text-neutral-950"
                    : clickable
                      ? "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      : "cursor-default text-neutral-400 dark:text-neutral-500"
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold ${dot}`}>
                  {r.state === "DONE" ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                {r.label}
                {r.state === "SKIPPED" && <span className={`text-[11px] ${r.isViewing ? "text-white/80" : "text-amber-600 dark:text-amber-400"}`}>· skipped</span>}
                {r.skippable && r.state === "UPCOMING" && <span className="text-[11px] opacity-70">· optional</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Chip({ children, tone = "muted" }) {
  const tones = {
    muted: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    warn: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300",
    info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300",
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${tones[tone]}`}>{children}</span>;
}

function BrandHeader({ brand, status, rows, viewing, onPick, onRefresh, refreshing }) {
  const phases = toPhases(rows, viewing);
  const viewingPhase = phases.find((p) => p.viewing) || null;
  const done = rows.filter((r) => r.state === "DONE" || r.state === "SKIPPED").length;
  const percent = status.progress?.percent ?? (rows.length ? (done / rows.length) * 100 : 0);
  const title = brand?.brandName || brand?.legalBusinessName || "New brand";
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const owner = brand?.whatsappNumber || brand?.user?.whatsappNumber;

  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {brand?.logo ? (
            <img src={brand.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-neutral-700" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[14px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300">
              {initials || "B"}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 truncate text-[16px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">{title}</h1>
            <div className="flex flex-wrap items-center gap-1">
              <Chip tone={status.kycPath ? "info" : "muted"}>{status.kycPath ? kycPathLabel(status.kycPath) : "Business status not chosen"}</Chip>
              {status.editMode === "REMEDIATION" && <Chip tone="warn">Sent back for changes</Chip>}
              {status.editMode === "LOCKED" && <Chip tone="info">Under review</Chip>}
              {brand?.uniqueId && <Chip>{brand.uniqueId}</Chip>}
              {owner && (
                <Chip>
                  <Phone size={10} /> +91 {owner}
                </Chip>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <ProgressRing percent={percent} />
            <div className="flex flex-col leading-tight">
              <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                {done} of {rows.length} steps
              </span>
              <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">completed</span>
            </div>
          </div>
          {onRefresh && (
            <SecondaryButton size="sm" busy={refreshing} onClick={onRefresh}>
              {!refreshing && <RefreshCw size={13} />} Refresh
            </SecondaryButton>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-200/70 px-5 pb-3 pt-4 dark:border-white/5">
        <PhaseTrack phases={phases} onPick={onPick} />
      </div>

      {viewingPhase && (
        <div className="rounded-b-2xl border-t border-neutral-200/70 bg-neutral-50/70 px-5 py-2.5 dark:border-white/5 dark:bg-neutral-950/30">
          <PhaseSteps phase={viewingPhase} index={phases.indexOf(viewingPhase)} count={phases.length} onPick={onPick} />
        </div>
      )}
    </div>
  );
}

/* ---- Create (owner number) ----------------------------------------- */
function CreateBrandStep() {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 409 VENDOR_ALREADY_EXISTS → details { userId, brandId, accountState } (#25h).
  const [existing, setExisting] = useState(null);
  const ok = WHATSAPP_RE.test(number) && (!name.trim() || name.trim().length >= 2);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setExisting(null);
    try {
      const res = await createOnboardingBrand({ whatsappNumber: number, brandName: name.trim() || undefined });
      const d = res?.data ?? res;
      const id = d?.brandId;
      if (!id) throw new Error("The server didn't return a brandId.");
      navigate(`/brand/onboard/${id}`, { replace: true });
    } catch (err) {
      if (err?.code === "VENDOR_ALREADY_EXISTS" && err.details?.brandId) setExisting(err.details);
      setError(errorText(err));
      setBusy(false);
    }
  };

  // Preview of the whole flow: this step is current, the rest come after
  // create. The verification steps shown are the GST path's; the business
  // status answer swaps them.
  const preview = [
    { key: "OWNER", label: "Owner number", group: GROUP_LABELS.BASIC_DETAILS, num: 1, state: "CURRENT", isViewing: true, reachable: false },
    ...laneScreens("GST").map((s, i) => ({ ...s, group: GROUP_LABELS[s.group], num: i + 2, state: "UPCOMING", isViewing: false, reachable: false })),
  ];
  const phases = toPhases(preview, "OWNER");

  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <div className="flex flex-col gap-0.5 px-5 py-4">
          <h1 className="m-0 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">New brand onboarding</h1>
          <p className="m-0 text-[13px] text-neutral-500 dark:text-neutral-400">
            Six phases. Everything is saved on the vendor's account, so the owner can log in later and carry on from the same step.
          </p>
        </div>
        <div className="border-t border-neutral-200/70 px-5 pb-3 pt-4 dark:border-white/5">
          <PhaseTrack phases={phases} />
        </div>
        <p className="m-0 rounded-b-2xl border-t border-neutral-200/70 bg-neutral-50/70 px-5 py-2.5 text-[12px] text-neutral-500 dark:border-white/5 dark:bg-neutral-950/30 dark:text-neutral-400">
          Verification depends on the business status: without GST there's no GST step, and a business that isn't registered verifies the owner
          instead of PAN and business type.
        </p>
      </div>

      <StepProvider value={{ icon: UserPlus, num: 1, total: preview.length, group: GROUP_LABELS.BASIC_DETAILS }}>
        <form onSubmit={create} className="min-w-0">
          <ScreenShell
            title="Who owns the brand?"
            intro="A vendor account is created on the owner's WhatsApp number. No code is sent now; the owner signs in with this number later."
            error={error}
            footer={
              <>
                <div />
                <PrimaryButton type="submit" busy={busy} disabled={!ok}>
                  Create & start onboarding
                </PrimaryButton>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Owner's WhatsApp number" hint="10 digits, starts with 6–9" error={number && !WHATSAPP_RE.test(number) ? "Enter a valid 10-digit number" : ""}>
                <div className="flex">
                  <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-neutral-300/80 bg-neutral-50 px-3 text-[14px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
                    +91
                  </span>
                  <input
                    className={`${inputCls} rounded-l-none`}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoFocus
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210"
                  />
                </div>
              </Field>
              <Field label="Brand name" optional hint="Can be filled on the next step too · 2–25 characters">
                <input className={inputCls} value={name} maxLength={25} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cafe Mocha" />
              </Field>
            </div>
            {existing ? (
              <Section
                title="A vendor already exists on this number"
                description={existing.accountState === "PENDING" ? "They never signed in, so the brand is hidden from the lists by default." : "Open their onboarding or the brand page."}
              >
                <div className="flex flex-wrap gap-2">
                  <PrimaryButton tone="dark" onClick={() => navigate(`/brand/onboard/${existing.brandId}`)}>Open onboarding</PrimaryButton>
                  <SecondaryButton onClick={() => navigate(`/brands/${existing.brandId}`)}>Open brand</SecondaryButton>
                </div>
              </Section>
            ) : (
              <Note tone="muted">If a vendor already exists on this number, you get a link to their brand instead.</Note>
            )}
          </ScreenShell>
        </form>
      </StepProvider>
    </div>
  );
}

/* ---- Wizard -------------------------------------------------------- */
function OnboardingWizard({ brandId }) {
  const navigate = useNavigate();
  // The screen being shown; null = follow the server's currentScreen.
  const [picked, setPicked] = useState(null);
  const [version, setVersion] = useState(0); // remounts the screen after each reload
  const [refreshing, setRefreshing] = useState(false);

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
  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };
  const goTo = (key) => {
    setPicked(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loading = statusQuery.isPending || brandQuery.isPending || (!status && statusQuery.isFetching);
  if (loading) return <Loader variant="page" label="Loading onboarding…" />;
  if (!status) {
    return (
      <EmptyState
        tone="error"
        icon="error"
        title="Couldn't load this brand's onboarding"
        description={loadError}
        action={{ label: "Try again", icon: RefreshCw, onClick: load }}
      />
    );
  }

  // The vendor's locks don't apply to the admin (guide §2.3, §6): every screen
  // up to the vendor's current one can be reopened and edited. Only after
  // submit does the wizard hand over to the review (legal edits then = §6).
  const afterSubmit = AFTER_SUBMIT.includes(status.currentScreen);
  const rows = buildStepper(status, viewing).map((r) => ({ ...r, locked: afterSubmit }));

  const lane = rows.map((r) => r.key);
  const viewIdx = lane.indexOf(viewing);
  const prevKey = viewIdx > 0 ? lane[viewIdx - 1] : null;

  const Screen = SCREEN_COMPONENTS[viewing];
  const row = rows.find((r) => r.key === viewing);
  const editing = viewing !== status.currentScreen;
  const eyebrow = row ? `Step ${row.num} of ${rows.length} · ${row.group}${editing ? " · editing" : ""}` : "";

  return (
    <div className="flex flex-col gap-4">
      <BrandHeader
        brand={brand}
        status={status}
        rows={rows}
        viewing={afterSubmit ? null : viewing}
        onPick={afterSubmit ? undefined : goTo}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      {/* editMode: FIRST_PASS (normal) · LOCKED (under review) · REMEDIATION (sent back / revoked) */}
      {status.editMode === "REMEDIATION" && (
        <Note tone="warn">
          <span className="font-semibold">Sent back by the verification team</span>
          {status.verification.rejectionReason ? `: ${status.verification.rejectionReason}` : status.verification.revokeReason ? `: ${status.verification.revokeReason}` : ""}. Fix
          the details and submit again.
        </Note>
      )}
      {loadError && <Note tone="error">{loadError}</Note>}

      {afterSubmit ? (
        <UnderReviewScreen status={status} onOpenBrand={() => navigate(`/brands/${brandId}`)} onOpenWaiting={() => navigate("/brand-waiting")} />
      ) : Screen ? (
        <StepProvider value={{ icon: SCREEN_ICONS[viewing], num: row?.num, total: rows.length, group: row?.group, editing }}>
          <Screen
            key={`${viewing}-${version}`}
            brandId={brandId}
            brand={brand}
            status={status}
            // false = a back-edit of a screen the vendor already passed
            isCurrent={!editing}
            eyebrow={eyebrow}
            onAdvance={load}
            onBack={prevKey ? () => goTo(prevKey) : undefined}
            onGoTo={goTo}
          />
        </StepProvider>
      ) : (
        <Note tone="warn">Unknown screen “{viewing}” from the server.</Note>
      )}
    </div>
  );
}

export default function AdminOnboarding() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  // normal-case: the app capitalises every word by default (index.css);
  // onboarding is full sentences.
  return (
    <div className="min-h-full p-4 normal-case text-neutral-900 sm:p-5 dark:text-neutral-100">
      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate("/new-onboarding")}
          className="inline-flex w-fit items-center gap-1.5 rounded-md px-1 text-[12.5px] font-medium text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          <ArrowLeft size={14} /> New Onboarding
        </button>
        {brandId ? <OnboardingWizard key={brandId} brandId={brandId} /> : <CreateBrandStep />}
      </div>
    </div>
  );
}
