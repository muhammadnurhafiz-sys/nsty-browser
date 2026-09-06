# Changelog

## v0.6.2 (2026-09-06) — Android: private-tab bug, tab switcher, browser fixes

Findings from a frame-by-frame review of the tester's screen recording.

- The `+` button always opened a private tab (the press event leaked into the `privateTab`
  parameter). Normal tabs open again, with a slide-in and a "New tab" toast.
- Private mode is now visible: purple chrome, a PRIVATE chip in the address bar, and a private
  landing page. Closing the last private tab says "Left private browsing".
- Tab switcher opens on the active tab's section, cards swipe sideways to close, "Close all"
  per section, thumbnails captured on load and before leaving a tab.
- Address bar accepts `localhost:3000` and `host:port`, and searches "word: text" instead of
  rejecting it.
- Back/forward state is per tab; the hardware back button no longer exits the app after a
  tab switch. A crashed tab remounts its WebView on reload.
- `target=_blank` links open a new tab; `intent:`/`market:` and other app links prompt
  "Open in another app?" instead of being dropped.
- Page content is no longer hidden behind the toolbar; the tab counter shows the active kind;
  desktop site is per tab; find-in-page has previous/next and a match count.
- Only the active tab plus the three most recent keep live WebViews; others reload on return.
- Extensions row is informational; site information hides inert rows on a new tab; About shows
  the real version.

## v0.6.1 (2026-09-06) — Windows launch crash, Android release APK

- Windows installers built on the VPS shipped a Linux `better_sqlite3.node`; the app closed at
  startup. An electron-builder afterPack hook now installs the Windows prebuilt, and the
  database driver loads lazily with a clear error instead of crashing the main process.
- Android: the VPS artifact is now a bundled `assembleRelease` APK. The earlier debug APKs had no
  JavaScript bundle and closed on launch.

## v0.6.0 (2026-09-06) — UX round 1: desktop and mobile

### Desktop
- Dialogs no longer blank the page: main captures the active page when an overlay opens and
  the shell blurs it behind the glass dialog.
- Tabs show favicons, a loading ring and an audio indicator.
- Sidebar collapses to a 64px favicon rail (persisted); the renderer reports its content rect
  to main instead of main hardcoding the geometry.
- Spaces have positional colours; the active space tints the sidebar edge and the active tab.
- Downloads appear as a toolbar pill with a progress ring and a popover.
- Omnibox suggestions query bounded history plus bookmarks, with arrow-key navigation.
- Find in page shows "n of m".

### Android
- Address bar shows the domain with a lock and a load-progress bar; tapping edits the full URL.
- Translucent bottom toolbar that hides while scrolling down and returns on scroll up.
- Full-screen tab switcher with page thumbnails, a Tabs | Private control and a floating new tab.
- Private tabs use an incognito WebView and never enter history or the saved session.
- New tab page shows recent tabs, top sites from history and bookmarks.

## v0.5.1 (2026-09-06) — Review follow-ups, user spaces, dependency bumps

### Desktop
- User-defined spaces: create and remove workspaces from the sidebar; tabs of a removed
  space move to the first space. Spaces persist across restarts.
- History no longer rides inside every snapshot; the History panel queries a bounded
  search (`browser:history`) and snapshots keep the 20 most recent entries.
- `browser-state.json` is versioned. Files written by a newer build or malformed files
  are backed up instead of silently overwritten.
- Unpacked extensions are copied into `userData/extensions`; only those paths are restored.
- AI and updater IPC use the same exact-origin shell check as the browser service.
- Tab views migrated from the deprecated BrowserView to WebContentsView.
- Snapshot sends are coalesced per event-loop turn; toolbar controls stay reachable below
  1000px; error toast no longer covers the sidebar settings control.
- Removed the superseded sidebar/top bar/tab manager/shield modules and their tests.

### Dependencies
- Electron 42.11, electron-builder 26.15, React 19.2.8, TypeScript 6.0.3, Vite 8.2,
  Vitest 4.1.11, Biome 2.5, Tailwind 4.3, lint-staged 17, jsdom 29.1, better-sqlite3 12.11,
  Anthropic SDK 0.91. GitHub Actions: checkout 6, setup-node 6, upload-artifact 7,
  download-artifact 8, action-gh-release 3.

## v0.5.0 (2026-09-06) — Main-owned browser engine, Liquid Glass shell, Android app

Completes the browser implementation planned in `docs/implementation/browser-completion.md`.

### Desktop
- `BrowserService` (main process) now owns all browser state: tabs with real IDs,
  isolated browsing sessions (private tabs never persist), Shield with per-site
  exceptions and per-tab attribution, downloads, unpacked extensions, site
  permissions, history/bookmarks, find, zoom, print, save page, persistence.
- Renderer replaced by `BrowserShell`: snapshot-driven chrome with omnibox
  suggestions, spaces, favorites, tabs, Shield/extensions/downloads/menu panels,
  settings, permission prompts. IPC validates exact shell identity and payloads.
- Themes: Graphite + Sage (dark) and Warm Paper (light), follow-system by default.
  Liquid Glass treatment on dialogs, suggestions, find bar and toasts.
- Frameless window keeps native Windows/Linux caption buttons on the toolbar.
- Removed global keyboard shortcuts; shortcuts are handled in-process.

### Android
- New `mobile/` Expo + Android System WebView app with the same two palettes:
  tabs, bookmarks, history, find, desktop-site toggle, optional cosmetic Shield.
  Extensions and private browsing are reported as unavailable in-product.

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
