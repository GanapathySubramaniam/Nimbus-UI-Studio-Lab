# Visual Page Studio Implementation Plan

> **For agentic workers:** Use subagent-driven-development for isolated tasks and review gates. Steps use checkbox syntax for tracking.

**Goal:** Deliver an operational visual page editor with portable matching code.

**Architecture:** Shared typed document and renderer; independent preset and widget catalogs; React editor panels; browser-local persistence.

**Tech Stack:** Existing React/TypeScript monorepo with Vite and Next reference applications.

**Spec:** ../specs/2026-09-06-visual-studio-design.md

## Global Constraints

- Work in Documents/project/nimbusUI/Nimbus-UI-Studio-Lab on feat/visual-page-studio.
- Off-white editor, independently styled widgets, no shipped upstream markdown or brand logos.
- Native accessible controls, bounded schema validation, no executable imported content.
- Canvas and export consume identical renderer and stylesheet.
- No push or publication; retain source attribution.

### Task 1: Reproducible toolchain

- [x] Diagnose installed package-manager mismatch, resolve usable exact dependencies, install and run baseline tests. Own package manifests, lock and obsolete workspace source-text tests only.

### Task 2: Attributed preset collection

- [x] Read all upstream analyses; implement presets.ts satisfying DesignPreset[] from studio/types.ts and license notice. Include every source folder with safe system fonts and concrete numeric/color values. Verify IDs, ranges and provenance.

### Task 3: Document engine and export

- [x] Add failing tools/studio tests for malformed documents, script-like text, unsafe image URLs, geometry and undo/redo; run node tests before implementations.
- [x] Implement catalog.ts, model.ts and history.ts, using StudioDocument/Widget contracts; render.ts implements renderWidget(widget), renderPage(document), WIDGET_CSS; export.ts implements exportHtml(document) and exportReact(document).
- [x] Test literal escaping and semantic widget output. Verify exported code builds and has no Nimbus runtime import.

### Task 4: Editor interface

- [x] Implement studio.tsx orchestration, canvas.tsx gestures, inspector.tsx properties, library.tsx insertion/presets/layers, and studio.css. Re-export through existing shell wrapper for both apps.
- [x] Implement image upload with format/size checks, native dialog export, undo/redo, local save, responsive canvas and templates.
- [x] Exercise browser add/edit/drag/resize/nudge/duplicate/undo/reload/import/preview/export workflows.

### Task 5: Release verification and handoff

- [x] Independent code review of validation, export parity, state transitions and UI usability; fix concrete findings.
- [x] Run typecheck, tests and production builds. Document launch commands, supported behavior and limitations.
