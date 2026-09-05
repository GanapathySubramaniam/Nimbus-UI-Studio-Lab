import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const json = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

test("root TypeScript policy enables enterprise strictness", () => {
  const config = json("tsconfig.base.json").compilerOptions;

  assert.equal(config.strict, true);
  assert.equal(config.noUncheckedIndexedAccess, true);
  assert.equal(config.exactOptionalPropertyTypes, true);
  assert.equal(config.noImplicitOverride, true);
  assert.equal(config.noFallthroughCasesInSwitch, true);
  assert.equal(config.noPropertyAccessFromIndexSignature, true);
  assert.equal(config.verbatimModuleSyntax, true);
  assert.equal(config.isolatedModules, true);
  assert.equal(config.module, "ESNext");
  assert.equal(config.moduleResolution, "Bundler");
});

test("library preset emits declarations without runtime JavaScript", () => {
  const config = json("packages/config/typescript/library.json").compilerOptions;

  assert.equal(config.composite, true);
  assert.equal(config.declaration, true);
  assert.equal(config.declarationMap, true);
  assert.equal(config.emitDeclarationOnly, true);
  assert.equal(config.outDir, "${configDir}/dist");
});

test("browser and server presets expose only their intended platform types", () => {
  const browser = json("packages/config/typescript/browser.json");
  const server = json("packages/config/typescript/server.json");

  assert.deepEqual(browser.compilerOptions.lib, ["ES2024", "DOM", "DOM.Iterable"]);
  assert.deepEqual(server.compilerOptions.lib, ["ES2024"]);
  assert.deepEqual(server.compilerOptions.types, ["node"]);
});

test("config package exports stable TypeScript preset subpaths", () => {
  const pkg = json("packages/config/package.json");

  assert.equal(pkg.private, false);
  assert.equal(pkg.type, "module");
  assert.equal(pkg.exports["./typescript/base"], "./typescript/base.json");
  assert.equal(pkg.exports["./typescript/browser"], "./typescript/browser.json");
  assert.equal(pkg.exports["./typescript/server"], "./typescript/server.json");
  assert.equal(pkg.exports["./typescript/library"], "./typescript/library.json");
});
