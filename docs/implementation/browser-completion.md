# Approved browser implementation

User approved the complete Liquid Glass browser UI, Graphite + Sage dark theme, Warm Paper light theme, and an Android build (September 6, 2026). The mockup gate is satisfied by the explicit approval in this session.

## Implementation

1. Replace the disconnected desktop renderer/native tab state with a main-owned browser service and versioned snapshots. Validate IPC sender identity and action payloads.
2. Connect the approved desktop panels to actual navigation, bookmarks/history, native downloads, compatible unpacked extensions, site permissions, Shield, find, zoom, print and saved settings. Use truthful empty and unavailable states.
3. Build a native Kotlin Android WebView browser with mobile controls and the same palettes. It is a Chromium WebView browser, not Electron or a Chrome extension runtime. Do not represent shared-storage browsing as private.
4. Verify with meaningful failing tests first, then integration checks, desktop packaging and Android compilation. Root is authorized by deploy-permissions.json. Record artifact signing and device-test limits.
5. Review before push; preserve unrelated workspace changes.

## Architecture constraints

The browser's native main process owns IDs, tabs and persisted state. Browser content uses a session separate from the privileged shell. Private desktop tabs must never enter persistent browsing state. Permissions require a requesting origin and one-shot response. Failed navigation stays an error instead of becoming a search. Ad blocking has per-site exceptions and top-level attribution; YouTube effectiveness requires live verification.

## Pipeline summary

Requirements: approved. Scope, implementation design, architecture review and test plan: completed. Mockup: approved. Next: RED → GREEN → validation → commit → review → desktop and Android build artifacts.
