import type { ReactNode } from "react";

// absolutely positioned readout inside a relative chart wrapper; flips to stay inside
export function Tooltip({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: ReactNode;
}) {
  const flip = x > width * 0.6;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[150px] rounded-lg border border-line-strong bg-[#0d1117]/95 px-3 py-2 text-xs shadow-2xl shadow-black/50 backdrop-blur"
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, -50%)`,
      }}
    >
      {children}
    </div>
  );
}

// value-first tooltip row with a short line key
export function TipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {color && <span className="h-[2px] w-3 shrink-0 rounded" style={{ background: color }} />}
      <span className="tnum font-semibold text-ink">{value}</span>
      <span className="text-ink-3">{label}</span>
    </div>
  );
}
