# Design System — Nsty Browser (Obsidian Monolith)

> Agent reference. Read before writing any UI in this project. All tokens live in `src/renderer/styles/globals.css`; this file documents intent, hierarchy, and usage. If the CSS and this file disagree, the CSS is the source of truth — update this file to match.

## 1. Visual Theme & Atmosphere

Nsty Browser is a developer-first Electron browser with a design philosophy called **Obsidian Monolith** — a near-black canvas, a single high-voltage accent, and chrome that recedes until the web content is the only thing on screen. The surface hierarchy is built from near-blacks (`#0e0e0e` → `#2c2c2c`) rather than a single flat background, creating depth through tone shift rather than shadow. One color carries the entire interactive identity: **`#CEFA05`** — a neon/lime green that reads as radioactive against the dark surfaces. Everything interactive, active, or focused uses this green; everything else is monochromatic.

The sidebar is **Arc-inspired**: a 60px collapsed rail with dots for spaces (workspaces), expanding to 240px to reveal pinned pages, tabs, and a command bar. The collapsed state is the default — the browser is optimized for content-first, chrome-on-demand. When expanded, the sidebar uses translucent green-tinted surfaces (`rgba(206, 250, 5, 0.03)` → `0.10`) with 30px backdrop blur, giving it a subtle "aurora" quality against the content area.

What distinguishes this system from other dark-themed browsers is the **primary-tinted translucent layer**. Borders, hover states, and subtle surfaces are not neutral whites — they are low-opacity primaries (`rgba(206, 250, 5, 0.05-0.15)`). This gives the entire UI a faint green undertone that's barely conscious but deeply brand-specific. When you hover a pinned page, the surface doesn't just lighten — it *greens*.

**Key Characteristics:**
- Near-black surface hierarchy (`#0e0e0e` → `#2c2c2c`) — depth via tone, not shadow
- Single high-voltage accent: `#CEFA05` (neon lime) for all interactive/active states
- Primary-tinted translucent borders (`rgba(206, 250, 5, 0.08-0.15)`) instead of neutral grays
- Arc-style sidebar: 60px → 240px, glassmorphic with green-aurora tinting
- Space Grotesk (headlines/labels) + Manrope (body) + Geist Mono (technical/URL bar)
- Uppercase micro-labels with aggressive letter-spacing (0.08em–0.3em) — engineering signage, not marketing copy
- Material Symbols Outlined icons at weight 400
- Focus ring uses `#CEFA05` — accessibility and brand are the same gesture
- Glow-pulse animation on active sidebar icon — the only true "effect" in the system

## 2. Color Palette & Roles

### Surface Hierarchy (near-black)
- **Container Lowest** (`#000000`): True black — rare, used for extreme depth (modal backdrops via overlay token).
- **Surface** (`#0e0e0e`): Default page background, main content area.
- **Container Low** (`#131313`): Sidebar base, slightly lifted from surface.
- **Container** (`#1a1919`): Standard cards, secondary surfaces.
- **Container High** (`#201f1f`): Dialogs, elevated panels, dashboard cards.
- **Container Highest / Variant** (`#262626`): Hovered containers, highest elevation.
- **Surface Bright** (`#2c2c2c`): Rare — brightest dark surface, used sparingly.

### Primary Accent (single, dominant)
- **Primary / Accent** (`#CEFA05`): All interactive states — active tabs, focus rings, CTA fills, active toggle, range-slider thumb.
- **Primary Dim** (`#c0ea00`): Hover state for primary; darker neon.
- **Primary Container** (`#cdf901`): Near-identical — used where a subtle shift is needed.
- **On Primary** (`#526500`): Text on primary fills — dark olive, readable against neon.
- **Primary Muted Accessible** (`#a8c804`): WCAG AA-safe primary for text at 4.5:1 contrast. Use this when low-opacity primary would fail contrast.

### Secondary & Tertiary (rare, workflow)
- **Secondary** (`#eee854`): Warm yellow — used sparingly for secondary emphasis.
- **Tertiary** (`#ffeeac`): Gold — used for tertiary badges or accents.

### Text
- **On Surface** (`#ffffff`): Primary text, pure white.
- **On Surface Variant** (`#adaaaa`): Secondary text, descriptions, metadata.
- **Outline / Text Muted** (`#777575`): Tertiary text, placeholders, muted icons.

