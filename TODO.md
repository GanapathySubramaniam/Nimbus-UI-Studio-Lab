# Nimbus UI Studio Lab roadmap

This file is the compact product backlog after the first stable Studio MVP. GitHub
issues and milestones remain the source of truth for ownership, acceptance criteria,
branches, pull requests, and release evidence.

## Stable MVP scope

- [x] Shared React shell used by Vite and Next.js references.
- [x] Static production output for both references.
- [x] Editable component canvas.
- [x] Action button, agent card, and prompt field previews.
- [x] Editable content, variant, radius, and canvas background.
- [x] Flat enterprise visual system with no gradients.
- [x] Live application theme palette, shape, and motion controls.
- [x] Copyable React usage code with success and failure announcements.
- [x] Responsive navigation and mobile layout.
- [x] Agent dashboard, conversation, safe thinking summary, run steps, attachment,
  composer, operational metrics, and recent-run reference composition.

## Next: component-library core

- [ ] Define the component taxonomy and coverage ledger.
- [ ] Extract design tokens into `@nimbus-ui-studio/tokens`.
- [ ] Add scoped theme runtime and validated theme import/export.
- [ ] Add typography, spacing, density, border, elevation, motion, breakpoint, and
  data-visualization token editors.
- [ ] Add light, dark, high-contrast, forced-colors, and reduced-transparency modes.
- [ ] Add undo, redo, reset, version history, diff, rollback, import, and export.
- [ ] Add viewport, locale, pseudolocale, RTL, zoom, and state-matrix controls.
- [ ] Add generated React, CSS variable, JSON token, and theme code exports.
- [ ] Add copy/download feedback, clipboard fallback, and export validation.
- [ ] Add public Storybook and embed its catalog in the Studio.

## Foundations and forms

- [ ] Layout primitives: box, stack, inline, cluster, grid, sidebar, center, cover,
  frame, scroll area, separator, portal, and resizable panels.
- [ ] Typography, links, icons, avatars, badges, tags, status, date, number, code,
  keyboard key, truncation, and highlighting.
- [ ] Buttons, button groups, split buttons, toggles, menus, tooltips, popovers,
  dialogs, drawers, sheets, tabs, disclosures, breadcrumbs, pagination, and steppers.
- [ ] Text, password, number, date, time, range, color, search, select, combobox,
  autocomplete, multiselect, checkbox, radio, switch, slider, rating, tag, OTP,
  upload, drop, paste, and attachment fields.
- [ ] Validation, server errors, autosave, unsaved changes, conditional/repeatable
  fields, wizards, JSON Schema forms, query builder, policy builder, JSON editor,
  key/value editor, masked fields, diff-before-save, history, restore, and conflicts.
- [ ] Loading, empty, no-results, first-run, stale, partial, denied, offline,
  degraded, maintenance, quota, error, and recovery states.

## Authentication and enterprise application shell

- [ ] Login, sign-up, email/password, email code, magic link, Google OAuth, passkey,
  enterprise SSO, MFA, step-up, verification, reset, recovery, invitations, session
  expiry, device/session management, deprovisioned access, and tenant switching.
- [ ] Responsive shell, workspace/project/environment switchers, global search,
  recents, favorites, command palette, shortcuts, help, user menu, and support access.
- [ ] Dashboard, history, saved views, archive/restore, labels, bulk actions, sharing,
  printing, exports, notifications, preferences, quiet hours, and deep links.
- [ ] Consent, privacy, cookie, telemetry, DNT, and GPC controls.

## Agent experience

- [ ] Full message family: user, assistant, system, tool, status, approval, artifact,
  safety, and structured error messages.
- [ ] Sanitized streaming Markdown, code, tables, math, diagrams, citations, evidence,
  artifacts, regeneration, editing, branching, retry, feedback, sharing, and printing.
- [ ] Long-conversation virtualization, scroll pinning, unread state, and jump-to-latest.
- [ ] Composer commands, mentions, templates, variables, agent/model/mode/knowledge
  selectors, voice contract, draft persistence, undo/redo, offline queue, and conflicts.
