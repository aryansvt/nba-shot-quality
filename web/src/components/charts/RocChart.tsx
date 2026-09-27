"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { motion } from "motion/react";
import { useState } from "react";

import { TipRow, Tooltip } from "@/components/charts/Tooltip";
import { C } from "@/lib/colors";
import { useElementWidth } from "@/lib/useElementWidth";
import type { Roc } from "@/lib/types";

const M = { t: 10, r: 12, b: 40, l: 46 };

export function RocChart({ data, headline }: { data: Roc; headline: string }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const height = Math.max(260, Math.min(width, 420));
  const iw = width - M.l - M.r;
  const ih = height - M.t - M.b;

  const x = scaleLinear().domain([0, 1]).range([0, iw]);
  const y = scaleLinear().domain([0, 1]).range([ih, 0]);
  const path = (tpr: number[]) =>
    line<number>()
      .x((_, i) => x(data.fpr[i]))
      .y((d) => y(d))(tpr) ?? "";

  const head = data.curves.find((c) => c.name === headline)!;
  const others = data.curves.filter((c) => c.name !== headline);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  // snap the pointer to the nearest fpr on the shared grid
  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const f = x.invert(e.clientX - rect.left);
    let best = 0;
    data.fpr.forEach((v, i) => {
      if (Math.abs(v - f) < Math.abs(data.fpr[best] - f)) best = i;
    });
    setHover(best);
  }

  const labelIdx = data.fpr.findIndex((f) => f >= 0.42);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-4 rounded bg-accent" /> {headline}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-4 rounded bg-neutral" /> Other {others.length} models
        </span>
        <span className="flex items-center gap-2">
          <span className="h-px w-4 bg-[var(--axis)]" /> Chance
        </span>
      </div>
      <div ref={ref} className="relative" style={{ height: width ? height : 320 }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="ROC curves for all seven models, nearly identical">
            <g transform={`translate(${M.l},${M.t})`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={0} y2={ih} stroke={C.grid} />
                  <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={C.grid} />
                  <text x={x(t)} y={ih + 18} textAnchor="middle" className="tnum fill-ink-3 font-mono text-[10.5px]">
                    {t}
                  </text>
                  <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-3 font-mono text-[10.5px]">
                    {t}
                  </text>
                </g>
              ))}
              <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={C.axis} />
              {others.map((c) => (
                <path key={c.name} d={path(c.tpr)} fill="none" stroke={C.neutral} strokeWidth={1.5} strokeLinejoin="round" />
              ))}
              <motion.path
                d={path(head.tpr)}
                fill="none"
                stroke={C.accent}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
              />
              {labelIdx > 0 && (
                <text
                  x={x(data.fpr[labelIdx]) + 8}
                  y={y(head.tpr[labelIdx]) + 18}
                  className="fill-ink text-[12px] font-semibold"
                >
                  AUC {head.auc.toFixed(3)}
                </text>
              )}
              <text x={iw / 2} y={ih + 36} textAnchor="middle" className="fill-ink-3 text-[11px]">
                False positive rate (misses called makes)
              </text>
              <text transform={`translate(${-36},${ih / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-3 text-[11px]">
                True positive rate (makes caught)
              </text>
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={x(data.fpr[hover])} x2={x(data.fpr[hover])} y1={0} y2={ih} stroke={C.ink3} strokeWidth={1} />
                  <circle cx={x(data.fpr[hover])} cy={y(head.tpr[hover])} r={4.5} fill={C.accent} stroke={C.surface} strokeWidth={2} />
                </g>
              )}
              <rect
                width={iw}
                height={ih}
                fill="transparent"
                onPointerMove={onMove}
                onPointerLeave={() => setHover(null)}
              />
            </g>
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={M.l + x(data.fpr[hover])} y={M.t + ih / 2} width={width}>
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
              FPR {data.fpr[hover].toFixed(3)} · TPR
            </div>
            {[head, ...others]
              .map((c) => ({ c, v: c.tpr[hover] }))
              .sort((a, b) => b.v - a.v)
              .map(({ c, v }) => (
                <TipRow key={c.name} color={c.name === headline ? C.accent : C.neutral} label={c.name} value={v.toFixed(3)} />
              ))}
          </Tooltip>
        )}
      </div>
    </div>
  );
}
