import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "default" | "raised" | "inset" | "dark" | "bordered";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Apply the standard card box-shadow */
  shadow?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:  "border border-[var(--color-border)] bg-[var(--color-surface)]",
  raised:   "border border-[var(--color-border)]/80 bg-[var(--color-surface-raised)]",
  inset:    "bg-[var(--color-surface-inset)]",
  dark:     "border border-[var(--color-border-subtle)] bg-[var(--color-surface-dark)] text-stone-100",
  bordered: "border border-dashed border-[var(--color-border-dashed)] bg-[var(--color-surface)]/60",
};

export function Card({
  variant = "default",
  shadow = true,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] p-5",
        variantClasses[variant],
        shadow && "shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Convenience: larger hero-style card with extra padding and a bigger radius */
export function HeroCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-2xl)] border border-[var(--color-border)]/50 bg-[var(--color-surface)]",
        "p-6 shadow-[var(--shadow-card-lg)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
