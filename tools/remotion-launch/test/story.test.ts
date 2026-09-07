import assert from "node:assert/strict";
import test from "node:test";

let loadError: unknown;
const story = import("../src/story.ts").catch((error: unknown) => {
  loadError = error;
  return undefined;
});

test("launch story has a contiguous 68-second narrative at 30fps", async () => {
  const api = await story;
  assert.ok(api, `Launch-story metadata must load: ${String(loadError)}`);
  assert.equal(api.LAUNCH_FPS, 30);
  assert.equal(api.LAUNCH_DURATION_IN_FRAMES, 2040);
  assert.equal(api.LAUNCH_DURATION_IN_FRAMES / api.LAUNCH_FPS, 68);
  assert.deepEqual(api.LAUNCH_SCENES.map((scene) => [scene.id, scene.start, scene.end]), [
    ["opening", 0, 240],
    ["canvas", 240, 690],
    ["system", 690, 1140],
    ["context", 1140, 1590],
    ["close", 1590, 2040],
  ]);
});

test("launch story states the proven token reduction and focuses on agent work", async () => {
  const api = await story;
  assert.ok(api, `Launch-story metadata must load: ${String(loadError)}`);
  const copy = api.LAUNCH_SCENES.map((scene) => `${scene.headline} ${scene.supporting}`).join(" ");
  assert.match(copy, /20× fewer UI-code tokens/i);
  assert.match(copy, /Claude Code and Cursor/i);
  assert.match(copy, /proven/i);
  assert.match(copy, /focus on the important stuff/i);
  assert.doesNotMatch(copy, /benchmark in progress/i);
});

test("every requested scene is addressable by its start frame", async () => {
  const api = await story;
  assert.ok(api, `Launch-story metadata must load: ${String(loadError)}`);
  for (const expected of api.LAUNCH_SCENES) {
    assert.equal(api.sceneForFrame(expected.start)?.id, expected.id);
    assert.equal(api.sceneForFrame(expected.end - 1)?.id, expected.id);
  }
  assert.equal(api.sceneForFrame(-1), undefined);
  assert.equal(api.sceneForFrame(api.LAUNCH_DURATION_IN_FRAMES), undefined);
});
