# Multi-page Prototype Builder Implementation Plan

> **For agentic workers:** Use executing-plans and dispatching-parallel-agents for disjoint modules; controller owns integration and final verification.

**Goal:** Turn the visual editor into a portable multi-page prototype builder with full-screen preview and asset-complete exports.

**Architecture:** A version-2 project owns ordered pages, a start-page ID, and version-1-compatible page documents. The shared renderer remains the appearance authority for canvas, preview and exported Nimbus runtime. IndexedDB stores the browser-local project; JSON remains portable and migrates legacy pages.

**Tech Stack:** Existing React/TypeScript, browser IndexedDB, safe HTML renderer, dependency-free ZIP writer, Vite consumer test.

**Spec:** The user's September 6 request and confirmed interpretation: 17 complete page templates, keep all 75 styles.

## Global Constraints

- Preserve existing uncommitted work and all 75 style presets. No push or merge.
- No arbitrary user HTML, scripts, SVG uploads or executable action expressions.
- Keep numeric/color validation; optional additions must round-trip and migrate old documents.
- Export source and locally uploaded image bytes, never a dependency on an unpublished Nimbus registry package.
- Browser-local database is not a shared enterprise backend; sample service controls remain examples.

## Shared contracts

`StudioProject = {version:2; name:string; startPageId:string; pages: Array<{id:string; document:StudioDocument}>}` in `project.ts`.
`Widget.actions?: Record<string,string>` maps `click` or `item:N` to project page IDs. No arbitrary URLs or JavaScript.
`StudioDocument.backdrop?` and `Widget.style.backdrop?` use a validated Background type; `Widget.motion.loading?` and easing/repeat enrich animation without breaking v1.

## Task 1 — Project persistence and editor integration (controller)

Files: project.ts, project-storage.ts, studio.tsx, pages-panel.tsx, prototype-preview.tsx, prototype.css; tools/studio/project.test.ts.

- [x] Test legacy migration, unique IDs, valid start page, max 50 pages, deletion clears links, duplicate remaps IDs.
- [x] Implement parseProject, createProject, replacePage, addPage, duplicatePage, removePage and serialized IndexedDB writes.
- [x] Integrate project-level undo/redo; page rename/add/duplicate/delete/start-page controls; invalidate stale uploads on page transitions.
- [x] Add full-viewport dialog preview with native fullscreen enhancement, focus restoration, Escape, start/current page and device controls.
- [x] Verify edit/save/reload/navigation and recovery failures in browser.

## Task 2 — Granular visual controls (visual worker)

Files: types.ts, model.ts, render.ts, inspector.tsx, visual-properties.tsx/css; tools/studio/visual-properties.test.ts.

- [x] Test safe gradients/images, backdrop geometry, motion enums, granular text styles and page actions before implementing.
- [x] Add solid/linear/radial/image background editor on pages and all widgets, image positioning/size, validated upload.
- [x] Add title/subtitle/value text styling; sidebar logo dimensions/fit and individually editable navigation labels and page targets.
- [x] Add loading shimmer/pulse/spinner/static, entrance/hover/press, easing and repeat with reduced-motion behavior.
- [x] Add whole-widget target and sidebar item targets using actions contract; expose pages prop to inspector.
- [x] Ensure canvas and exports consume identical safe renderer output; check all old tests.

## Task 3 — Seventeen templates (template worker)

Files: templates.ts, template-gallery.tsx/css; tools/studio/templates.test.ts.

Create distinct, complete, editable compositions: Analytics overview; Revenue & sales; CRM pipeline; Commerce operations; Finance & expenses; Project delivery; Team directory; Support inbox; Marketing performance; Product analytics; Agent workspace; Workflow operations; Knowledge library; Security & audit; Organization settings; Sign-in & onboarding; SaaS plans & billing.

- [x] Assert exactly 17 unique template descriptors plus a separate blank option; retain dashboard/agent/settings IDs.
- [x] Give each composition specific useful hierarchy, data, content and appropriate styles rather than palette-only duplicates.
- [x] Verify bounded geometry, unique stable widget IDs and parse round-trip for every template.
- [x] Implement searchable gallery with representative thumbnails and selected template callback.

## Task 4 — Nimbus runtime and asset-complete export (export worker)

Files: export.ts, export-dialog.tsx, package-export.ts, zip.ts, runtime-source.ts; tools/studio/package-export.test.ts.

- [x] Test ZIP entries/CRC, binary raster asset extraction and deduplication, no traversal, full-app/page/widget scope and consumer compile.
- [x] Export React component using bundled local @nimbus-ui/runtime; package includes full source, package.json, Vite entry, styles, project JSON and public/assets.
- [x] Standalone HTML supports page actions for entire app; scoped exports report unavailable targets and remain standalone.
- [x] Use the shared renderer and fixed safe navigation script; never interpolate raw executable user content.
- [x] Keep copy/download HTML and editable JSON, add download React ZIP and descriptive instructions.

## Final gate

- [x] Run all studio tests and full pnpm check. Build an extracted exported consumer.
- [x] Browser-test 17-template selection, gradients, text/logo upload, animations, multi-page links, fullscreen, app/widget exports and reload.
- [x] Independent read-only review of correctness, unsafe content boundaries, stale async state and export parity; resolve important findings.
- [x] Update user guide and verification report with actual evidence and remaining limitations.
