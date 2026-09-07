import assert from "node:assert/strict";
import test from "node:test";

let loadError: unknown;
const layout = import("../src/scene-layout.ts").catch((error: unknown) => {
  loadError = error;
  return undefined;
});

test("hero captions retain horizontal and vertical centering during their entrance", async () => {
  const api = await layout;
  assert.ok(api, `Scene-layout helpers must load: ${String(loadError)}`);
  assert.equal(api.captionTransform(28, true), "translate(-50%, calc(-50% + 28px))");
  assert.equal(api.captionTransform(0, true), "translate(-50%, calc(-50% + 0px))");
  assert.equal(api.captionTransform(28, false), "translateY(28px)");
});
