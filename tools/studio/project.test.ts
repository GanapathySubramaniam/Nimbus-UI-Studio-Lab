import test from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  createWidget,
} from "../../packages/application-shell/src/studio/model.ts";
import { widgetCatalog } from "../../packages/application-shell/src/studio/catalog.ts";
import * as project from "../../packages/application-shell/src/studio/project.ts";

test("legacy single pages migrate into version two projects without changing their content", () => {
  assert.equal(typeof project.parseProject, "function");
  const doc = createDocument();
  const migrated = project.parseProject(JSON.stringify(doc));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.startPageId, migrated.pages[0]?.id);
  assert.deepEqual(migrated.pages[0]?.document, doc);
});
test("page deletion clears navigation targets and preserves at least one page", () => {
  let p = project.createProject(createDocument());
  p = project.addPage(p, { ...createDocument(), name: "Destination" });
  const target = p.pages[1]!.id;
  const widget = {
    ...createWidget(widgetCatalog[0]!),
    actions: { click: target, "item:0": target },
  };
  p = project.replacePage(p, p.pages[0]!.id, {
    ...p.pages[0]!.document,
    widgets: [widget],
  });
  p = project.removePage({ ...p, startPageId: target }, target);
  assert.equal(p.pages.length, 1);
  assert.equal(p.startPageId, p.pages[0]!.id);
  assert.deepEqual(p.pages[0]!.document.widgets[0]!.actions, {});
  assert.equal(project.removePage(p, p.startPageId), p);
});
test("duplicated pages have distinct identities and self navigation follows the duplicate", () => {
  let p = project.createProject(createDocument());
  const id = p.startPageId;
  const widget = { ...createWidget(widgetCatalog[0]!), actions: { click: id } };
  p = project.replacePage(p, id, {
    ...p.pages[0]!.document,
    widgets: [widget],
  });
  const copy = project.duplicatePage(p, id);
  assert.equal(copy.pages.length, 2);
  assert.notEqual(copy.pages[1]!.id, id);
  assert.notEqual(copy.pages[1]!.document.widgets[0]!.id, widget.id);
  assert.equal(
    copy.pages[1]!.document.widgets[0]!.actions?.click,
    copy.pages[1]!.id,
  );
  assert.equal(p.pages.length, 1);
});
test("invalid identity, version, start-page and dangling targets are rejected", () => {
  const p = project.createProject(createDocument());
  assert.throws(() =>
    project.parseProject(JSON.stringify({ ...p, version: 3 })),
  );
  assert.throws(() =>
    project.parseProject(JSON.stringify({ ...p, startPageId: "missing" })),
  );
  assert.throws(() =>
    project.parseProject(
      JSON.stringify({ ...p, pages: [...p.pages, ...p.pages] }),
    ),
  );
  assert.throws(() =>
    project.parseProject(JSON.stringify({ ...p, pages: [] })),
  );
  const w = {
    ...createWidget(widgetCatalog[0]!),
    actions: { click: "missing" },
  };
  const broken = project.replacePage(p, p.startPageId, {
    ...createDocument(),
    widgets: [w],
  });
  assert.throws(() => project.parseProject(JSON.stringify(broken)));
});
test("page limits and no-op updates are deterministic", () => {
  let p = project.createProject(createDocument());
  for (let i = 1; i < 50; i++) p = project.addPage(p, createDocument());
  assert.equal(p.pages.length, 50);
  assert.equal(project.addPage(p, createDocument()), p);
  assert.equal(project.replacePage(p, "missing", createDocument()), p);
  assert.deepEqual(project.parseProject(JSON.stringify(p)), p);
});
