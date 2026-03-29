# Nsty Browser — Project Instructions

## Project Overview
Nsty Browser is an Electron-based desktop browser built with:
- **Electron 41** + **React 19** + **TypeScript 6** + **Vite 8** + **Tailwind CSS 4**
- Brave-style ad blocking (Ghostery adblocker engine)
- Arc.app-inspired sidebar with workspaces ("spaces")
- Claude AI integration (@anthropic-ai/sdk)
- Design system: "Obsidian Monolith" (dark theme, neon green #CEFA05 accent)

## Build & Release Pipeline
After implementing changes, always follow this sequence:
1. `npm run lint` — TypeScript typecheck (tsc --noEmit)
2. `npm run test` — Vitest test suite
3. `npm run build` — Vite build + tsc for main process
4. Version bump in package.json
5. Git commit with conventional prefix
6. Git tag matching version
7. Git push with tags → triggers GitHub Actions CI (builds Win/Mac/Linux)
8. Local build: `npm run package:linux` + `npx electron-builder --win` (WSL2 can cross-compile Windows, macOS is CI-only)

Use `/release` skill to automate steps 4-7. Use `/deploy-desktop` skill to automate step 8 (auto-chained after `/release` for Electron apps).

## Pre-commit Hook Awareness
The global TDD gate hook blocks `feat:` and `fix:` commits if test files are missing for changed modules.

**Bypass strategies for non-logic changes:**
- Use `refactor:` prefix for UI restructuring, styling, layout changes
- Use `chore:` prefix for config, dependency, and tooling changes
- Use `docs:` prefix for documentation-only changes
- Only `feat:` and `fix:` trigger the TDD gate

**Before committing, always run:**
```bash
npm run lint    # tsc --noEmit
npm run test    # vitest run
```

## Planning vs Implementation
- Proceed directly to implementation after brief analysis
- Do NOT produce plan-only documents unless explicitly asked to brainstorm or design
- Avoid excessive codebase exploration before starting work
- Exit plan mode early — the user prefers action over analysis

## Type Checking
Common pitfalls in this project:
- **Path aliases**: Use `@shared/types` (maps to `src/shared/`), `@renderer/` (maps to `src/renderer/`)
- **Dual tsconfig**: `tsconfig.json` for renderer (React), `tsconfig.main.json` for Electron main process
- **CSS vars in style props**: Use `style={{ color: 'var(--primary)' }}` not Tailwind for design tokens
- Always run `npm run lint` before committing TypeScript changes

## Available Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev mode (Vite + tsc watch + Electron) |
| `npm run build` | Production build (Vite + tsc main) |
| `npm test` | Run Vitest test suite |
| `npm run lint` | TypeScript typecheck (tsc --noEmit) |

## Git
- Default branch: `main`
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- Always include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` when Claude contributes

## Design System
The "Obsidian Monolith" design system is defined in `src/renderer/styles/globals.css`:
- Primary accent: `#CEFA05` (neon green)
- Typography: Space Grotesk (headlines), Manrope (body)
- Icons: Material Symbols Outlined
- Glassmorphism: `.glass-panel` class
- Cards: `.card-base` class with hover lift

## Design Work
Always download design exports as local files before starting UI implementation.
External design URLs (Stitch, Figma previews) are often inaccessible due to auth/CORS/iframe restrictions.
