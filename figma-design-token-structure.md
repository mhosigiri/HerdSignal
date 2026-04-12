# Figma Design Token Structure
## Apple Website 2025 (Community) — Variable & Style Architecture

**File:** [Apple website 2025 (Community)](https://www.figma.com/design/UZRxj4WnxXFpWvDowlRjEP/Apple-website-2025--Community-)  
**Analysed via:** Figma REST API (`/v1/files/:key`) + MCP inspection  
**Total registered styles:** 582 (135 fill, 447 text)

---

## 1. Three-Layer Token Architecture

This file follows a classic **Brand → Alias → Semantic (Mapped)** token hierarchy. The three layers are visible both in the Figma styles panel and in how style names are namespaced.

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — Brand / Primitive                                    │
│  Raw, named color values. No context. Single source of truth.  │
│  e.g.  "Shark", "Science Blue", "Black 56%", "White 92%"       │
└──────────────────────────────┬──────────────────────────────────┘
                               │  referenced by alias tokens
┌──────────────────────────────▼──────────────────────────────────┐
│  LAYER 2 — Alias / Global                                       │
│  Tokens that mirror brand values with opacity variants.        │
│  e.g.  "Shark 50%", "Athens Gray 60%", "Woodsmoke 80%"         │
└──────────────────────────────┬──────────────────────────────────┘
                               │  referenced by component/semantic tokens
┌──────────────────────────────▼──────────────────────────────────┐
│  LAYER 3 — Semantic / Mapped                                    │
│  Purposeful names consumed directly by components.             │
│  e.g.  "White Black", "White White", "White Athens Gray"        │
│        (adaptive tokens that swap between light / dark)        │
└─────────────────────────────────────────────────────────────────┘
```

The **connection point** between the collections is the slash-namespace prefix `www.apple.com/`. Brand and alias tokens share the same namespace root; semantic (mapped) tokens add a second segment that expresses their purpose (`Semantic/`, `White …`) rather than their raw value.

---

## 2. Collection Details

### 2.1 Brand / Primitive Collection — Fill Styles

Namespace: `www.apple.com/<ColorName>`  
All values are **solid, named colors** drawn from Apple's internal palette.

| Group | Example tokens |
|-------|---------------|
| Neutrals | `Black`, `White`, `Shark`, `Cod Gray`, `Mine Shaft`, `Woodsmoke`, `Mirage`, `Thunder` |
| Grays | `Athens Gray`, `French Gray`, `Mischka`, `Iron`, `Jumbo`, `Manatee`, `Mid Gray`, `Rolling Stone` |
| Warm neutrals | `Pampas`, `Satin Linen`, `Westar`, `Wild Sand`, `Vista White`, `Gallery`, `Alabaster`, `Whisper` |
| Blues | `Science Blue`, `Dodger Blue`, `Royal Blue`, `Malibu`, `Rock Blue`, `Tropical Blue`, `Portage`, `Azure Radiance`, `Hoki` |
| Reds / Oranges | `Red`, `Cinnabar`, `Monza`, `Crimson`, `Radical Red`, `Torch Red`, `Sunglo`, `Blaze Orange`, `International Orange`, `Fire`, `Hollywood Cerise`, `Rose of Sharon` |
| Accent / Other | `Confetti`, `Marigold Yellow`, `Kobi`, `Oyster Pink`, `Plum`, `Celeste`, `Geyser`, `Jet Stream`, `Tasman`, `Snuff`, `Silver Rust`, `Parchment`, `Indian Khaki`, `Tea` |
| Darks | `Big Stone`, `Ebony Clay`, `Outer Space`, `Cape Cod`, `Merlin`, `Salt Box`, `Emperor`, `Dove Gray`, `Ship Gray`, `Tuna`, `Abbey`, `Alto` |

**Total unique brand fill tokens: ~101**

---

### 2.2 Alias Collection — Opacity Variants

Namespace: `www.apple.com/<ColorName> <Opacity%>`  
These extend brand tokens with **alpha channel variants**. They resolve to the same hue but at reduced opacity, giving the system flexibility without new raw values.

| Base color | Alias variants |
|-----------|---------------|
| `Black` | `Black 5%`, `Black 8%`, `Black 16%`, `Black 20%`, `Black 40%`, `Black 42%`, `Black 48%`, `Black 56%`, `Black 72%`, `Black 80%`, `Black 88%` |
| `White` | `White 24%`, `White 80%`, `White 92%` |
| `Athens Gray` | `Athens Gray 60%`, `Athens Gray 70%`, `Athens Gray 80%` |
| `Shark` | `Shark 50%` |
| `Jumbo` | `Jumbo 80%` |
| `Mischka` | `Mischka 64%` |
| `Woodsmoke` | `Woodsmoke 80%` |
| `Whisper` | `Whisper 80%` |
| `Blaze Orange` | `Blaze Orange 10%` |
| `Black Russian` | `Black Russian 10%` |

> **Connection point (Brand → Alias):** An alias token such as `www.apple.com/Black 56%` points to the primitive `www.apple.com/Black` with a 56% opacity modifier applied. In Figma's variable panel this appears as a variable that *references* the base brand variable rather than hardcoding a new hex value.

---

### 2.3 Semantic / Mapped Collection — Adaptive (Light/Dark) Tokens

Namespace: `www.apple.com/<Semantic-name>`  
These tokens are **mode-aware**: they resolve to different brand or alias tokens depending on the active colour mode (light vs. dark). The naming convention encodes the mapping directly in the token name.

#### 2.3.1 Adaptive Color Tokens

The pattern `<LightValue> <DarkValue>` is baked into the token name:

| Token name | Light mode resolves to | Dark mode resolves to |
|-----------|----------------------|----------------------|
| `White Black` | `White` | `Black` |
| `White White` | `White` | `White` (unchanged) |
| `White Athens Gray` | `White` | `Athens Gray` |

> **Connection point (Alias → Semantic/Mapped):** The mapped tokens reference alias or brand tokens by variable ID. When the Figma mode switches, Figma resolves each semantic token to its mode-specific alias/brand token. This is the critical "binding" between collections.

#### 2.3.2 Semantic Text (Role-based) Tokens

Namespace: `www.apple.com/Semantic/<Role>`  
These **text style** tokens describe typographic intent, not raw font properties:

| Token | Typographic role |
|-------|----------------|
| `Semantic/Heading 1` | Primary page title |
| `Semantic/Heading 2` | Section heading |
| `Semantic/Heading 3` | Sub-section heading |
| `Semantic/Heading 4` | Minor heading |
| `Semantic/Strong` | Bold inline text |
| `Semantic/Emphasis` | Italic / accent inline text |
| `Semantic/Item` | List item body text |
| `Semantic/Small` | Caption / fine print |
| `Semantic/Link` | Hyperlink text |
| `Semantic/Link underline` | Underlined hyperlink variant |
| `Semantic/Superscript` | Legal superscript notation |
| `Semantic/Button` | CTA button label |

---

## 3. Typography System

### 3.1 Primitive Font Styles (Base Collection)

Three Apple system typefaces define the primitive typography tokens:

| Family | Weights registered |
|--------|-------------------|
| **SF Pro Display** | Regular, Bold |
| **SF Pro Text** | Regular, Medium, Semibold, Semibold underline, Bold |
| **SF Pro Icons** | Regular, Bold |

Namespace: `www.apple.com/<Family>/<Weight>`

### 3.2 Semantic Text Styles (Mapped Collection)

The 12 `Semantic/*` text styles (section 2.3.2) **reference** the primitive SF Pro styles above. The connection point is a Figma text-style reference: `Semantic/Heading 1` → `SF Pro Display/Bold` (large size, letter-spacing, etc.), while `Semantic/Small` → `SF Pro Text/Regular` (small size, tighter leading).

---

## 4. Collection Connection Map

```
www.apple.com/  (primitive namespace)
│
├── [BRAND] <ColorName>                ← raw hex values
│       │
│       └──▶ [ALIAS] <ColorName> <N%> ← same hue, opacity override
│                   │
│                   └──▶ [SEMANTIC] White/Black duals ← mode-resolved adaptive tokens
│
├── [BRAND] SF Pro Display / Text / Icons  ← raw typeface definitions
│       │
│       └──▶ [SEMANTIC] Semantic/<Role>   ← purpose-driven text tokens
│
└── [ROOT] Blue, White                    ← legacy / remote library styles
```

---

## 5. Naming Conventions

| Convention | Meaning | Examples |
|-----------|---------|---------|
| Slash `/` separator | Hierarchy delimiter | `www.apple.com/Semantic/Heading 1` |
| `www.apple.com/` prefix | Local file namespace | All non-remote tokens |
| Plain color names | Brand/primitive | `Shark`, `Science Blue` |
| `<Name> <N>%` suffix | Opacity alias | `Black 56%`, `White 80%` |
| `<Light> <Dark>` pattern | Adaptive semantic mapping | `White Black`, `White Athens Gray` |
| `Semantic/<Role>` | Component intent | `Semantic/Button`, `Semantic/Link` |
| Remote styles (no prefix) | External library tokens | `Blue`, `White` (remote: true) |

---

## 6. Key Observations

1. **Primitive-first discipline** — Every color in the system starts as a named primitive. No component ever hardcodes a hex value.

2. **Opacity aliases instead of new primitives** — Rather than defining 11 separate shades of black as independent primitives, the system uses opacity variants (`Black 5%` through `Black 88%`). This keeps the primitive palette lean while still covering all needed opacities.

3. **Dual-value adaptive tokens** — The `White Black` / `White Athens Gray` pattern is the mechanism for light/dark mode support. The token name itself encodes which brand token is active in each mode, making the mapping self-documenting.

4. **Semantic layer decouples design from intent** — Components bind to `Semantic/Heading 1` rather than to `SF Pro Display/Bold 56px`. If the design system changes a typeface, only the semantic→primitive connection changes; all components automatically update.

5. **Two remote tokens** — `Blue` and `White` (node IDs `1:24`, `1:3`, `1:2`) are marked `remote: true`, indicating they originate from a linked external library. All other 580 styles are locally defined.

6. **Text style count asymmetry** — 447 text style registrations vs 135 fill registrations. Many text styles appear duplicated across nodes (different instances sharing the same style definition), which is normal in Figma.
