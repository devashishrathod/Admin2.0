import { useEffect, useState } from "react";
import { BadgeCheck, Mail, MessageCircle, PencilLine, Phone, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button, IconInput, Notice, Pill, SectionCard } from "../../notification/components/NotificationUi";
import { TINTS, innerTile } from "../../notification/components/notificationStyles";
import {
  sendEmailCode,
  sendMobileCode,
  sendWhatsappCode,
  verifyEmailCode,
  verifyMobileCode,
  verifyWhatsappCode,
} from "../services/ProfileApi";
import { refreshMyProfile } from "../queries/profileQueries";
import { EMAIL_RE, formatPhone, tenDigits } from "../profileUtils";
import OtpCodeInput from "./OtpCodeInput";

const RESEND_SECONDS = 60;

/* One config per channel — how to send / verify a code (doc #12a–12f). */
const CHANNELS = {
  email: {
    label: "Email",
    icon: Mail,
    tint: "amber",
    placeholder: "you@trydood.com",
    inputType: "email",
    display: (v) => v.toLowerCase(),
    validate: (v) => (EMAIL_RE.test(v.trim()) ? "" : "Enter a valid email address."),
    normalize: (v) => v.trim().toLowerCase(),
    send: (value) => sendEmailCode({ email: value }),
    verify: ({ otp }) => verifyEmailCode({ otp }),
  },
  mobile: {
    label: "Mobile",
    icon: Phone,
    tint: "sky",
    placeholder: "98765 43210",
    inputType: "tel",
    display: formatPhone,
    validate: (v) => (tenDigits(v).length === 10 ? "" : "Enter a 10-digit mobile number."),
    normalize: tenDigits,
    send: (value) => sendMobileCode({ mobile: value }),
    verify: ({ otp, value, sessionId }) => verifyMobileCode({ otp, sessionId, mobile: value }),
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    tint: "emerald",
    placeholder: "98765 43210",
    inputType: "tel",
    display: formatPhone,
    validate: (v) => (tenDigits(v).length === 10 ? "" : "Enter a 10-digit WhatsApp number."),
    normalize: tenDigits,
    send: (value) => sendWhatsappCode({ whatsappNumber: value }),
    verify: ({ otp, value }) => verifyWhatsappCode({ otp, whatsappNumber: value }),
  },
};

// What the code step is asking for, in plain words.
const STEP_TEXT = {
  CONFIRM_CURRENT: "Step 1 of 2 — confirm the number you have now",
  CONFIRM_NEW: "Confirm the new one",
};

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft];
}

/* One contact row:
 *   idle → value + verified state, "Verify" / "Change"
 *   edit → new value, "Send code"
 *   code → six-digit code, "Verify", resend after a cooldown
 * The account only changes when the code is verified. */
