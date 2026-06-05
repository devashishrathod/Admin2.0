import { useState } from "react";
import logo from "@/assets/Logo1.jpg";
import Sidebar               from "./setup-steps/Sidebar";
import Step1PanDetails       from "./setup-steps/Step1PanDetails";
import Step2GstSelection     from "./setup-steps/Step2GstSelection";
import Step3BankDetails      from "./setup-steps/Step3BankDetails";
import Step4ContactDetails   from "./setup-steps/Step4ContactDetails";
import Step5PartnerContract  from "./setup-steps/Step5PartnerContract";

// ── Same bubbles as onboarding & login ───────────────────────────────────────
const BUBBLES = [
  [110, '8%',  '6%',  'rgba(16,185,129,0.12)', 6,   0  ],
  [70,  '18%', '28%', 'rgba(99,102,241,0.11)',  8,   1  ],
  [90,  '42%', '3%',  'rgba(244,63,94,0.10)',   7,   2  ],
  [60,  '18%', '82%', 'rgba(20,184,166,0.12)',  9,   0.5],
  [80,  '12%', '62%', 'rgba(245,158,11,0.10)',  7.5, 3  ],
  [45,  '75%', '12%', 'rgba(16,185,129,0.13)',  5.5, 1.5],
  [50,  '55%', '22%', 'rgba(139,92,246,0.11)',  10,  2.5],
  [65,  '70%', '72%', 'rgba(99,102,241,0.10)',  8.5, 1  ],
  [40,  '85%', '45%', 'rgba(244,63,94,0.10)',   6.5, 3.5],
  [55,  '30%', '88%', 'rgba(16,185,129,0.11)',  7,   0.8],
  [35,  '60%', '55%', 'rgba(245,158,11,0.09)',  9.5, 2  ],
  [75,  '88%', '30%', 'rgba(139,92,246,0.10)',  8,   1.2],
];

const TOTAL_STEPS = 5;

export default function SetupAccount() {
  const [currentStep, setCurrentStep] = useState(1);
  const next = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));

  const progressPct = Math.round(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100);

  return (
    <div
      className="min-h-screen bg-white relative overflow-hidden flex flex-col"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Bubble animation ── */}
      <style>{`
        .sa-bubble {
          position: absolute;
          border-radius: 50%;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border: 1.5px solid rgba(255,255,255,0.55);
          pointer-events: none;
          animation: saFloat ease-in-out infinite;
        }
        @keyframes saFloat {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-14px) scale(1.03); }
        }
      `}</style>

      {/* Green glow — bottom left */}
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at bottom left, rgba(16,185,129,0.15) 0%, transparent 70%)' }}
      />
      {/* Subtle glow — top right */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.07) 0%, transparent 70%)' }}
      />

      {/* Bubbles */}
      {BUBBLES.map(([size, top, left, bg, dur, delay], i) => (
        <div
          key={`sa-bubble-${i}`}
          className="sa-bubble"
          style={{
            width: size, height: size,
            top, left,
            background: bg,
            boxShadow: `inset 0 0 ${size * 0.15}px ${bg}, 0 4px ${size * 0.2}px ${bg}`,
            animationDuration: `${dur}s`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}

      {/* ── All content above bg ── */}
      <div className="relative z-10 flex flex-col flex-1">

        {/* ── Header ── */}
        <header className="px-10 pt-6 pb-5 flex items-center justify-between border-b border-gray-100/80 backdrop-blur-sm bg-white/70">
          <div className="flex items-center gap-4">
            <img src={logo} alt="TryDodd" className="h-8 w-auto" />
            <div className="w-px h-6 bg-gray-200" />
            <div>
              <h1 className="text-base font-extrabold text-gray-900 leading-tight">
                Set Up Your Trydood Account
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Create an outlet to manage your products and services.
              </p>
            </div>
          </div>

          {/* Progress pill — top right */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-600">Step {currentStep} of {TOTAL_STEPS}</p>
              <p className="text-[10px] text-gray-400">{progressPct}% Complete</p>
            </div>
            {/* Mini arc progress */}
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="#10b981" strokeWidth="3"
                  strokeDasharray={`${progressPct * 0.879} ${87.9 - progressPct * 0.879}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-emerald-600">
                {progressPct}%
              </span>
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex flex-1 px-10 py-8 gap-8">

          {/* Sidebar */}
          <Sidebar currentStep={currentStep} setCurrentStep={setCurrentStep} />

          {/* Divider */}
          <div className="w-px bg-gray-100 flex-shrink-0" />

          {/* Step content */}
          <div className="flex-1 max-w-2xl">

            {/* Step label chip */}
            <div className="inline-flex items-center gap-1.5 mb-5 bg-emerald-50 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-600 tracking-wide">
                STEP {currentStep} OF {TOTAL_STEPS}
              </span>
            </div>

            {/* Animated step wrapper */}
            <div
              key={currentStep}
              className="animate-fadeIn"
              style={{
                animation: 'stepFadeIn 0.35s ease both',
              }}
            >
              <style>{`
                @keyframes stepFadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {currentStep === 1 && <Step1PanDetails      onNext={next} />}
              {currentStep === 2 && <Step2GstSelection    onNext={next} />}
              {currentStep === 3 && <Step3BankDetails     onNext={next} />}
              {currentStep === 4 && <Step4ContactDetails  onNext={next} />}
              {currentStep === 5 && <Step5PartnerContract onNext={next} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}