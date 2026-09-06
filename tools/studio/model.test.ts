import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDocument,
  parseDocument,
  constrainWidget,
  safeImage,
  DEFAULT_STYLE,
  createWidget,
  duplicateInDocument,
  updateWidgetContent,
} from "../../packages/application-shell/src/studio/model.ts";
import {
  createHistory,
  commitHistory,
  undoHistory,
  redoHistory,
} from "../../packages/application-shell/src/studio/history.ts";
import { designPresets } from "../../packages/application-shell/src/studio/presets.ts";
import { widgetCatalog } from "../../packages/application-shell/src/studio/catalog.ts";

test("document parser round trips a valid page and rejects malformed imported state", () => {
  const doc = createDocument();
  assert.deepEqual(parseDocument(JSON.stringify(doc)), doc);
  for (const value of [
    {},
    { ...doc, version: 2 },
    { ...doc, width: -1 },
    { ...doc, background: "url(https://tracker.test)" },
    { ...doc, widgets: [{}] },
  ]) {
    assert.throws(() => parseDocument(JSON.stringify(value)));
  }
});
test("unsafe images cannot execute code or embed SVG documents", () => {
  assert.equal(safeImage("javascript:alert(1)"), false);
  assert.equal(safeImage("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(safeImage("https://example.org/logo.svg"), false);
  assert.equal(safeImage("https://example.org/page.html"), false);
  assert.equal(safeImage(" https://example.org/image.png"), false);
  assert.equal(safeImage("https://example.org/image.png"), true);
  assert.equal(safeImage("data:image/png;base64,aGVsbG8="), true);
  assert.equal(safeImage(""), true);
});
test("widget geometry remains finite and inside the canvas", () => {
  assert.deepEqual(
    constrainWidget({ x: -12, y: 99, width: 400, height: 200 }, 320, 250),
    { x: 0, y: 50, width: 320, height: 200 },
  );
  assert.deepEqual(
    constrainWidget({ x: 13, y: 17, width: 100, height: 80 }, 1000, 1000, 8),
    { x: 16, y: 16, width: 104, height: 80 },
  );
  assert.equal(DEFAULT_STYLE.fontSize, 14);
});
test("undo restores prior state, redo restores edit, a new edit removes redo branch", () => {
  const initial = createHistory("a");
  const edited = commitHistory(initial, "b");
  assert.equal(undoHistory(edited).present, "a");
  assert.equal(redoHistory(undoHistory(edited)).present, "b");
  const branched = commitHistory(undoHistory(edited), "c");
  assert.equal(branched.future.length, 0);
  let bounded = initial;
  for (let i = 0; i < 150; i++) bounded = commitHistory(bounded, String(i));
  assert.ok(bounded.past.length <= 60);
});

const definition = {
  kind: "image" as const,
  name: "Image",
  category: "Content",
  description: "",
  width: 200,
  height: 200,
  title: "Original",
  subtitle: "",
  value: "",
  items: "",
};
test("every shipped design preset and widget kind produces an importable project", () => {
  for (const preset of designPresets) {
    const doc = createDocument();
    doc.widgets = widgetCatalog.map((def) => createWidget(def, preset));
    assert.deepEqual(
      parseDocument(JSON.stringify(doc)),
      doc,
      `Invalid preset ${preset.id}`,
    );
  }
});
test("duplicating the maximum layer name produces a reopenable project", () => {
  const doc = createDocument();
  const widget = createWidget(definition);
  widget.name = "a".repeat(120);
  doc.widgets.push(widget);
  const duplicate = duplicateInDocument(doc, widget.id);
  assert.equal(duplicate.widgets.length, 2);
  assert.equal(duplicate.widgets[1]?.name.length, 120);
  assert.deepEqual(parseDocument(JSON.stringify(duplicate)), duplicate);
});
test("asset completion merges only its field and cannot resurrect missing or locked widgets", () => {
  const doc = createDocument();
  const widget = createWidget(definition);
  widget.content.title = "Newer title";
  doc.widgets.push(widget);
  const image = "data:image/png;base64,aGVsbG8=";
  const updated = updateWidgetContent(doc, widget.id, { image });
  assert.equal(updated.widgets[0]?.content.title, "Newer title");
  assert.equal(updated.widgets[0]?.content.image, image);
  const deleted = { ...doc, widgets: [] };
  assert.equal(updateWidgetContent(deleted, widget.id, { image }), deleted);
  widget.locked = true;
  assert.equal(updateWidgetContent(doc, widget.id, { image }), doc);
});
