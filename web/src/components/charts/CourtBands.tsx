"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { C } from "@/lib/colors";
import { int, pct, pts } from "@/lib/format";
import type { Context } from "@/lib/types";

// court in feet: x across (-25..25), y up from the baseline, hoop at y = 5.25
const HOOP_Y = 5.25;
const VIEW_H = 31;
const X = (x: number) => x + 25;
const Y = (y: number) => VIEW_H - y;
const LINE = 0.14; // stroke width in feet

function ring(r1: number, r2: number) {
  const cx = X(0);
  const cy = Y(HOOP_Y);
  const circle = (r: number) =>
    r <= 0 ? "" : `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  return `${circle(r2)} ${circle(r1)}`;
}

// three point line: straight corners at 22 ft, 23.75 ft arc
const cornerY = HOOP_Y + Math.sqrt(23.75 ** 2 - 22 ** 2);
const COURT_LINES = [
  `M ${X(-25)} ${Y(0)} H ${X(25)}`, // baseline
  `M ${X(-8)} ${Y(0)} V ${Y(19)} H ${X(8)} V ${Y(0)}`, // lane
  `M ${X(-6)} ${Y(19)} A 6 6 0 0 1 ${X(6)} ${Y(19)}`, // free throw circle
  `M ${X(-4)} ${Y(HOOP_Y)} A 4 4 0 0 1 ${X(4)} ${Y(HOOP_Y)}`, // restricted arc
  `M ${X(-22)} ${Y(0)} V ${Y(cornerY)} A 23.75 23.75 0 0 1 ${X(22)} ${Y(cornerY)} V ${Y(0)}`, // three
  `M ${X(-3)} ${Y(4)} H ${X(3)}`, // backboard
];

// warm above the league average, cool below, stronger the further away
function tint(fg: number, league: number) {
  const d = fg - league;
  return { color: d >= 0 ? C.accent : C.cool, opacity: 0.1 + 0.75 * Math.min(1, Math.abs(d) / 0.25) };
}

export function CourtBands({ zones, league }: { zones: Context["zones"]; league: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const bands = zones.map((z) => ({ ...z, outer: z.max_ft ?? 40 }));

  return (
    <div>
      <svg
        viewBox={`0 0 50 ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-label="Half court with distance rings shaded by field goal percentage relative to the league average"
      >
        <defs>
          <clipPath id="court-clip">
            <rect x="0" y="0" width="50" height={VIEW_H} />
          </clipPath>
        </defs>
        <g clipPath="url(#court-clip)">
          {bands.map((b, i) => (
            <motion.path
              key={b.zone}
              d={ring(b.min_ft, b.outer)}
              fillRule="evenodd"
              fill={tint(b.fg, league).color}
              stroke="var(--surface)"
              strokeWidth={0.2}
              initial={{ opacity: 0 }}
              animate={{ opacity: tint(b.fg, league).opacity * (hover && hover !== b.zone ? 0.3 : 1) }}
              transition={{ duration: 0.5, delay: hover === null ? 0.4 + i * 0.1 : 0 }}
              onPointerEnter={() => setHover(b.zone)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </g>
        <g pointerEvents="none">
          {COURT_LINES.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={LINE}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.1 + i * 0.07, ease: [0.65, 0, 0.35, 1] }}
            />
          ))}
          <circle cx={X(0)} cy={Y(HOOP_Y)} r={0.75} fill="none" stroke="var(--ink)" strokeWidth={LINE * 1.6} />
        </g>
      </svg>

      <ul className="mt-5 grid grid-cols-2 gap-x-5 sm:grid-cols-3" aria-label="Field goal percentage by distance">
        {bands.map((b) => (
          <li
            key={b.zone}
            tabIndex={0}
            onPointerEnter={() => setHover(b.zone)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(b.zone)}
            onBlur={() => setHover(null)}
            className={`border-t border-line py-2.5 outline-none transition-opacity ${
              hover && hover !== b.zone ? "opacity-40" : ""
            }`}
          >
            <div className="flex items-center gap-2 text-[13px] text-ink-2">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: tint(b.fg, league).color, opacity: Math.max(0.35, tint(b.fg, league).opacity) }}
              />
              <span className="truncate">{b.label}</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="tnum text-[15px] font-semibold text-ink">{pct(b.fg)}</span>
              <span className="tnum font-mono text-[11px] text-ink-3">{pts(b.fg - league)}</span>
            </div>
            <div className="font-mono text-[10.5px] text-ink-3">
              {b.max_ft ? `${b.min_ft}–${b.max_ft} ft` : `${b.min_ft}+ ft`} · {int(b.n)}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Rings are by distance only: the data has no x/y shot locations, so corners and wings are pooled. Colors and
        the small numbers compare each ring to the {pct(league)} league average.
      </p>
    </div>
  );
}
