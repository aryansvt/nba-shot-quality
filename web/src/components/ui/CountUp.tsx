"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type Format = "fixed3" | "pct1" | "int";

const formatters: Record<Format, (v: number) => string> = {
  fixed3: (v) => v.toFixed(3),
  pct1: (v) => `${(v * 100).toFixed(1)}%`,
  int: (v) => Math.round(v).toLocaleString("en-US"),
};

// renders the final value on the server, then counts up once when seen
export function CountUp({ value, format, duration = 1.2 }: { value: number; format: Format; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const fmt = formatters[format];

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduced) return;
    const controls = animate(value * 0.6, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [inView, reduced, value, fmt, duration]);

  return <span ref={ref}>{fmt(value)}</span>;
}
