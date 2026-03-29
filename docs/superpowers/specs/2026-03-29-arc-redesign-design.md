# Nsty Browser Arc-Inspired Redesign — Design Spec

## Context

Nsty Browser currently uses the "Obsidian Monolith" design — dark opaque surfaces, neon green (#CEFA05) accent, hex logo, floating glass top bar, and a separate tab drawer. The user wants to adopt Arc browser's layout and interaction patterns (sidebar-first, minimal chrome, command palette) while preserving Nsty's green identity and existing feature set (shield, AI, spaces, settings).

## Design Decisions (User-Confirmed)

| Decision | Choice |
|----------|--------|
| Layout | Full Arc sidebar-first: tabs in sidebar, no top bar |
| Settings | Command palette style (searchable, via command bar) |
| Identity | Keep neon green #CEFA05 + hex logo, green-tinted gradients per space |
| AI access | Command palette integration (`@claude` triggers chat mode) |
| Dashboard | Rich dashboard restyled with Arc translucent glass aesthetic |
| Space switching | Colored dots at sidebar bottom |
| Nav controls | Small (20px), subtle — back/forward/reload in sidebar |
| Implementation | Phased — 4 waves |

---

## 1. New Sidebar Layout

The sidebar replaces both the current sidebar AND the top bar. It becomes the single navigation hub.

**Width:** 240px expanded, 60px collapsed (icon-only mode). Transition: 200ms ease.

**Sections (top to bottom):**

### 1.1 Header (drag region)
- Hex logo (24px) + "NSTY" wordmark (monospace, 13px, #CEFA05, uppercase, letter-spacing 0.15em)
- Sidebar collapse toggle button (right side)
- Entire header is `-webkit-app-region: drag` for window dragging

### 1.2 Command Bar
- Replaces the current AddressBar in TopBar
- Pill-shaped input: `rgba(206,250,5,0.06)` background, `rgba(206,250,5,0.12)` border, 10px radius
- Placeholder: "Search, URL, or @claude..."
- Search icon (Material Symbols, 14px) prefix
- **Modes:**
  - **Default**: URL input + search (same logic as current AddressBar — auto-detect URL vs search query)
  - **`@claude` prefix**: Switches to AI chat mode (inline streaming responses below the input)
  - **`/settings` prefix**: Opens searchable settings list
  - **Tab search**: Type to filter open tabs (shown inline as results)
- Keyboard shortcut: `Ctrl+L` or `Ctrl+T` focuses command bar

### 1.3 Navigation Controls
- Row of icon buttons: Back, Forward, Reload + Shield badge
- **Size: 20px icons** in 24px hit targets, `rgba(206,250,5,0.05)` background on hover
- Shield icon has badge (same as current TopBar) showing blocked count
- Shield click opens ShieldPopup (positioned relative to sidebar, not top bar)

### 1.4 Pinned Section
- Label: "Pinned" (10px, uppercase, `rgba(206,250,5,0.35)`, letter-spacing 0.12em)
- Horizontal grid of favicon squares (32px, 8px radius)
- Drag-and-drop reorder (keep existing @dnd-kit integration)
- "+" button to pin current tab
- Right-click context menu to unpin

### 1.5 Today Tabs (scrollable, flex-1)
- Label: "Today" (same style as Pinned label)
- Vertical list of open tabs:
  - Favicon (14px, 3px radius) + title (12px, ellipsis truncation) + close button (×, 10px)
  - Active tab: `rgba(206,250,5,0.1)` background + `rgba(206,250,5,0.15)` border
  - Inactive tab: transparent, text at 0.5 opacity
  - Hover: show close button (hidden by default, opacity transition)
  - Click: switch tab. Middle-click: close. Right-click: pin
- Scrollable overflow with hidden scrollbar (`::-webkit-scrollbar { display: none }`)

### 1.6 New Tab Button
- "+ New Tab" text link, `rgba(206,250,5,0.5)` color
- Click opens dashboard in a new tab

### 1.7 Bottom Bar
- **Space dots** (left): 20px colored circles with green-tinted gradients
  - Active space: full opacity + 2px border `rgba(206,250,5,0.4)`
  - Inactive: 0.4 opacity
  - "+" dashed circle to create new space (14px)
  - Click to switch space (changes tab list + pinned pages)
- **User avatar** (right): 26px circle, initials fallback, `rgba(206,250,5,0.1)` background
  - Click opens UserMenu dropdown

### 1.8 Collapsed State (60px)
When collapsed, show only:
- Hex logo (no wordmark)
- Command bar becomes a search icon button (click to expand sidebar temporarily)
- Nav controls as icon-only
- Pinned as favicon-only grid
- Tabs as favicon-only vertical list (no titles)
- Space dots + avatar at bottom

---

## 2. Top Bar Removal

The current `TopBar.tsx` component is **removed entirely**. Its responsibilities migrate:

| TopBar Element | New Location |
|---------------|-------------|
| Back/Forward/Reload | Sidebar nav controls (section 1.3) |
| AddressBar | Sidebar command bar (section 1.2) |
| Space tabs | Sidebar space dots (section 1.7) |
| Shield icon + badge | Sidebar nav controls (section 1.3) |
| AI toggle button | Command bar `@claude` mode (section 1.2) |

**Content area** becomes full-width, full-height (no 52px top offset). The `--topbar-height` CSS variable is removed.

---

## 3. Command Palette

A unified interface accessed through the sidebar command bar.

### 3.1 URL / Search Mode (default)
- Same behavior as current AddressBar: auto-detect URL vs search query
- Enter navigates to URL or searches Google
- Escape cancels and blurs

### 3.2 AI Chat Mode (`@claude`)
- Triggered when user types `@claude` (or `@` shortcut)
- Command bar expands into a chat panel within the sidebar:
  - Input stays at top of expanded area
  - Streaming responses appear below in a scrollable area
  - Max height: 60% of sidebar height
  - Model selector accessible via command (e.g., `@claude /opus`)
- Replaces the current AiPanel.tsx right-side panel entirely
- Chat history persists per session
- Press Escape or click outside to collapse back to command bar

### 3.3 Settings Mode (`/settings`)
- Triggered when user types `/settings` or `/` prefix
- Shows searchable list of all settings inline below command bar
- Each setting row: icon + name + description + control (toggle/dropdown/slider)
- Categories shown as section headers (Interface, Privacy, AI, Extensions, About)
- Type to filter settings by name
- Toggle/change settings directly inline
- Press Escape to close

### 3.4 Tab Search Mode
- Triggered when typing with open tabs matching the query
- Shows matching tabs as results below command bar
- Click or Enter to switch to tab
- Results show favicon + title + URL preview

---

## 4. Dashboard Restyle

Keep all current dashboard features but restyle with Arc's translucent glass aesthetic.

### 4.1 Layout
- Centered content, max-width 480px
- Greeting: "Good morning/afternoon/evening, {name}" (14px, `rgba(206,250,5,0.6)`)
- No search bar on dashboard (command bar in sidebar replaces it)

### 4.2 Shield Stats Cards
- 2-column grid: "Ads Blocked" count + "Effectiveness" percentage
- Card style: `rgba(206,250,5,0.04)` background, `rgba(206,250,5,0.1)` border, 12px radius
- Numbers: 24px, #CEFA05, font-weight 600
- Labels: 10px, `rgba(255,255,255,0.4)`

### 4.3 Recent Tabs Card
- Full-width card with "Recent" label (same card style)
- List of recent tab titles (12px, `rgba(255,255,255,0.6)`)
- Dividers: `rgba(206,250,5,0.05)`
- Click to reopen tab

### 4.4 Removed Elements
- Dashboard search bar (replaced by sidebar command bar)
- FeatureCard ("Browse with Confidence" marketing card) — remove, not needed
- HexIcon on dashboard — logo is now in sidebar header

---

## 5. Design Tokens (CSS Variables)

### 5.1 New/Changed Variables
```css
/* Remove */
--topbar-height: (deleted)

/* Update */
--sidebar-width: 240px        /* was 240px — keep */
--sidebar-width-collapsed: 60px /* was 60px — keep */

/* New: space gradient system */
--space-gradient-1: linear-gradient(135deg, #1a3a0a, #2d5a1a)
--space-gradient-2: linear-gradient(135deg, #0a2a1a, #1a4a3a)
--space-gradient-3: linear-gradient(135deg, #1a2a0a, #3a4a0a)

/* New: translucent surfaces (replacing opaque) */
--surface-translucent: rgba(206,250,5,0.03)
--surface-translucent-hover: rgba(206,250,5,0.06)
--surface-translucent-active: rgba(206,250,5,0.1)
--border-subtle: rgba(206,250,5,0.08)
--border-active: rgba(206,250,5,0.15)

/* New: command bar */
--command-bar-bg: rgba(206,250,5,0.06)
--command-bar-border: rgba(206,250,5,0.12)

/* Keep unchanged */
--primary: #CEFA05
--surface: #0e0e0e
--on-surface: #ffffff
--on-surface-variant: #adaaaa
/* (all other existing tokens stay) */
```

### 5.2 Background
- Main window background: `linear-gradient(135deg, #0a1a0a 0%, #132613 40%, #0d1f0d 80%, #0a150a 100%)`
- This is the default space gradient (green-tinted). Each space can override.
- Sidebar: `--surface-translucent` with `backdrop-filter: blur(30px)`

---

## 6. Components Affected

### 6.1 Modified (major changes)
| Component | Changes |
|-----------|---------|
| `Sidebar.tsx` | Complete rewrite — becomes the primary navigation hub with all sections |
| `App.tsx` | Remove TopBar, remove AI panel, adjust layout (no top offset) |
| `Dashboard.tsx` | Restyle cards, remove search bar, remove FeatureCard |
| `globals.css` | New design tokens, remove topbar vars, add translucent surfaces |

### 6.2 New Components
| Component | Purpose |
|-----------|---------|
| `CommandBar.tsx` | Universal command palette (URL + search + @claude + /settings + tab search) |
| `CommandResults.tsx` | Dropdown results panel for command bar |
| `SettingsCommandList.tsx` | Inline settings list for /settings mode |
| `AiChatInline.tsx` | Inline AI chat for @claude mode (replaces AiPanel) |
| `SpaceDots.tsx` | Space switcher dots at sidebar bottom |
| `NavControls.tsx` | Back/forward/reload + shield badge row |

### 6.3 Removed Components
| Component | Reason |
|-----------|--------|
| `TopBar.tsx` | Replaced by sidebar sections |
| `AddressBar.tsx` | Replaced by CommandBar |
| `AiPanel.tsx` | Replaced by AiChatInline in command bar |
| `ChatMessage.tsx` | Rebuilt into AiChatInline |
| `ChatInput.tsx` | Merged into CommandBar |
| `ModelSelector.tsx` | Becomes command (`@claude /opus`) |
| `TabDrawer.tsx` | Tabs are now always visible in sidebar |
| `FeatureCard.tsx` | Removed from dashboard |

### 6.4 Minor Restyling
| Component | Changes |
|-----------|---------|
| `ShieldStatusCard.tsx` | Restyle with translucent glass tokens |
| `QuickAccessCard.tsx` | Restyle with translucent glass tokens |
| `ShieldPopup.tsx` | Reposition to appear from sidebar, restyle |
| `HistoryPanel.tsx` | Restyle with translucent glass, integrate into command bar as future enhancement |
| `SettingsPanel.tsx` | Remove — replaced by command palette settings |
| `SettingsToggle.tsx` | Keep, restyle for inline command palette use |
| `SettingsSlider.tsx` | Keep, restyle for inline command palette use |
| `SettingsSegmented.tsx` | Keep, restyle for inline command palette use |
| `TabItem.tsx` | Restyle for sidebar inline display |
| `TabList.tsx` | Restyle, remove drawer animation |
| `PinnedPages.tsx` | Restyle as horizontal favicon grid |
| `UserMenu.tsx` | Restyle, reposition from sidebar bottom |

---

## 7. Implementation Waves

### Wave 1: Design Tokens + Sidebar Shell
**Files:** `globals.css`, `Sidebar.tsx`, `NavControls.tsx`, `SpaceDots.tsx`, `TabItem.tsx`, `TabList.tsx`, `PinnedPages.tsx`
- Update CSS variables (translucent surfaces, gradients, remove topbar height)
- Rebuild Sidebar with all sections (header, pinned, tabs inline, nav controls, space dots)
- Nav controls (back/forward/reload at 20px + shield badge)
- Space dots at bottom
- Tabs display inline in sidebar (no drawer)
- **Verify:** Sidebar renders with tabs, pins, nav, spaces. TopBar still exists (removed in Wave 2).

### Wave 2: Remove TopBar + Layout Shift
**Files:** `App.tsx`, `TopBar.tsx` (delete), `AddressBar.tsx` (delete), `TabDrawer.tsx` (delete)
- Remove TopBar from App.tsx render
- Remove `margin-top: var(--topbar-height)` from content area
- Content area becomes full-height
- Delete TopBar, AddressBar, TabDrawer components
- **Verify:** Browser works with sidebar-only navigation. Content fills full window. Back/forward/reload work from sidebar.

### Wave 3: Command Palette
**Files:** `CommandBar.tsx` (new), `CommandResults.tsx` (new), `SettingsCommandList.tsx` (new), `AiChatInline.tsx` (new), `AiPanel.tsx` (delete), `ChatMessage.tsx` (delete), `ChatInput.tsx` (delete), `ModelSelector.tsx` (delete), `SettingsPanel.tsx` (delete)
- Build CommandBar with mode detection (URL, search, @claude, /settings, tab filter)
- AI chat inline with streaming (port logic from useAi hook)
- Settings as searchable inline list (port settings from SettingsPanel)
- Tab search with fuzzy matching
- Delete old AI panel and settings panel components
- **Verify:** Can navigate URLs, search Google, chat with Claude, change settings, filter tabs — all from command bar.

### Wave 4: Dashboard + Polish
**Files:** `Dashboard.tsx`, `ShieldStatusCard.tsx`, `QuickAccessCard.tsx`, `FeatureCard.tsx` (delete), `ShieldPopup.tsx`, `HistoryPanel.tsx`, `globals.css`
- Restyle dashboard cards with translucent glass tokens
- Remove search bar and FeatureCard from dashboard
- Restyle ShieldPopup positioning (from sidebar)
- Restyle HistoryPanel with new design tokens
- Add space-specific gradient backgrounds
- Polish animations: sidebar collapse, command bar mode transitions, tab hover
- **Verify:** Full end-to-end flow works. Dashboard looks clean. All features accessible.

---

## 8. Verification Plan

After each wave:
1. `npm run lint` — TypeScript typecheck passes
2. `npm run test` — Vitest suite passes
3. `npm run build` — Production build succeeds
4. `npm run dev` — Manual smoke test:
   - Sidebar renders all sections correctly
   - Tabs open, close, switch, pin/unpin
   - Command bar navigates URLs, searches, filters tabs
   - `@claude` chat works with streaming
   - `/settings` shows and toggles settings
   - Shield badge updates, popup works
   - Space dots switch workspaces
   - Dashboard shows greeting + stats + recent tabs
   - Sidebar collapses/expands smoothly
   - Window dragging works from header
   - Keyboard shortcuts work (Ctrl+L, Ctrl+T, Escape)
