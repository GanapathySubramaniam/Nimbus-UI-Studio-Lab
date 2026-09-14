// Reproduces the MCP tool-call token count documented in docs/benchmark.md
// ("MCP tool-call token efficiency"). Run from anywhere:
//   node packages/mcp-nimbus-studio/scripts/token-efficiency.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { encode } from "gpt-tokenizer";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const calls = JSON.parse(readFileSync(`${ROOT}/docs/benchmark-samples/task-a-mcp/mcp-calls.json`, "utf8"));

const transport = new StdioClientTransport({
  command: "node",
  args: [`${ROOT}/packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs`],
  cwd: ROOT,
});
const client = new Client({ name: "token-efficiency-test", version: "0.0.0" });
await client.connect(transport);

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return result.content?.[0]?.text ?? "";
}

await call("new_project", { name: "Token Efficiency Task A" });
for (const step of calls) {
  const result = await call(step.tool, step.arguments);
  console.log(result);
}
const widgets = await call("list_widgets", {});
console.log("\n--- resulting widgets ---\n" + widgets);

const code = await call("export_code", { format: "react", scope: "page" });
const acceptance = {
  hasHeading: code.includes('"kind": "heading"') && code.includes("Portfolio overview"),
  hasButton: code.includes('"kind": "button"') && code.includes("New agent run"),
  statCount: (code.match(/"kind": "stat"/g) || []).length,
};
console.log("\nAcceptance check:", JSON.stringify(acceptance));

const callsText = calls.map((c) => JSON.stringify({ tool: c.tool, arguments: c.arguments })).join("\n");
const mcpTokens = encode(callsText).length;
const baselineTsx = readFileSync(`${ROOT}/docs/benchmark-samples/task-a/baseline.tsx`, "utf8");
const baselineCss = readFileSync(`${ROOT}/docs/benchmark-samples/task-a/baseline.css`, "utf8");
const baselineTokens = encode(baselineTsx + "\n" + baselineCss).length;

console.log(`\nMCP tool-call payload: ${callsText.length} chars / ${mcpTokens} tokens`);
console.log(`Hand-written baseline: ${(baselineTsx + baselineCss).length} chars / ${baselineTokens} tokens`);
console.log(`Ratio (baseline / mcp): ${(baselineTokens / mcpTokens).toFixed(2)}x`);

writeFileSync(`${ROOT}/docs/benchmark-samples/task-a-mcp/mcp-calls.txt`, callsText);

await client.close();
process.exit(0);
