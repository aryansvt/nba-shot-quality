"use client";

import { scaleLinear, scaleSqrt } from "d3-scale";
import { useMemo, useState } from "react";

import { TipRow, Tooltip } from "@/components/charts/Tooltip";
import { Segmented } from "@/components/ui/Segmented";
import { C } from "@/lib/colors";
import { int, pct, pts } from "@/lib/format";
import type { Player } from "@/lib/types";
import { useElementWidth } from "@/lib/useElementWidth";

const Z = 1.96;
type Verdict = "over" | "under" | "noise";
const verdict = (p: Player): Verdict => (p.diff > Z * p.se ? "over" : p.diff < -Z * p.se ? "under" : "noise");
const VERDICT_COLOR: Record<Verdict, string> = { over: C.accent, under: C.cool, noise: C.neutral };

export function PlayerExplorer({ players }: { players: Player[] }) {
  const [focus, setFocus] = useState<number | null>(null);
  const ranked = useMemo(() => players.map((p, i) => ({ ...p, rank: i + 1, verdict: verdict(p) })), [players]);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-5">
        <h3 className="text-[15px] font-semibold text-ink">Actual vs expected FG%</h3>
        <p className="mt-1 text-sm text-ink-3">{int(players.length)} players with 200+ shots. Dot size is shot volume.</p>
        <Scatter players={ranked} focus={focus} setFocus={setFocus} />
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-7">
        <Table players={ranked} focus={focus} setFocus={setFocus} />
      </div>
    </div>
  );
}

type Ranked = Player & { rank: number; verdict: Verdict };

