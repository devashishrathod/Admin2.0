import { TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { compactInr } from "../../utils/overviewStats";
import { FIN_SERIES, FIN_CHART, SPAN, pctOf, fullInr as inr2 } from "../../utils/financeOverview";

/* -------------------------------------------------------------------------
 * Building blocks of the finance overviews (Transactions, Refunds, Refund
 * Requests, Settlements) so the pages read as one system — and as the
 * Dashboard does: frosted-glass bento cards on one 12-column grid, kept
 * compact. OverviewShell gives the section its name + scope line; every
 * card takes a `className` for its grid span. Every chart has its values
 * written out beside it (no hover needed).
 * ---------------------------------------------------------------------- */

// Same glass card as the Dashboard (Dashbaord.jsx glassClass), tighter padding.
export const finCard =
  "rounded-3xl border border-white/80 bg-white/65 p-4 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30";
const innerTile = "bg-white/70 dark:bg-neutral-950/50";

/* ---- Section shell ------------------------------------------------------ */

// Named overview section ("Transactions overview") + what it covers, with
// the bento grid its cards sit on.
export function OverviewShell({ icon: Icon, title, subtitle, loading, children }) {
  return (
    // Hold the previous render at reduced opacity while refetching.
    <section className={`mb-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{title}</h2>
          {subtitle && <p className="truncate text-[11.5px] text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-12">{children}</div>
    </section>
  );
}

/* ---- KPI tile ----------------------------------------------------------- */

// ▲/▼ change. `invert` = going up is bad (e.g. refund requests).
export function Trend({ value, suffix = "%", invert = false }) {
  if (value === undefined) return null;
  if (value === null)
    return <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-neutral-500 dark:bg-neutral-800">New</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
        good ? "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      <Icon size={10} /> {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

const TILE_TINTS = {
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
};

// Dashboard StatCard look, compact. `highlight` = the green gradient lead tile.
export function KpiTile({ icon: Icon, tint = "emerald", label, value, note, trend, trendSuffix, invert, highlight = false, className = SPAN.kpi }) {
  const muted = highlight ? "text-neutral-900/70 dark:text-neutral-300" : "text-neutral-500";
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden p-3.5 ${className} ${
        highlight
          ? "rounded-3xl border border-white/80 bg-gradient-to-br from-emerald-200/80 via-emerald-100/70 to-white/60 shadow-[0_8px_30px_rgba(16,185,129,0.15)] backdrop-blur-xl dark:border-emerald-400/10 dark:from-emerald-500/30 dark:via-emerald-600/10 dark:to-neutral-900/60"
          : finCard
      }`}
    >
      {highlight && <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />}
      <div className="relative flex items-center justify-between gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            highlight ? "bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300" : TILE_TINTS[tint]
          }`}
        >
          <Icon size={15} />
        </span>
        <Trend value={trend} suffix={trendSuffix} invert={invert} />
      </div>
      <p className={`relative mt-2.5 truncate text-[11.5px] font-medium ${muted}`}>{label}</p>
      <p title={String(value)} className="relative truncate text-[19px] font-bold leading-tight tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50">
        {value}
      </p>
      {note && <p className={`relative mt-0.5 truncate text-[11px] ${muted}`}>{note}</p>}
    </div>
  );
}

/* ---- Card header -------------------------------------------------------- */

export function CardTitle({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
          {Icon && <Icon size={14} className="shrink-0 text-emerald-500" />}
          {title}
        </p>
        {subtitle && <p className="mt-0.5 truncate text-[11px] text-neutral-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export const FinEmpty = ({ children }) => <p className="flex flex-1 items-center justify-center py-6 text-center text-[12px] text-neutral-500">{children}</p>;

/* ---- Daily bars --------------------------------------------------------- */

function DayTip({ active, payload, money, countLabel }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-[12px] shadow-lg ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
      <p className="font-semibold text-neutral-900 dark:text-neutral-50">{d.label}</p>
      <p className="text-neutral-600 dark:text-neutral-300">
        {money ? `${inr2(d.value)} · ` : ""}
        {d.count} {countLabel}
      </p>
    </div>
  );
}

// series = dailySeries(...) — { daily, total, best }.
export function DailyBarsCard({ icon, title, subtitle, series, isDark, money = true, countLabel = "items", emptyText, className = SPAN.chart }) {
  const c = FIN_CHART[isDark ? "dark" : "light"];
  const days = series.daily.length;
  const fmt = money ? compactInr : (n) => Math.round(n).toLocaleString("en-IN");
  return (
    <div className={`${finCard} flex h-full flex-col ${className}`}>
      <CardTitle
        icon={icon}
        title={title}
        subtitle={subtitle}
        right={
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-bold leading-none tabular-nums text-neutral-900 dark:text-neutral-50">{money ? inr2(series.total) : fmt(series.total)}</p>
            {series.best?.value > 0 && (
              <p className="mt-1 text-[10.5px] text-neutral-500">
                Best {series.best.label} · {fmt(series.best.value)}
              </p>
            )}
          </div>
        }
      />
      {series.total > 0 ? (
        <div className="min-h-[150px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.daily} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: 10 }} axisLine={false} tickLine={false} interval={days > 31 ? 6 : days > 14 ? 2 : 1} />
              <YAxis tickFormatter={fmt} tick={{ fill: c.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={46} allowDecimals={false} />
              <Tooltip cursor={{ fill: c.grid, opacity: 0.6 }} content={<DayTip money={money} countLabel={countLabel} />} />
              <Bar dataKey="value" fill={FIN_SERIES[isDark ? "dark" : "light"]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <FinEmpty>{emptyText}</FinEmpty>
      )}
    </div>
  );
}

/* ---- Status donut ------------------------------------------------------- */

function SliceTip({ active, payload, money }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="whitespace-nowrap rounded-xl bg-white px-3 py-2 text-[12px] shadow-lg ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
      <p className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-50">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}
      </p>
      <p className="text-neutral-600 dark:text-neutral-300">
        {s.count}
        {money ? ` · ${inr2(s.amount)}` : ""}
      </p>
    </div>
  );
}

// parts = [{ key, label, count, amount?, color, icon }]. Donut with the
// total in the middle + a compact row per part (icon, label, count, %);
// amounts are in the hover tip and the row's title.
export function DonutCard({ icon, title, subtitle, parts, total, centerNote, isDark, money = true, emptyText, className = SPAN.side }) {
  const slices = parts.filter((p) => p.count > 0);
  return (
    <div className={`${finCard} flex h-full flex-col ${className}`}>
      <CardTitle icon={icon} title={title} subtitle={subtitle} />
      {total ? (
        <>
          <div className="relative mx-auto h-[100px] w-[100px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={34}
                  outerRadius={48}
                  paddingAngle={slices.length > 1 ? 3 : 0}
                  cornerRadius={4}
                  stroke={FIN_CHART[isDark ? "dark" : "light"].surface}
                  strokeWidth={1}
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
                {/* Above the centre label and free to leave the small donut box,
                    so the tip never sits under / over the total text. */}
                <Tooltip
                  content={<SliceTip money={money} />}
                  allowEscapeViewBox={{ x: true, y: true }}
                  offset={18}
                  wrapperStyle={{ zIndex: 20, pointerEvents: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
              <p className="text-[17px] font-bold leading-none tabular-nums text-neutral-900 dark:text-neutral-50">{total}</p>
              {centerNote && <p className="mt-0.5 max-w-[64px] truncate text-[9.5px] text-neutral-500">{centerNote}</p>}
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {parts.map((s) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.key}
                  title={money && s.amount != null ? `${s.label}: ${inr2(s.amount)}` : s.label}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-1 text-[11.5px] ${innerTile}`}
                >
                  {Icon && <Icon size={12} className="shrink-0" style={{ color: s.color }} />}
                  <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">{s.label}</span>
                  <span className="font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{s.count}</span>
                  <span className="w-8 text-right text-[10px] tabular-nums text-neutral-400">{pctOf(s.count, total)}%</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <FinEmpty>{emptyText}</FinEmpty>
      )}
    </div>
  );
}

