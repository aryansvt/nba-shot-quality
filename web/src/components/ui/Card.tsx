import type { ReactNode } from "react";

// chart card: surface, hairline border, title row
export function Card({
  title,
  note,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-ink">{title}</h3>}
            {note && <p className="mt-1 text-sm text-ink-3">{note}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
