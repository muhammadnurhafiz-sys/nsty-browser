# Nsty Browser — Project Instructions

## Project Overview
Nsty Browser is an Electron-based desktop browser built with:
- **Electron 41** + **React 19** + **TypeScript 6** + **Vite 8** + **Tailwind CSS 4**
- Brave-style ad blocking (Ghostery adblocker engine)
- Arc.app-inspired sidebar with workspaces ("spaces")
- Claude AI integration (@anthropic-ai/sdk)
- Design system: "Obsidian Monolith" (dark theme, neon green #CEFA05 accent)

## Build Environment (VPS, Headless Linux)
This project is developed on a **headless Linux VPS**, not the user's local machine. The user does NOT run builds locally — they download finished installers from this VPS.

**Implication for Claude:** after implementing changes, build the installers HERE and leave them in `release/` so the user can fetch them. Do not tell the user to "run `npm run package:*` locally" — they can't.

### Platform build matrix (on this VPS)
| Platform | Built here? | Command | Output in `release/` |
|----------|-------------|---------|----------------------|
| Linux AppImage | ✅ Native | `npm run package:linux` | `Nsty Browser-<ver>.AppImage` |
| Windows NSIS `.exe` installer | ✅ If Wine installed | `npm run package:win` | `Nsty Browser Setup <ver>.exe` |
| Windows portable `.tar.gz` | ✅ Fallback without Wine | `npx electron-builder --win portable` | `nsty-browser-v<ver>-win-x64-portable.tar.gz` |
| macOS `.dmg` | ❌ CI only | (GitHub Actions) | — |
| Android APK (`mobile/`) | ✅ Native | `cd mobile && npx expo prebuild --platform android --clean --no-install && cd android && ./gradlew assembleRelease` | `nsty-browser-<ver>-android.apk` |

**Android: run `cd mobile && npm run check` (typecheck, tests, `expo-doctor`) before any build.** `expo-doctor` must report 20/20; a duplicate or SDK-mismatched native module (the 0.5.1–0.6.0 `expo-font@57` next to SDK 55) crashes the app at launch before any JavaScript runs. Install native packages only with `npx expo install <pkg>`, never plain `npm install`.

**Android: always ship `assembleRelease`, never `assembleDebug`.** A debug APK contains no JS bundle; it expects a Metro dev server and closes on launch when installed standalone (this was the 0.6.0 "auto close" report). The generated project signs release builds with the debug keystore, so the release APK installs directly. Signed store builds come from `npx eas-cli build --platform android --profile preview` (EAS account `it-nastyworldwide`).

**Android over-the-air updates (EAS Update, since 0.6.3).** JavaScript-only changes ship without a new APK:
```bash
cd mobile && CI=1 npx eas-cli update --branch preview --environment preview --platform android --message "<what changed>" --non-interactive
```
All three flags are required on this VPS: `--environment` for non-interactive mode, `--platform android` because the project has no `react-native-web`, and `CI=1` for the underlying `expo export`. Phones pick the update up on next launch or via Settings → Updates → Check for updates. The runtime version follows the app version, so any change to native modules, permissions, or `app.json` still needs a version bump and a new APK. The preview channel is set for local builds through `updates.requestHeaders` in `app.json`.

**Windows cross-build native modules.** `scripts/after-pack.cjs` swaps the Linux `better_sqlite3.node` for the Windows prebuilt; without it the `.exe` crashes at startup. Verify with `file release/win-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node` → must say `PE32+`.

### Wine prerequisite for `.exe` installer
Building the NSIS `.exe` from Linux requires Wine. Check once with `which wine`; if missing, install:
```bash
sudo apt-get update && sudo apt-get install -y wine wine64
```
Without Wine, `npm run package:win` will fail or silently produce only the portable tar.gz.

### Where the user downloads from
Completed artifacts sit in `/root/nsty-browser/release/`. The user retrieves them via SCP/SFTP/HTTP from the VPS. After a build, always list the new artifact paths in the final response so the user knows what to download.

## Build & Release Pipeline
After implementing changes, always follow this sequence:
1. `npm run lint` — TypeScript typecheck (tsc --noEmit)
2. `npm run test` — Vitest test suite
3. `npm run build` — Vite build + tsc for main process
4. Version bump in package.json
5. Git commit with conventional prefix
6. Git tag matching version
7. Git push with tags → triggers GitHub Actions CI (builds Win/Mac/Linux for GitHub Releases)
8. **Build installers on this VPS** — `npm run package:linux` and `npm run package:win` (requires Wine for `.exe`, see above)
9. Report new artifact paths in `release/` so the user can download

Use `/release` skill to automate steps 4-7. Use `/deploy-desktop` skill to automate step 8 (auto-chained after `/release` for Electron apps). macOS `.dmg` is CI-only.

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
