import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/tokens";

interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  /** Pulse animation (useful for "live" / "processing" states) */
  pulse?: boolean;
  label?: string;
}

const dotColor: Record<StatusTone, string> = {
  positive: "bg-[var(--color-status-positive-fg)]",
  warning:  "bg-[var(--color-status-warning-fg)]",
  critical: "bg-[var(--color-status-critical-fg)]",
  neutral:  "bg-[var(--color-fg-faint)]",
};

export function StatusDot({
  tone = "neutral",
  pulse = false,
  label,
  className,
  ...props
}: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotColor[tone],
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor[tone])} />
      </span>
      {label && (
        <span className="text-sm text-[var(--color-fg-muted)]">{label}</span>
      )}
    </span>
  );
}
