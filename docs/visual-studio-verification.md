# Visual studio verification — 2026-09-06

This records the earlier single-page editor milestone. For the subsequent multi-page builder and its current gates, see [prototype-builder-verification.md](prototype-builder-verification.md).

Implementation is in the user-selected Documents/project/nimbusUI/Nimbus-UI-Studio-Lab checkout on feat/visual-page-studio. It is left uncommitted, with no merge, push, PR or publication. Nimbus retains its existing GitHub origin. The upstream reference clone lives separately in Documents/project/nimbus-design-reference at commit 8147538b4226ae41e2487a9179e3bcc1f68e8554.

## Completed gates

- Pinned dependency installation: npm run setup, pnpm 12.3.4, existing lockfile preserved.
- Full check: npm exec --yes --package=pnpm@12.3.4 --call "pnpm check" passed after final source formatting and fixes. Includes configured lint, strict type checks, tests and Vite/Next production builds.
- 36 existing governance/workspace tests passed.
- 27 studio tests passed: 7 model/history tests, 19 renderer/export tests, 1 generated-TSX consumer build/render test. The model test applies all 75 presets to all 40 widget definitions and round-trips each resulting document. Renderer tests cover 200 kind/state combinations and hostile input boundaries.
- Main browser smoke passed 16 paths: insert, mixed presets, content, radius, keyboard nudge, pointer move/resize, undo/redo, motion, React/HTML/JSON export, save/reload, mobile stacking and embedded image upload/export. An additional native library drag/drop check inserted exactly one widget.
- Persistence browser regressions passed: delayed upload preserves newer edits; maximum layer-name duplicate reloads; selected-widget export; downloaded JSON reimport; recovery data survives selection; pending upload cannot resurrect a replaced page.
- Separate canvas browser QA passed 29 checks, including no-op callbacks, overlapping layer order, keyboard resizing, Escape/lost capture/blur/context cancellation, foreign pointers and locked widgets. Header controls and save errors were visible at 320/390/600/900/1024px.
- Chromium editor session reported zero console errors and warnings. Generated desktop and mobile screenshots were visually inspected.
- Independent static peer review closed all eight actionable findings and three follow-up residuals. This is a Codex peer review, not a separately obtained Claude signoff.

## Fixed review findings

Image completions now merge only the image field into the latest existing/unlocked target. Request versions and page/history epochs invalidate obsolete uploads. Rejected mutations cannot announce upload success. Duplicate names obey the schema; all committed documents are validated. No-op selection preserves recovery and save state. Responsive CSS is page-scoped. Selection decoration is separate from content stacking. Mobile retains project/history/save controls. Stable pointer capture has cancellation and pointer-identity guards. Image controls are restricted to widget types that render images.

## Measurements and limits

Final Vite output: JavaScript 318.85 kB / 94.81 kB gzip; CSS 24.18 kB / 5.69 kB gzip. Both framework production builds passed. These are bundle sizes, not a formal performance certification. Current configured lint is TypeScript-based; the existing framework test tasks have no additional local tests and emit non-fatal Turbo output warnings. Real studio tests execute at workspace level.

No WCAG certification, full assistive-technology matrix, concurrent multi-user backend or enterprise security accreditation is claimed. The studio is browser-local. Agentic, approval and login widgets are editable UI samples. See studio-guide.md for export and responsive behavior, storage limits and remaining platform scope.
