"use client";

import { animate, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { C, fgColor } from "@/lib/colors";
import { int, pct, pts } from "@/lib/format";
import { makePredictor, supportAt, type ShotInput } from "@/lib/grid";
import type { Context, GridAxis, PredictorGrid } from "@/lib/types";
import { useElementWidth } from "@/lib/useElementWidth";

const SLIDERS: { key: GridAxis; label: string; min: number; max: number; step: number; unit: string; hint: string }[] = [
  { key: "shot_dist", label: "Shot distance", min: 0, max: 30, step: 0.5, unit: "ft", hint: "Threes start at 22 ft in the corners" },
  { key: "def_dist", label: "Closest defender", min: 0, max: 15, step: 0.5, unit: "ft", hint: "6+ ft counts as open" },
  { key: "shot_clock", label: "Shot clock", min: 0, max: 24, step: 1, unit: "s", hint: "4 s or less is late clock" },
  { key: "touch_time", label: "Touch time", min: 0, max: 12, step: 0.5, unit: "s", hint: "How long the shooter held the ball" },
  { key: "dribbles", label: "Dribbles", min: 0, max: 12, step: 1, unit: "", hint: "0 = catch and shoot" },
];

const PRESETS: { label: string; v: ShotInput }[] = [
  { label: "Catch-and-shoot three", v: { shot_dist: 24, def_dist: 5, shot_clock: 14, touch_time: 1, dribbles: 0 } },
  { label: "Wide-open corner three", v: { shot_dist: 22.5, def_dist: 9, shot_clock: 12, touch_time: 1, dribbles: 0 } },
  { label: "Contested layup", v: { shot_dist: 2, def_dist: 1.5, shot_clock: 11, touch_time: 3, dribbles: 3 } },
  { label: "Cut to the rim", v: { shot_dist: 1, def_dist: 4, shot_clock: 15, touch_time: 0.5, dribbles: 0 } },
  { label: "Late-clock pull-up", v: { shot_dist: 19, def_dist: 3, shot_clock: 2, touch_time: 6, dribbles: 7 } },
  { label: "Iso mid-range", v: { shot_dist: 15, def_dist: 2.5, shot_clock: 8, touch_time: 8, dribbles: 9 } },
];

const SPREAD = 0.3;

function zoneOf(d: number) {
  if (d <= 4) return "Restricted area";
  if (d <= 8) return "Paint";
  if (d <= 16) return "Short mid-range";
  if (d <= 22) return "Long mid-range";
  if (d <= 26) return "Three";
  return "Deep three";
}

export function Predictor({ context }: { context: Context }) {
  const [grid, setGrid] = useState<PredictorGrid | null>(null);
  const [error, setError] = useState(false);
  const [input, setInput] = useState<ShotInput>(PRESETS[0].v);

  useEffect(() => {
    let alive = true;
    fetch("/data/predictor_grid.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((g: PredictorGrid) => alive && setGrid(g))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const predict = useMemo(() => (grid ? makePredictor(grid) : null), [grid]);
  const p = predict ? predict(input) : null;
  const league = context.league_fg;
  const foot = context.by_distance[Math.min(30, Math.floor(input.shot_dist))];
  const set = useCallback((k: GridAxis, v: number) => setInput((s) => ({ ...s, [k]: v })), []);

  const zone = zoneOf(input.shot_dist);
  const flags = [
    input.shot_dist >= 22 ? "3PT" : "2PT",
    zone === "Three" ? null : zone,
    input.dribbles === 0 ? "Catch and shoot" : null,
    input.shot_clock <= 4 ? "Late clock" : null,
    input.def_dist >= 6 ? "Open" : input.def_dist < 2 ? "Tight" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* readout: first on phones and sticky so it stays visible while sliding */}
      <div className="sticky top-[58px] z-20 lg:static lg:col-span-7 lg:col-start-6 lg:row-start-1">
        <div className="rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Make probability</p>
              <p className="mt-1 font-display text-[clamp(3.2rem,9vw,5.5rem)] font-semibold leading-[0.9] text-ink" aria-live="polite">
                {p === null ? "–" : <AnimatedPct value={p} />}
              </p>
            </div>
            <div className="min-w-0 flex-1 pb-1 sm:min-w-[240px]">
              {p !== null && (
                <>
                  <Gauge p={p} reference={foot.fg} />
                  <p className="mt-2 text-sm text-ink-2">
                    <span className="tnum font-semibold text-ink">{pts(p - foot.fg)} pts</span> vs the {pct(foot.fg)} that
                    all real shots from {foot.ft === 30 ? "30+" : foot.ft} ft made
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
            {flags.map((f) => (
              <span key={f} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-2">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-5 lg:row-span-2 lg:row-start-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Start from a common look</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((pr) => {
            const active = SLIDERS.every((s) => pr.v[s.key] === input[s.key]);
            return (
              <button
                key={pr.label}
                type="button"
                aria-pressed={active}
                onClick={() => setInput(pr.v)}
                className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  active ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
                }`}
              >
                {pr.label}
              </button>
            );
          })}
        </div>

        <div className="mt-7 space-y-5">
          {SLIDERS.map((s) => {
            const v = input[s.key];
            const pctFill = ((v - s.min) / (s.max - s.min)) * 100;
            return (
              <div key={s.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={`sl-${s.key}`} className="text-[14px] font-medium text-ink">
                    {s.label}
                  </label>
                  <span className="tnum font-mono text-[13px] text-ink">
                    {s.step < 1 ? v.toFixed(1) : v}
                    {s.unit && <span className="text-ink-3"> {s.unit}</span>}
                  </span>
                </div>
                <input
                  id={`sl-${s.key}`}
                  type="range"
                  className="slider mt-1"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={v}
                  aria-describedby={`hint-${s.key}`}
                  style={{ ["--pct" as string]: `${pctFill}%` }}
                  onChange={(e) => set(s.key, Number(e.target.value))}
                />
                <p id={`hint-${s.key}`} className="text-xs text-ink-3">
                  {s.hint}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-7 border-t border-line pt-5 text-xs leading-relaxed text-ink-3">
          Average shooter against an average defender. Everything else is held at typical values: 2nd quarter,
          about 6 minutes left, the shooter&apos;s 5th attempt, home and away averaged. Distance sets two vs three at
          22 ft.
        </div>
      </div>

      {/* map */}
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-7 lg:col-start-6 lg:row-start-2">
        <div className="mb-4">
          <h3 className="text-[15px] font-semibold text-ink">Distance × defender map</h3>
          <p className="mt-1 text-sm text-ink-3">
            Every distance and defender gap at the current clock, touch and dribbles. Click the map to move the shot.
          </p>
        </div>
        {error ? (
          <p className="py-16 text-center text-sm text-ink-3">Couldn&apos;t load the prediction grid.</p>
        ) : grid && predict ? (
          <Heatmap grid={grid} predict={predict} input={input} league={league} onPick={(d, g) => setInput((s) => ({ ...s, shot_dist: d, def_dist: g }))} />
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-ink-3">
            Loading 207,360 precomputed predictions…
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-ink-3">
          Predictions come from the tuned LightGBM model on a grid of about 207k points and are blended linearly in
          between. Tree models move in steps, so small slider moves can jump. Hatched cells had fewer than 25 real
          shots, so treat them as extrapolation.
        </p>
      </div>
    </div>
  );
}

function AnimatedPct({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = pct(value);
      last.current = value;
      return;
    }
    const controls = animate(last.current, value, {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = pct(v);
        last.current = v;
      },
    });
    return () => controls.stop();
  }, [value, reduced]);

  return <span ref={ref}>{pct(value)}</span>;
}

// 0-100% track with the prediction and the real fg% from that distance
function Gauge({ p, reference }: { p: number; reference: number }) {
  return (
    <div className="relative h-8" aria-hidden="true">
      <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-[var(--axis)]" />
      <div
        className="absolute left-0 top-3 h-1.5 rounded-full transition-[width] duration-300"
        style={{ width: `${p * 100}%`, background: C.accent }}
      />
      <div className="absolute top-1 h-5.5 w-px bg-ink" style={{ left: `${reference * 100}%` }} />
      <span className="tnum absolute top-[22px] -translate-x-1/2 font-mono text-[10px] text-ink-3" style={{ left: `${reference * 100}%` }}>
        all shots
      </span>
    </div>
  );
}

const NX = 61; // 0..30 ft every 0.5
const NY = 31; // 0..15 ft every 0.5

function Heatmap({
  grid,
  predict,
  input,
  league,
  onPick,
}: {
  grid: PredictorGrid;
  predict: (i: ShotInput) => number;
  input: ShotInput;
  league: number;
  onPick: (dist: number, def: number) => void;
}) {
  const [ref, width] = useElementWidth();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ d: number; g: number } | null>(null);
  const M = { t: 6, r: 8, b: 36, l: 40 };
  const height = Math.max(240, Math.round(width * 0.52));
  const iw = width - M.l - M.r;
  const ih = height - M.t - M.b;

  const { shot_clock, touch_time, dribbles } = input;
  const cells = useMemo(() => {
    const out = new Float32Array(NX * NY);
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NY; j++)
        out[i * NY + j] = predict({ shot_dist: i * 0.5, def_dist: j * 0.5, shot_clock, touch_time, dribbles });
    return out;
  }, [predict, shot_clock, touch_time, dribbles]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || iw <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(iw * dpr);
    c.height = Math.round(ih * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, iw, ih);
    // each cell is centered on its grid value so it lines up with the axes and crosshair
    const px = (d: number) => Math.max(0, Math.min(iw, (d / 30) * iw));
    const py = (g: number) => Math.max(0, Math.min(ih, ih - (g / 15) * ih));
    for (let i = 0; i < NX; i++) {
      const x0 = Math.floor(px(i * 0.5 - 0.25));
      const x1 = Math.ceil(px(i * 0.5 + 0.25));
      for (let j = 0; j < NY; j++) {
        const y0 = Math.floor(py(j * 0.5 + 0.25));
        const y1 = Math.ceil(py(j * 0.5 - 0.25));
        ctx.fillStyle = fgColor(cells[i * NY + j], league, SPREAD);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    // hatch thin-data regions
    const { dist_edges, def_edges, counts } = grid.support;
    ctx.save();
    ctx.strokeStyle = "rgba(10,13,18,0.55)";
    ctx.lineWidth = 1;
    const xs = iw / 30;
    const ys = ih / 15;
    for (let a = 0; a < dist_edges.length - 1; a++) {
      for (let b = 0; b < def_edges.length - 1; b++) {
        if (counts[a][b] >= 25) continue;
        const x0 = dist_edges[a] * xs;
        const x1 = dist_edges[a + 1] * xs;
        const y0 = ih - def_edges[b + 1] * ys;
        const y1 = ih - def_edges[b] * ys;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
        ctx.fillStyle = "rgba(10,13,18,0.35)";
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.beginPath();
        for (let k = -40; k < x1 - x0 + 40; k += 6) {
          ctx.moveTo(x0 + k, y1);
          ctx.lineTo(x0 + k + (y1 - y0), y0);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }, [cells, iw, ih, league, grid.support]);

  const fx = (d: number) => (d / 30) * iw;
  const fy = (g: number) => ih - (g / 15) * ih;

  function toData(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const d = Math.round(((e.clientX - rect.left) / iw) * 30 * 2) / 2;
    const g = Math.round(((ih - (e.clientY - rect.top)) / ih) * 15 * 2) / 2;
    return { d: Math.max(0, Math.min(30, d)), g: Math.max(0, Math.min(15, g)) };
  }

  const hoverP = hover ? predict({ shot_dist: hover.d, def_dist: hover.g, shot_clock, touch_time, dribbles }) : null;

  return (
    <div>
      <div ref={ref} className="relative" style={{ height: width ? height : 300 }}>
        {width > 0 && (
          <>
            <canvas
              ref={canvas}
              className="absolute rounded-[3px]"
              style={{ left: M.l, top: M.t, width: iw, height: ih }}
              aria-label="Heatmap of make probability by shot distance and defender distance"
              role="img"
            />
            <svg width={width} height={height} className="pointer-events-none absolute inset-0">
              <g transform={`translate(${M.l},${M.t})`}>
                {[0, 5, 10, 15, 20, 25, 30].map((t) => (
                  <text key={t} x={fx(t)} y={ih + 16} textAnchor="middle" className="tnum fill-ink-3 font-mono text-[10.5px]">
                    {t}
                  </text>
                ))}
                {[0, 5, 10, 15].map((t) => (
                  <text key={t} x={-8} y={fy(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-3 font-mono text-[10.5px]">
                    {t}
                  </text>
                ))}
                <line x1={fx(22)} x2={fx(22)} y1={0} y2={ih} stroke="rgba(255,255,255,0.35)" />
                <text x={fx(22) + 4} y={10} className="fill-ink-2 text-[10.5px]">
                  3PT
                </text>
                <text x={iw / 2} y={ih + 32} textAnchor="middle" className="fill-ink-3 text-[11px]">
                  Shot distance (ft)
                </text>
                <text transform={`translate(${-30},${ih / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-3 text-[11px]">
                  Defender (ft)
                </text>
                {/* current shot */}
                <line x1={fx(input.shot_dist)} x2={fx(input.shot_dist)} y1={0} y2={ih} stroke={C.ink} strokeOpacity={0.5} />
                <line x1={0} x2={iw} y1={fy(input.def_dist)} y2={fy(input.def_dist)} stroke={C.ink} strokeOpacity={0.5} />
                <circle cx={fx(input.shot_dist)} cy={fy(input.def_dist)} r={6} fill={C.ink} stroke={C.bg} strokeWidth={2.5} />
                {hover && <circle cx={fx(hover.d)} cy={fy(hover.g)} r={5} fill="none" stroke={C.ink} strokeWidth={1.5} />}
              </g>
            </svg>
            <div
              className="absolute cursor-crosshair"
              style={{ left: M.l, top: M.t, width: iw, height: ih }}
              onPointerMove={(e) => {
                const h = toData(e);
                setHover(h);
                if (e.buttons === 1) onPick(h.d, h.g);
              }}
              onPointerDown={(e) => {
                const h = toData(e);
                onPick(h.d, h.g);
              }}
              onPointerLeave={() => setHover(null)}
            />
            {hover && hoverP !== null && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-line-strong bg-[#0d1117]/95 px-3 py-2 text-xs shadow-2xl"
                style={{
                  left: M.l + fx(hover.d),
                  top: M.t + fy(hover.g),
                  transform: `translate(${fx(hover.d) > iw * 0.6 ? "calc(-100% - 12px)" : "12px"}, -110%)`,
                }}
              >
                <div className="tnum font-semibold text-ink">{pct(hoverP)}</div>
                <div className="text-ink-3">
                  {hover.d} ft, defender {hover.g} ft
                </div>
                <div className="text-ink-3">{int(supportAt(grid, hover.d, hover.g))} real shots nearby</div>
              </div>
            )}
          </>
        )}
      </div>
      <Legend league={league} />
    </div>
  );
}

function Legend({ league }: { league: number }) {
  const stops = Array.from({ length: 11 }, (_, i) => {
    const p = league - SPREAD + (i / 10) * 2 * SPREAD;
    return `${fgColor(p, league, SPREAD)} ${i * 10}%`;
  });
  const lo = league - SPREAD;
  const span = 2 * SPREAD;
  const marks = [0.2, league, 0.7];
  return (
    <div className="mt-4 pl-10 pr-2">
      <div className="h-2 rounded-full" style={{ background: `linear-gradient(to right, ${stops.join(",")})` }} />
      <div className="relative mt-1 h-4">
        {marks.map((m) => (
          <span
            key={m}
            className="tnum absolute -translate-x-1/2 font-mono text-[10.5px] text-ink-3"
            style={{ left: `${((m - lo) / span) * 100}%` }}
          >
            {m === league ? `${pct(m)} avg` : pct(m, 0)}
          </span>
        ))}
      </div>
    </div>
  );
}
