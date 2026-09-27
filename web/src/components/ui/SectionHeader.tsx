import type { ReactNode } from "react";

import { Reveal } from "./Reveal";

export function SectionHeader({
  index,
  kicker,
  title,
  children,
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Reveal className="grid gap-6 md:grid-cols-[180px_1fr] md:gap-10">
      <div className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.18em] text-ink-3 md:flex-col md:gap-2 md:pt-3">
        <span className="text-accent">{index}</span>
        <span>{kicker}</span>
      </div>
      <div className="max-w-3xl">
        <h2 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] font-semibold uppercase leading-[0.95] tracking-[-0.01em] text-balance text-ink">
          {title}
        </h2>
        {children && <div className="mt-5 space-y-4 text-[17px] leading-relaxed text-ink-2">{children}</div>}
      </div>
    </Reveal>
  );
}