### Borders & Outlines (primary-tinted)
- **Ghost Border** (`rgba(100, 100, 100, 0.35)`): Neutral border, used on glassmorphic panels and dashboard cards.
- **Border Subtle** (`rgba(206, 250, 5, 0.08)`): Primary-tinted border, default for sidebar surfaces.
- **Border Active** (`rgba(206, 250, 5, 0.15)`): Primary-tinted border in active state.
- **Border Interactive** (`rgba(255, 255, 255, 0.10)`): Neutral interactive border for inputs/buttons.
- **Outline Variant** (`#494847`): Dark outline for strong dividers.

### Translucent Surfaces (Arc-inspired)
- **Surface Translucent** (`rgba(206, 250, 5, 0.03)`): Sidebar base tint.
- **Surface Translucent Hover** (`rgba(206, 250, 5, 0.06)`): Hovered pinned-page, hovered tab.
- **Surface Translucent Active** (`rgba(206, 250, 5, 0.10)`): Active/selected state.
- **Bg Hover** (`rgba(255, 255, 255, 0.06)`): Neutral hover for non-primary elements.
- **Bg Active** (`rgba(255, 255, 255, 0.09)`): Neutral active for non-primary elements.

### Error / Danger
- **Error** (`#ff7351`): Warning coral, close-tab hover, destructive CTA.
- **Error Dim** (`#d53d18`): Hover state for error.
- **On Error** (`#450900`): Text on error fills.

### Overlay & Command
- **Surface Overlay Dim** (`rgba(0, 0, 0, 0.5)`): Modal backdrop, dialog scrim.
- **Command Bar Bg** (`rgba(206, 250, 5, 0.06)`): Command bar input background.
- **Command Bar Border** (`rgba(206, 250, 5, 0.12)`): Command bar outline.

### Space Gradients (workspace identity)
- **Space Gradient 1** (green): `linear-gradient(135deg, #0a1a0a 0%, #132613 40%, #0d1f0d 80%, #0a150a 100%)` — default/primary space.
- **Space Gradient 2** (teal): `linear-gradient(135deg, #0a1a1a 0%, #0d2a1a 40%, #0a1f1a 80%, #0a1510 100%)` — work/secondary space.
- **Space Gradient 3** (amber): `linear-gradient(135deg, #1a1a0a 0%, #2a2d0a 40%, #1f1f0d 80%, #15150a 100%)` — personal/tertiary space.

### Depth & Elevation (shadow-as-border, Vercel-inspired)
- **Shadow Border** (`0 0 0 1px rgba(255, 255, 255, 0.06)`): Replaces CSS borders on cards/containers. Zero-offset, zero-blur, 1px spread.
- **Shadow Card** (`0 0 0 1px rgba(255, 255, 255, 0.06), 0 2px 2px rgba(0, 0, 0, 0.24)`): Standard card lift — ring + ambient.
- **Shadow Card Elevated** (`0 0 0 1px rgba(255, 255, 255, 0.06), 0 2px 2px rgba(0, 0, 0, 0.24), 0 8px 16px -8px rgba(0, 0, 0, 0.4)`): Dialogs, raised panels.
- **Shadow Ambient** (`0 8px 24px rgba(0, 0, 0, 0.30)`): Hover lift on cards.
- **Shadow Glow** (`0 0 14px rgba(206, 250, 5, 0.4-0.6)`): The signature — pulsing glow on active sidebar icon.

## 3. Typography Rules

### Font Families
- **Headline / Label**: `Space Grotesk` (300, 400, 500, 600, 700) — geometric, slightly quirky, strong at uppercase.
- **Body**: `Manrope` (300, 400, 500, 600, 700) — humanist, high-readability at small sizes.
- **Mono / Technical**: `Geist Mono` (400, 500, 600) — URL bar, code, technical metadata, terminal-style labels.
- **Icons**: `Material Symbols Outlined` at weight 400.

Fonts load via Google Fonts in `src/renderer/index.html`. When adding a new weight or family, update the `<link>` tag there *and* the font stack in `globals.css`.

