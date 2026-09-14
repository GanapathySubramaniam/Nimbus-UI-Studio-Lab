---
name: nimbus-ui-designer
description: Assemble a web app UI (dashboards, forms, agent panels, etc.) by calling the Nimbus UI Studio MCP server's tools instead of writing JSX/CSS by hand. Use whenever the task is "build/design a UI", "add this widget to the page", "mock up a dashboard", or when a Nimbus Studio project (nimbus-project.json, or the running Studio app) is already open. Measured at roughly a third of the tokens of hand-written code for the same layout, and any widget assembled this way opens correctly in the real Studio app and exports identically.
---

# Nimbus UI Studio designer

You are composing a UI from Nimbus UI Studio's real component catalog through
its MCP server (`@nimbus-ui-studio/mcp-server`), not by writing JSX or CSS.
Every tool call operates on the exact same data model and generator the
Studio app itself uses (`packages/application-shell/src/studio/`), so
whatever you build here opens correctly in the app and exports identically —
there is no separate "agent" code path that can drift from what a human sees.

**Why this exists**: hand-writing a dashboard's JSX + CSS burns tokens on
markup and style boilerplate for things a fixed component catalog already
solves. Calling `add_widget({kind, x, y, title, ...})` costs a fraction of
that. Measured on one real task: 203 tokens of tool calls vs. 572 tokens of
equivalent hand-written JSX+CSS (2.82x fewer) — see
`docs/benchmark-samples/task-a-mcp/` in this repo for the exact artifacts and
a command to recompute that number yourself. Don't repeat this number
without also being ready to show that command; if you improve on it with a
new measurement, update this line and commit the new artifacts the same way.

## Before you start: register the MCP server

If the `nimbus_ui_studio` (or similarly named) tools are not already
available in this session, register the server once:

**Claude Code**: `claude mcp add nimbus-studio -- node packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs` (run from the repo root).

**Codex CLI**: add to `~/.codex/config.toml`:
```toml
[mcp_servers.nimbus-studio]
command = "node"
args = ["packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs"]
cwd = "/absolute/path/to/Nimbus-UI-Studio-Lab"
```

**Any other MCP-compatible agent**: the server speaks standard MCP over
stdio — point your client's server config at
`node <repo>/packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs`. No build
step; it runs the TypeScript source directly.

## Workflow

1. **Start or resume a project.** `new_project({ template })` for a fresh
   design (see `list_templates` for starter pages), or `load_project_json`
   to resume one. The server holds one working project in memory per
   process — you don't need to pass the whole project on every call.
2. **Look up what's available, once per session.** `list_widget_kinds` (full
   catalog is also mirrored in `references/components.md`, regenerated from
   the live catalog — read that file instead of calling the tool if you
   just need to skim it) and `list_style_presets`.
3. **Place widgets.** `add_widget({ kind, x, y, width?, height?, title?,
   subtitle?, value?, items?, presetId? })` per element. Position and size
   are pixels on the page's own grid (default page is 1200×1000). Every
   widget kind uses the same four content fields — `title`, `subtitle`,
   `value`, `items` (one item per line; a row's columns separated by
   ` | `) — check `references/components.md` for what each kind renders
   them as (e.g. a `stat` widget shows `title` as its label and `value` as
   the big number).
4. **Check reusable components first.** Before hand-composing something
   common (a KPI tile, an agent status card, a pricing block), check
   `references/saved-components.md` — if a close match exists, place it
   with `insert_saved_component` instead of rebuilding it from primitives.
5. **Iterate.** `list_widgets`, `update_widget`, `remove_widget`,
   `duplicate_widget` as needed. If the user has the Studio app open in a
   browser and clicks "Connect agent" in its header, every mutation appears
   there live — no export/reload needed to show progress. Check
   `studio_bridge_status` if you want to confirm a tab is connected.
6. **Save what's reusable.** Once you've composed something you or another
   session will want again, call `save_component({ widgetIds, name,
   description })`. This persists it to this package's saved-components
   store and **automatically regenerates
   `references/saved-components.md`** — the next session (yours or a
   teammate's) sees it without anyone touching this file by hand. This is
   the mechanism by which the component library, and this skill, grow over
   time.
7. **Hand off code only when something outside the Studio needs it.**
   `export_code({ format, scope })` returns React/HTML/JSON — the same
   generator the app's own Export dialog uses. For a full runnable package,
   `export_package({ path, scope })` writes the same ZIP the app's
   "Download React ZIP" button produces straight to disk, instead of
   spending tokens returning it as text.

## Rules

- Don't write raw JSX/CSS for something the catalog already covers — that
  defeats the entire point of this skill. Check `list_widget_kinds` /
  `references/components.md` first.
- Don't pass a full project JSON on every call. `pageId` is optional on
  every per-page tool and defaults to the project's current page; only pass
  `get_project_json` / `load_project_json` when you genuinely need the
  whole document (backup, handoff, or resuming someone else's project).
- Don't fabricate a token-savings number beyond what's measured in
  `docs/benchmark-samples/`. If asked, point to the real comparison instead
  of estimating one.
- Widget kinds are a closed, generated-from-source list — don't guess a
  kind name; call `list_widget_kinds` or read `references/components.md`.

## Reference files (regenerate with `pnpm --filter @nimbus-ui-studio/mcp-server generate:skill-refs`)

- `references/components.md` — full widget catalog and style-preset
  families, generated from `packages/application-shell/src/studio/catalog.ts`.
- `references/saved-components.md` — reusable components saved by any
  session via `save_component`. Grows over time; never hand-edit.
