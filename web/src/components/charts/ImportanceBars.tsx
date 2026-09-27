"use client";

import { motion } from "motion/react";
import { useState } from "react";

import type { Shap } from "@/lib/types";

// mean |shap| per feature, one series so one color
export function ImportanceBars({ items }: { items: Shap["importance"] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 10);
  const max = items[0].mean_abs;

  return (
    <div>
      <ol className="space-y-1.5">
        {shown.map((d, i) => (
          <li key={d.feature} className="grid grid-cols-[minmax(0,1fr)_1.3fr] items-center gap-3 sm:grid-cols-[210px_1fr]">
            <span className="text-right text-[13px] leading-tight text-ink-2" title={d.feature}>
              {d.label}
            </span>
            <span className="flex items-center gap-2">
              <motion.span
                className="block h-3.5 rounded-r-[4px]"
                style={{ background: i < 4 ? "var(--accent)" : "var(--neutral)", maxWidth: "calc(100% - 44px)" }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(d.mean_abs / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: Math.min(i, 10) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="tnum shrink-0 font-mono text-[11px] text-ink-3">{d.mean_abs.toFixed(3)}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="flex items-center gap-2 text-xs text-ink-3">
          <span className="h-2 w-2 rounded-[2px] bg-accent" /> Top four, plotted in detail
        </p>
        <button type="button" onClick={() => setAll((v) => !v)} className="link text-sm text-ink-3 hover:text-ink">
          {all ? "Show top 10" : `Show all ${items.length} features`}
        </button>
      </div>
    </div>
  );
}
