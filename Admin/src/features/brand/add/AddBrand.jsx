import { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, AlertTriangle, Check, ChevronLeft, Loader2 } from "lucide-react";
import Stepper from "./components/Stepper";
import BusinessStep from "./steps/BusinessStep";
import GstPanStep from "./steps/GstPanStep";
import BankStep from "./steps/BankStep";
import BrandProfileStep from "./steps/BrandProfileStep";
import OutletLocationStep from "./steps/OutletLocationStep";
import WorkingHoursStep from "./steps/WorkingHoursStep";
import ListingFeaturesStep from "./steps/ListingFeaturesStep";
import ShowcaseStep from "./steps/ShowcaseStep";
import ReviewStep from "./steps/ReviewStep";
import { createInitialForm, VALIDATORS, buildBrandFormData, isRegisteredBusiness } from "./brandFormConfig";
import { createBrand } from "../services/BrandApi";
import { useBrands } from "../BrandContext";

const STEPS = [
  { key: "business", label: "Business", title: "Business details", description: "Who owns the brand and how the business is registered.", Component: BusinessStep },
  { key: "gstPan", label: "GST & PAN", title: "GST & PAN", description: "Tax identity of the business.", Component: GstPanStep },
  { key: "bank", label: "Bank", title: "Bank account", description: "Where settlements for this brand are paid out.", Component: BankStep },
  { key: "brandProfile", label: "Brand", title: "Brand profile", description: "How the brand appears to customers.", Component: BrandProfileStep },
  { key: "outlet", label: "Outlet", title: "Outlet & location", description: "The brand's first outlet and its address.", Component: OutletLocationStep },
  { key: "hours", label: "Hours", title: "Working hours", description: "Weekly opening hours of the outlet.", Component: WorkingHoursStep },
  { key: "features", label: "Features", title: "Listing features", description: "Amenities shown on the listing.", Component: ListingFeaturesStep },
  { key: "showcase", label: "Showcase", title: "Showcase", description: "Photo and video albums for the brand profile.", Component: ShowcaseStep },
  { key: "review", label: "Review", title: "Review & submit", description: "Check everything once before creating the brand.", Component: ReviewStep },
];

const UNREGISTERED_STEPS = STEPS.filter((s) => s.key !== "gstPan");

export default function AddBrand() {
  const navigate = useNavigate();
  const { fetchBrands } = useBrands();

  const [form, setForm] = useState(createInitialForm);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  // Errors only show after the user tries to leave a step, then update live.
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // GST & PAN only applies to registered businesses.
  const steps = isRegisteredBusiness(form) ? STEPS : UNREGISTERED_STEPS;
  const last = steps.length - 1;

  const registrationStatus = form.basicDetails.businessRegistrationStatus;

  // Object sections are merged with a patch; arrays (and anything needing
  // the previous value) take an updater function.
  const setSection = useCallback(
    (section, patch) => {
      // Switching registration status adds/removes a step, so the indexes
      // after Business shift â€” make the user walk forward again from here.
      if (
        section === "basicDetails" &&
        patch.businessRegistrationStatus &&
        patch.businessRegistrationStatus !== registrationStatus
      ) {
        setMaxReached(0);
      }
      setForm((prev) => ({
        ...prev,
        [section]: typeof patch === "function" ? patch(prev[section]) : { ...prev[section], ...patch },
      }));
    },
    [registrationStatus]
  );

  const current = steps[step];
  const errors = showErrors ? VALIDATORS[current.key](form) : {};
  const errorCount = Object.keys(errors).length;

  const goTo = (index) => {
    setStep(index);
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (Object.keys(VALIDATORS[current.key](form)).length) {
      setShowErrors(true);
      return;
    }
    const next = step + 1;
    setMaxReached((m) => Math.max(m, next));
    goTo(next);
  };

  const handleSubmit = async () => {
    // Steps can be revisited from Review, so re-check all of them and land
    // on the first one that's incomplete.
    const firstInvalid = steps.findIndex((s) => Object.keys(VALIDATORS[s.key](form)).length);
    if (firstInvalid !== -1) {
      goTo(firstInvalid);
      setShowErrors(true);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await createBrand(buildBrandFormData(form));
      fetchBrands();
      navigate("/new-onboarding");
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = current.Component;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/brand"
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ChevronLeft size={14} />
          Brands
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">Add Brand</h1>
        <p className="mt-1 text-[13px] text-neutral-500">Onboard a new brand with its first outlet, step by step.</p>
      </div>

      <div className="mb-5 rounded-2xl bg-white px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <Stepper steps={steps} current={step} maxReached={maxReached} onSelect={goTo} />
      </div>

      {/* Step card */}
      <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="border-b border-neutral-100 px-5 py-4 sm:px-6 dark:border-neutral-800">
          <p className="text-[11.5px] font-medium text-neutral-400">
            Step {step + 1} of {steps.length}
          </p>
          <h2 className="mt-0.5 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{current.title}</h2>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">{current.description}</p>
        </div>

        <div className="px-5 py-6 sm:px-6">
          {errorCount > 0 && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              Fix {errorCount} field{errorCount === 1 ? "" : "s"} below to continue.
            </div>
          )}
          <StepComponent
            form={form}
            errors={errors}
            setSection={setSection}
            onEdit={(key) => goTo(steps.findIndex((s) => s.key === key))}
          />
        </div>

        {submitError && (
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 sm:mx-6 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {submitError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4 sm:px-6 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => (step === 0 ? navigate("/new-onboarding") : goTo(step - 1))}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
          >
            <ArrowLeft size={14} />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step === last ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-5 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? "Creating brandâ€¦" : "Create brand"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              {step === last - 1 ? "Review" : "Save & next"}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
