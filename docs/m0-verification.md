# M0 local foundation verification

2026-09-06; branch `feat/m0-local-foundation`; [issue #138](https://github.com/GanapathySubramaniam/Nimbus-UI-Studio-Lab/issues/138).

## Implemented and checked locally

- Built-in SQLite repository with transactional migration, foreign keys, WAL, busy timeout and full synchronous commits. Whole validated project JSON and normalized page/node/style/motion/action/image records commit together. Current 75 presets seed once; no fake motion/template seeds.
- Revisioned local CRUD; invalid projects never replace saved data; two real simultaneous writers produce exactly one winner; failed SQL and migration operations roll back.
- Loopback HTTP, original Host validation before Vite proxy rewriting, trusted-origin checks, bounded JSON and generic failure responses. Vite cannot serve `.nimbus` or SQLite/sidecar paths, including through public asset URLs.
- Canonical database-path validation includes real Windows junctions, missing ancestors, public aliases, `..cache` names and broken links. It returns the canonical filename for the store. It does not claim to lock the filesystem against a malicious local administrator changing links afterward.
- Plain-JavaScript startup validates Node/dependencies before TypeScript or SQLite imports. Both listeners share one process. Setup installs pinned dependencies and initializes the database; startup creates it if absent.
- README/local development guide and the full user GOAL.md describe scope accurately. The editor still uses IndexedDB until M3.

## Evidence

- Database tests: 15 passing against real temporary files, raw foreign-key checks, rollback triggers, and competing worker threads.
- Runtime path tests: 10 passing, with actual Windows junctions and no skipped junction cases.
- HTTP tests: 5 passing, using low-level requests for hostile Host headers because Node fetch rewrites that header.
- Launcher tests: 4 passing, including actual Vite proxy and file-serving boundaries.
- Public-entry tests: 5 passing, including missing dependencies, corrupt/future databases, occupied Studio port cleanup and real SIGTERM termination.
- Existing studio tests: 62 passing. The final combined studio/local runner passed all 101 tests with zero failures or cancellations, including the final real SIGTERM case.
- Full `pnpm check` passed after the canonical-path, proxy and public-entry fixes: strict local/workspace TypeScript, governance/workspace tests, studio/local tests and both Vite/Next production builds. Node experimental notices and Turbo empty-output warnings are not hidden.
- Fresh source snapshot with no node_modules/database: `npm run setup`, public launcher, editor GET, same-origin project PUT, shutdown and SQLite reopen all passed. Dependencies were installed from the local pnpm content store; this proves a fresh dependency layout, not uncached registry availability.
- Actual browser prototype journey passed under the combined launcher: template selection, text/background/image/logo changes, loading appearance, navigation, fullscreen, exports and browser-local reload. Console: zero errors, zero warnings. This is not the M2 pixel-fidelity matrix.

## Review

Independent Codex reviewer James returned scoped PASS after the runtime/security fixes, including the Windows/Ubuntu Node-floor CI workflow. Original findings were real and addressed: default Vite database exposure, public `..cache` and junction bypasses, Host rewriting before validation, signal-exit cleanup, preflight ordering and startup-failure test gaps. Source-review approval is not hosted-CI evidence or whole-product certification.

One intermediate full run timed out in the launcher test; diagnostic stage logging and signal-aware cleanup were added. Subsequent combined and full-workspace runs passed. No claim of exhaustive long-session stability follows from those runs.

## Remaining release gate

Commit `96ed9d5` is in [PR #139](https://github.com/GanapathySubramaniam/Nimbus-UI-Studio-Lab/pull/139). A separate actual Git clone installed with `npm run setup`, then served the editor and SQLite health endpoint through the public launcher on ports 5184/4318. Its fresh browser session loaded the editor with zero console errors or warnings.

Hosted Windows testing exposed a short-path/canonical-path mismatch in a test expectation (100 passed, one failed); the expectation now canonicalizes the existing temporary parent. Six CodeQL annotations in test-only HTML extraction/absence and attribution checks were addressed with case-insensitive tag checks and exact source-line equality, without exclusions. The follow-up passed all 101 studio/local tests and the full workspace check locally; James returned scoped PASS. Hosted reruns and merge remain required. M1–M11 remain active as recorded in the delivery ledger.