/* ---- State rows (split bar + rows with amounts) ------------------------- */

// parts = [{ key, label, count, amount, color, icon }]; total = count base.
export function StateRowsCard({ icon, title, subtitle, parts, total, emptyText, className = SPAN.side }) {
  const shown = parts.filter((p) => p.count > 0);
  return (
    <div className={`${finCard} flex h-full flex-col ${className}`}>
      <CardTitle icon={icon} title={title} subtitle={subtitle} />
      {total ? (
        <>
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
            {shown.map((p) => (
              <div
                key={p.key}
                title={`${p.label}: ${p.count}`}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(p.count / total) * 100}%`, backgroundColor: p.color }}
              />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {parts.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.key} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${innerTile}`}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${p.color}1a`, color: p.color }}>
                    <Icon size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{p.label}</p>
                    <p className="truncate text-[12.5px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
                      {p.amount != null ? inr2(p.amount) : p.count}
                    </p>
                  </div>
                  {p.amount != null && <span className="text-[11px] font-semibold tabular-nums text-neutral-500">{p.count}</span>}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <FinEmpty>{emptyText}</FinEmpty>
      )}
    </div>
  );
}

/* ---- Ranked list -------------------------------------------------------- */

// items = [{ name, value, sub?, logo? }] sorted by value; bars scale to
// the top item. `money` formats value as ₹.
export function RankListCard({ icon, title, subtitle, items, isDark, money = false, showLogo = false, emptyText, className = SPAN.half }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const fmt = money ? inr2 : (n) => Math.round(n).toLocaleString("en-IN");
  return (
    <div className={`${finCard} flex h-full flex-col ${className}`}>
      <CardTitle icon={icon} title={title} subtitle={subtitle} />
      {items.length ? (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={it.name}>
              <div className="mb-1 flex items-center gap-2 text-[11.5px]">
                {showLogo ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100 text-[10px] font-bold text-neutral-500 ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
                    {it.logo ? <img src={it.logo} alt="" className="h-full w-full object-cover" /> : it.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span className="w-4 shrink-0 text-center text-[10.5px] font-bold tabular-nums text-neutral-400">{i + 1}</span>
                )}
                <span className="min-w-0 flex-1 truncate capitalize text-neutral-700 dark:text-neutral-300" title={it.name}>
                  {it.name}
                </span>
                <span className="shrink-0 tabular-nums">
                  <b className="font-semibold text-neutral-900 dark:text-neutral-50">{fmt(it.value)}</b>
                  {it.sub && <span className="text-neutral-500"> · {it.sub}</span>}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/60 dark:bg-neutral-800">
                <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, backgroundColor: FIN_SERIES[isDark ? "dark" : "light"] }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <FinEmpty>{emptyText}</FinEmpty>
      )}
    </div>
  );
}
