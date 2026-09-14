#!/usr/bin/env node
// Regenerates ../references/*.md from the live widget catalog and the saved
// components store. Thin wrapper so it can be run from anywhere; the real
// work (and its dependencies) lives in the mcp-nimbus-studio package.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
execFileSync("pnpm", ["--filter", "@nimbus-ui-studio/mcp-server", "generate:skill-refs"], {
  cwd: repoRoot,
  stdio: "inherit",
});
