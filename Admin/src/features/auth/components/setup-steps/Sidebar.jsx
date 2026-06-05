import { useNavigate } from "react-router-dom";

const STEPS = [
  { id: 1, label: "Pan Details",        sub: "STEP 1" },
  { id: 2, label: "GST selection",      sub: "STEP 2" },
  { id: 3, label: "Bank Details",       sub: "STEP 3" },
  { id: 4, label: "Register as author", sub: "STEP 4" },
  { id: 5, label: "Partner Contract",   sub: "STEP 5" },
];

const LockIcon = () => (
  <svg className="w-3 h-3 inline-block" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function Sidebar({ currentStep, setCurrentStep }) {
  const navigate = useNavigate();

  return (
    <div
      className="w-56 flex-shrink-0 flex flex-col px-5 py-6"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-500 transition mb-6 w-fit"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd"/>
        </svg>
        Back
      </button>

      {/* Steps */}
      <div className="flex flex-col">
        {STEPS.map((step, idx) => {
          const isDone   = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isLocked = step.id > currentStep;
          const isLast   = idx === STEPS.length - 1;

          // line color: green if this step is done or active, gray if locked
          const lineColor = isDone ? '#10b981' : '#e5e7eb';

          return (
            <button
              key={step.id}
              onClick={() => !isLocked && setCurrentStep(step.id)}
              className={`text-left flex items-stretch gap-4 ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Left: only line, no dot */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 2 }}>
                <div
                  className="w-[2px] transition-colors duration-500"
                  style={{
                    flex: 1,
                    background: lineColor,
                    // first step: line starts from middle of text row
                    // last step: line ends at middle, not bottom
                    marginTop:    idx === 0 ? 18 : 0,
                    marginBottom: isLast   ? 18 : 0,
                  }}
                />
              </div>

              {/* Text */}
              <div className={`${isLast ? "pb-0" : "pb-7"} pt-1`}>
                <p className={`text-sm font-semibold leading-tight
                  ${isActive ? "text-emerald-500"
                  : isDone   ? "text-gray-800"
                  :            "text-gray-300"}`}>
                  {step.label}
                </p>
                <p className={`text-[11px] mt-0.5 tracking-wide
                  ${isActive ? "text-emerald-400" : "text-gray-400"}`}>
                  {step.sub}
                </p>
                {isDone && (
                  <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                    Documents Secured <LockIcon />
                  </p>
                )}
                {isLocked && (
                  <span className="text-gray-300 mt-0.5"><LockIcon /></span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}