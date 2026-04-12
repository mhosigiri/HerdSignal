import { SVGAttributes } from "react";
import { cn } from "@/lib/cn";

interface SpinnerProps extends SVGAttributes<SVGSVGElement> {
  size?: "sm" | "md" | "lg";
  /** Token-driven colour: "primary" | "accent" | "current" */
  color?: "primary" | "accent" | "current";
}

const sizeMap = { sm: 16, md: 20, lg: 28 };
const colorMap = {
  primary: "text-[var(--color-primary)]",
  accent:  "text-[var(--color-accent)]",
  current: "text-current",
};

export function Spinner({ size = "md", color = "primary", className, ...props }: SpinnerProps) {
  const px = sizeMap[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      width={px}
      height={px}
      className={cn("animate-spin", colorMap[color], className)}
      aria-label="Loading"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
