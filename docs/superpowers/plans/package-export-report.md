# Task 4 — package export report

Implemented in the requested checkout on September 6, 2026. Work was limited to `export.ts`, `export-dialog.tsx`, `package-export.ts`, `zip.ts`, `runtime-source.ts`, `tools/studio/package-export.test.ts`, and this report. No agents, commits, pushes, dependency installation into the repository, or edits to controller/visual/template ownership files.

## Delivered contracts

- Preserved `exportHtml(document)` and the existing standalone `exportReact(document)` API. The existing React consumer compile/render parity test passes.
- Added `exportProjectHtml(project, startPageId?)`. It renders with the shared renderer and a fixed navigation script. A valid explicit start ID takes precedence over the project start ID, with a first-page fallback.
- Navigation uses `.nw-node[data-id]` plus the visual worker's `data-nimbus-page="<pageId>"` metadata. Only allowlisted `click`/`item:N` actions with included page IDs enter the navigation payload. User strings are escaped JSON or renderer-produced HTML, never executable expressions.
- Script behavior covers click and keyboard navigation, destination focus, disabled/loading controls, native field input, and sidebar item precedence. Form submissions remain local sample behavior.
- When embedded, the fixed script sends `parent.postMessage({type:'nimbus:page',pageId}, '*')` on initial page display and navigation, and `{type:'nimbus:close-preview'}` on Escape. It sends neither when `parent === window`. Controller must validate `event.source === iframe.contentWindow` and its page-ID allowlist.
- `ExportDialog` retains `document`, `selected`, and `onClose`, and accepts optional `project`/`currentPageId`. It supports app/page/widget scope, HTML/React/JSON copy/download, and React ZIP download. Scope warnings are visible in the dialog and included in the ZIP README.
- Scoped JSON removes links to omitted pages from the exported clone so the controller's `parseProject` can reopen it. The source project and undo state are unchanged. Widget exports contain one visible widget at `(0,0)`.

## React ZIP

`createReactPackage(project, options?)` returns `{entries,warnings,project}`. `exportReactZip(project, options?)` returns `Uint8Array`. Options are `{scope?:'app'|'page'|'widget', currentPageId?:string, widgetId?:string}`. `scopeProject` and the separate `exportProjectReact` copy helper are exported for reuse.

The archive includes:

```text
package.json                  # @nimbus-ui/runtime: file:./packages/runtime
index.html
vite.config.ts
tsconfig.json
src/App.tsx
src/main.tsx
src/env.d.ts
src/styles.css
src/project.json
public/assets/image-N.ext
packages/runtime/package.json
packages/runtime/src/index.tsx
packages/runtime/src/project.ts   # exact shared StudioProject shape, types only
packages/runtime/src/render.ts    # full shared source, not a renderer facsimile
packages/runtime/src/model.ts     # full shared validation dependency
packages/runtime/src/types.ts
packages/runtime/src/export.ts
packages/runtime/LICENSE
packages/runtime/THIRD_PARTY_NOTICES.md
LICENSE
THIRD_PARTY_NOTICES.md
README.md
```

The exported `NimbusPrototype` React component renders an isolated `sandbox="allow-scripts"` iframe using that full renderer and fixed script. CSS remains in the shared renderer source. Runtime source can be edited locally. The React copy explains that the bundled package must be installed with `npm install ./packages/runtime`; it never assumes an unpublished registry dependency.

Uploaded PNG/JPEG/WebP/GIF data URLs are decoded to binary files and deduplicated. Asset names are generated, never derived from user filenames. Project image fields become local `assets/image-N.ext` references. The runtime adapts those known paths through a safe placeholder during shared rendering, then substitutes their public URLs, preserving the renderer's untrusted image URL policy. Backdrop `src` and widget `image` fields are both covered. HTML and the separate editable JSON export retain embedded uploaded images.

External image URLs are retained and disclosed; offline availability is not promised. Initial `npm install` requires network access for public React/Vite/TypeScript packages. The ZIP supplies a Vite scaffold; its README explains Next.js `transpilePackages`, client-component, and public-assets integration. Apache-2.0 and the complete pinned preset MIT notice are preserved at root and inside the local runtime package.

## Source generation / controller wiring

Run from the repository root:

```sh
node --experimental-strip-types tools/studio/package-export.test.ts --sync-runtime
```

Suggested root script, to be added by the controller:

```json
"studio:sync-runtime": "node --experimental-strip-types tools/studio/package-export.test.ts --sync-runtime"
```

Run that command before build/dev whenever `render.ts`, `model.ts`, `types.ts`, `export.ts`, `LICENSE`, or `THIRD_PARTY_NOTICES.md` changes. The command mechanically generates only `runtime-source.ts`. No `?raw` imports, bundler-specific loaders, Node filesystem imports in browser code, or extra build dependencies are needed. The existing `test:studio` glob discovers the test automatically and fails with the stale filename if the snapshot drifts. It also fails consumer compilation if a new renderer dependency is omitted.