### Utility Classes
- `.font-headline` — Space Grotesk, for headings and strong labels.
- `.font-body` — Manrope, default on `body`; use explicitly when inside a `.font-headline` region.
- `.font-label` — Space Grotesk, for uppercase micro-labels.
- `.font-mono` — Geist Mono, for URL bar, code, technical IDs.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Space Grotesk | 32px+ | 500 | 1.2 | 0.3em (uppercase) | Dashboard hero, rare |
| Card Title | Space Grotesk | 16px (1rem) | 600 | 1.3 | normal | Dashboard cards |
| Section Label | Space Grotesk | 10–12px | 500 | 1.0 | 0.1em–0.3em (uppercase) | Card labels, section headers |
| Dialog Title | Space Grotesk | 16px | 600 | 1.3 | normal | Confirm dialogs, modals |
| Body | Manrope | 13–14px | 400 | 1.5 | normal | Descriptions, dialog messages |
| Body Small | Manrope | 11–12px | 400 | 1.4 | normal | Secondary metadata |
| Button Label | Space Grotesk | 11px | 600–700 | 1.0 | 0.08em (uppercase) | All button labels |
| Micro Badge | Space Grotesk | 0.6rem (9–10px) | 700 | 1.0 | 0.08em (uppercase) | Active/status badges |
| URL / Address | Geist Mono | 13px | 400 | 1.4 | normal | Command bar input |
| Technical Label | Geist Mono | 10–11px | 500 | 1.0 | 0.05em (uppercase) | Shortcut hints, dev metadata |

### Principles
- **Uppercase is the dominant label treatment.** Space Grotesk in uppercase with 0.08em–0.3em letter-spacing is the house style for labels, badges, buttons, and section headers. Lowercase is reserved for body copy and titles.
- **Weight discipline (Vercel-inspired three-weight rule):** prefer 400 (body reading), 500 (UI/interactive), 600 (emphasis/headings). Use 700 only for micro-badges and uppercase button labels where the small size demands weight to be legible. Avoid 300 and 800+ in new UI.
- **Space Grotesk for engineering signage, Manrope for prose.** When you need a label, tag, button, or badge — Space Grotesk uppercase. When you need something read for meaning (descriptions, messages, tooltips) — Manrope.
- **Geist Mono is the "developer voice."** Use it wherever the content is technical: URLs, code, keyboard shortcuts, IDs, timestamps, file sizes. Never use it for prose.
- **Letter-spacing scales with intent, not size.** Uppercase labels always get `letter-spacing: 0.08em+`. Body copy gets normal tracking. There is no aggressive *negative* tracking in this system (the opposite of Vercel).

## 4. Component Stylings

### Buttons

**Primary CTA**
- Background: `var(--primary)` (`#CEFA05`)
- Text: `var(--on-primary)` (`#526500`)
- Padding: `8px 16px`
- Radius: `var(--radius-lg)` (8px)
- Font: Space Grotesk 11px weight 700, uppercase, letter-spacing 0.08em
- Hover: `var(--primary-dim)`
- Focus: outline `2px solid var(--primary)`, outline-offset `2px`

**Secondary / Ghost**
- Background: `transparent`
- Text: `var(--on-surface-variant)` (`#adaaaa`)
- Border: `1px solid var(--border-subtle)` (primary-tinted)
- Padding: `8px 16px`
- Radius: `var(--radius-lg)` (8px)
- Font: Space Grotesk 11px weight 600, uppercase, letter-spacing 0.08em

**Danger**
- Background: `var(--error)` (`#ff7351`)
- Text: `var(--on-error)` (`#450900`)
- All other specs identical to Primary CTA

**Icon Button (sidebar rail)**
- Size: `32px × 32px` (8×8 rem units), circular or 8px radius
- Background: `transparent` → `var(--bg-hover)` on hover
- Icon: Material Symbols Outlined, 16–20px
- Active state: `var(--primary)` icon color + glow-pulse animation

### Cards & Containers

**Dashboard Card (`.card-base`)**
- Background: `var(--surface-container-high)` (`#201f1f`)
- Border: `1px solid var(--ghost-border)` OR shadow-border: `var(--shadow-border)`
- Radius: `var(--radius-xl)` (12px)
- Transition: `transform`, `box-shadow` at 200ms ease
- Hover: `transform: translateY(-2px)`, `box-shadow: var(--shadow-ambient)`

**Translucent Card (sidebar, pinned pages)**
- Background: `var(--surface-translucent)` → hover `var(--surface-translucent-hover)` → active `var(--surface-translucent-active)`
- Border: `1px solid var(--border-subtle)` (primary-tinted)
- Radius: `var(--radius-lg)` (8px)

**Glass Panel (`.glass-panel`)**
- Background: `rgba(32, 31, 31, 0.6)`
- Backdrop filter: `blur(20px)`
- Border: `1px solid var(--ghost-border)`
- Use: floating panels, popovers

### Inputs & Forms

