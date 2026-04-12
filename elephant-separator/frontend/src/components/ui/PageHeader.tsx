import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Overline label (small all-caps above the title) */
  overline?: string;
  title: string;
  description?: string;
  /** Optional slot for actions (buttons etc.) aligned to the right on wide screens */
  actions?: ReactNode;
}

export function PageHeader({
  overline,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="space-y-2">
        {overline && (
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-fg-muted)]">
            {overline}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-fg)]">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
