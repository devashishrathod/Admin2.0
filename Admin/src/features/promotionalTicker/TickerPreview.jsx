import { Image as ImageIcon, Megaphone } from "lucide-react";

/* -------------------------------------------------------------------------
 * TickerPreview — the ticker strip as the customer app shows it: icon +
 * title items scrolling right → left on the green strip.
 *   items: [{ key, title, icon }] in display order
 *   mode:  "auto"  — always scrolls, pauses on hover (page / form preview)
 *          "hover" — still until its .ticker-card is hovered (grid cards)
 *   size:  "md" | "sm"
 * The row is the item list repeated (at least 4 entries so a single short
 * ticker still fills the strip) and then doubled; the CSS moves it by half
 * for a seamless loop (index.css, .ticker-marquee).
 * ---------------------------------------------------------------------- */

const MIN_PER_HALF = 4;

export default function TickerPreview({ items, mode = "auto", size = "md", emptyText = "No ticker to preview", className = "" }) {
  const small = size === "sm";
  const strip = `ticker-strip relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white ${
    small ? "rounded-xl py-1.5" : "rounded-2xl py-2.5"
  } ${className}`;

  if (!items.length) {
    return (
      <div className={`${strip} flex items-center justify-center gap-1.5 text-[12px] font-medium text-white/85`}>
        <Megaphone size={13} /> {emptyText}
      </div>
    );
  }

  const half = Array.from({ length: Math.ceil(MIN_PER_HALF / items.length) }, () => items).flat();
  const row = [...half, ...half];
  // Same reading speed whatever the text length (~0.18s per character).
  const chars = half.reduce((n, t) => n + (t.title?.length || 0) + 6, 0);
  const duration = Math.max(8, Math.round(chars * 0.18));

  return (
    <div className={strip} aria-label={`Ticker preview: ${items.map((t) => t.title).join(", ")}`}>
      {/* Soft fade at both edges, like the app's strip */}
      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-emerald-500 to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-teal-500 to-transparent" />
      <div className="ticker-marquee flex w-max items-center" data-mode={mode} style={{ "--ticker-duration": `${duration}s` }} aria-hidden="true">
        {row.map((t, i) => (
          <span key={`${t.key}-${i}`} className={`flex shrink-0 items-center gap-2 font-semibold ${small ? "px-3 text-[11.5px]" : "px-4 text-[13px]"}`}>
            <span
              className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30 ${small ? "h-5 w-5" : "h-6 w-6"}`}
            >
              {t.icon ? <img src={t.icon} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={small ? 10 : 12} />}
            </span>
            <span className="whitespace-nowrap">{t.title}</span>
            <span className={`h-1 w-1 shrink-0 rounded-full bg-white/60 ${small ? "ml-3" : "ml-4"}`} />
          </span>
        ))}
      </div>
    </div>
  );
}
