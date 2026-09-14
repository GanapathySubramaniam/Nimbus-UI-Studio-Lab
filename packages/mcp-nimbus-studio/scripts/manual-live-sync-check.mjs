// Manual end-to-end check that a running Studio tab receives an agent's
// edits live. Requires `playwright` (not a project dependency — install it
// yourself, e.g. `npm install -D playwright && npx playwright install chromium`)
// and a Studio build already being served, e.g.:
//   pnpm --filter @nimbus-ui-studio/reference-vite build
//   pnpm --filter @nimbus-ui-studio/reference-vite preview --port 4173
// Then, from the repo root:
//   node packages/mcp-nimbus-studio/scripts/manual-live-sync-check.mjs [studioUrl]
import { chromium } from "playwright";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const studioUrl = process.argv[2] ?? "http://localhost:4173/";

const transport = new StdioClientTransport({
  command: "node",
  args: [`${ROOT}/packages/mcp-nimbus-studio/bin/nimbus-studio-mcp.mjs`],
  cwd: ROOT,
});
const client = new Client({ name: "live-sync-test", version: "0.0.0" });
await client.connect(transport);

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return result.content?.[0]?.text ?? "";
}

await call("new_project", { name: "Live Sync Test" });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(studioUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

await page.locator("button", { hasText: "Connect agent" }).click();
await page.waitForTimeout(800);
const buttonLabel = await page.locator("button[aria-pressed]", { hasText: /Agent connected|Connecting/ }).first().textContent();
console.log("Connect-agent button now reads:", buttonLabel);

const before = await page.locator("body").innerText();
console.log("Marker present before tool call:", before.includes("LIVE_SYNC_MARKER"));

await call("add_widget", { kind: "heading", x: 60, y: 60, title: "LIVE_SYNC_MARKER" });
await page.waitForTimeout(1000);
const after = await page.locator("body").innerText();
console.log("Marker present after tool call, no reload:", after.includes("LIVE_SYNC_MARKER"));

await call("add_widget", { kind: "button", x: 700, y: 60, title: "LIVE_SYNC_BUTTON" });
await page.waitForTimeout(800);
const after2 = await page.locator("body").innerText();
console.log("Second live update present:", after2.includes("LIVE_SYNC_BUTTON"));

await browser.close();
await client.close();
process.exit(0);
