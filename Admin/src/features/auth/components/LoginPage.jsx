import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import {
    ArrowRight,
    Loader2,
    ShieldCheck,
    Mail,
    X,
    AlertTriangle,
    Clock,
} from 'lucide-react';
import { isTokenValid } from '../session';
import HeroImage from "@/assets/Trydood’s Cozy Restaurant Dashboard.png";
import Image2 from "../../../assets/Logo1.jpg";
import { useAuthStore } from "../store/authStore";

// ── WhatsApp Icon ──────────────────────────────────────────
const WhatsAppIcon = ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.76 14.03c-.24.68-1.4 1.3-1.93 1.38-.49.08-1.11.11-1.79-.11-.41-.13-.94-.31-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.72-2.09.98-2.37c.26-.28.56-.35.75-.35s.38 0 .54.01c.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.56.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.86-1.06.18-.28.36-.23.6-.14.24.09 1.52.72 1.78.85.26.14.44.21.5.32.06.12.06.68-.18 1.36z" />
    </svg>
);

// ── OTP Modal ──────────────────────────────────────────────
// Reads inputType / maskedValue / actions straight from the auth store,
// so no more prop-drilling from LoginPage.
function OtpModal({ open, onClose, onVerifySuccess }) {
    const {
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

    async function handleVerify(e) {
        e?.preventDefault();
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

    const displayError = localError || storeError;

    if (!open) return null;

    return (
        <div className="login-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm">
            <div className="login-rise relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_80px_-20px_rgba(16,185,129,0.45)] backdrop-blur-2xl sm:p-8 dark:border-white/5 dark:bg-neutral-900/95 dark:shadow-black/60">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/10" />

                {/* Close */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                >
                    <X size={16} />
                </button>

                {verified ? (
                    /* ── Success state ── */
                    <div className="relative flex flex-col items-center gap-3 py-6 text-center">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
                            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.8)]">
                                <svg viewBox="0 0 24 24" fill="none" width="30" height="30">
                                    <path d="M6 12.5l4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </div>
                        <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Verified!</p>
                        <p className="flex items-center gap-1.5 text-[12.5px] text-neutral-500">
                            <Loader2 size={13} className="animate-spin" /> Taking you to the dashboard…
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleVerify} className="relative">
                        {/* Icon */}
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_10px_24px_-8px_rgba(16,185,129,0.8)]">
                            <WhatsAppIcon size={24} />
                        </div>

                        {/* Heading */}
                        <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                            Enter the code
                        </h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
                            We sent a 6-digit OTP on WhatsApp to{' '}
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{maskedValue}</span>
                        </p>

                        {/* OTP Boxes */}
                        <div className="mt-6 flex justify-between gap-1.5 sm:gap-2">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={el => boxRefs.current[idx] = el}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                                    aria-label={`Digit ${idx + 1}`}
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleBoxInput(idx, e.target.value)}
                                    onKeyDown={e => handleKeyDown(idx, e)}
                                    onPaste={handlePaste}
                                    disabled={verifyingOtp}
                                    className={`h-12 w-full min-w-0 rounded-2xl border-2 text-center text-xl font-bold outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/20 disabled:opacity-60 sm:h-14 ${
                                        digit
                                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                                            : 'border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-50'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Error */}
                        <p className="mt-2 min-h-5 text-center text-[12px] text-red-500 dark:text-red-400">{displayError}</p>

                        {/* Verify button */}
                        <button
                            type="submit"
                            disabled={verifyingOtp}
                            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[14px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(16,185,129,0.9)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {verifyingOtp ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                            {verifyingOtp ? 'Verifying…' : 'Verify & sign in'}
                        </button>

                        {/* Resend */}
                        <div className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] text-neutral-500">
                            <span>Didn't get it?</span>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={!canResend || resendingOtp}
                                className="inline-flex items-center gap-1 font-semibold text-emerald-600 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-neutral-400 dark:text-emerald-400 dark:disabled:text-neutral-500"
                            >
                                {resendingOtp ? (
                                    'Sending…'
                                ) : canResend ? (
                                    'Resend OTP'
                                ) : (
                                    <>
                                        <Clock size={12} /> Resend in {countdown}s
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
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

    async function handleSendOTP(e) {
        e?.preventDefault();
        if (!inputType) return;
        await sendOtp('ADMIN'); // sets maskedValue + opens modal on success (store.error set on failure)
    }

    // Where to go after login: the page the admin was on when the session
    // ended (?from=…, set by the route guard / 401 handler), else the dashboard.
    // Only same-app paths are accepted — never an absolute / protocol-relative URL.
    const [searchParams] = useSearchParams();
    const fromParam = searchParams.get('from');
    const returnTo = fromParam && fromParam.startsWith('/') && !fromParam.startsWith('//') ? fromParam : '/dashboard';
    const sessionExpired = searchParams.get('session') === 'expired';

    const accessToken = useAuthStore((s) => s.accessToken);
    const logout = useAuthStore((s) => s.logout);
    const alreadyLoggedIn = isTokenValid(accessToken);

    // A stale (expired) token left in storage — clear it so the form starts clean.
    useEffect(() => {
        if (accessToken && !alreadyLoggedIn) logout();
    }, [accessToken, alreadyLoggedIn, logout]);

    function handleVerifySuccess() {
        navigate(returnTo, { replace: true });
    }

    // Already logged in with a valid token → skip the login screen entirely.
    // (Opening the site root used to always show this page, which looked
    // like being logged out.)
    if (alreadyLoggedIn) return <Navigate to={returnTo} replace />;

    const valid = inputType === 'whatsapp';
    const showInvalid = !inputType && value.length > 0;

    return (
        // Same soft green "bento" backdrop as the app shell (Layout), so the
        // login screen and the console feel like one product.
        // Exactly one viewport tall on every screen — no scrolling anywhere.
        // On short screens the less important bits hide (max-height media
        // variants below) instead, so the card always fits.
        <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#E9F8EF] via-[#F5FBF7] to-[#E3F5F1] px-3 py-4 sm:px-6 sm:py-6 dark:from-neutral-950 dark:via-neutral-950 dark:to-[#06231b]">
            <style>{`
                @keyframes loginFade { from { opacity: 0 } to { opacity: 1 } }
                @keyframes loginRise { from { opacity: 0; transform: translateY(16px) scale(.98) } to { opacity: 1; transform: none } }
                .login-fade { animation: loginFade .25s ease-out both }
                .login-rise { animation: loginRise .35s cubic-bezier(.2,.8,.2,1) both }
            `}</style>

            {/* Glow blobs */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-500/10" />
                <div className="absolute right-[-6rem] top-24 h-[28rem] w-[28rem] rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-500/10" />
                <div className="absolute bottom-[-8rem] left-1/3 h-96 w-[32rem] rounded-full bg-lime-200/40 blur-3xl dark:bg-emerald-400/5" />
            </div>

            <div className="login-rise relative z-10 grid h-full max-h-[760px] w-full max-w-6xl items-center gap-4 lg:grid-cols-[1.1fr_1fr] xl:gap-8">

                {/* ══════════ LEFT — illustration (desktop) ══════════ */}
                {/* Square artwork, capped by the row height (max-h-full keeps its
                    aspect ratio) so it never pushes the page into a scroll. */}
                <aside className="hidden h-full min-h-0 items-center justify-center p-4 lg:flex xl:p-6">
                    <img
                        src={HeroImage}
                        alt="Trydood admin dashboard"
                        className="max-h-full max-w-full rounded-[28px] object-contain shadow-[0_30px_60px_-20px_rgba(6,78,59,0.45)] ring-1 ring-white/60 dark:ring-white/5"
                    />
                </aside>

                {/* ══════════ RIGHT — sign-in form ══════════ */}
                <main className="flex h-full min-h-0 flex-col justify-center overflow-hidden px-5 py-8 sm:px-10 sm:py-10 lg:py-8 [@media(max-height:700px)]:py-5">
                    <div className="mx-auto w-full max-w-sm">
                        {/* Logo — dropped on very short screens (the brand panel / badge still says Trydood admin). */}
                        <img src={Image2} alt="Trydood" className="h-12 w-auto rounded-xl object-contain [@media(max-height:620px)]:hidden" />

                        {/* Heading */}
                        <span className="mt-5 [@media(max-height:620px)]:mt-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                            <ShieldCheck size={12} /> Admin access only
                        </span>
                        <h2 className="mt-3 text-[24px] font-bold sm:text-[28px] leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
                            Welcome back 👋
                        </h2>
                        <p className="mt-1.5 text-[13.5px] text-neutral-500">
                            Sign in with the WhatsApp number linked to your admin account.
                        </p>

                        {/* Sent here because the token expired (route guard / API 401). */}
                        {sessionExpired && !error && (
                            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-800 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
                                <Clock size={14} className="mt-0.5 shrink-0" />
                                Your session has expired. Please log in again.
                            </div>
                        )}

                        <form onSubmit={handleSendOTP} className="mt-6">
                            <label htmlFor="login-whatsapp" className="mb-1.5 block text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-300">
                                WhatsApp number
                            </label>

                            {/* Input with +91 prefix */}
                            <div
                                className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition-all duration-200 focus-within:ring-4 dark:bg-neutral-950/60 ${
                                    showInvalid
                                        ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-400/15 dark:border-red-500/40'
                                        : 'border-neutral-200 focus-within:border-emerald-400 focus-within:ring-emerald-400/20 dark:border-neutral-800'
                                }`}
                            >
                                <span className={`flex h-full items-center gap-1.5 border-r border-neutral-200 bg-neutral-50 px-3 text-[13px] font-semibold transition-colors dark:border-neutral-800 dark:bg-neutral-900 ${valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
                                    <WhatsAppIcon size={15} /> +91
                                </span>
                                <input
                                    id="login-whatsapp"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    autoFocus
                                    placeholder="98765 43210"
                                    value={value}
                                    onChange={handleChange}
                                    className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[14px] font-medium tracking-wide text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none dark:text-neutral-50 dark:placeholder:text-neutral-600"
                                />
                                {valid && (
                                    <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                        <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                                            <path d="M6 12.5l4 4 8-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                )}
                            </div>

                            {/* Helper / validation */}
                            <p className={`mt-1.5 min-h-5 pl-1 text-[12px] transition-colors ${showInvalid ? 'text-red-500 dark:text-red-400' : valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                                {valid
                                    ? 'You’ll get a 6-digit OTP on WhatsApp.'
                                    : showInvalid
                                        ? 'Enter a valid 10-digit WhatsApp number.'
                                        : 'We’ll send a one-time code to this number.'}
                            </p>

                            {/* Send-OTP level error (e.g. network/API failure) */}
                            {error && !modalOpen && (
                                <div className="mt-1 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Send OTP */}
                            <button
                                type="submit"
                                disabled={!inputType || sendingOtp}
                                className="group mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[14px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(16,185,129,0.9)] transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                            >
                                {sendingOtp ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Sending OTP…
                                    </>
                                ) : (
                                    <>
                                        Send OTP
                                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Trust line */}
                        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-neutral-400 [@media(max-height:560px)]:hidden">
                            <ShieldCheck size={12} /> Secured with WhatsApp OTP · Session ends when you close the tab
                        </p>

                        {/* Support */}
                        {/* Help card — hidden on short screens so the form never needs a scroll. */}
                        <div className="mt-6 flex items-center gap-3 rounded-2xl [@media(max-height:660px)]:hidden border border-neutral-200/80 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Mail size={16} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11.5px] text-neutral-500">Need help signing in?</p>
                                <a
                                    href="mailto:TrydoodTeam@gmail.com"
                                    className="truncate text-[13px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                                >
                                    trydoodteam@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>
                </main>
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
