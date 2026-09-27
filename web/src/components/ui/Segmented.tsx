"use client";

// pill toggle group, one option active at a time
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="scroll-thin inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-line bg-bg/60 p-1 sm:gap-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors sm:px-3.5 sm:tracking-[0.12em] ${
              active ? "bg-ink text-bg" : "text-ink-3 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
