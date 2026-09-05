import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const json = (path) => JSON.parse(read(path));

test("root package pins the approved package manager and task runner", () => {
  const pkg = json("package.json");

  assert.equal(pkg.private, true);
  assert.equal(pkg.packageManager, "pnpm@12.3.4");
  assert.equal(pkg.engines.node, ">=22.16.0");
  assert.equal(pkg.devDependencies.turbo, "2.10.12");
});

test("workspace discovers applications, packages, and clean consumer fixtures", () => {
  const workspace = read("pnpm-workspace.yaml");

  for (const pattern of ["apps/*", "packages/*", "fixtures/*"]) {
    assert.ok(workspace.includes(`- '${pattern}'`), `missing workspace pattern ${pattern}`);
  }
});

test("root scripts expose the complete workspace lifecycle", () => {
  const scripts = json("package.json").scripts;

  for (const name of ["build", "dev", "test", "lint", "typecheck", "check", "clean"]) {
    assert.equal(typeof scripts[name], "string", `missing root script ${name}`);
  }
});

test("turbo tasks use dependency-aware builds and cacheable outputs", () => {
  const turbo = json("turbo.json");

  assert.deepEqual(turbo.tasks.build.dependsOn, ["^build"]);
  assert.ok(turbo.tasks.build.outputs.includes("dist/**"));
  assert.equal(turbo.tasks.dev.cache, false);
  assert.equal(turbo.tasks.dev.persistent, true);
  for (const task of ["test", "lint", "typecheck"]) {
    assert.ok(turbo.tasks[task], `missing turbo task ${task}`);
  }
});
