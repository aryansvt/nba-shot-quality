"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { Segmented } from "@/components/ui/Segmented";
import type { ModelRow } from "@/lib/types";

type Key = "auc" | "log_loss" | "brier" | "accuracy";

const METRICS: { value: Key; label: string; better: "higher" | "lower"; digits: number; ticks: number[] }[] = [
  { value: "auc", label: "AUC", better: "higher", digits: 4, ticks: [0.5, 0.55, 0.6, 0.65] },
  { value: "log_loss", label: "Log loss", better: "lower", digits: 4, ticks: [0.69, 0.68, 0.67, 0.66, 0.65] },
  { value: "brier", label: "Brier", better: "lower", digits: 4, ticks: [0.25, 0.24, 0.23, 0.22] },
  { value: "accuracy", label: "Accuracy", better: "higher", digits: 3, ticks: [0.54, 0.57, 0.6, 0.63] },
];

// lollipops from the naive baseline to each model, better always to the right
export function MetricDots({ rows, headline }: { rows: ModelRow[]; headline: string }) {
  const [key, setKey] = useState<Key>("auc");
  const m = METRICS.find((x) => x.value === key)!;

  const naive = rows.find((r) => r.family === "Baseline")!;
  const lo = m.ticks[0];
  const hi = m.ticks[m.ticks.length - 1];
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (m.better === "higher" ? b[key] - a[key] : a[key] - b[key])),
    [rows, key, m.better],
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Metric" options={METRICS} value={key} onChange={setKey} />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          {m.better} is better · right is better
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,118px)_1fr_auto] gap-x-3 sm:grid-cols-[190px_1fr_auto] sm:gap-x-4">
        {/* axis */}
        <div />
        <div className="relative h-5">
          {m.ticks.map((t, i) => (
            <span
              key={t}
              className={`tnum absolute -translate-x-1/2 font-mono text-[10.5px] text-ink-3 ${
                i === 0 || i === m.ticks.length - 1 ? "" : "hidden sm:inline"
              }`}
              style={{ left: `${x(t)}%` }}
            >
              {t.toFixed(2)}
            </span>
          ))}
        </div>
        <div />

        {sorted.map((r) => {
          const isHead = r.name === headline;
          const isNaive = r === naive;
          const color = isHead ? "var(--accent)" : isNaive ? "var(--ink-3)" : "var(--ink-2)";
          const x0 = x(naive[key]);
          const x1 = x(r[key]);
          return (
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              key={r.name}
              className="col-span-3 grid grid-cols-subgrid items-center border-t border-line py-2.5"
            >
              <div className="min-w-0">
                <div className={`truncate text-[14px] ${isHead ? "font-semibold text-ink" : "text-ink-2"}`}>{r.name}</div>
                <div className="truncate font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">{r.family}</div>
              </div>
              <div className="relative h-6">
                {/* gridlines */}
                {m.ticks.map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-[var(--grid)]" style={{ left: `${x(t)}%` }} />
                ))}
                {!isNaive && (
                  <motion.span
                    className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                    style={{ background: isHead ? "var(--accent)" : "var(--neutral)" }}
                    initial={false}
                    animate={{ left: `${Math.min(x0, x1)}%`, width: `${Math.abs(x1 - x0)}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <motion.span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background: isNaive ? "var(--surface)" : color,
                    border: isNaive ? "2px solid var(--ink-3)" : undefined,
                    boxShadow: "0 0 0 2px var(--surface)",
                  }}
                  initial={false}
                  animate={{ left: `${x1}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className={`tnum text-right font-mono text-[13px] ${isHead ? "text-ink" : "text-ink-2"}`}>
                {r[key].toFixed(m.digits)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
