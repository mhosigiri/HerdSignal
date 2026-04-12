import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Render the file variant (dashed upload zone) */
  fileVariant?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ fileVariant = false, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)]",
        "px-4 py-3 text-sm text-[var(--color-fg)] transition",
        "placeholder:text-[var(--color-fg-faint)]",
        "focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-0",
        fileVariant
          ? "border-dashed border-[var(--color-border-dashed)]"
          : "border-[var(--color-border)] hover:border-[var(--color-fg-faint)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
