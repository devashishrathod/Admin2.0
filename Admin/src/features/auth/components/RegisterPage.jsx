import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/Logo1.jpg";

// ── Bubbles only (fish removed) ───────────────────────────────────────────────
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

// ── Step Icons ────────────────────────────────────────────────────────────────
const IconRegister = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="14" r="6" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 34c0-6.627 5.373-12 12-12" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="30" cy="30" r="6" fill="#e8faf4" stroke="#10b981" strokeWidth="2"/>
    <path d="M27.5 30l1.5 1.5 3.5-3.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDeed = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="5" width="24" height="30" rx="3" stroke="#10b981" strokeWidth="2"/>
    <path d="M13 14h14M13 19h14M13 24h8" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24 26l2.5 2.5 5-5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBrand = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="18" width="30" height="18" rx="2.5" stroke="#10b981" strokeWidth="2"/>
    <path d="M14 18v-5a6 6 0 0112 0v5" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="20" cy="27" r="2.5" stroke="#10b981" strokeWidth="1.8"/>
    <path d="M20 29.5v3" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const STEPS = [
  {
    num: "01",
    Icon: IconRegister,
    title: "Register as an Outlet",
    desc: "Onboard your business within minutes with just your PAN card & Bank details.",
  },
  {
    num: "02",
    Icon: IconDeed,
    title: "Partnership Deed",
    desc: "A legal document outlining terms, roles, and responsibilities between business partners.",
  },
  {
    num: "03",
    Icon: IconBrand,
    title: "Listing Your Brand",
    desc: "Benefits: Transactions, Settlements, Voucher, Deal Pack, Membership & More.",
  },
];

export default function TryDoddOnboarding() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen bg-white flex flex-col px-10 py-6 relative overflow-hidden"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <style>{`
        .bubble {
          position: absolute;
          border-radius: 50%;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border: 1.5px solid rgba(255,255,255,0.55);
          pointer-events: none;
          animation: floatB ease-in-out infinite;
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-14px) scale(1.03); }
        }
      `}</style>

      {/* Green glow — bottom left */}
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at bottom left, rgba(16,185,129,0.15) 0%, transparent 70%)' }}
      />

      {/* Bubbles */}
      {BUBBLES.map(([size, top, left, bg, dur, delay], i) => (
        <div
          key={`bubble-${i}`}
          className="bubble"
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

        {/* Logo */}
        <div
          className={`mb-5 transition-all duration-500 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          <img src={logo} alt="TryDodd" className="h-8 w-auto" />
        </div>

        {/* Two-column */}
        <div className="flex-1 grid lg:grid-cols-2 gap-10 items-center">

          {/* ── LEFT — text only, no image ── */}
          <div className="flex flex-col justify-center">

            {/* Badge */}
            <div
              className={`inline-flex items-center gap-1.5 w-fit mb-4 transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
              }`}
              style={{ transitionDelay: "80ms" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-500 font-medium">Easy 03 Step To Onboarding</span>
            </div>

            {/* Headline */}
            <h1
              className={`text-5xl font-black text-gray-900 leading-[1.08] mb-4 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
              }`}
              style={{ transitionDelay: "140ms" }}
            >
              Before We Start
            </h1>

            {/* Sub-headline */}
            <p
              className={`text-lg font-semibold text-gray-700 leading-snug transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
              }`}
              style={{ transitionDelay: "210ms" }}
            >
              Smart Reach.{" "}
              <span className="text-emerald-500">Better Growth.</span>
              <br />
              Higher <span className="text-emerald-500">Earnings.</span>
            </p>
          </div>

          {/* ── RIGHT — steps + button ── */}
          <div className="flex flex-col justify-center gap-8">

            {/* Steps */}
            <div>
              {STEPS.map((step, i) => {
                const isLast = i === STEPS.length - 1;
                return (
                  <div
                    key={step.num}
                    className={`flex gap-4 transition-all duration-700 ${
                      visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
                    }`}
                    style={{ transitionDelay: `${280 + i * 130}ms` }}
                  >
                    {/* Dot + line */}
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 ring-[3px] ring-emerald-100 shrink-0" />
                      {!isLast && (
                        <div className="w-px flex-1 mt-1.5 mb-1.5 bg-gradient-to-b from-emerald-300 to-emerald-100 min-h-[44px]" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 -mt-0.5">
                      <step.Icon />
                    </div>

                    {/* Text */}
                    <div className={`${isLast ? "pb-0" : "pb-10"} flex-1`}>
                      <span className="text-[10px] font-black text-emerald-500 tracking-widest">{step.num}</span>
                      <h3 className="text-sm font-bold text-gray-900 mt-0.5 leading-tight">{step.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA — smaller, not full width */}
            <div
              className={`transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "700ms" }}
            >
              <button
                onClick={() => navigate('/setup')}
                className="group inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-white font-bold text-sm tracking-wide transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:shadow-emerald-300/40 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-emerald-300/50"
                style={{ background: "linear-gradient(90deg, #2dd4bf 0%, #059669 100%)" }}
              >
                Start Your Process
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}