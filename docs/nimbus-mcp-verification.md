# Nimbus UI Studio MCP server — verification record

Date: 2026-09-14. Branch `claude/ui-component-canvas-builder-8uno7e`. Node
v22.22.2, Chromium via Playwright, `apps/reference-vite` production build
served locally on port 4173.

## Scope delivered

`packages/mcp-nimbus-studio` — a standard MCP server (stdio,
`@modelcontextprotocol/sdk`) exposing 19 tools over the Studio's real
design engine (`packages/application-shell/src/studio/engine.ts`, a new
framework-free barrel export added alongside it): project/page/widget
CRUD, code and package export (the same generator the app's own Export
dialog uses), and a reusable-component library (`save_component` /
`list_saved_components` / `insert_saved_component`) persisted to
`packages/mcp-nimbus-studio/data/saved-components.json`.

A companion skill at `.claude/skills/nimbus-ui-designer/` documents the
workflow and MCP registration for Claude Code and Codex CLI. Its
`references/components.md` and `references/saved-components.md` are
generated from the live catalog and the saved-components store
(`pnpm --filter @nimbus-ui-studio/mcp-server generate:skill-refs`) rather
than hand-maintained; `save_component` regenerates them automatically.

The Studio app gained one opt-in addition: a "Connect agent" header button
(`packages/application-shell/src/studio/studio.tsx`) that subscribes to the
MCP server's local live-sync bridge (`GET /events`, Server-Sent Events on
`127.0.0.1:4796` by default, `NIMBUS_BRIDGE_PORT` to override) and commits
incoming project updates through the same `commitProject` path used by
`Import project`. Off by default; never connects on its own.

## What was actually run

- `packages/mcp-nimbus-studio/scripts/manual-smoke-check.mjs` — spawns the
  real server over stdio via the MCP client SDK and drives it through
  `new_project`, `list_widget_kinds`, four `add_widget` calls, `list_widgets`,
  `update_widget`, `studio_bridge_status`, `export_code`, `save_component`,
  and `list_saved_components`. Verified the exported React code contains the
  post-`update_widget` title. Isolates its saved-components/skill-reference
  writes to a temp directory (`NIMBUS_COMPONENTS_PATH` /
  `NIMBUS_SKILL_REFS_DIR`) so a run never touches the real, committed files.
- `packages/mcp-nimbus-studio/scripts/manual-live-sync-check.mjs` — built
  and served the Vite reference app, opened it in a real (headless)
  Chromium tab, clicked "Connect agent" (button text changed to "Agent
  connected"), then called `add_widget` from a **separate** MCP client
  process. The new widget appeared in the open tab with no reload, twice
  in a row for two independent tool calls. Screenshot:
  `docs/media/nimbus-mcp-live-sync.png`.
- `packages/mcp-nimbus-studio/scripts/token-efficiency.mjs` — replayed the
  five `add_widget` calls documented in `docs/benchmark.md`'s "MCP
  tool-call token efficiency" section against a real server, checked the
  result against Task A's acceptance criteria, and reproduced the recorded
  203-vs-572-token comparison exactly.
- `tsc --noEmit` for both `packages/application-shell` and
  `packages/mcp-nimbus-studio`, and `turbo run build` for
  `@nimbus-ui-studio/reference-vite`, all clean.

## What this does not claim

- The 2.82x token figure is one task, measured by the person who built the
  feature, not an independent or adversarial study — see the caveats
  already in `docs/benchmark.md`.
- `save_component` / `insert_saved_component` compose existing catalog
  widgets into named, reusable groups; they do not add a new widget *kind*
  to the renderer. Adding a genuinely new rendering primitive is still a
  code change to `packages/application-shell/src/studio/render.ts` and
  `catalog.ts`, not something this MCP server does at runtime.
- The live-sync bridge is unauthenticated and bound to loopback only. It is
  a local development convenience, not something to expose past the local
  machine.
- Manual scripts under `packages/mcp-nimbus-studio/scripts/` are not wired
  into `pnpm test` — they start real server/browser processes and are run
  by hand. `manual-live-sync-check.mjs` additionally requires `playwright`,
  which is intentionally not a project dependency (installed ad hoc for
  this verification, matching how earlier Studio verification work in this
  repo, e.g. `docs/prototype-builder-verification.md`, also used it).

## Unrelated finding from this session

A user report that "redesigning and downloading as package or HTML
downloads a default template, not the actual design" could not be
reproduced on the current `main`. Tested: editing the default pre-loaded
template's heading, editing a template picked from the gallery, all three
export formats (React/HTML/JSON), both download controls (plain Download
and Download React ZIP), and a full page reload after autosave — all
correctly reflected the edit in every case. No code change was made for
this report; it may already be fixed by other recent work, or may need a
more specific repro (which widget type, exact steps) to chase further.
