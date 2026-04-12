/**
 * Typography components — semantic layer mirroring the Figma Semantic/* text tokens.
 *
 * Heading   → Semantic/Heading 1–4
 * Body      → Semantic/Item
 * Strong    → Semantic/Strong
 * Emphasis  → Semantic/Emphasis
 * Caption   → Semantic/Small
 * Overline  → (overline convention; all-caps tracking)
 * Mono      → IBM Plex Mono (code / data values)
 * Link      → Semantic/Link
 */
import { ElementType, HTMLAttributes, AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// ─── Heading ─────────────────────────────────────────────────────────────────

type HeadingLevel = 1 | 2 | 3 | 4;

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: ElementType;
}

const headingClasses: Record<HeadingLevel, string> = {
  1: "text-4xl font-semibold tracking-tight sm:text-5xl",
  2: "text-2xl font-semibold tracking-tight",
  3: "text-xl font-semibold tracking-tight",
  4: "text-base font-semibold tracking-tight",
};

export function Heading({ level = 1, as, className, children, ...props }: HeadingProps) {
  const Tag = (as ?? `h${level}`) as "h1";
  return (
    <Tag
      className={cn("text-[var(--color-fg)]", headingClasses[level], className)}
      {...(props as HTMLAttributes<HTMLHeadingElement>)}
    >
      {children}
    </Tag>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────────

interface BodyProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: "sm" | "base";
  muted?: boolean;
}

export function Body({ size = "base", muted = false, className, children, ...props }: BodyProps) {
  return (
    <p
      className={cn(
        "leading-6",
        size === "sm" ? "text-sm" : "text-base",
        muted ? "text-[var(--color-fg-muted)]" : "text-[var(--color-fg)]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// ─── Strong ───────────────────────────────────────────────────────────────────

export function Strong({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <strong className={cn("font-semibold text-[var(--color-fg)]", className)} {...props}>
      {children}
    </strong>
  );
}

// ─── Emphasis ─────────────────────────────────────────────────────────────────

export function Emphasis({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <em className={cn("italic text-[var(--color-fg-muted)]", className)} {...props}>
      {children}
    </em>
  );
}

// ─── Caption / Small ──────────────────────────────────────────────────────────

export function Caption({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <small
      className={cn("block text-xs leading-5 text-[var(--color-fg-faint)]", className)}
      {...props}
    >
      {children}
    </small>
  );
}

// ─── Overline ─────────────────────────────────────────────────────────────────

export function Overline({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xs uppercase tracking-[0.35em] text-[var(--color-fg-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// ─── Mono ─────────────────────────────────────────────────────────────────────

interface MonoProps extends HTMLAttributes<HTMLElement> {
  as?: "code" | "pre" | "span";
}

export function Mono({ as: Tag = "code", className, children, ...props }: MonoProps) {
  const isCode = Tag === "code";
  return (
    <Tag
      className={cn(
        "font-mono text-sm tracking-tight text-[var(--color-fg)]",
        isCode && "rounded bg-[var(--color-surface-inset)] px-1.5 py-0.5",
        className,
      )}
      {...(props as HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Tag>
  );
}

// ─── Link ─────────────────────────────────────────────────────────────────────

interface TypographyLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  underline?: boolean;
}

export function TypographyLink({
  underline = false,
  className,
  children,
  ...props
}: TypographyLinkProps) {
  return (
    <a
      className={cn(
        "text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]",
        underline && "underline underline-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
