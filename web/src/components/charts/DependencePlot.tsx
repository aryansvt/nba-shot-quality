"use client";

import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { useMemo, useState } from "react";

import { TipRow, Tooltip } from "@/components/charts/Tooltip";
import { Segmented } from "@/components/ui/Segmented";
import { C } from "@/lib/colors";
import { signed } from "@/lib/format";
import type { Shap } from "@/lib/types";
import { useElementWidth } from "@/lib/useElementWidth";

const M = { t: 12, r: 14, b: 42, l: 50 };

// what each curve says, written from the exported trend lines
const SHORT: Record<string, string> = {
  DEF_DIST_PER_SHOT_DIST: "Gap ratio",
  SHOT_DIST: "Distance",
  LOG_TOUCH_TIME: "Touch time",
  CLOSE_DEF_DIST: "Defender",
};

const CAPTIONS: Record<string, string> = {
  DEF_DIST_PER_SHOT_DIST:
    "Below about 0.4 (defender closer than 40% of the shot's length) this pushes toward a miss. Above it the push climbs fast: a defender as far away as the shot is long is worth roughly +0.8.",
  SHOT_DIST:
    "Inside 4 ft is a strong plus. It fades fast after that, turns negative around 7 ft and keeps sliding, with a small lift around 22 to 23 ft where corner threes live.",
  LOG_TOUCH_TIME:
    "Quick releases around half a second get the biggest boost. Past about 1.5 s of holding the ball it turns negative and stays there. Readings near zero, which include clipped sensor errors, get a small negative push.",
  CLOSE_DEF_DIST:
    "On its own, defender distance matters less than you'd guess: about −0.1 when tight, +0.1 at 6 to 8 ft, with the big gains only for wide-open looks. Most of its effect runs through the ratio above.",
};

export function DependencePlot({ data }: { data: Shap["dependence"] }) {
  const [feature, setFeature] = useState(data[0].feature);
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const d = data.find((f) => f.feature === feature)!;

  const height = width < 500 ? 280 : 340;
  const iw = width - M.l - M.r;
  const ih = height - M.t - M.b;

  const pts = useMemo(
    () =>
      d.x
        .map((x, i) => [x, d.shap[i]] as const)
        .filter(([x]) => x >= d.domain[0] && x <= d.domain[1]),
    [d],
  );
  const trend = d.trend.x.map((x, i) => [x, d.trend.mean[i]] as const).filter(([x]) => x <= d.domain[1]);

  const x = scaleLinear().domain(d.domain).range([0, iw]).nice();
  const ys = pts.map((p) => p[1]);
  const y = scaleLinear()
    .domain([Math.min(-0.5, ...ys), Math.max(0.5, ...ys)])
    .range([ih, 0])
    .nice();
  const trendPath = line<readonly [number, number]>()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]))
    .curve(curveMonotoneX)(trend);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const v = x.invert(e.clientX - rect.left);
    let best = 0;
    trend.forEach((t, i) => {
      if (Math.abs(t[0] - v) < Math.abs(trend[best][0] - v)) best = i;
    });
    setHover(best);
  }

  const unit = d.unit === "ratio" ? "" : ` ${d.unit}`;

  return (
    <div>
      <Segmented
        label="Feature"
        options={data.map((f) => ({ value: f.feature, label: SHORT[f.feature] ?? f.label }))}
        value={feature}
        onChange={(v) => {
          setFeature(v);
          setHover(null);
        }}
      />
      <div className="mt-4 mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cool-soft opacity-70" /> One test shot
        </span>
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-4 rounded bg-accent" /> Binned average
        </span>
      </div>
      <div ref={ref} className="relative" style={{ height: width ? height : 320 }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`SHAP dependence for ${d.label}`}>
            <g transform={`translate(${M.l},${M.t})`}>
              {y.ticks(5).map((t) => (
                <g key={t}>
                  <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.ink3 : C.grid} />
                  <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-3 font-mono text-[10.5px]">
                    {signed(t, 1)}
                  </text>
                </g>
              ))}
              {x.ticks(width < 500 ? 5 : 8).map((t) => (
                <text key={t} x={x(t)} y={ih + 18} textAnchor="middle" className="tnum fill-ink-3 font-mono text-[10.5px]">
                  {t}
                </text>
              ))}
              <g>
                {pts.map(([px, py], i) => (
                  <circle key={i} cx={x(px)} cy={y(py)} r={2.2} fill={C.ink2} opacity={0.22} />
                ))}
              </g>
              <path d={trendPath ?? ""} fill="none" stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
              <text x={iw} y={y(0) - 6} textAnchor="end" className="fill-ink-3 text-[10.5px]">
                pushes toward a make ↑
              </text>
              <text x={iw} y={y(0) + 14} textAnchor="end" className="fill-ink-3 text-[10.5px]">
                pushes toward a miss ↓
              </text>
              <text x={iw / 2} y={ih + 36} textAnchor="middle" className="fill-ink-3 text-[11px]">
                {d.label}
                {d.unit && d.unit !== "ratio" ? ` (${d.unit})` : ""}
              </text>
              <text transform={`translate(${-40},${ih / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-3 text-[11px]">
                SHAP value (log-odds)
              </text>
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={x(trend[hover][0])} x2={x(trend[hover][0])} y1={0} y2={ih} stroke={C.ink3} />
                  <circle cx={x(trend[hover][0])} cy={y(trend[hover][1])} r={4.5} fill={C.accent} stroke={C.surface} strokeWidth={2} />
                </g>
              )}
              <rect width={Math.max(0, iw)} height={Math.max(0, ih)} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
            </g>
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={M.l + x(trend[hover][0])} y={M.t + y(trend[hover][1])} width={width}>
            <TipRow color={C.accent} label="average push" value={signed(trend[hover][1], 2)} />
            <div className="text-ink-3">
              near {trend[hover][0].toFixed(2)}
              {unit}
            </div>
          </Tooltip>
        )}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">{CAPTIONS[d.feature]}</p>
    </div>
  );
}
