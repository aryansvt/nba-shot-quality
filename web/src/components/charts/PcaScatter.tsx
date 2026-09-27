"use client";

import { scaleLinear } from "d3-scale";

import { C } from "@/lib/colors";
import { useElementWidth } from "@/lib/useElementWidth";

// first two principal components, made vs missed; the point is that they overlap
export function PcaScatter({ points }: { points: [number, number, number][] }) {
  const [ref, width] = useElementWidth();
  const height = Math.max(200, Math.min(280, width * 0.7));
  const pad = 8;
  const x = scaleLinear().domain([-3.8, 5.2]).range([pad, width - pad]);
  const y = scaleLinear().domain([-3, 4.6]).range([height - pad, pad]);

  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> Made
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cool" /> Missed
        </span>
      </div>
      <div ref={ref} style={{ height: width ? height : 240 }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="PCA projection where made and missed shots overlap completely">
            <rect x={0} y={0} width={width} height={height} rx={10} fill={C.bg} />
            {/* points arrive in random order, so neither class paints over the other */}
            {points.map(([a, b, made], i) => (
              <circle key={i} cx={x(a)} cy={y(b)} r={2} fill={made ? C.accent : C.cool} fillOpacity={0.55} />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
