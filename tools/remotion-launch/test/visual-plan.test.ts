import assert from "node:assert/strict";
import test from "node:test";

let loadError: unknown;
const visualPlan = import("../src/visual-plan.ts").catch((error: unknown) => {
  loadError = error;
  return undefined;
});

test("every product chapter introduces the feature in orange and white before revealing a crisp product close-up", async () => {
  const api = await visualPlan;
  assert.ok(api, `Visual plan must load: ${String(loadError)}`);
  assert.deepEqual(api.PRODUCT_CHAPTERS.map((chapter) => [chapter.id, chapter.preludeFrames, chapter.sourceStartFrame]), [
    ["canvas", 90, 0],
    ["system", 90, 360],
    ["context", 90, 900],
  ]);
  for (const chapter of api.PRODUCT_CHAPTERS) {
    assert.equal(chapter.preludePalette, "orange-white");
    assert.equal(chapter.productTreatment, "full-resolution-close-up");
  }
});
