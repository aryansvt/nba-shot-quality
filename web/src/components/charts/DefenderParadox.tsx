"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { DEFENDER_RAMP } from "@/lib/colors";
import { int, pct } from "@/lib/format";
import type { Context } from "@/lib/types";

type Panel = { label: string; cells: { band: string; fg: number; n: number }[] };

// small multiples: fg% by defender distance, overall and inside each distance group
export function DefenderParadox({ defender }: { defender: Context["defender"] }) {
  const [hover, setHover] = useState<string | null>(null);
  const panels: Panel[] = [
    { label: "All shots", cells: defender.bands.map((b) => ({ band: b.label, fg: b.fg, n: b.n })) },
    ...defender.by_distance.map((g) => ({ label: g.label === "22+ ft" ? "22+ ft" : g.label, cells: g.cells })),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="text-ink-3">Closest defender</span>
        {defender.bands.map((b, i) => (
          <span key={b.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: DEFENDER_RAMP[i] }} />
            {b.label.replace("-", "–")}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {panels.map((p, pi) => (
          <figure
            key={p.label}
            className={`rounded-xl border p-3 ${pi === 0 ? "col-span-2 border-line-strong sm:col-span-1" : "border-line"}`}
          >
            <figcaption className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">{p.label}</figcaption>
            <div className="relative flex h-32 items-end gap-1.5 border-b border-[var(--axis)]">
              {p.cells.map((c, i) => {
                const id = `${p.label}-${c.band}`;
                return (
                  <div
                    key={c.band}
                    className="relative flex h-full flex-1 items-end"
                    tabIndex={0}
                    aria-label={`${p.label}, defender ${c.band}: ${pct(c.fg)} on ${int(c.n)} shots`}
                    onPointerEnter={() => setHover(id)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(id)}
                    onBlur={() => setHover(null)}
                  >
                    <motion.div
                      className="w-full rounded-t-[4px]"
                      style={{ background: DEFENDER_RAMP[i], opacity: hover && hover !== id ? 0.55 : 1 }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${c.fg * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: pi * 0.06 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    />
                    {hover === id && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-line-strong bg-[#0d1117] px-2 py-1 text-[11px]">
                        <span className="tnum font-semibold text-ink">{pct(c.fg)}</span>
                        <span className="ml-1 text-ink-3">{int(c.n)} shots</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="tnum mt-2 flex justify-between font-mono text-[11px] text-ink-2">
              <span>{pct(p.cells[0].fg, 0)}</span>
              <span className="text-ink-3">→</span>
              <span className="text-ink">{pct(p.cells[p.cells.length - 1].fg, 0)}</span>
            </div>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-3">Bars share one 0–100% scale. First and last numbers: tightest vs most open.</p>
    </div>
  );
}
