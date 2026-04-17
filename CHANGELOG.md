# Changelog

## v0.4.1 (2026-04-17) — Design system documentation and token migration

Formalizes the "Obsidian Monolith" design system as an agent-consumable reference
and borrows three techniques from Vercel's Geist system without swapping the
dark/neon-green aesthetic.

### Design system
- New `DESIGN.md` at project root — 9-section getdesign.md-format reference
  covering colors, typography, components, spacing, elevation, do's/don'ts,
  responsive behavior, and agent prompt guide. Agents must consult this file
  before writing UI.
- New tokens in `globals.css`:
  - `--primary-rgb`, `--neutral-rgb` — RGB channel vars enabling
    `rgba(var(--primary-rgb), X)` at arbitrary alpha without hardcoding hex
  - `--shadow-border`, `--shadow-card`, `--shadow-card-elevated`,
    `--shadow-ambient`, `--shadow-focus-ring` — Vercel-inspired shadow-as-border
    stack that avoids subpixel artifacts on rounded corners
  - `.card-ring` and `.shadow-border` utility classes
- Geist Mono font family loaded (400/500/600 with OpenType `liga` + `tnum`);
  `.font-mono` utility class for URLs, code, timestamps, technical labels
- Command bar URL input migrated to `.font-mono` — matches developer-browser
  convention (Raycast, Warp, Arc)

### Refactor
- 30 hardcoded `rgba(206, 250, 5, …)` across 13 components migrated to either
  `rgba(var(--primary-rgb), …)` or a semantic token
  (`--surface-translucent`, `--border-subtle`, etc.) where opacity matches
- 16 hardcoded `rgba(255, 255, 255, …)` across 7 components migrated to
  `rgba(var(--neutral-rgb), …)`
- 7 Tailwind `z-40` / `z-50` / `z-10` classes migrated to
  `z-[var(--z-sidebar/backdrop/drawer/card)]` arbitrary-var syntax
- Sidebar z-index corrected from 40 to `var(--z-sidebar)` (30) — modal
  backdrops at `var(--z-backdrop)` (40) now reliably layer above the sidebar
  instead of relying on DOM render order

## v0.4.0 (2026-04-17) — Production-readiness release

Closes the 6 foundation gaps identified in the production-readiness audit.
All changes gated by CI lint + test + build.

### Security
- Enable main-window `sandbox: true`
- Strict Content-Security-Policy injected via `session.webRequest.onHeadersReceived`
- `safeOn` / `safeHandle` IPC wrappers validate `event.senderFrame.url` against an app:// + localhost:5173 allowlist
- Navigation guard blocks `javascript:`, `file:`, `data:`, `chrome:` on every BrowserView and the shell; new-window requests denied with https fallback to `shell.openExternal`
- Resolves 6 npm audit findings (xmldom, brace-expansion, electron, lodash, vite, and `@anthropic-ai/sdk` 0.80 → 0.90 path-validation CVE)

### Observability
- `createLogger(module)` in both main and renderer — tagged levels, ISO timestamps, JSON context, appends to `userData/nsty-debug.log` on main
- React `ErrorBoundary` wraps `<App/>` with Obsidian-styled fallback + Reload CTA
- Main-process crash handlers: `uncaughtException`, `unhandledRejection`, `render-process-gone`, `child-process-gone`
- All ad-hoc `console.*` replaced with structured logger calls

### Accessibility (WCAG 2.1 AA)
- `useFocusTrap` hook applied to `HistoryPanel`, `ShieldPopup`, and the new `ConfirmDialog`
- `useReducedMotion` hook gates the sidebar margin-left JS transition
- `<aside>` → `<nav aria-label="Workspaces and tabs">` semantic landmark
- `SkipToContent` component rendered as first child of `App.tsx`
- `type="button"` added to 20 previously-untyped buttons
- `aria-label` on CommandBar, HistoryPanel, and SettingsCommandList inputs
- `TabItem` outer `<div onClick>` restructured to sibling `<button>`s with proper labels and discoverability tooltip
- `vitest-axe` smoke test asserts zero violations on `SkipToContent`, `ConfirmDialog`, `ErrorBoundary`

### Design system
- New tokens: `--border-interactive`, `--primary-muted-accessible`, `--surface-overlay-dim`
- Fade-up cards now render visible under `prefers-reduced-motion`
- `ConfirmDialog` replaces `window.confirm` in `PinnedPages`
- `HistoryPanel` width responsive to narrow viewports (`min(560px, 100vw - 120px)`)
- `::-webkit-slider-thumb` + `::-moz-range-thumb` styling for `SettingsSlider`
- JS hover handlers migrated to CSS `:hover` in `HistoryPanel`, `UserMenu`, `QuickAccessCard`
- `SpaceDots` no longer renders a non-functional "+ new space" button
- Sidebar header collapses its dual-toggle into a single affordance per state

### Tooling
- Biome 2.4 with strict rules + test-file overrides; `husky` + `lint-staged` pre-commit gate
- Tightened tsconfig: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `noImplicitOverride`
- New `.github/workflows/ci.yml` runs lint + test + build on every PR
- Dependabot config: weekly grouped updates (electron, react, anthropic, dev-tooling, dnd)
- `vitest.config.ts` unifies test discovery across main/renderer (was previously silently skipping 19 of 47 test files)
- jsdom environment for all tests; `@testing-library/react` + `vitest-axe` added

### Metrics
- 94 → 115 tests, 28 → 55 test files
- 0 npm audit findings (was 6)
- 23 lint warnings → 4 (remaining are intentional deferrals)

## v0.3.1 (2026-03-29)

### Fixes
- Address code review findings — controlled input, null safety, favicon fallback

### Refactors
- Add accessibility improvements across all UI components (aria-labels, focus-visible, reduced-motion, role="dialog", skip-to-content, form labels, alt text)
- Address code review findings for accessibility pass (API key aria-label, animation:none, ghost border contrast)
- Improve touch targets, responsive grid, and z-index scale
- Address Wave 2-3 review — tab close button size, z-index docs
- Polish animations (ease-out), typography (line-height), and lazy loading
- Redesign UI with card-based dashboard and collapsible sidebar

### Chores
- Add project CLAUDE.md and settings from insights report

## v0.3.0 (2026-03-28)

- Initial Obsidian Monolith release
- Card-based dashboard with Shield status, quick access, and feature cards
- Collapsible sidebar with workspace navigation
- Glassmorphism design system with neon green accent