- [ ] Attachment validation, progress, scanning contract, quota, cancel, retry,
  rejection, preview, paste, drag/drop, and mobile capture.
- [ ] Run queue and lifecycle: pause, resume, stop, cancel, retry, interrupt, steer,
  reconnect, replay, duplicate handling, background execution, and diagnostics.
- [ ] Safe thinking summaries only; never expose hidden reasoning or chain-of-thought.
- [ ] Plans, nested steps, tools, evidence, timings, sub-agents, delegation, and handoffs.
- [ ] Risk-based approvals, scopes, diffs, deadlines, escalation, delegation, batch and
  conditional approval, expiry, auto-deny, appeal, step-up, and immutable receipts.

## Results, data, workflows, and administration

- [ ] Virtualized data grid, tree grid, sorting, filtering, grouping, aggregation,
  selection, column controls, density, saved views, pagination, and bulk actions.
- [ ] Accessible charts and alternatives for usage, cost, latency, evaluations,
  traces, timelines, heatmaps, distributions, funnels, and hierarchical data.
- [ ] Code, diff, JSON, CSV, log, file-tree, image, PDF, audio, video, transcript,
  Markdown, citation, evidence, provenance, version, comparison, and artifact viewers.
- [ ] Agent catalog; tool and skill registry; OAuth, scopes, permissions, quotas,
  health, test invocation, history, revocation, and approval requirements.
- [ ] Knowledge connectors, ingestion/sync states, source/chunk inspection,
  permission-aware search, retrieval debugger, ranking evidence, freshness, and reindex.
- [ ] Workflow catalog, accessible canvas and outline editor, typed nodes and edges,
  validation, navigation, grouping, version diff, test runs, execution overlays, logs,
  retry-from-node, cancellation, and adapted mobile view.
- [ ] Multi-agent roster, topology, shared context, handoffs, conflicts, presence, and
  parent/child run views.
- [ ] Tenant, workspace, user, group, role, permission, SSO, SCIM, session, retention,
  residency, region, model/tool allowlist, safety, quota, budget, feature flag, brand,
  audit, legal hold, billing, entitlement, moderation, incident, integration, API-key,
  secret, webhook, and delivery-history UI contracts.

## Protocols, security, accessibility, and quality

- [ ] Deterministic normalized event contracts, reducers, replay, snapshots, JSON
  Schema, error taxonomy, adapters, simulation, fixtures, and telemetry redaction.
- [ ] AG-UI conformance adapter; isolated experimental A2UI and A2A adapters.
- [ ] Finite generative-UI component/action registries and malicious-payload limits.
- [ ] Sanitized Markdown, trusted URL policy, strict CSP, Trusted Types, isolated
  artifact origin, restrictive iframe sandbox, versioned messaging, and fuzz tests.
- [ ] WCAG 2.2 AA, Section 508, EN 301 549, 320px reflow, 400% zoom, keyboard,
  drag alternatives, focus restoration, live-region throttling, and screen-reader matrix.
- [ ] Ten maintained locales plus expanded LTR and mirrored RTL pseudolocales.
- [ ] Unit, interaction, visual, E2E, accessibility, conformance, mutation, consumer,
  browser/device, performance, memory-soak, package-size, and tree-shaking tests.
- [ ] Dependency boundaries, API reports, Changesets, codemods, SBOM, provenance,
  signed releases, license audit, contributor docs, security docs, and migrations.

## Release and hosting

- [ ] Replace the MVP font request with packaged/self-hosted production assets.
- [ ] Add PWA install, update, offline history, draft queue, reconnect conflict,
  cache clearing, security update, and push permission flows.
- [ ] Publish stable packages only after public APIs and accessibility gates are frozen.
- [ ] Publish the validated Vite Studio and Next.js reference through ChatGPT Sites.
- [ ] Run deployed desktop/mobile/keyboard smoke tests against the exact release commit.
- [ ] Tag and announce 1.0 only when GitHub, npm, and Sites identify the same commit.