function Scatter({
  players,
  focus,
  setFocus,
}: {
  players: Ranked[];
  focus: number | null;
  setFocus: (id: number | null) => void;
}) {
  const [ref, width] = useElementWidth();
  const M = { t: 10, r: 10, b: 40, l: 44 };
  const height = Math.max(300, Math.min(width, 460));
  const iw = width - M.l - M.r;
  const ih = height - M.t - M.b;

  const lo = 0.28;
  const hi = 0.76;
  const x = scaleLinear().domain([lo, hi]).range([0, iw]);
  const y = scaleLinear().domain([lo, hi]).range([ih, 0]);
  const r = scaleSqrt().domain([200, 1400]).range([2.5, 8]).clamp(true);
  const ticks = [0.3, 0.4, 0.5, 0.6, 0.7];

  const labelled = new Set([...players.slice(0, 3), ...players.slice(-3)].map((p) => p.id));
  const focused = players.find((p) => p.id === focus);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best: Ranked | null = null;
    let bestD = 24 * 24;
    for (const p of players) {
      const d = (x(p.expected) - mx) ** 2 + (y(p.actual) - my) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    setFocus(best ? best.id : null);
  }

  return (
    <div>
      <div className="mt-4 mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <Key color={C.accent} label="Above expected, beyond noise" />
        <Key color={C.cool} label="Below, beyond noise" />
        <Key color={C.neutral} label="Within noise" />
      </div>
      <div ref={ref} className="relative" style={{ height: width ? height : 360 }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Scatter of actual versus expected field goal percentage per player">
            <g transform={`translate(${M.l},${M.t})`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={0} y2={ih} stroke={C.grid} />
                  <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={C.grid} />
                  <text x={x(t)} y={ih + 18} textAnchor="middle" className="tnum fill-ink-3 font-mono text-[10.5px]">
                    {pct(t, 0)}
                  </text>
                  <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-3 font-mono text-[10.5px]">
                    {pct(t, 0)}
                  </text>
                </g>
              ))}
              <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} stroke={C.ink3} />
              <text
                transform={`translate(${x(0.705)},${y(0.705) + 14}) rotate(-45)`}
                textAnchor="middle"
                className="fill-ink-3 text-[10.5px]"
              >
                actual = expected
              </text>
              {[...players]
                .sort((a, b) => (a.verdict === "noise" ? -1 : 0) - (b.verdict === "noise" ? -1 : 0))
                .map((p) => (
                  <circle
                    key={p.id}
                    cx={x(p.expected)}
                    cy={y(p.actual)}
                    r={r(p.shots)}
                    fill={VERDICT_COLOR[p.verdict]}
                    fillOpacity={focus && focus !== p.id ? 0.3 : p.verdict === "noise" ? 0.55 : 0.9}
                    stroke={C.surface}
                    strokeWidth={1.5}
                  />
                ))}
              {players
                .filter((p) => labelled.has(p.id))
                .map((p) => {
                  const up = p.diff > 0;
                  return (
                    <text
                      key={p.id}
                      x={x(p.expected) + (up ? -r(p.shots) - 5 : r(p.shots) + 5)}
                      y={y(p.actual)}
                      dy="0.32em"
                      textAnchor={up ? "end" : "start"}
                      className="pointer-events-none fill-ink-2 text-[11px]"
                    >
                      {p.name}
                    </text>
                  );
                })}
              {focused && (
                <circle
                  cx={x(focused.expected)}
                  cy={y(focused.actual)}
                  r={r(focused.shots) + 3}
                  fill="none"
                  stroke={C.ink}
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )}
              <text x={iw / 2} y={ih + 36} textAnchor="middle" className="fill-ink-3 text-[11px]">
                Expected FG% (average shooter, same shots)
              </text>
              <text transform={`translate(${-34},${ih / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-3 text-[11px]">
                Actual FG%
              </text>
              <rect width={Math.max(0, iw)} height={Math.max(0, ih)} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setFocus(null)} />
            </g>
          </svg>
        )}
        {focused && width > 0 && (
          <Tooltip x={M.l + x(focused.expected)} y={M.t + y(focused.actual)} width={width}>
            <div className="mb-1 font-semibold text-ink">{focused.name}</div>
            <TipRow label="actual" value={pct(focused.actual)} />
            <TipRow label="expected" value={pct(focused.expected)} />
            <TipRow color={VERDICT_COLOR[focused.verdict]} label={`± ${(Z * focused.se * 100).toFixed(1)} noise`} value={pts(focused.diff)} />
            <div className="mt-1 text-ink-3">{int(focused.shots)} shots · rank {focused.rank}</div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

type SortKey = "rank" | "shots" | "actual" | "expected";
type View = "top" | "bottom" | "all";

function Table({
  players,
  focus,
  setFocus,
}: {
  players: Ranked[];
  focus: number | null;
  setFocus: (id: number | null) => void;
}) {
  const [view, setView] = useState<View>("top");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = players;
    if (q) list = players.filter((p) => p.name.toLowerCase().includes(q));
    else if (view === "top") list = players.slice(0, 15);
    else if (view === "bottom") list = players.slice(-15);
    return [...list].sort((a, b) => (a[sort.key] - b[sort.key]) * sort.dir);
  }, [players, view, query, sort]);

  const maxAbs = 0.16;
  const bx = (v: number) => 50 + (Math.max(-maxAbs, Math.min(maxAbs, v)) / maxAbs) * 50;

  function header(key: SortKey, label: string, className = "") {
    const active = sort.key === key;
    return (
      <th className={`px-2 py-2 font-normal ${className}`} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : key === "rank" ? 1 : -1 })}
          className={`inline-flex items-center gap-1 uppercase tracking-[0.1em] ${active ? "text-ink" : "hover:text-ink"}`}
        >
          {label}
          <span className="text-[9px]">{active ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
        </button>
      </th>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Players shown"
          options={[
            { value: "top", label: "Top 15" },
            { value: "bottom", label: "Bottom 15" },
            { value: "all", label: `All ${players.length}` },
          ]}
          value={view}
          onChange={(v) => {
            setView(v);
            setQuery("");
            setSort({ key: "rank", dir: v === "bottom" ? -1 : 1 });
          }}
        />
        <label className="relative block w-full sm:w-56">
          <span className="sr-only">Search players</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all players"
            className="w-full rounded-full border border-line bg-bg/60 px-4 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <div className={`scroll-thin mt-4 overflow-auto ${view === "all" || query ? "max-h-[560px]" : ""}`}>
        <table className="w-full border-collapse text-sm sm:min-w-[520px]">
          <thead className="sticky top-0 z-[1] bg-surface font-mono text-[10.5px] text-ink-3">
            <tr className="border-b border-line text-left">
              {header("rank", "#", "w-10")}
              <th className="px-2 py-2 font-normal uppercase tracking-[0.1em]">Player</th>
              {header("shots", "Shots", "hidden text-right sm:table-cell")}
              {header("actual", "FG%", "hidden text-right sm:table-cell")}
              {header("expected", "xFG%", "hidden text-right sm:table-cell")}
              <th className="px-2 py-2 text-center font-normal uppercase tracking-[0.1em]">
                <span className="sm:hidden">Over expected</span>
                <span className="hidden sm:inline">Over expected, ±95% noise</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const lo = bx(p.diff - Z * p.se);
              const hi = bx(p.diff + Z * p.se);
              const color = VERDICT_COLOR[p.verdict];
              return (
                <tr
                  key={p.id}
                  onPointerEnter={() => setFocus(p.id)}
                  onPointerLeave={() => setFocus(null)}
                  className={`border-b border-line transition-colors ${focus === p.id ? "bg-surface-2" : ""}`}
                >
                  <td className="tnum px-2 py-2 font-mono text-[12px] text-ink-3">{p.rank}</td>
                  <td className="px-2 py-2 text-ink">
                    {p.name}
                    <span className="tnum block text-[11px] text-ink-3 sm:hidden">
                      {pct(p.actual)} vs {pct(p.expected)} · {int(p.shots)} shots
                    </span>
                  </td>
                  <td className="tnum hidden px-2 py-2 text-right text-ink-2 sm:table-cell">{int(p.shots)}</td>
                  <td className="tnum hidden px-2 py-2 text-right text-ink-2 sm:table-cell">{pct(p.actual)}</td>
                  <td className="tnum hidden px-2 py-2 text-right text-ink-2 sm:table-cell">{pct(p.expected)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-3">
                      <div className="relative h-5 min-w-[90px] flex-1" aria-hidden="true">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--axis)]" />
                        <span
                          className="absolute top-1/2 h-px -translate-y-1/2 bg-ink-3"
                          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                        />
                        <span className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-ink-3" style={{ left: `${lo}%` }} />
                        <span className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-ink-3" style={{ left: `${hi}%` }} />
                        <span
                          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{ left: `${bx(p.diff)}%`, background: color, boxShadow: "0 0 0 2px var(--surface)" }}
                        />
                      </div>
                      <span className="tnum w-12 text-right font-mono text-[12px] text-ink">{pts(p.diff)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-ink-3">
                  No player matches &ldquo;{query}&rdquo;. Only players with 200+ shots are listed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Dot: actual minus expected FG%, in percentage points. Whisker: the range luck alone would produce 95% of the
        time for that player&apos;s shot count. Scale runs from −16 to +16.
      </p>
    </div>
  );
}
