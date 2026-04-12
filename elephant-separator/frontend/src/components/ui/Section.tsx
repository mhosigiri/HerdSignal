import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Top-level dashboard section wrapper — consistent vertical rhythm */
export function Section({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("space-y-[var(--space-section)]", className)} {...props}>
      {children}
    </section>
  );
}

/** Full-width grid row with a responsive column layout */
interface GridRowProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4;
}

export function GridRow({ cols = 2, className, children, ...props }: GridRowProps) {
  const colClass = {
    1: "",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={cn("grid gap-4", colClass, className)} {...props}>
      {children}
    </div>
  );
}
