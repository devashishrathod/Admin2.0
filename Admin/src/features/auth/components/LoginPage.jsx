
// API WITH LOGIC REAL API CODE 



import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Image1 from "@/assets/svg/device-sync.svg";
import Image2 from "../../../assets/Logo1.jpg";
import { useAuthStore } from "../store/authStore";

// ── Email Icon ─────────────────────────────────────────────
const EmailIcon = ({ color = '#9ca3af' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0 1.1.9 2 2 2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

// ── Phone Icon ─────────────────────────────────────────────
const PhoneIcon = ({ color = '#9ca3af' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
);

// ── OTP Modal ──────────────────────────────────────────────
// Reads inputType / maskedValue / actions straight from the auth store,
// so no more prop-drilling from LoginPage.
function OtpModal({ open, onClose, onVerifySuccess }) {
    const {
        inputType,
        maskedValue,
        verifyOtp,
        resendOtp,
        verifyingOtp,
        resendingOtp,
        error: storeError,
        clearError,
    } = useAuthStore();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [localError, setLocalError] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [verified, setVerified] = useState(false);
    const boxRefs = useRef([]);
    const timerRef = useRef(null);

    // Start countdown whenever modal opens
    useEffect(() => {
        if (!open) return;
        setOtp(['', '', '', '', '', '']);
        setLocalError('');
        clearError();
        setVerified(false);
        startCountdown();
        setTimeout(() => boxRefs.current[0]?.focus(), 100);
        return () => clearInterval(timerRef.current);
    }, [open]);

    function startCountdown() {
        setCountdown(30);
        setCanResend(false);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    function handleBoxInput(idx, val) {
        const digit = val.replace(/\D/g, '').slice(-1);
        const next = [...otp];
        next[idx] = digit;
        setOtp(next);
        setLocalError('');
        if (digit && idx < 5) boxRefs.current[idx + 1]?.focus();
    }

    function handleKeyDown(idx, e) {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
            const next = [...otp];
            next[idx - 1] = '';
            setOtp(next);
            boxRefs.current[idx - 1]?.focus();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        const next = ['', '', '', '', '', ''];
        digits.split('').forEach((d, i) => { next[i] = d; });
        setOtp(next);
        const last = Math.min(digits.length, 5);
        boxRefs.current[last]?.focus();
    }

    async function handleVerify() {
        const code = otp.join('');
        if (code.length < 6) {
            setLocalError('Please enter the complete 6-digit OTP.');
            return;
        }
        setLocalError('');
        const result = await verifyOtp(code, 'ADMIN');
        if (result.success) {
            setVerified(true);
            clearInterval(timerRef.current);
            setTimeout(() => {
                onVerifySuccess?.();
                onClose();
            }, 2000);
        }
        // on failure, storeError already holds the message and is shown below
    }

    async function handleResend() {
        setOtp(['', '', '', '', '', '']);
        setLocalError('');
        clearError();
        const result = await resendOtp('ADMIN');
        if (result.success) {
            startCountdown();
            boxRefs.current[0]?.focus();
        }
    }

    const isEmail = inputType === 'email';
    const accentColor = isEmail ? '#6366f1' : '#10b981';
    const gradientBg = isEmail
        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
        : 'linear-gradient(135deg,#10b981,#059669)';
    const displayError = localError || storeError;

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', animation: 'fadeIn .25s' }}
        >
            <style>{`
                @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
                @keyframes slideUp { from { transform:translateY(30px);opacity:0 } to { transform:translateY(0);opacity:1 } }
            `}</style>

            <div className="relative bg-white rounded-3xl p-6 sm:p-9 w-full max-w-sm shadow-2xl"
                style={{ animation: 'slideUp .3s ease' }}>

                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
                >✕</button>

                {verified ? (
                    /* ── Success state ── */
                    <div className="flex flex-col items-center gap-3 py-4">
                        <svg viewBox="0 0 24 24" fill="none" width="60" height="60">
                            <circle cx="12" cy="12" r="11" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                            <path d="M7 12.5l3.5 3.5 6-7" stroke="#10b981" strokeWidth="2.5"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="font-bold text-emerald-600 text-lg" style={{ fontFamily: 'Syne,sans-serif' }}>
                            Verified Successfully!
                        </p>
                        <p className="text-gray-400 text-xs">Redirecting to admin dashboard…</p>
                    </div>
                ) : (
                    <>
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{ background: gradientBg }}>
                                {isEmail
                                    ? <EmailIcon color="white" />
                                    : <PhoneIcon color="white" />}
                            </div>
                        </div>

                        {/* Heading */}
                        <h3 className="text-center font-bold text-gray-900 text-xl mb-1"
                            style={{ fontFamily: 'Syne,sans-serif' }}>
                            Verify Your {isEmail ? 'Email' : 'Mobile'}
                        </h3>
                        <p className="text-center text-xs text-gray-400 mb-6 leading-relaxed">
                            We've sent a 6-digit OTP via {isEmail ? 'email' : 'SMS'} to<br />
                            <strong className="text-gray-600">{maskedValue}</strong>
                        </p>

                        {/* OTP Boxes */}
                        <div className="flex gap-1.5 sm:gap-2 justify-center mb-2">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={el => boxRefs.current[idx] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleBoxInput(idx, e.target.value)}
                                    onKeyDown={e => handleKeyDown(idx, e)}
                                    onPaste={handlePaste}
                                    disabled={verifyingOtp}
                                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200"
                                    style={{
                                        borderColor: digit ? accentColor : '#e5e7eb',
                                        background: digit ? (isEmail ? '#eef2ff' : '#ecfdf5') : '#f9fafb',
                                        color: digit ? accentColor : '#111827',
                                        fontFamily: 'Syne,sans-serif',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Error */}
                        <p className="text-xs text-red-500 text-center mb-3 min-h-[16px]">{displayError}</p>

                        {/* Verify button */}
                        <button
                            onClick={handleVerify}
                            disabled={verifyingOtp}
                            className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-widest transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: gradientBg,
                                fontFamily: 'Syne,sans-serif',
                                boxShadow: `0 4px 14px ${accentColor}55`,
                            }}
                        >
                            {verifyingOtp ? 'VERIFYING…' : 'VERIFY OTP'}
                        </button>

                        {/* Resend */}
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                            <span>Didn't receive it?</span>
                            <button
                                onClick={handleResend}
                                disabled={!canResend || resendingOtp}
                                className="font-semibold transition"
                                style={{ color: (canResend && !resendingOtp) ? accentColor : '#9ca3af' }}
                            >
                                {resendingOtp
                                    ? 'Sending…'
                                    : canResend
                                        ? 'Resend OTP'
                                        : `Resend in ${countdown}s`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Main Login Page ────────────────────────────────────────
export default function LoginPage() {
    const navigate = useNavigate();

    const {
        value,
        inputType,
        modalOpen,
        sendingOtp,
        error,
        setValue,
        sendOtp,
        closeModal,
    } = useAuthStore();

    function handleChange(e) {
        setValue(e.target.value);
    }

    async function handleSendOTP() {
        if (!inputType) return;
        await sendOtp('ADMIN'); // sets maskedValue + opens modal on success (store.error set on failure)
    }

    function handleVerifySuccess() {
        navigate('/dashboard');
        console.log('Admin verified! Redirecting…');
    }

    const isEmail = inputType === 'email';
    const isPhone = inputType === 'phone';
    const iconColor = isEmail ? '#6366f1' : isPhone ? '#10b981' : '#9ca3af';

    return (
        <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-white">

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
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
                    50%     { transform: translateY(-14px) scale(1.03); }
                }
                .fish {
                    position: absolute;
                    pointer-events: none;
                    animation: swimAcross linear infinite;
                    opacity: 0.45;
                }
                @keyframes swimAcross {
                    0%   { transform: translateX(0vw)   translateY(0px); }
                    25%  { transform: translateX(25vw)  translateY(-8px); }
                    50%  { transform: translateX(50vw)  translateY(4px); }
                    75%  { transform: translateX(75vw)  translateY(-6px); }
                    100% { transform: translateX(105vw) translateY(0px); }
                }
                .otp-input-ring:focus {
                    box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
                }
            `}</style>

            {/* ── Soft gradient blob ── */}
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at bottom left, rgba(16,185,129,0.15) 0%, transparent 70%)' }}
            />

            {/* ══════════════════════════════════════
                LEFT — Illustration + tagline
            ══════════════════════════════════════ */}
            <div className="hidden lg:flex w-1/2 flex-col items-center justify-center pl-10 pr-6 relative z-10 gap-6">
                <img
                    src={Image1}
                    alt="Business Growth Illustration"
                    className="w-full max-w-md h-auto object-contain drop-shadow-sm"
                />
                <div className="text-center max-w-xs px-4">
                    <p className="text-gray-700 text-md font-medium leading-relaxed">
                        Grow your business with ease on{' '}<br />
                        <span className="text-emerald-500 font-bold">Trydood.</span>
                    </p>
                    <p className="text-gray-500 text-xs leading-relaxed mt-1">
                        Enjoy low-cost subscriptions and easy access<br />
                        to powerful business tools.
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════
                RIGHT — Login Card
            ══════════════════════════════════════ */}
            <div className="w-full lg:w-1/2 flex items-center justify-center relative z-10 px-4 py-10">
                <div className="w-full max-w-sm px-4 sm:px-8 py-6 sm:py-10 flex flex-col">

                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <img src={Image2} alt="Trydood" className="w-36 h-24 object-contain" />
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1"
                            style={{ fontFamily: 'Syne,sans-serif' }}>
                            Welcome <span className="text-emerald-500">Back!</span>
                        </h2>
                        <p className="text-sm text-gray-400">
                            Admin login — enter email or mobile number
                        </p>
                    </div>

                    {/* ── Input ── */}
                    <div className="flex flex-col gap-2 mb-3">

                        {/* Input with left icon */}
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200">
                                {isEmail
                                    ? <EmailIcon color={iconColor} />
                                    : <PhoneIcon color={iconColor} />}
                            </span>

                            <input
                                type="text"
                                placeholder="Email address or mobile number"
                                value={value}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition duration-200"
                            />

                            {/* Small type badge on right */}
                            {inputType && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded-md"
                                    style={{
                                        background: isEmail ? '#eef2ff' : '#ecfdf5',
                                        color: isEmail ? '#6366f1' : '#10b981',
                                    }}>
                                    {isEmail ? 'EMAIL' : 'MOBILE'}
                                </span>
                            )}
                        </div>

                        {/* Helper label */}
                        <p className="text-xs pl-1 min-h-[16px] transition-all duration-200"
                            style={{ color: isEmail ? '#6366f1' : isPhone ? '#10b981' : '#9ca3af' }}>
                            {isEmail && '✦ OTP will be sent to your email address'}
                            {isPhone && '✦ OTP will be sent via SMS to your mobile'}
                            {!inputType && value.length > 0 && 'Enter a valid email or 10-digit mobile number'}
                        </p>

                        {/* Send-OTP level error (e.g. network/API failure) */}
                        {error && !modalOpen && (
                            <p className="text-xs text-red-500 pl-1">{error}</p>
                        )}
                    </div>

                    {/* Send OTP button */}
                    <div className="flex justify-center mb-3">
                        <button
                            onClick={handleSendOTP}
                            disabled={!inputType || sendingOtp}
                            className="w-3/4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm tracking-widest transition duration-200 active:scale-95 flex items-center justify-center gap-2"
                            style={{ fontFamily: 'Syne,sans-serif' }}
                        >
                            {sendingOtp ? 'SENDING…' : 'SEND OTP'} {!sendingOtp && <span>→</span>}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-0.5">In case of any queries, reach out to</p>
                            <a href="mailto:TrydoodTeam@gmail.com"
                                className="text-sm text-emerald-500 hover:text-emerald-600 font-medium hover:underline transition">
                                trydoodteam@gmail.com
                            </a>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── OTP Modal ── */}
            <OtpModal
                open={modalOpen}
                onClose={closeModal}
                onVerifySuccess={handleVerifySuccess}
            />

        </div>
    );
}