**Command Bar Input**
- Background: `var(--command-bar-bg)` (primary-tinted translucent)
- Border: `1px solid var(--command-bar-border)` (primary-tinted)
- Radius: `10px` (between lg and xl)
- Font: Geist Mono 13px weight 400 (URL mode) / Manrope 13px (search mode)
- Padding: `12px` vertical, no horizontal padding on input itself (wrapper provides 12px)

**Toggle / Segmented**
- Active: `background: var(--primary)`, `color: var(--on-primary)`
- Inactive: `background: var(--bg-hover)`, `color: var(--on-surface-variant)`
- Radius: `var(--radius-full)` (9999px pill)

**Range Slider Thumb**
- Size: `16px × 16px` WebKit / `14px × 14px` Moz
- Background: `var(--primary)`
- Border: `2px solid var(--surface-container-high)`
- Ring: `0 0 0 1px var(--primary-dim)` (WebKit)
- Focus: `0 0 0 3px rgba(206, 250, 5, 0.4)`

### Sidebar

- Width: `60px` collapsed (`--sidebar-width`), `240px` expanded (`--sidebar-width-wide`)
- Transition: `width 200ms ease`
- Background: `.sidebar-glass` — translucent primary-tinted + 30px backdrop blur + `border-right: 1px solid var(--border-subtle)`
- Collapsed rail shows: space dots, nav controls, pinned page icons, user avatar at bottom
- Expanded drawer adds: space labels, pinned page titles, tab list, command bar

### Dialogs / Modals

- Backdrop: `var(--surface-overlay-dim)` (rgba 0,0,0,0.5) at `z-backdrop` (40)
- Dialog: centered, `max-width: min(420px, calc(100vw - 48px))`, `padding: 24px`
- Background: `var(--surface-container-high)` (`#201f1f`)
- Border: `1px solid var(--border-subtle)` (primary-tinted) OR `var(--shadow-card-elevated)`
- Radius: `var(--radius-xl)` (12px)
- z-index: `var(--z-modal)` (60)
- Focus management: focus the primary action on open, restore on close
- Escape key closes, backdrop click closes

### Badges

**Active Badge (`.badge-active`)**
- Background: `var(--primary)`
- Text: `var(--on-primary)`
- Padding: `2px 10px`
- Radius: `var(--radius-full)` (9999px)
- Font: Space Grotesk 0.6rem weight 700 uppercase letter-spacing 0.08em

**Shortcut Hint**
- Background: `rgba(255, 255, 255, 0.06)` or transparent
- Border: `1px solid var(--border-interactive)`
- Padding: `2px 6px`
- Radius: `var(--radius-sm)` (2px) or `var(--radius-md)` (4px)
- Font: Geist Mono 10–11px weight 500 uppercase

## 5. Layout Principles

