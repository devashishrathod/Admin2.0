import { useState } from "react";
import { AlertTriangle, BatteryFull, Bell, Eye, Info, OctagonAlert, SignalHigh, Smartphone, Wifi } from "lucide-react";
import { isValidUrl } from "../utils/notificationUtils";
import { Pill, SectionCard, Segmented } from "./NotificationUi";
import { innerTile } from "./notificationStyles";

// How each priority paints both previews — banner edge, icon, tag.
const SEVERITY_LOOK = {
  INFO: {
    icon: Info,
    tag: null,
    banner: "bg-white/90 dark:bg-neutral-800/90",
    card: "border-emerald-400/30",
    iconTile: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  WARNING: {
    icon: AlertTriangle,
    tag: ["amber", "Warning", "bg-amber-400 text-neutral-950"],
    banner: "bg-gradient-to-br from-amber-50/95 to-white/90 shadow-amber-500/20 dark:from-amber-500/20 dark:to-neutral-800/90",
    card: "border-amber-400/60 bg-amber-50/60 dark:bg-amber-400/[0.06]",
    iconTile: "bg-amber-400/15 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  CRITICAL: {
    icon: OctagonAlert,
    tag: ["red", "Critical", "bg-red-500 text-white"],
    banner: "bg-gradient-to-br from-red-50/95 to-white/90 shadow-red-500/25 dark:from-red-500/20 dark:to-neutral-800/90",
    card: "border-red-500/60 bg-red-50/60 dark:bg-red-500/[0.06]",
    iconTile: "bg-red-500/15 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
};
const lookOf = (severity) => SEVERITY_LOOK[severity] || SEVERITY_LOOK.INFO;

function PushPreview({ title, body, image, severity }) {
  const look = lookOf(severity);
  const SevIcon = look.icon;
  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="relative overflow-hidden rounded-[2.2rem] border-[6px] border-neutral-900 bg-neutral-950 shadow-xl shadow-black/30">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-700/40 via-teal-900/40 to-neutral-950" />
        <div className="absolute left-1/2 top-2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-neutral-950" />
        <div className="relative z-10 flex flex-col px-3 pb-6 pt-2.5">
          <div className="flex items-center justify-between px-2 text-[10px] font-medium text-white">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-white/90">
              <SignalHigh size={10} />
              <Wifi size={10} />
              <BatteryFull size={12} />
            </span>
          </div>
          <p className="mt-4 text-center text-[34px] font-semibold leading-none tracking-tight text-white">9:41</p>
          <p className="mt-1 text-center text-[10.5px] text-white/60">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>

          <div className={`mt-5 rounded-2xl p-2.5 shadow-lg backdrop-blur transition-all ${look.banner}`}>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-[9px] font-bold text-white">T</span>
              <span className="flex-1 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">Trydood · now</span>
              {look.tag && (
                <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase ${look.tag[2]}`}>
                  <SevIcon size={8} /> {look.tag[1]}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-neutral-900 dark:text-neutral-50">{title}</p>
                <p className="mt-0.5 line-clamp-3 text-[10.5px] leading-snug text-neutral-600 dark:text-neutral-300">{body}</p>
              </div>
              {image && <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InAppPreview({ title, body, image, severity, deepLink }) {
  const look = lookOf(severity);
  const SevIcon = look.icon;
  return (
    <div className={`rounded-2xl p-3 ${innerTile}`}>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
        <Bell size={12} /> Notifications
      </p>
      <div className={`flex gap-2.5 rounded-2xl border bg-white p-3 shadow-sm transition-colors dark:bg-neutral-900 ${look.card}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${look.iconTile}`}>
          <SevIcon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-neutral-900 dark:text-neutral-50">{title}</p>
            <span className={`h-2 w-2 shrink-0 rounded-full ${look.dot}`} />
          </div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-neutral-600 dark:text-neutral-300">{body}</p>
          {image && <img src={image} alt="" className="mt-2 max-h-28 w-full rounded-xl object-cover" />}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-neutral-400">Just now</span>
            {look.tag && <Pill tint={look.tag[0]}>{look.tag[1]}</Pill>}
            {deepLink && <Pill tint="sky">Opens {deepLink}</Pill>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* How the message lands — lock-screen push or the in-app bell card. */
export default function NotificationPreview({ message, push, inApp }) {
  const [view, setView] = useState("push");
  const title = message.title.trim() || "Notification title";
  const body = message.body.trim() || "Your message shows up here.";
  const image = isValidUrl(message.imageUrl.trim()) ? message.imageUrl.trim() : null;

  return (
    <SectionCard icon={Eye} title="Preview" subtitle="Updates as you type">
      <Segmented
        stretch
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { key: "push", label: "Push", icon: Smartphone },
          { key: "inApp", label: "In-app", icon: Bell },
        ]}
      />
      <div className="mt-3">
        {view === "push" ? (
          <PushPreview title={title} body={body} image={image} severity={message.severity} />
        ) : (
          <InAppPreview title={title} body={body} image={image} severity={message.severity} deepLink={message.deepLink.trim()} />
        )}
      </div>
      <p className="mt-3 text-[10.5px] leading-relaxed text-neutral-400">
        {view === "push"
          ? push
            ? "Recipients without a registered device are skipped on this channel."
            : "Push is off for this send — it will only appear in-app."
          : inApp
            ? "Every recipient gets this in their bell, whatever the push setting."
            : "In-app is off for this send."}
      </p>
    </SectionCard>
  );
}
