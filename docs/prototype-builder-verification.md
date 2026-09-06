# Multi-page prototype builder — verification record

Date: 2026-09-06. Checkout: `Documents/project/nimbusUI/Nimbus-UI-Studio-Lab`, branch `feat/visual-page-studio`. No commit, merge, push, PR or publication was performed. Existing Nimbus origin is retained.

## Scope delivered

Version-2 multi-page projects with legacy migration, ordered IndexedDB autosave, project-wide undo/redo, page management, link cleanup on deletion and self-link remapping on duplication. Full-window modal preview supports real browser fullscreen, authored page navigation, device sizing without remounting the current page, form-state continuity and focus restoration.

All 75 style presets remain. Seventeen distinct editable templates plus blank pages have schema, geometry and isolation tests. All 17 default desktop compositions were browser-checked for widget surface overflow; the template worker reported zero surfaces exceeding their dimensions by more than 2px after content-fit corrections.

Page/widget backgrounds support solid, linear/radial gradients and safe raster uploads. Typography overrides target title/subtitle/value. Sidebar logos support independent dimensions and fit, while navigation labels and destinations are editable. Motion supports entrance, hover, press, loading appearance, easing, delay, duration and repetition. Numeric fields use local drafts with bounded blur/Enter commits.

Exports include app/page/widget React packages with a local Nimbus runtime and binary uploaded assets, package-based React component copy, standalone HTML and editable JSON. The package includes complete current renderer/validation/type/navigation source and required licenses. Its React component hosts the prototype in a sandboxed iframe; it is not a native per-widget JSX source generator. Remote URLs remain network dependencies.

## Commands and tests

`npm exec --yes --package=pnpm@12.3.4 --call "pnpm check"` runs runtime-source synchronization, configured lint, strict typechecking, governance/workspace tests, studio tests and both host production builds. Runtime source freshness is tested against the originals; the package test independently extracts a generated ZIP, compiles TypeScript, and produces a Vite consumer build. The consumer uses installed third-party dependencies, not a fresh network install.

The final integrated checks contain 36 governance/workspace and 62 studio tests, all passing. Framework-local test tasks have no extra tests and may produce nonfatal Turbo output warnings; substantive studio tests run at workspace level. Lint is TypeScript-based.

## Persistent browser regressions

- `tools/studio/prototype-qa.js`: gallery count/search/selection, page creation, gradient, independent text creation, loading spinner, page links, full-window dimensions, native fullscreen entry/exit, device/form continuity, focus restoration, background upload, text sizing, all export formats/scopes, ZIP download, IndexedDB reload, sidebar logo sizing and linked item editing, iframe Escape.
- `tools/studio/project-races-qa.js`: real IndexedDB writes with delayed completion notification; undo must persist the latest desired snapshot. Competing asynchronous File reads must keep the newest import; intervening edits invalidate an earlier import.
- `tools/studio/prototype-polish-qa.js`: loaded gallery miniatures; 390px gallery, page manager, export dialog and preview toolbar without horizontal overflow; visible mobile project/history controls.
- `tools/studio/project-recovery-qa.js`: malformed IndexedDB value enters recovery and is not overwritten by selection; the test restores its original disposable project afterward.

Tests use a separate browser profile, not the user's working project. Images and ZIP readback artifacts are under ignored `output/playwright`.

## Peer review ledger

- Task 1 independent review found and closed five issues: in-flight save/undo ordering, competing imports, ineligible fullscreen target, device-switch navigation reset and opener focus overwritten by rerenders. A real-browser follow-up also caught Strict Mode modal cleanup; closing the dialog before focus restoration resolved it.
- Task 3 reciprocal review passed. The template worker separately corrected default content clipping rather than hiding it with renderer CSS.
- Task 4 follow-ups: scoped JSON strips omitted destinations; blank scoped names receive valid fallbacks; scope notices are retained in the ZIP README. Further review checks asset URL escaping and prevents asset resolution from rewriting ordinary text.
- Task 2 follow-ups: image/logo uploads should survive unrelated edits on the same target; progress percentage text must honor value typography overrides.

All scoped peer-review follow-ups are closed. The final reciprocal review confirmed upload identity checks and latest callbacks, rendered progress value styling, no success announcement after rejected background commits, safe final CSS asset URL escaping, and preservation of ordinary asset-like text. Reviews were performed by independent Codex peers; this is not a Claude sign-off or security certification.

## Limits

Browser-local database, no cloud synchronization or shared tenant backend. Sample business widgets do not implement authentication, billing, agent execution, AG-UI or A2UI services. Mobile uses ordered stacking; arbitrary desktop coordinates do not infer custom responsive constraints. User-created styles can fail accessibility or content-fit requirements. No WCAG certification, cross-browser/assistive-technology matrix or enterprise security accreditation is asserted.

## Final follow-up gate

The synchronized full `pnpm check` passed after the follow-up fixes, including Vite and Next.js production builds. A separate `node --experimental-strip-types --test --test-reporter=spec tools/studio/*.test.ts` run passed 62/62.

All four controller browser scripts listed above passed against the built production application on a separate localhost origin/profile, including malformed IndexedDB recovery. The final production editor console contained zero errors and zero warnings. The development server needed a restart after Vite retained transient module-resolution failures during concurrent source creation; final acceptance uses production output rather than that transient development cache.

Measured Vite assets: initial JS 372.84 kB / 112.66 kB gzip; stylesheet 34.10 kB / 7.55 kB gzip; lazy export tools 118.99 kB / 33.67 kB gzip; lazy template gallery 4.45 kB / 1.86 kB gzip. These are bundle measurements, not a complete runtime performance benchmark.

Scope remains an editable local-first visual prototype builder. Code and plans remain uncommitted on the feature branch for user review.
