# Task 3 — Seventeen page templates

Completed September 6, 2026 in `C:/Users/ganap/Documents/project/nimbusUI/Nimbus-UI-Studio-Lab`.

## Owned files

- `packages/application-shell/src/studio/templates.ts`: 17 complete compositions; typed descriptor catalog and factory.
- `packages/application-shell/src/studio/template-gallery.tsx`: searchable native modal gallery with rendered miniature previews.
- `packages/application-shell/src/studio/template-gallery.css`: complete responsive gallery styling, including keyboard focus and reduced-motion treatment. File is present on disk.
- `tools/studio/templates.test.ts`: four automated template/gallery tests.
- `docs/superpowers/plans/templates-report.md`: this handoff report.

Only the four implementation/test files and this requested report were edited by this worker. No shared types, renderer, presets, controller files, or root stylesheet were edited. No subagents, commits, or pushes.

## Integration contract

`templates.ts` exports:

- `templateCatalog`: exactly 17 descriptors, each with `{ id, name, description, category }`. Blank is deliberately separate.
- `TemplateId`: the 17 catalog IDs plus `blank`.
- `createTemplate(id: TemplateId): StudioDocument`: returns a fresh, editable version-1 document with deterministic initial widget IDs. It uses the existing shared model and widget catalog and requires no new optional fields.

`template-gallery.tsx` exports the named `TemplateGallery` component accepting `{ onSelect: (id: TemplateId) => void; onClose: () => void }`. Mounting opens its native dialog. A selection calls `onSelect(id)` followed by `onClose()`. Close, Escape, and backdrop dismissal call only `onClose()`. The controller owns page insertion/replacement and lazy loading.

Per the controller's follow-up, the component has **no side-effect CSS import**. The controller imports `./studio/template-gallery.css` from the root stylesheet; that import was observed in the current checkout. This avoids the library's TS2882 CSS-module error and works with the controller's React.lazy integration.

The 75 style presets remain independent and untouched. The gallery shows 17 page cards plus a separate blank action, not a 75-item style list.

## Catalog and composition

| ID | Complete page | Working-area composition |
| --- | --- | --- |
| `dashboard` | Analytics overview | KPI row, revenue trend, channel donut, transaction table and activity |
| `revenue` | Revenue & sales | Target attainment, territory chart, deal forecast and closing plan |
| `crm` | CRM pipeline | Search, four-stage deal board, account owner, brief and follow-ups |
| `commerce` | Commerce operations | Order exception notice, fulfillment table, dispatch progress and stock watch |
| `finance` | Finance & expenses | Cash position, approval table, upcoming payments, budgets and close checklist |
| `projects` | Project delivery | Release progress, sprint board, milestone calendar and handoff notes |
| `team` | Team directory | Search/filter controls and six people with roles, working hours and specialties |
| `support` | Support inbox | Triage queue, customer conversation, reply composer and customer context |
| `marketing` | Marketing performance | Acquisition KPIs, campaign scorecard, spend chart and launch schedule |
| `product` | Product analytics | Activation funnel, retention, adoption table and experiment agenda |
| `agent` | Agent workspace | Research conversation, source files, composer and human approval panel |
| `workflows` | Workflow operations | System status, processing stages, run history and review decision |
| `knowledge` | Knowledge library | Search, curated collections, document shelf and editorial reading note |
| `security` | Security & audit | Security posture, MFA progress, audit table and temporary-access review |
| `settings` | Organization settings | Organization form, regional options, digest toggle and access summary |
| `onboarding` | Sign-in & onboarding | Split welcome/sign-in layout, first-day checklist and setup progress |
| `billing` | SaaS plans & billing | Three plan tiers, seat usage, subscription card and invoice history |

Legacy IDs `dashboard`, `agent`, `settings`, and `blank` are preserved. Every nonblank layout has a distinct widget-kind/geometry signature, purpose-specific sample content, and a coherent palette. All supplied widgets remain visible and unlocked. Service, authentication, agent and billing controls are prototype examples.

## Verification

Latest automated run:

```text
node --experimental-strip-types --test --test-reporter=spec tools/studio/*.test.ts
56 tests, 56 passed, 0 failed

npm exec --yes --package=pnpm@12.3.4 --call "pnpm --filter @nimbus-ui-studio/application-shell typecheck"
tsc --noEmit — exit 0
```

Four Task 3 tests cover:

1. Exactly 17 unique descriptors, preservation of legacy IDs, separate blank option, descriptor/factory name agreement and all 75 presets.
2. Every template's exact JSON parse round trip, deterministic IDs/documents, unique IDs, finite bounded geometry, nonoverlapping frames, visible/unlocked widgets and supported rendering.
3. Distinct composition structures and isolation between editable factory results.
4. A real Vite consumer build and React server render of the gallery: 17 rendered miniatures, empty iframe sandboxes, excluded iframe tab stops, native dialog labels, live result count, blank/close actions and restrictive preview CSP.

The first three tests were observed failing against the original implementation's missing catalog before implementation. The latest broader studio run also passed project, visual-properties and export tests, including the extracted React ZIP consumer build. This is a current shared-checkout result, not a claim of ownership over those features.

An early broader run observed concurrent export-runtime snapshot mismatches; the latest run above passes. The default pnpm on PATH was 11.19.0, so typechecking used the repository-pinned 12.3.4 through npm exec. No package configuration was changed.

## Browser verification and content-fit corrections

Used a separate background browser tab and a memory-only Vite fixture on `127.0.0.1:5187/task3`. The fixture imported the actual gallery, its CSS, `createTemplate`, `renderPage`, and `WIDGET_CSS`; it did not modify or interact with the controller's main browser. No fixture source files were added to the repository.

Verified:

- Native modal opens with focus on the search input and all 17 cards.
- Case-insensitive multiword search with surrounding whitespace (`TEAM directory`) returns the correct page.
- No-results state, clear-search recovery and separate blank selection work.
- Team selection produces `team`, blank selection produces `blank`, and both dismiss the dialog and restore launcher focus.
- Escape dismisses without selecting; focus returns to the launcher.
- Tab and Shift+Tab explicitly wrap between the first and last gallery controls; miniature iframes are inert and not keyboard destinations.
- Gallery renders three columns at desktop width and one column at a 390×844 mobile viewport, with no horizontal dialog overflow. Temporary viewport override was reset afterward.
- Browser console had no errors in the final fixture check.
- CRM page and gallery miniatures were visually inspected after layout adjustments.
- All 17 pages were rendered individually at their default 1200×1000 document size. No `.nw-surface` exceeded its client dimensions by more than 2px in either direction in the final check (`templatesChecked: 17, overflows: []`).

The browser pass caught compact default widgets whose content needed more room. CRM and team search fields are now 104px tall with 12px padding and concise single-line labels. Library search and settings fields were similarly adjusted. Shared template density is 13px body text with 16px standard padding; compact lists, files and notices have explicit smaller padding. The agent approval/source rail was rearranged for more vertical space, and overly dense secondary lists were shortened. These are saved widget styles and geometry, so the canvas and exports receive the same correction. No shared-renderer CSS overrides were introduced to hide clipping.

## Remaining controller gate

Controller integration, the full workspace `pnpm check`, and final end-to-end project editing/export checks remain controller-owned. Mobile gallery layout was checked; arbitrary user-edited content and every exported mobile page were not exhaustively audited by this worker. Browser checks were performed directly in the temporary fixture; the four persistent automated tests are in the owned test file.
