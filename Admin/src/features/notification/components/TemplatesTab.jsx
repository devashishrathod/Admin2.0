import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookmarkPlus, FileText, Info, OctagonAlert, Search, Trash2, Users } from "lucide-react";
import { AUDIENCE_GROUPS, STARTER_TEMPLATES } from "../notificationConfig";
import { formatWhen } from "../utils/notificationUtils";
import { GlassCard, PageTabs, Pill } from "./NotificationUi";
import { glass, inputClass } from "./notificationStyles";

const SEVERITY = {
  INFO: { icon: Info, label: "Info", cls: "bg-white/25 text-white" },
  WARNING: { icon: AlertTriangle, label: "Warning", cls: "bg-white text-amber-600" },
  CRITICAL: { icon: OctagonAlert, label: "Critical", cls: "bg-white text-red-600" },
};

const audienceText = (audience) =>
  audience?.roles?.length
    ? AUDIENCE_GROUPS.filter((g) => audience.roles.includes(g.role))
        .map((g) => g.label)
        .join(" + ")
    : "Keeps your audience";

/* One template, starter or saved:
 *   gradient header (icon, category, priority)
 *   a mini notification bubble overlapping it — how it lands on a phone
 *   who it's for + channels, and the "Use template" action */
function TemplateCard({ template, onUse, onRemove }) {
  const t = template;
  const Icon = t.icon || FileText;
  const sev = SEVERITY[t.message.severity] || SEVERITY.INFO;
  const SevIcon = sev.icon;

  return (
    <div className={`${glass} group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(16,185,129,0.16)]`}>
      {/* Header */}
      <div className={`relative h-24 overflow-hidden bg-gradient-to-br ${t.gradient || "from-emerald-600 via-teal-500 to-cyan-400"} px-4 pt-3.5 text-white`}>
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/25 blur-2xl transition-transform duration-500 group-hover:scale-125" />
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm">
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-bold leading-tight">{t.name}</p>
              <p className="truncate text-[10.5px] font-medium text-white/80">{t.category || `Saved ${formatWhen(t.createdAt)}`}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase ${sev.cls}`}>
              <SevIcon size={9} /> {sev.label}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                aria-label={`Delete ${t.name}`}
                title="Delete template"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/40"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mini notification */}
      <div className="relative -mt-7 px-3">
        <div className="rounded-2xl bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-emerald-500 text-[8px] font-bold text-white">T</span>
            <span className="text-[10px] font-semibold text-neutral-500">Trydood · now</span>
          </div>
          <p className="mt-1 line-clamp-1 text-[12.5px] font-bold normal-case text-neutral-900 dark:text-neutral-50">{t.message.title || "Untitled"}</p>
          <p className="mt-0.5 line-clamp-2 text-[11.5px] normal-case leading-snug text-neutral-500">{t.message.body || "No message text"}</p>
        </div>
      </div>

      {/* Meta + action */}
      <div className="flex flex-1 flex-col gap-3.5 px-4 pb-4 pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <Pill tint="emerald">
            <Users size={9} /> {audienceText(t.audience)}
          </Pill>
          {t.push && <Pill tint="sky">Push</Pill>}
          {t.inApp !== false && <Pill tint="violet">In-app</Pill>}
          {t.message.deepLink && <Pill>Link</Pill>}
        </div>
        <button
          type="button"
          onClick={() => onUse(t)}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-400/10 py-2 text-[12px] font-semibold text-emerald-700 transition-all hover:bg-emerald-500 hover:text-white hover:shadow-[0_8px_20px_rgba(16,185,129,0.28)] dark:text-emerald-300"
        >
          Use template <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title, count, hint }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-2">
      <h3 className="text-[14px] font-bold text-neutral-900 dark:text-neutral-50">{title}</h3>
      <span className="rounded-full bg-neutral-200/70 px-1.5 text-[10.5px] font-bold text-neutral-500 dark:bg-neutral-800">{count}</span>
      {hint && <span className="text-[11px] normal-case text-neutral-400">{hint}</span>}
    </div>
  );
}

const matches = (t, q) => !q || [t.name, t.category, t.message.title, t.message.body].some((v) => (v || "").toLowerCase().includes(q));

/* Starter templates (built in) + the admin's saved ones. "Use" loads the
 * message and channels into Compose — and, for starters, their audience. */
export default function TemplatesTab({ templates, onUse, onRemove }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState("all");
  const q = query.trim().toLowerCase();

  const starters = useMemo(() => STARTER_TEMPLATES.filter((t) => matches(t, q)), [q]);
  const saved = useMemo(() => templates.filter((t) => matches(t, q)), [templates, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTabs
          value={show}
          onChange={setShow}
          tabs={[
            { key: "all", label: "All", badge: STARTER_TEMPLATES.length + templates.length },
            { key: "starter", label: "Starter", badge: STARTER_TEMPLATES.length },
            { key: "saved", label: "Saved", badge: templates.length },
          ]}
        />
        <div className="relative sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" className={`${inputClass} rounded-full pl-9`} />
        </div>
      </div>

      {show !== "saved" && (
        <section>
          <SectionTitle title="Starter templates" count={starters.length} hint="Ready to send — tweak anything after you pick one" />
          {starters.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {starters.map((t) => (
                <TemplateCard key={t.id} template={t} onUse={onUse} />
              ))}
            </div>
          ) : (
            <p className="text-[12px] normal-case text-neutral-400">No starter matches "{query}".</p>
          )}
        </section>
      )}

      {show !== "starter" && (
        <section>
          <SectionTitle title="Your templates" count={saved.length} hint="Saved from Compose" />
          {saved.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {saved.map((t) => (
                <TemplateCard key={t.id} template={t} onUse={onUse} onRemove={onRemove} />
              ))}
            </div>
          ) : (
            <GlassCard className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                <BookmarkPlus size={20} />
              </span>
              <p className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200">{q ? "No saved template matches" : "No saved templates yet"}</p>
              <p className="max-w-xs text-[11.5px] normal-case text-neutral-500">
                Write a message in Compose and tap "Save as template" — it shows up here for next time.
              </p>
            </GlassCard>
          )}
        </section>
      )}
    </div>
  );
}
