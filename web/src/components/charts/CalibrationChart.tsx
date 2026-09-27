"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useState } from "react";

import { TipRow, Tooltip } from "@/components/charts/Tooltip";
import { C } from "@/lib/colors";
import { int, pct } from "@/lib/format";
import { useElementWidth } from "@/lib/useElementWidth";

const M = { t: 10, r: 12, b: 40, l: 46 };

// reliability diagram: predicted vs actual make rate per decile of predictions
export function CalibrationChart({
  predicted,
  actual,
  binSize,
}: {
  predicted: number[];
  actual: number[];
  binSize: number;
}) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const height = Math.max(260, Math.min(width, 420));
  const iw = width - M.l - M.r;
  const ih = height - M.t - M.b;

  const x = scaleLinear().domain([0.2, 0.8]).range([0, iw]);
  const y = scaleLinear().domain([0.2, 0.8]).range([ih, 0]);
  const ticks = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const pts = predicted.map((p, i) => [p, actual[i]] as const);
  const d = line<readonly [number, number]>()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]))(pts);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" /> One tenth of the test shots
        </span>
        <span className="flex items-center gap-2">
          <span className="h-px w-4 bg-[var(--ink-3)]" /> Perfect calibration
        </span>
      </div>
      <div ref={ref} className="relative" style={{ height: width ? height : 320 }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Calibration curve close to the diagonal">
            <g transform={`translate(${M.l},${M.t})`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={0} y2={ih} stroke={C.grid} />
                  <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={C.grid} />
                  {t !== 0.3 && t !== 0.5 && t !== 0.7 && (
                    <>
                      <text x={x(t)} y={ih + 18} textAnchor="middle" className="tnum fill-ink-3 font-mono text-[10.5px]">
                        {pct(t, 0)}
                      </text>
                      <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-3 font-mono text-[10.5px]">
                        {pct(t, 0)}
                      </text>
                    </>
                  )}
                </g>
              ))}
              <line x1={x(0.2)} y1={y(0.2)} x2={x(0.8)} y2={y(0.8)} stroke={C.ink3} strokeWidth={1} />
              <path d={d ?? ""} fill="none" stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
              {pts.map(([p, a], i) => (
                <g key={i}>
                  <circle cx={x(p)} cy={y(a)} r={hover === i ? 6 : 4.5} fill={C.accent} stroke={C.surface} strokeWidth={2} />
                  <circle
                    cx={x(p)}
                    cy={y(a)}
                    r={14}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`Predicted ${pct(p)}, actual ${pct(a)}`}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              ))}
              <text x={iw / 2} y={ih + 36} textAnchor="middle" className="fill-ink-3 text-[11px]">
                Predicted make probability
              </text>
              <text transform={`translate(${-36},${ih / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-3 text-[11px]">
                Share that actually went in
              </text>
            </g>
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={M.l + x(pts[hover][0])} y={M.t + y(pts[hover][1])} width={width}>
            <TipRow label="predicted" value={pct(pts[hover][0])} />
            <TipRow label="went in" value={pct(pts[hover][1])} />
            <div className="mt-1 text-ink-3">about {int(binSize)} shots</div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
