import { BadgeCheck, CalendarDays, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { ROLE_LABELS, formatDate, initialsOf } from "../profileUtils";
import { profileImageOf } from "../queries/profileQueries";

// One at-a-glance fact. `good === false` turns the icon amber (needs action).
function Fact({ icon: Icon, label, value, good }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 bg-white/90 px-3 py-3 sm:px-4 dark:bg-neutral-900">
      <Icon size={16} className={`shrink-0 ${good === false ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`} />
      <div className="min-w-0 leading-tight">
        <p className="text-[10.5px] font-medium uppercase tracking-wide text-neutral-400">{label}</p>
        <p className={`truncate text-[12.5px] font-semibold ${good === false ? "text-amber-700 dark:text-amber-400" : "text-neutral-800 dark:text-neutral-100"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* Top of the profile page — avatar, name, role, status, then four facts
 * in one divided row. Plain glass card, no gradients. */
export default function ProfileHero({ profile }) {
  const image = profileImageOf(profile);
  const name = profile.name || "Admin";
  const role = ROLE_LABELS[profile.role] || profile.role || "Admin";
  const inactive = profile.isActive === false;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        {image ? (
          <img src={image} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-[21px] font-bold sm:h-20 sm:w-20 sm:text-[26px] text-emerald-700 dark:text-emerald-300">
            {initialsOf(name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="max-w-full truncate text-[18px] font-bold sm:text-[21px] tracking-tight text-neutral-900 dark:text-neutral-50">{name}</h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              <ShieldCheck size={11} /> {role}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                inactive ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${inactive ? "bg-red-500" : "bg-emerald-500"}`} />
              {inactive ? "Deactivated" : "Active"}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-neutral-500">
            <span className="break-all normal-case">{profile.email ? profile.email.toLowerCase() : "No email added yet"}</span>
            {profile.uniqueId && (
              <>
                <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="font-mono text-[12px] normal-case">{profile.uniqueId}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-neutral-200/70 bg-neutral-200/70 lg:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-800">
        <Fact icon={CalendarDays} label="Member since" value={formatDate(profile.createdAt) || "—"} />
        <Fact
          icon={Mail}
          label="Email"
          value={profile.isEmailVerified ? "Verified" : profile.email ? "Not verified" : "Not added"}
          good={Boolean(profile.isEmailVerified)}
        />
        <Fact
          icon={KeyRound}
          label="Password"
          value={profile.passwordSetAt ? `Set on ${formatDate(profile.passwordSetAt)}` : "Not set"}
          good={Boolean(profile.passwordSetAt)}
        />
        <Fact icon={BadgeCheck} label="Signs in with" value={profile.loginType ? profile.loginType.toLowerCase() : "WhatsApp"} />
      </div>
    </div>
  );
}
