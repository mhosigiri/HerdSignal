import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "./Badge";
import type { StatusTone } from "@/lib/tokens";

interface MetricCardProps extends HTMLAttributes<HTMLElement> {
  label: string;
  value: string | number;
  change?: string;
  tone?: StatusTone;
}

export function MetricCard({
  label,
  value,
  change,
  tone = "neutral",
  className,
  ...props
}: MetricCardProps) {
  return (
    <article
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--color-border)]/80",
        "bg-[var(--color-surface)]/80 p-5 shadow-[var(--shadow-card)] backdrop-blur",
        className,
      )}
      {...props}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-fg-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-fg)]">
        {value}
      </p>
      {change && (
        <div className="mt-4">
          <Badge tone={tone}>{change}</Badge>
        </div>
      )}
    </article>
  );
}
