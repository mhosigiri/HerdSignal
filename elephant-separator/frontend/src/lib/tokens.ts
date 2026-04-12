/**
 * Design Token Reference — typed JS mirror of the CSS custom-property system.
 *
 * Three-layer architecture (Brand → Alias → Semantic):
 *  brand.*   — raw primitive values; never used in components directly
 *  alias.*   — opacity / derived variants of brand tokens
 *  tokens.*  — semantic, purpose-driven tokens consumed by components
 *
 * These are provided as static JS values for use in:
 *  - inline styles that can't reach CSS vars (e.g. canvas, Three.js, Recharts)
 *  - programmatic logic (e.g. computing chart colours)
 *  - unit tests that assert design correctness
 *
 * For Tailwind utilities, always prefer the CSS-var-backed classes defined in
 * globals.css (bg-primary, text-fg-muted, etc.).
 */

// ─── LAYER 1: Brand / Primitive ──────────────────────────────────────────────

export const brand = {
  // Neutrals
  black:         "#1b1a16",
  white:         "#ffffff",
  parchment:     "#f8f5ef",
  cream:         "#ece5da",
  linen:         "#f7f1e6",
  dune:          "#ece7df",

  // Forest greens
  forestDeep:    "#13251b",
  forest:        "#27452d",
  forestMid:     "#1c3522",
  forestMuted:   "#2e442e",

  // Amber / gold
  amber:         "#d2a24f",
  amberLight:    "#f5d98a",
  amberPale:     "#f4e4c3",

  // Stone scale
  stone50:       "#fafaf9",
  stone100:      "#f5f5f4",
  stone200:      "#e7e5e4",
  stone300:      "#d6d3d1",
  stone400:      "#a8a29e",
  stone500:      "#78716c",
  stone600:      "#57534e",
  stone700:      "#44403c",
  stone800:      "#292524",
  stone900:      "#1c1917",
  stone950:      "#0c0a09",

  // Status hues
  greenBg:       "#e2f0de",
  greenFg:       "#28482e",
  amberBg:       "#f4e4c3",
  amberFg:       "#7c5c20",
  redBg:         "#f4d7cf",
  redFg:         "#8f3f2c",
  emerald:       "#6ee7b7",
  amberWarn:     "#fcd34d",
} as const;

// ─── LAYER 2: Alias / Opacity Variants ───────────────────────────────────────

export const alias = {
  forestDeep98:  "rgba(19, 37, 27, 0.98)",
  forestDark98:  "rgba(10, 18, 14, 0.98)",
  forest95:      "rgba(46, 68, 46, 0.95)",
  amber95:       "rgba(210, 162, 79, 0.95)",
  amber35:       "rgba(210, 162, 79, 0.35)",
  black15:       "rgba(0, 0, 0, 0.15)",
  white5:        "rgba(255, 255, 255, 0.05)",
  white10:       "rgba(255, 255, 255, 0.10)",
  white50:       "rgba(255, 255, 255, 0.50)",
  stone08:       "rgba(56, 44, 29, 0.08)",
  stone28:       "rgba(20, 37, 26, 0.28)",
  amber25:       "rgba(210, 157, 72, 0.25)",
} as const;

// ─── LAYER 3: Semantic / Mapped ───────────────────────────────────────────────

export const tokens = {
  // Page chrome
  bg:              brand.parchment,
  bgSubtle:        brand.cream,
  fg:              brand.black,
  fgMuted:         brand.stone500,
  fgFaint:         brand.stone400,

  // Surfaces
  surface:         brand.white,
  surfaceRaised:   brand.linen,
  surfaceInset:    brand.dune,
  surfaceDark:     brand.forestDeep,

  // Borders
  border:          brand.stone200,
  borderSubtle:    alias.white10,
  borderDashed:    brand.stone400,

  // Primary (forest green)
  primary:         brand.forest,
  primaryHover:    brand.forestMid,
  primaryFg:       brand.stone50,

  // Accent (amber gold)
  accent:          brand.amber,
  accentLight:     brand.amberLight,
  accentPale:      brand.amberPale,
  accentFg:        brand.stone950,

  // Shadows
  shadowCard:      `0 16px 50px ${alias.stone08}`,
  shadowCardLg:    `0 20px 80px ${alias.stone08}`,
  shadowHero:      `0 28px 100px ${alias.stone28}`,
  shadowAccent:    `0 12px 40px ${alias.amber25}`,

  // Border radii
  radiusSm:        "0.75rem",
  radiusMd:        "1.25rem",
  radiusLg:        "1.75rem",
  radiusXl:        "2rem",
  radius2xl:       "2.5rem",

  // Status tones
  status: {
    positive: { bg: brand.greenBg,  fg: brand.greenFg  },
    warning:  { bg: brand.amberBg,  fg: brand.amberFg  },
    critical: { bg: brand.redBg,    fg: brand.redFg    },
    neutral:  { bg: brand.dune,     fg: brand.stone600 },
  },

  // Chart palette (ordered; safe on parchment background)
  chart: [
    brand.forest,
    brand.amber,
    brand.forestMuted,
    brand.amberLight,
    brand.stone500,
    brand.amberPale,
    brand.forestMid,
  ],
} as const;

export type StatusTone = keyof typeof tokens.status;
