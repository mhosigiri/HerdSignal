import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/tokens";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone | "accent";
}

const toneClasses: Record<StatusTone | "accent", string> = {
  positive: "bg-[var(--color-status-positive-bg)] text-[var(--color-status-positive-fg)]",
  warning:  "bg-[var(--color-status-warning-bg)]  text-[var(--color-status-warning-fg)]",
  critical: "bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-fg)]",
  neutral:  "bg-[var(--color-status-neutral-bg)]  text-[var(--color-status-neutral-fg)]",
  accent:   "bg-[var(--color-accent-pale)] text-[var(--color-accent-fg)]",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1",
        "text-xs font-medium uppercase tracking-[0.18em]",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