### Spacing System
- Base unit: `4px` (Tailwind default — `p-1` = 4px)
- Common scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`
- Use Tailwind utilities (`p-2`, `gap-3`, `mt-6`) — match tokens to pixel values.

### Grid & Container
- Sidebar: fixed `60px` or `240px` column (CSS var-driven width)
- Content area: fills remaining viewport, content-first
- Dashboard: 3-column feature grid on desktop, 2-column on tablet, 1-column on mobile
- Command bar: centered, `max-width: 600px` in expanded mode

### Whitespace Philosophy
- **Dark-surface density**: the dark canvas lets elements sit closer without feeling cluttered. Card-to-card gutters are 16–24px, not 48px+.
- **Sidebar is sparse, content is dense.** The 60px rail is minimalist; the expanded drawer is efficient. The content area (where the webview renders) is left untouched — no chrome.
- **Modals breathe.** Dialogs use 24px padding on all sides, 20px between sections.

### Border Radius Scale
- **Sharp (2px)** `--radius-sm`: Inline code, tiny badges, shortcut hints
- **Subtle (4px)** `--radius-md`: Small containers, focus outlines
- **Standard (8px)** `--radius-lg`: Buttons, secondary cards, inputs
- **Comfortable (12px)** `--radius-xl`: Dashboard cards, dialogs, command bar panels
- **Full pill (9999px)** `--radius-full`: Badges, toggles, progress bars

### Z-Index Scale (use `--z-*` tokens, not hardcoded)
- `--z-base` (1): Default stacking
- `--z-card` (10): Elevated cards
- `--z-sidebar` (30): Sidebar rail + drawer
- `--z-backdrop` (40): Modal backdrops
- `--z-drawer` (50): Slide-in drawers (history, tab drawer)
- `--z-modal` (60): Dialogs, confirms
- `--z-skip` (100): Skip-to-content a11y link

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (0) | No shadow, no ring | Page background, body text |
| Ring (1) | `var(--shadow-border)` — `0 0 0 1px rgba(255,255,255,0.06)` | Shadow-border replacement for CSS border on cards |
| Tinted Ring (1b) | `1px solid var(--border-subtle)` (primary-tinted) | Sidebar items, translucent surfaces |
| Standard Card (2) | `var(--shadow-card)` — ring + `0 2px 2px rgba(0,0,0,0.24)` | Dashboard cards at rest |
| Hover Lift (3) | `translateY(-2px)` + `var(--shadow-ambient)` — `0 8px 24px rgba(0,0,0,0.30)` | Card hover |
| Elevated (4) | `var(--shadow-card-elevated)` — ring + ambient + `0 8px 16px -8px rgba(0,0,0,0.4)` | Dialogs, raised panels |
| Focus (A11y) | `outline: 2px solid var(--primary)`, offset `2px` | Keyboard focus on ALL interactive elements |
| Glow (Signature) | `0 0 14px rgba(206, 250, 5, 0.4-0.6)` pulsing | Active sidebar icon only |

**Depth philosophy**: Depth in Obsidian Monolith comes primarily from **surface tone shift** (`--surface-container-low` → `--surface-container-high`), not from shadows. Shadows are used sparingly for (a) card hover, (b) dialog elevation, (c) the glow-pulse signature. Borrow Vercel's shadow-as-border technique for crisp card outlines without the box-model awkwardness.

## 7. Do's and Don'ts

### Do
- Use `#CEFA05` as the single interactive accent — active, focused, selected, primary CTA.
- Use primary-tinted translucent surfaces (`--surface-translucent-*`) for Arc-style sidebar interactions.
- Use CSS custom properties (`var(--primary)`) in `style={{ ... }}` props — don't hardcode hex values.
- Use `.font-headline` / `.font-body` / `.font-label` / `.font-mono` utility classes to signal typographic intent.
- Use uppercase + letter-spacing (0.08em+) for ALL labels, badges, and button text.
- Use `var(--z-*)` tokens for z-index — don't hardcode Tailwind `z-40` / `z-50`.
- Use `var(--shadow-border)` instead of `border: 1px solid ...` for new cards where a crisp 1px line is needed.
- Use Geist Mono for URLs, shortcuts, and any technical metadata.
- Always include a visible focus ring using `var(--primary)` — accessibility is non-negotiable.
- Honor `prefers-reduced-motion` — all animations in this system already do.

### Don't
- Don't introduce a second accent color. Neon green is the *only* interactive color. Warnings use `--error`; everything else is mono.
- Don't use pure black (`#000000`) as the main surface — use `--surface` (`#0e0e0e`). The `#0e0e0e` micro-warmth matters.
- Don't hardcode `rgba(206, 250, 5, ...)` — use `--surface-translucent-*` or `--border-subtle/active` tokens.
- Don't mix Tailwind color utilities (`text-gray-400`) with design tokens — always use tokens.
- Don't use aggressive *negative* letter-spacing (that's Vercel, not us). Our system uses *positive* tracking on uppercase labels.
- Don't use `border` when a shadow-border (`var(--shadow-border)`) would avoid subpixel artifacts on rounded corners.
- Don't apply glow/glow-pulse decoratively. It marks exactly one thing: the active sidebar space icon.
- Don't use Manrope for labels or Space Grotesk for body. They have specific roles.
- Don't use low-opacity primary (alpha < 0.5) for text — use `--primary-muted-accessible` (`#a8c804`) for WCAG AA text.
- Don't put chrome over the webview content area. The browser's value is the page, not our UI.

## 8. Responsive Behavior

Nsty Browser is primarily a **desktop Electron app** — the browser window can be as small as ~800×600 but the design targets ≥1280px. There is no true mobile layout. The sidebar collapses to 60px when window is narrow, and the dashboard grid reflows.

### Breakpoints (approximate, Tailwind-aligned)
| Name | Width | Key Changes |
|------|-------|-------------|
| Narrow | <1024px | Sidebar force-collapsed to 60px, dashboard 1-column |
| Standard | 1024–1440px | Default layout, sidebar toggleable |
| Wide | >1440px | Dashboard 3-column, expanded sidebar recommended |

### Sidebar Responsive
- Always 60px rail visible; never fully hidden.
- Expanded state (240px) is user-toggleable via `onToggleExpand`.
- Content area width adjusts smoothly (200ms ease) as sidebar width changes.

