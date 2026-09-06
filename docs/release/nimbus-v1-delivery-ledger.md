# Nimbus design/export release ledger

Authority: [GOAL.md](../../GOAL.md), copied verbatim from the user's 2026-09-06 attachment. This ledger records evidence, not a narrowed replacement objective. Last audit: 2026-09-06.

## Milestone status

| Milestone | Current evidence | Missing exit evidence / next work |
| --- | --- | --- |
| M0 local foundation | Merged PR #139, closed #138; squash `9ce898e`. Hosted Windows/Ubuntu run `34062450196`, CodeQL and governance passed. Actual clone startup and SQLite durability verified at final PR head `55004df`. | Exit passed. UI persistence remains M3. |
| M1 75 token archetypes | Branch feat/m1-token-presets, issue #140. Original descriptive catalog, 150 theme sets, strict compiler/export, Token Studio, transactional v2 seed migration. 13 token tests and 22 DB/adapter/source checks pass; 6,900 contrast pairs pass. | Browser matrix, independent review, final hosted checks and merge remain in progress. Full token-native widget rendering belongs to M2. |
| M2 native widgets and fidelity | Shared HTML renderer and compile/export tests exist. | Real `nimbus-ui` React Button/Card/Stat, canvas/export screenshot comparison >0.99 SSIM or <1% differing pixels across 75 presets and both themes. String/roundtrip tests are not fidelity proof. |
| M3 canvas/persistence | Working flat canvas gestures, selection, browser IndexedDB persistence. SQLite API now available. | Hierarchical node editing and SQLite client wiring/migration with every editable field restored after restart. |
| M4 complete inspector | Position, dimensions, style, content, linear/radial/image backgrounds, per-role typography controls. | Inline text editing, complete spacing/element overrides, conic/multi-stop controls and verified persistence coverage. |
| M5 widget library | Existing 40 widget kinds, catalog/schema tests and prior 17-page overflow checks. | Every Section 9 module, applicable states, keyboard/screen-reader contracts, native composition and full preset/theme fidelity matrix. |
| M6 motion | Existing CSS entrance/hover/press/loading treatments; browser smoke proves spinner exists, not every animation firing. | All 20 named animations, all seven trigger bindings, adjustable parameters, tokenized timing, replay, reduced-motion and per-trigger executable regression checks. |
| M7 assets/logos | Raster upload, background/logo editing and embedded/exported image assets. | Video loop/muted autoplay and export, clipboard/drop/logo composition, reusable shared styles/logos/presets and their SQLite CRUD. |
| M8 prototype | Multiple pages, page/item links, native fullscreen, device/form-state continuity. | Page reorder, portable cross-page copy/paste including assets, five-page end-to-end acceptance and complete action authoring. |
| M9 exports | HTML, JSON and ZIP with images/current runtime source compile successfully. | Native `nimbus-ui` imports rather than iframe host, all video/assets/actions, exact README installation contract, deterministic bytes and all four fidelity paths. |
| M10 dashboard/templates | Seventeen designed single-page templates retained. | Project dashboard CRUD/search/sort and all 12 named complete multi-page project templates with immediately working links. |
| M11 release/docs | Current README, studio guide, source notes and test evidence; goal now checked in as a working file. | Measured three-page token comparison, demo GIF, MIT license transition with notices, live wiki, milestone PR closure, final fresh-user acceptance and release. |

## Scope and decisions

- Keep all 75 styles and 17 designed page templates while adding the 12 complete project starters; these are different catalogs.
- Preserve existing user projects and uncommitted editor work. No destructive reset or replacement of the saved checkout.
- M0 passed both fresh source-snapshot durability and a separate actual Git-clone install/start check, repeated at final PR head `55004df` before merge. M1 runs these relevant installation/migration checks again.
- Protocol adapters, accounts, cloud collaboration, telemetry, hosting, SSR/PWA and additional locales are explicitly outside this design/export release. Existing issues for those features are not marked complete by this work.
- No registry package publication is assumed. M9 must provide an honest runnable local-package path and avoid an `npm install nimbus-ui` instruction that resolves unrelated code.
- Current Apache licensing/third-party MIT notices are preserved pending the explicit MIT transition audit; a package field change alone is not relicensing evidence.

## M0 findings and verification

- Real DB tests prove rollback of failed replacement and migration, stable reopen, composite-key isolation, cascade cleanup, preservation of shared library rows, and exactly one winner from two competing writer threads.
- Real HTTP tests prove revision conflict responses, malformed data rejection, body limits, Host/Origin/opaque-origin/cross-site rejection and no permissive CORS.
- The first Host test used Node fetch, which replaced the intended hostile Host header. It was corrected to use a real raw HTTP request; production validation was not relaxed.
- A live `/@fs` request exposed `.nimbus/studio.sqlite` through Vite. The reproduced 200 response is now covered by a 403 regression; private DB/sidecar paths are denied and cross-origin Vite reads disabled. Custom database paths are constrained away from public assets.
- The existing prototype browser script assumed a previously configured 1600×1000 viewport. It now establishes that viewport explicitly; the full journey passes under the combined launcher with zero browser errors/warnings.
- Node 22.16 emits experimental notices for its SQLite and type-stripping APIs. These are visible terminal notices, not a falsely claimed warning-free Node runtime.

M0 is closed. M1 remains in progress; no whole-product completion claim is made by this ledger.
