// Manual end-to-end check: spawns the real MCP server and drives it through
// a representative session. Not wired into `pnpm test` — it starts a real
// server process and a real live-sync bridge, so run it by hand:
//   node packages/mcp-nimbus-studio/scripts/manual-smoke-check.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
// Isolate this run's saved components and skill docs from the real,
// git-tracked library and reference files.
const scratchDir = mkdtempSync(join(tmpdir(), "nimbus-smoke-"));
const scratchComponents = join(scratchDir, "saved-components.json");

const transport = new StdioClientTransport({
  command: "node",
  args: [`${ROOT}/packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs`],
  cwd: ROOT,
  env: { ...process.env, NIMBUS_COMPONENTS_PATH: scratchComponents, NIMBUS_SKILL_REFS_DIR: scratchDir },
  stderr: "pipe",
});
const client = new Client({ name: "smoke-test", version: "0.0.0" });
await client.connect(transport);

if (transport.stderr) {
  transport.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));
}

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.[0]?.text ?? "(no text)";
  console.log(`\n--- ${name}(${JSON.stringify(args)}) ---`);
  console.log(text);
  if (result.isError) console.log("[isError=true]");
  return text;
}

const tools = await client.listTools();
console.log("Registered tools:", tools.tools.map((t) => t.name).join(", "));

await call("new_project", { name: "Smoke Test App" });
await call("list_widget_kinds", { category: "Data" });
const addResult = await call("add_widget", { kind: "heading", x: 40, y: 40, title: "Portfolio overview" });
const headingId = addResult.split(/\s+/)[0];
const statA = await call("add_widget", { kind: "stat", x: 40, y: 140, width: 220, height: 120, title: "Active agents", value: "24", subtitle: "up 12%" });
const statAId = statA.split(/\s+/)[0];
await call("add_widget", { kind: "stat", x: 280, y: 140, width: 220, height: 120, title: "Tasks completed", value: "1,284", subtitle: "up 8.4%" });
await call("add_widget", { kind: "button", x: 900, y: 40, width: 190, height: 52, title: "New agent run" });
await call("list_widgets", {});
await call("update_widget", { widgetId: headingId, title: "Portfolio overview (updated)" });
await call("studio_bridge_status", {});

const code = await call("export_code", { format: "react", scope: "page" });
console.log("\nExport contains updated title:", code.includes("Portfolio overview (updated)"));

await call("save_component", { widgetIds: [statAId], name: "KPI tile (smoke test)", description: "A single stat tile saved during automated testing." });
await call("list_saved_components", {});

await client.close();
process.exit(0);