Controller's lazy `ExportDialog` integration keeps the generated source out of the initial app bundle. Vite build output verified a separate export-dialog chunk. The dialog retains its tiny binary-capable download helper; controller's separately owned `download.ts` currently accepts text only.

## Verification evidence

- Tests were added before the export implementation. Initial run failed because the new modules did not exist. Subsequent tests caught and drove fixes for a misplaced template delimiter, missing CSS declarations, consumer TypeScript compiler options, native-input navigation interference, and scoped JSON dangling links.
- Thirteen Task 4 tests pass: ZIP STORE/UTF-8 names/binary bytes/CRC/offsets, unsafe paths/duplicates, exact source freshness, scopes plus JSON reimport, empty/whitespace scoped names, scoped ZIP README warnings, raster extraction/deduplication/remote notices, safe standalone navigation, iframe messages, native input behavior, deployment-path CSS escaping, preservation of asset-like authored text, and extracted consumer compilation/build.
- CRC checks compare ZIP records against Node's independent `node:zlib.crc32`; the standard `123456789 -> 0xcbf43926` vector also passes.
- The consumer test independently reads the produced ZIP, extracts it into a temporary directory, and compiles the extracted files with TypeScript before producing a Vite production build. Only installed public third-party dependencies are linked for the test; the Nimbus runtime resolves from the extracted archive. The test verifies full renderer/license equality and emitted binary asset bytes. It does not perform a fresh network `npm install`.
- The earlier full studio run passed all 56 tests, including the unchanged legacy React consumer compile test and controller/visual/template tests. Following the controller's additional empty-name edge case, the focused package-export plus legacy compile run passed 12/12 tests; no full suite was rerun for that follow-up, as requested.
- Both repository host production builds passed: `@nimbus-ui-studio/reference-vite` and `@nimbus-ui-studio/reference-next` (Turbopack, TypeScript, static generation). Used `npm exec --yes --package=pnpm@12.3.4 --call "pnpm --filter <package> build"` because the default PATH pnpm was 11.19.0 and did not satisfy this repository's engine requirement.
- Actual Chromium/Playwright check of an extracted built consumer: the sandboxed frame loaded an uploaded PNG from `http://127.0.0.1:5194/assets/image-1.png` with `complete:true` and `naturalWidth:1`; activating the sidebar Overview button navigated to the Second page; parent received `{type:'nimbus:page',pageId:'second'}` and then `{type:'nimbus:close-preview'}` on Escape. The all-widget compile fixture overlaps widgets, so the sidebar button was activated through its real DOM click method rather than a pointer coordinate. Initial iframe loading required waiting for the main element. Only browser console error observed was the scaffold's absent favicon (404).
- Controller separately reported browser GUI success for the new Nimbus component import, HTML assets, selected-scope warning, and React ZIP download. That report supplements this worker's directly observed consumer checks. Final Vite and Next.js rebuilds after the scoped JSON fix both exited successfully. The temporary browser session and preview server were closed afterward.

## Limits / handoff

Follow-up correction: scoped project names fall back to `Untitled page` or `Untitled widget` when the underlying schema-valid document/widget name is empty or whitespace. Original document/widget names remain intact. A regression test first reproduced `parseProject` rejecting the empty exported project name, then passed after the fallback. The current dialog calls `createReactPackage(sourceProject, scopeOptions)`; an independent ZIP-readback regression verifies README warnings survive while dangling actions are removed from the exported JSON.

Euler's bounded review follow-up: final asset URL substitution now percent-encodes CSS delimiters, including parentheses, so a deployment under `/previews/(demo)/` produces usable page/widget background URLs containing `/previews/%28demo%29/`. Runtime local-path resolution now uses the same `image`, `src`, `url`, `imageUrl` field allowlist as extraction. Authored names, titles, subtitles and alt text such as `assets/image-1.png` are preserved. Both regressions were observed failing against the emitted runtime before these changes. Their harness compiles and executes the actual emitted component/renderer, replacing only React hook scheduling to capture its iframe document in Node. After regenerating the source snapshot for concurrent visual changes, the focused package-export plus unchanged legacy compile run passed **14/14**, including the extracted consumer TypeScript and Vite production build. No full-suite or host build rerun was performed for this bounded follow-up. Requested next gate: Euler's scoped re-review of these two fixes and regression tests only.

No new repository dependencies or additional production files are needed. Hook up the source-sync script and continue to regenerate after future shared-source changes. This worker verified export behavior and host builds; controller retains the full application's browser acceptance and overall release gate. The emitted component is a prototype iframe with local native fields and page navigation, not service integration or generated individual React widget components. The ZIP's asset-rewritten `src/project.json` is runtime data; use the dialog's JSON export for a self-contained builder reimport.
