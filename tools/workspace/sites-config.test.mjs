import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../../.openai/hosting.json", import.meta.url);

test("ChatGPT Sites configuration contains only public project metadata", async () => {
  const config = JSON.parse(await readFile(configUrl, "utf8"));

  assert.deepEqual(Object.keys(config).sort(), ["project_id", "static"]);
  assert.match(config.project_id, /^appgprj_[a-z0-9]+$/);
  assert.deepEqual(config.static, {
    directory: "apps/reference-vite/dist",
  });

  const serialized = JSON.stringify(config).toLowerCase();
  for (const prohibitedKey of ["token", "secret", "credential", "password", "authorization"]) {
    assert.equal(serialized.includes(prohibitedKey), false);
  }
});