function ContactRow({ kind, value, verified, onSignedOut }) {
  const ch = CHANNELS[kind];
  const Icon = ch.icon;
  const [mode, setMode] = useState("idle"); // idle | edit | code
  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState(null); // new value being switched to (null = confirm current)
  const [code, setCode] = useState("");
  const [flow, setFlow] = useState(null); // { message, step, sessionId }
  const [busy, setBusy] = useState(null); // "send" | "verify"
  const [status, setStatus] = useState(null); // { tone, text }
  const [cooldown, setCooldown] = useCountdown();

  const draftError = mode === "edit" && draft ? ch.validate(draft) : "";
  const sameAsCurrent = mode === "edit" && value && ch.normalize(draft) === ch.normalize(value);

  const close = () => {
    setMode("idle");
    setDraft("");
    setTarget(null);
    setCode("");
    setFlow(null);
  };

  const send = async (newValue = target) => {
    setBusy("send");
    setStatus(null);
    try {
      const res = await ch.send(newValue || undefined);
      const data = res?.data ?? {};
      setTarget(newValue);
      setFlow({ message: res?.message || `Code sent to ${data.sentTo || "you"}.`, step: data.step, sessionId: data.sessionId });
      setCode("");
      setMode("code");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (err.retryAfterSeconds) setCooldown(Math.ceil(err.retryAfterSeconds));
      setStatus({ tone: "error", text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setBusy("verify");
    setStatus(null);
    try {
      const res = await ch.verify({ otp: code, value: target || undefined, sessionId: flow?.sessionId });
      const data = res?.data ?? {};
      // WhatsApp step-up: the current number is confirmed, a code is now on
      // its way to the new one.
      if (data.step === "CONFIRM_NEW") {
        setFlow({ message: res?.message, step: data.step, sessionId: data.sessionId ?? flow?.sessionId });
        setCode("");
        setCooldown(RESEND_SECONDS);
        return;
      }
      close();
      setStatus({ tone: "success", text: res?.message || `${ch.label} verified.` });
      if (data.sessionsEnded) {
        // Changing the WhatsApp number ends every session, this one too.
        onSignedOut(res?.message);
        return;
      }
      await refreshMyProfile();
    } catch (err) {
      setStatus({ tone: "error", text: err.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`rounded-2xl border border-neutral-200/70 p-3 sm:p-4 dark:border-neutral-800 ${innerTile}`}>
      {/* Row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TINTS[ch.tint]}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-50">{ch.label}</p>
            {value &&
              (verified === true ? (
                <Pill tint="emerald">
                  <BadgeCheck size={10} /> Verified
                </Pill>
              ) : verified === false ? (
                <Pill tint="amber">Not verified</Pill>
              ) : null)}
          </div>
          <p className={`truncate text-[12.5px] ${value ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400"} ${kind === "email" ? "normal-case" : "tabular-nums"}`}>
            {value ? ch.display(value) : `No ${ch.label.toLowerCase()} added`}
          </p>
        </div>
        {mode === "idle" && (
          <div className="flex w-full gap-1.5 sm:w-auto sm:shrink-0 [&>button]:flex-1 [&>button]:justify-center sm:[&>button]:flex-none">
            {value && verified !== true && (
              <Button variant="soft" size="sm" icon={ShieldCheck} loading={busy === "send"} disabled={cooldown > 0} onClick={() => send(null)}>
                Verify
              </Button>
            )}
            <Button size="sm" icon={PencilLine} onClick={() => setMode("edit")}>
              {value ? "Change" : "Add"}
            </Button>
          </div>
        )}
        {mode !== "idle" && <Button size="icon" icon={X} aria-label="Cancel" title="Cancel" onClick={close} />}
      </div>

      {/* Edit */}
      {mode === "edit" && (
        <div className="mt-3 space-y-2 border-t border-neutral-200/70 pt-3 dark:border-neutral-800">
          <p className="text-[11.5px] normal-case text-neutral-500">
            We'll send a code to the new {ch.label.toLowerCase()}. Your account changes only after you enter it.
            {kind === "whatsapp" && verified === true && " Your current number gets a code first, then the new one."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <IconInput
              icon={Icon}
              type={ch.inputType}
              value={draft}
              onChange={setDraft}
              placeholder={ch.placeholder}
              autoFocus
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && !draftError && draft && !sameAsCurrent && send(ch.normalize(draft))}
            />
            <Button
              variant="primary"
              loading={busy === "send"}
              disabled={!draft || Boolean(draftError) || sameAsCurrent || cooldown > 0}
              onClick={() => send(ch.normalize(draft))}
            >
              {cooldown > 0 ? `Wait ${cooldown}s` : "Send code"}
            </Button>
          </div>
          {(draftError || sameAsCurrent) && (
            <p className="text-[11px] normal-case text-red-500">{draftError || `That's already your ${ch.label.toLowerCase()}.`}</p>
          )}
        </div>
      )}

      {/* Code */}
      {mode === "code" && (
        <div className="mt-3 space-y-3 border-t border-neutral-200/70 pt-3 dark:border-neutral-800">
          {STEP_TEXT[flow?.step] && (
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{STEP_TEXT[flow.step]}</p>
          )}
          <p className="text-[12px] normal-case text-neutral-600 dark:text-neutral-300">{flow?.message}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <OtpCodeInput key={flow?.step || "code"} value={code} onChange={setCode} disabled={busy === "verify"} />
            <Button variant="primary" icon={ShieldCheck} loading={busy === "verify"} disabled={code.length !== 6} onClick={verify} className="justify-center">
              Verify
            </Button>
          </div>
          <button
            type="button"
            disabled={cooldown > 0 || Boolean(busy)}
            onClick={() => send(target)}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline dark:text-emerald-300"
          >
            <RefreshCw size={11} /> {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      )}

      {status && (
        <Notice tone={status.tone} className="mt-3">
          {status.text}
        </Notice>
      )}
    </div>
  );
}

/* Email, mobile and WhatsApp — each verified with a one-time code. */
export default function ContactCard({ profile, onSignedOut }) {
  return (
    <SectionCard icon={ShieldCheck} title="Contact & verification" subtitle="Where we reach you — every change is confirmed with a code">
      <div className="space-y-3">
        <ContactRow kind="email" value={profile.email || ""} verified={profile.isEmailVerified} onSignedOut={onSignedOut} />
        <ContactRow kind="mobile" value={profile.mobile || ""} verified={profile.isMobileVerified} onSignedOut={onSignedOut} />
        <ContactRow kind="whatsapp" value={profile.whatsappNumber || ""} verified={profile.isWhatsappVerified} onSignedOut={onSignedOut} />
      </div>
      <Notice tone="warning" className="mt-3">
        <span className="normal-case">
          WhatsApp is how you sign in. Changing it signs you out on every device, this one included — sign back in with the new number.
        </span>
      </Notice>
    </SectionCard>
  );
}
