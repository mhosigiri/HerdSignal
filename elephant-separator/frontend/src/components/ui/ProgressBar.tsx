import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number;
  /** Show the numeric percentage label */
  showLabel?: boolean;
  variant?: "primary" | "accent";
}

export function ProgressBar({
  value,
  showLabel = false,
  variant = "primary",
  className,
  ...props
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  const fillColor =
    variant === "accent"
      ? "bg-[var(--color-accent)]"
      : "bg-[var(--color-primary)]";

  return (
    <div className={cn("space-y-1", className)} {...props}>
      {showLabel && (
        <div className="flex justify-between text-xs text-[var(--color-fg-muted)]">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-inset)]"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", fillColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
