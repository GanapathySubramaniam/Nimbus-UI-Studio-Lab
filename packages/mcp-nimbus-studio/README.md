# @nimbus-ui-studio/mcp-server

An MCP (Model Context Protocol) server that exposes Nimbus UI Studio's real
component catalog and design engine as tools, so a coding agent can assemble
a web app UI by calling tools instead of writing JSX/CSS by hand.

It reuses the exact same engine the Studio app and its code exporter run —
`packages/application-shell/src/studio/engine.ts` — so anything assembled
through this server opens correctly in the running app and exports
identically. There is no separate "agent" code path to drift out of sync.

Standard MCP over stdio, no build step (runs its TypeScript source directly
via [`tsx`](https://tsx.is)), so it works with any MCP-compatible client —
Claude Code, Codex CLI, or otherwise.

## Why

Hand-writing a dashboard's JSX and CSS spends tokens re-describing things a
fixed component catalog already solves. Calling
`add_widget({ kind, x, y, title, ... })` costs a fraction of that. Measured
on one real task: 203 tokens of tool calls vs. 572 tokens of equivalent
hand-written JSX+CSS for the same layout (2.82x fewer) — see
[`docs/benchmark-samples/task-a-mcp/`](../../docs/benchmark-samples/task-a-mcp)
in this repo for the exact artifacts and a command to recompute that number.

## Register it

**Claude Code** (from the repo root):
```sh
claude mcp add nimbus-studio -- node packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs
```

**Codex CLI** — add to `~/.codex/config.toml`:
```toml
[mcp_servers.nimbus-studio]
command = "node"
args = ["packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs"]
cwd = "/absolute/path/to/Nimbus-UI-Studio-Lab"
```

**Anything else that speaks MCP**: point it at
`node <repo>/packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs`.

For the full tool reference and recommended workflow, see the companion
skill at
[`.claude/skills/nimbus-ui-designer/SKILL.md`](../../.claude/skills/nimbus-ui-designer/SKILL.md)
— it applies regardless of which agent is calling this server.

## Live sync with a running Studio tab

On startup the server also opens a small local HTTP+SSE bridge (default
`http://127.0.0.1:4796`, override with the `NIMBUS_BRIDGE_PORT` environment
variable). Every tool call that changes the design is pushed to
any Studio browser tab that has clicked **Connect agent** in its header, so
you can watch an agent's edits land in real time. Bound to loopback only;
never exposed beyond the local machine. Check `studio_bridge_status` to
confirm a tab is connected.

## Development

```sh
pnpm --filter @nimbus-ui-studio/mcp-server start           # run the server directly (stdio, for manual testing)
pnpm --filter @nimbus-ui-studio/mcp-server typecheck
pnpm --filter @nimbus-ui-studio/mcp-server generate:skill-refs   # regenerate the skill's reference docs
```

`data/saved-components.json` is the persisted store behind `save_component` /
`list_saved_components` / `insert_saved_component` — components saved there
are what the skill's `references/saved-components.md` is generated from.
