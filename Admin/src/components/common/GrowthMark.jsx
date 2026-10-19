export default function GrowthMark() {
  // Concentric "growth ring" mark — the signature brand glyph.
  return (
    <div className="relative h-8.5 w-8.5 shrink-0">
      <svg viewBox="0 0 40 40" width={34} height={34}>
        <circle
          className="animate-pulse fill-none stroke-emerald-400"
          cx="20"
          cy="20"
          r="6"
          strokeWidth="1.4"
        />
        <circle
          className="animate-pulse fill-none stroke-emerald-400 opacity-50"
          cx="20"
          cy="20"
          r="11"
          strokeWidth="1.4"
          style={{ animationDelay: "150ms" }}
        />
        <circle
          className="animate-pulse fill-none stroke-emerald-400 opacity-30"
          cx="20"
          cy="20"
          r="16"
          strokeWidth="1.4"
          style={{ animationDelay: "300ms" }}
        />
        <circle cx="20" cy="20" r="3.4" className="fill-emerald-400" />
      </svg>
    </div>
  );
}
