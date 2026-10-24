import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hourglass, StickyNote } from "lucide-react";

const CARD_W = 320;
const GAP = 8;

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

/* -------------------------------------------------------------------------
 * "RD" pill (real brand shown as coming soon) with a hover card for the
 * internal note. The card is portalled to <body> with fixed coordinates so
 * the brand card's cropped cover can't clip it; long notes scroll inside.
 * A short close delay lets the pointer move from the pill into the card.
 * ---------------------------------------------------------------------- */
export default function RdBadge({ brand, className = "", iconSize = 11 }) {
  const pillRef = useRef(null);
  const closeTimer = useRef(null);
  const [pos, setPos] = useState(null);

  const open = () => {
    clearTimeout(closeTimer.current);
    const r = pillRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(GAP, r.left), window.innerWidth - CARD_W - GAP);
    // Below the pill if there's room, otherwise above it.
    const below = window.innerHeight - r.bottom > 240;
    setPos(below ? { left, top: r.bottom + GAP } : { left, bottom: window.innerHeight - r.top + GAP });
  };
  const close = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPos(null), 120);
  };

  // A fixed card would drift away from the pill on scroll — just close it.
  useEffect(() => {
    if (!pos) return undefined;
    const hide = () => setPos(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [pos]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const note = brand.realDummyNote?.trim();

  return (
    <>
      <span ref={pillRef} onMouseEnter={open} onMouseLeave={close} className={`flex cursor-help items-center gap-1 ${className}`}>
        <Hourglass size={iconSize} />
        RD
      </span>

      {pos &&
        createPortal(
          <div
            role="tooltip"
            onMouseEnter={open}
            onMouseLeave={close}
            onClick={(e) => e.stopPropagation()}
            style={{ ...pos, width: CARD_W }}
            className="fixed z-[60] rounded-2xl border border-neutral-200 bg-white p-3.5 normal-case shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                <StickyNote size={12} />
                RD note
              </span>
              {brand.realDummyUpdatedAt && (
                <span className="text-[10.5px] text-neutral-400">{fmt(brand.realDummyUpdatedAt)}</span>
              )}
            </div>
            {note ? (
              <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-[12.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {note}
              </p>
            ) : (
              <p className="text-[12.5px] italic text-neutral-400">No note added.</p>
            )}
            <p className="mt-2.5 border-t border-neutral-100 pt-2 text-[10.5px] text-neutral-400 dark:border-neutral-800">
              Shown to customers as “Coming soon” · admins only see this note
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
