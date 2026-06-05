import { useState, useRef, useEffect } from "react";
import { ArrowIcon, CheckIcon } from "./icons";

const inp = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition";

// ── Reusable OTP Box Row ──────────────────────────────────────────────────────
function OtpInput({ otp, setOtp, otpRefs }) {
  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      otpRefs.current[i - 1]?.focus();
  };
  return (
    <div className="flex gap-2">
      {otp.map((d, i) => (
        <input
          key={i}
          ref={el => (otpRefs.current[i] = el)}
          type="text" inputMode="numeric" maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-11 h-11 border border-gray-200 rounded-lg text-center text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
        />
      ))}
    </div>
  );
}

// ── Countdown timer hook ──────────────────────────────────────────────────────
function useCountdown(start, trigger) {
  const [t, setT] = useState(start);
  useEffect(() => {
    if (!trigger) return;
    setT(start);
    const id = setInterval(() => setT(v => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [trigger]);
  return t;
}

// ── Main Step4 ────────────────────────────────────────────────────────────────
export default function Step4ContactDetails({ onNext }) {
  const [name,   setName]   = useState("");
  const [mobile, setMobile] = useState("");
  const [email,  setEmail]  = useState("");

  // Mobile OTP state
  const [mobileOtpSent,     setMobileOtpSent]     = useState(false);
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);
  const [mobileOtp,         setMobileOtp]         = useState(["","","","","",""]);
  const mobileRefs = useRef([]);
  const mobileTimer = useCountdown(59, mobileOtpSent);

  // Email OTP state
  const [emailOtpSent,     setEmailOtpSent]     = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailOtp,         setEmailOtp]         = useState(["","","","","",""]);
  const emailRefs = useRef([]);
  const emailTimer = useCountdown(59, emailOtpSent);

  const bothVerified = mobileOtpVerified && emailOtpVerified;

  // Simulate verify — in real app call API
  const verifyMobile = () => setMobileOtpVerified(true);
  const verifyEmail  = () => setEmailOtpVerified(true);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Add Contact Details</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        Add phone number and email for notifications and support.
      </p>

      {/* Name */}
      <div className="mb-5 max-w-md">
        <label className="block text-sm text-gray-600 mb-2">Tell Us Your Name</label>
        <input className={inp} placeholder="eg. Charlotte Amelia"
          value={name} onChange={e => setName(e.target.value)} />
      </div>

      {/* Mobile + Email in a row */}
      <div className="flex gap-5 mb-2">
        {/* ── Mobile ── */}
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">Enter Mobile Number</label>
          <div className="relative">
            <input
              className={inp + " pr-24"}
              placeholder="+91 9874581230"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              disabled={mobileOtpVerified}
            />
            {/* Verified badge */}
            {mobileOtpVerified ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-emerald-500 font-semibold">
                <CheckIcon /> Verified
              </span>
            ) : (
              !mobileOtpSent && (
                <button
                  onClick={() => mobile && setMobileOtpSent(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-500 font-semibold hover:text-emerald-700"
                >
                  Send OTP
                </button>
              )
            )}
          </div>

          {/* Mobile OTP box */}
          {mobileOtpSent && !mobileOtpVerified && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">
                OTP sent to your mobile number.
              </p>
              <OtpInput otp={mobileOtp} setOtp={setMobileOtp} otpRefs={mobileRefs} />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  Retry in{" "}
                  <span className="font-semibold text-gray-600">
                    00:{String(mobileTimer).padStart(2,"0")} s
                  </span>
                </p>
                <button
                  onClick={verifyMobile}
                  className="text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Email ── */}
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-2">Enter Mail Id</label>
          <div className="relative">
            <input
              className={inp + " pr-24"}
              placeholder="jsmith@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={emailOtpVerified}
            />
            {emailOtpVerified ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-emerald-500 font-semibold">
                <CheckIcon /> Verified
              </span>
            ) : (
              !emailOtpSent && (
                <button
                  onClick={() => email && setEmailOtpSent(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-500 font-semibold hover:text-emerald-700"
                >
                  Send OTP
                </button>
              )
            )}
          </div>

          {/* Email OTP box */}
          {emailOtpSent && !emailOtpVerified && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">
                OTP sent to your email address.
              </p>
              <OtpInput otp={emailOtp} setOtp={setEmailOtp} otpRefs={emailRefs} />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  Retry in{" "}
                  <span className="font-semibold text-gray-600">
                    00:{String(emailTimer).padStart(2,"0")} s
                  </span>
                </p>
                <button
                  onClick={verifyEmail}
                  className="text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status messages */}
      <div className="flex gap-5 mb-6 min-h-[20px]">
        <div className="flex-1">
          {mobileOtpVerified && (
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
              <CheckIcon /> Mobile number verified successfully!
            </p>
          )}
        </div>
        <div className="flex-1">
          {emailOtpVerified && (
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
              <CheckIcon /> Email verified successfully!
            </p>
          )}
        </div>
      </div>

      {/* Continue — only when both verified */}
      <button
        onClick={onNext}
        disabled={!bothVerified}
        className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition
          ${bothVerified
            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
      >
        Continue <ArrowIcon />
      </button>
    </div>
  );
}