### Dialog Responsive
- `max-width: min(420px, calc(100vw - 48px))` — always 24px from viewport edges.
- Backdrop always covers full viewport.

### Touch Targets
- Although desktop-first, minimum touch targets: 32×32px for icon buttons, 40px for text buttons.
- Sidebar rail buttons are 32×32px — acceptable for pointer use.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA fill: `var(--primary)` (`#CEFA05`)
- Primary CTA text: `var(--on-primary)` (`#526500`)
- Page background: `var(--surface)` (`#0e0e0e`)
- Card background: `var(--surface-container-high)` (`#201f1f`)
- Primary text: `var(--on-surface)` (`#ffffff`)
- Secondary text: `var(--on-surface-variant)` (`#adaaaa`)
- Border (primary-tinted): `var(--border-subtle)` (`rgba(206, 250, 5, 0.08)`)
- Border (shadow-style): `var(--shadow-border)` (`0 0 0 1px rgba(255,255,255,0.06)`)
- Focus ring: `var(--primary)` (`#CEFA05`)
- Error/danger: `var(--error)` (`#ff7351`)

### Example Component Prompts
- **Card**: "Create a card with `background: var(--surface-container-high)`, `border-radius: var(--radius-xl)` (12px), `box-shadow: var(--shadow-card)`. Title uses `.font-headline` at 16px weight 600, body uses `.font-body` at 13px weight 400 with `color: var(--on-surface-variant)`. Hover: `translateY(-2px)` + `var(--shadow-ambient)`."
- **Primary button**: "Button with `background: var(--primary)`, `color: var(--on-primary)`, `padding: 8px 16px`, `border-radius: var(--radius-lg)`, `.font-label` class (Space Grotesk), font-size 11px, font-weight 700, uppercase, letter-spacing 0.08em. Hover: `background: var(--primary-dim)`. Focus: `outline: 2px solid var(--primary)`, `outline-offset: 2px`."
- **Sidebar pinned page**: "Clickable row with `background: var(--surface-translucent)`, hover `var(--surface-translucent-hover)`, active `var(--surface-translucent-active)`. `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-lg)`. Favicon 14×14 left, `.font-body` label at 12px truncated."
- **URL input**: "Input inside command bar: `background: var(--command-bar-bg)`, `border: 1px solid var(--command-bar-border)`, `border-radius: 10px`, `padding: 12px`. Use `.font-mono` class (Geist Mono) at 13px weight 400 for URL text."
- **Dialog**: "Fixed centered dialog with `background: var(--surface-container-high)`, `padding: 24px`, `border-radius: var(--radius-xl)`, `box-shadow: var(--shadow-card-elevated)`, `z-index: var(--z-modal)`. Backdrop: `background: var(--surface-overlay-dim)`, `z-index: var(--z-backdrop)`. Title `.font-headline` 16px weight 600, message `.font-body` 13px `color: var(--on-surface-variant)`, buttons right-aligned with 8px gap."
- **Active badge**: "`.badge-active` class — `background: var(--primary)`, `color: var(--on-primary)`, `padding: 2px 10px`, `border-radius: var(--radius-full)`, Space Grotesk 0.6rem weight 700 uppercase letter-spacing 0.08em."

### Iteration Guide
1. **Tokens first** — never hardcode colors/sizes. If a token doesn't exist, add it to `globals.css` before using it.
2. **Single accent** — neon green `#CEFA05` is the only interactive color. If a designer asks for "a nice blue here," push back.
3. **Three weights** — 400 (read), 500 (UI), 600 (emphasis). Use 700 only for tiny uppercase labels.
4. **Uppercase labels always get tracking** (0.08em+).
5. **Shadow-border > CSS border** for crisp 1px outlines on rounded cards. Use `var(--shadow-border)`.
6. **Glassmorphism is for floating/translucent panels only** (`.glass-panel`, `.sidebar-glass`). Don't apply it to everyday cards.
7. **Geist Mono signals "this is technical"** — URLs, code, keyboard shortcuts, timestamps. Everywhere else: Space Grotesk or Manrope.
8. **Focus rings are brand** — `2px solid var(--primary)` with `outline-offset: 2px`. Never remove focus styles.
9. **Honor `prefers-reduced-motion`** — the global rule in `globals.css` already disables animations; don't override.
10. **The page is sacred** — chrome never covers the webview content area unless explicitly user-triggered (command bar, dialog).

---

**Last updated:** 2026-04-17 — design system v1 (Obsidian Monolith + Vercel-inspired shadow-border technique)
