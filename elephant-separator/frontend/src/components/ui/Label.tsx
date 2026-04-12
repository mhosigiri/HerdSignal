import { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type LabelVariant = "default" | "overline" | "caption";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  variant?: LabelVariant;
}

const variantClasses: Record<LabelVariant, string> = {
  default:  "text-sm font-medium text-[var(--color-fg)]",
  overline: "text-xs font-normal uppercase tracking-[0.35em] text-[var(--color-fg-muted)]",
  caption:  "text-xs text-[var(--color-fg-faint)]",
};

export function Label({ variant = "default", className, children, ...props }: LabelProps) {
  return (
    <label className={cn(variantClasses[variant], className)} {...props}>
      {children}
    </label>
  );
}
