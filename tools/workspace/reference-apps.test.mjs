import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const json = (path) => JSON.parse(read(path));

test("Vite and Next references pin the approved React stack", () => {
  const vite = json("apps/reference-vite/package.json");
  const next = json("apps/reference-next/package.json");

  assert.equal(vite.dependencies.react, "19.2.8");
  assert.equal(vite.devDependencies.vite, "8.2.2");
  assert.equal(next.dependencies.react, "19.2.8");
  assert.equal(next.dependencies.next, "16.3.4");
  assert.equal(next.scripts.build, "next build");
  assert.equal(next.scripts.typecheck, "next typegen && tsc --noEmit");
  assert.equal(next.scripts.lint, "next typegen && tsc --noEmit");
});

test("both references consume one shared application shell and journey catalog", () => {
  for (const app of ["reference-vite", "reference-next"]) {
    const pkg = json(`apps/${app}/package.json`);
    assert.equal(pkg.dependencies["@nimbus-ui-studio/application-shell"], "workspace:*");
    assert.equal(pkg.dependencies["@nimbus-ui-studio/testing"], "workspace:*");
  }

  const viteSource = read("apps/reference-vite/src/App.tsx");
  const nextSource = read("apps/reference-next/app/page.tsx");
  assert.match(viteSource, /NimbusApplicationShell/);
  assert.match(nextSource, /NimbusApplicationShell/);
});

test("shared golden journeys cover the first public experience slice", () => {
  const journeys = read("packages/testing/src/golden-journeys.ts");

  for (const journey of [
    "streaming-agent-conversation",
    "safe-thinking-summary",
    "theme-preview",
    "responsive-navigation",
    "keyboard-navigation",
  ]) {
    assert.ok(journeys.includes(`\"${journey}\"`), `missing golden journey ${journey}`);
  }
});

test("both applications are configured for static Sites artifacts", () => {
  const vite = json("apps/reference-vite/package.json");
  const nextConfig = read("apps/reference-next/next.config.ts");

  assert.equal(vite.scripts.build, "tsc -b && vite build");
  assert.match(nextConfig, /output:\s*["']export["']/);
  assert.match(nextConfig, /images:\s*\{\s*unoptimized:\s*true/);
});

// Visual-editor behavior coverage belongs in tools/studio as the old
// ComponentLab shell is replaced; workspace tests do not grep its source.
