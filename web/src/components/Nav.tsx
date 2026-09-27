"use client";

import { useEffect, useState } from "react";

import { GITHUB_URL } from "@/lib/site";

export const SECTIONS = [
  { id: "models", label: "Models" },
  { id: "explain", label: "Explain" },
  { id: "players", label: "Players" },
  { id: "predictor", label: "Predictor" },
  { id: "method", label: "Method" },
];

export function Nav() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      // active = last section whose top has passed a third of the way down the screen
      const line = window.innerHeight / 3;
      let current: string | null = null;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-line bg-bg/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 sm:px-8">
        <a href="#top" className="flex shrink-0 items-center gap-2.5" aria-label="Back to top">
          <Mark />
          <span className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Shot<span className="text-accent">Quality</span>
          </span>
        </a>
        <ul className="nav-scroll scroll-thin -mx-2 flex flex-1 items-center gap-1 overflow-x-auto px-2 sm:justify-end">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? "true" : undefined}
                className={`block whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  active === s.id ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={GITHUB_URL}
          className="hidden shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 transition-colors hover:border-accent hover:text-ink md:block"
        >
          Code
        </a>
      </nav>
    </header>
  );
}

// small ball mark
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--accent)" strokeWidth="1.8" />
      <path d="M1.5 12h21M12 1.5v21M4.6 4.6c3 3 3 11.8 0 14.8M19.4 4.6c-3 3-3 11.8 0 14.8" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
    </svg>
  );
}
