import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { type TestContext } from "node:test";
import { Worker } from "node:worker_threads";
import { once } from "node:events";
import { openStore, ConflictError } from "./database.ts";
import { migrate } from "./migrations.ts";
import { designPresets } from "../../packages/application-shell/src/studio/presets.ts";
import { createDocument, DEFAULT_STYLE } from "../../packages/application-shell/src/studio/model.ts";
import { createProject, parseProject, type StudioProject } from "../../packages/application-shell/src/studio/project.ts";

const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=";
const tables = ["project", "page", "node", "style_override", "animation_binding", "interaction", "asset", "preset", "animation_preset", "user_preset", "user_widget_style", "logo", "template", "project_setting", "migration"];
const owned = ["page", "node", "style_override", "animation_binding", "interaction", "asset", "project_setting"];

function fixture(): StudioProject {
  const page = createDocument();
  page.backdrop = { type: "image", src: image, size: "cover", positionX: 50, positionY: 50, repeat: "no-repeat" };
  page.widgets = [{
    id: "same-node", kind: "button", name: "Navigate", x: 20, y: 20, width: 160, height: 60,
    presetId: "nimbus", style: { ...DEFAULT_STYLE, backdrop: page.backdrop, text: { title: { fontWeight: 700, italic: true } }, logo: { width: 32, height: 32, fit: "contain" } },
    content: { title: "Go ' next", subtitle: "Subtitle", value: "42", items: "One\nTwo", image, imageAlt: "Uploaded logo" },
    motion: { entrance: "fade", hover: "lift", click: "press", duration: 320, delay: 40, loading: "pulse", easing: "ease-out", repeat: 3 },
    state: "default", locked: false, hidden: false,
    actions: { click: "details", "item:0": "home" },
  }];
  return { version: 2, name: "O'Brien app", startPageId: "home", pages: [{ id: "home", document: page }, { id: "details", document: structuredClone(page) }] };
}

function setup(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "nimbus-sqlite-test-"));
  const path = join(directory, ".nimbus", "studio.sqlite");
  const stores: ReturnType<typeof openStore>[] = [];
  const connections: DatabaseSync[] = [];
  t.after(() => {
    for (const db of connections) db.close();
    for (const store of stores) store.close();
    // Only the unique test-owned directory returned by mkdtempSync is removed.
    rmSync(directory, { recursive: true, force: true });
  });
  const open = () => { const store = openStore(path); stores.push(store); return store; };
  const raw = () => { const db = new DatabaseSync(path); db.exec("PRAGMA foreign_keys = ON"); connections.push(db); return db; };
  return { path, open, raw };
}

function count(db: DatabaseSync, table: string): number {
  assert.ok(tables.includes(table));
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!["count"]);
}

function integrity(db: DatabaseSync) {
  assert.equal(db.prepare("PRAGMA integrity_check").get()!["integrity_check"], "ok");
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
}

test("creates every required table, configures SQLite, and seeds only the current 75 presets", (t) => {
  const f = setup(t), store = f.open(), db = f.raw();
  const actual = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map((r) => r["name"]);
  for (const table of tables) assert.ok(actual.includes(table), table);
  assert.equal(store.db.prepare("PRAGMA foreign_keys").get()!["foreign_keys"], 1);
  assert.equal(store.db.prepare("PRAGMA journal_mode").get()!["journal_mode"], "wal");
  assert.equal(store.db.prepare("PRAGMA busy_timeout").get()!["timeout"], 5000);
  assert.equal(count(db, "migration"), 2);
  assert.equal(count(db, "preset"), 75);
  for (const preset of designPresets) {
    const row = db.prepare("SELECT preset_json FROM preset WHERE id = ?").get(preset.id)!;
    const seeded = JSON.parse(String(row["preset_json"]));
    assert.deepEqual(seeded.style, preset.style);
    assert.equal(seeded.name, preset.name);
    assert.equal(seeded.tokenVersion, 1);
    assert.deepEqual(Object.keys(seeded.themes).sort(), ['dark', 'light']);
  }
  for (const table of ["animation_preset", "template", "user_preset", "user_widget_style", "logo"]) assert.equal(count(db, table), 0);
  assert.deepEqual(store.listProjects(), []);
  assert.equal(store.getProject("missing"), null);
  integrity(db);
});

test("roundtrips whole validated documents and normalized uploaded images, styles, motion and actions", (t) => {
  const f = setup(t), store = f.open(), project = fixture();
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  const saved = store.saveProject("project-one", project, 0);
  assert.deepEqual(Object.keys(saved).sort(), ["createdAt", "id", "project", "revision", "updatedAt"]);
  assert.equal(saved.id, "project-one");
  assert.equal(saved.revision, 1);
  assert.equal(saved.createdAt, saved.updatedAt);
  assert.ok(Number.isFinite(Date.parse(saved.createdAt)));
  assert.deepEqual(saved.project, project);
  assert.deepEqual(store.getProject("project-one"), saved);
  assert.deepEqual(store.listProjects(), [saved]);
  const db = f.raw();
  assert.deepEqual(JSON.parse(String(db.prepare("SELECT project_json FROM project").get()!["project_json"])), project);
  assert.equal(count(db, "page"), 2);
  assert.equal(count(db, "node"), 2);
  assert.equal(count(db, "asset"), 1);
  assert.equal(db.prepare("SELECT source FROM asset").get()!["source"], image);
  assert.deepEqual(JSON.parse(String(db.prepare("SELECT style_json FROM style_override LIMIT 1").get()!["style_json"])), project.pages[0]!.document.widgets[0]!.style);
  assert.deepEqual(JSON.parse(String(db.prepare("SELECT motion_json FROM animation_binding LIMIT 1").get()!["motion_json"])), project.pages[0]!.document.widgets[0]!.motion);
  assert.equal(count(db, "interaction"), 4);
  assert.equal(db.prepare("SELECT target_page_id FROM interaction WHERE page_id = 'home' AND event = 'click'").get()!["target_page_id"], "details");
  assert.equal(db.prepare("SELECT image_asset_id = backdrop_asset_id AS same FROM node LIMIT 1").get()!["same"], 1);
  assert.equal(db.prepare("SELECT parent_id FROM node LIMIT 1").get()!["parent_id"], null);
  integrity(db);
});

test("migration repeats and close/reopen preserve data, revision, timestamps and seeds", (t) => {
  const f = setup(t), first = f.open();
  const row = first.saveProject("persist", fixture(), 0);
  migrate(first.db);
  migrate(first.db);
  assert.deepEqual(first.getProject("persist"), row);
  first.close();
  first.close();
  const second = f.open();
  assert.deepEqual(second.getProject("persist"), row);
  assert.equal(count(second.db, "preset"), 75);
  assert.equal(count(second.db, "migration"), 2);
  integrity(second.db);
});

test("updates increment revision, preserve creation time, and remove obsolete normalized children", (t) => {
  const f = setup(t), store = f.open();
  const first = store.saveProject("replace", fixture(), 0);
  const replacement = createProject(createDocument());
  const next = store.saveProject("replace", replacement, 1);
  assert.equal(next.revision, 2);
  assert.equal(next.createdAt, first.createdAt);
  assert.ok(next.updatedAt >= first.updatedAt);
  assert.deepEqual(next.project, replacement);
  assert.equal(count(store.db, "page"), 1);
  for (const table of ["node", "style_override", "animation_binding", "interaction", "asset"]) assert.equal(count(store.db, table), 0);
  integrity(store.db);
});

test("stale create, update and delete conflict; missing delete returns false", (t) => {
  const f = setup(t), a = f.open(), b = f.open();
  assert.equal(a.deleteProject("missing", 0), false);
  assert.equal(a.deleteProject("missing", 10), false);
  assert.throws(() => a.saveProject("missing", fixture(), 1), ConflictError);
  a.saveProject("shared", fixture(), 0);
  const stale = b.getProject("shared")!;
  const latest = a.saveProject("shared", { ...fixture(), name: "New name" }, 1);
  for (const revision of [0, stale.revision, 3]) {
    assert.throws(() => b.saveProject("shared", fixture(), revision), ConflictError);
    assert.throws(() => b.deleteProject("shared", revision), ConflictError);
  }
  assert.deepEqual(b.getProject("shared"), latest);
  assert.equal(b.deleteProject("shared", 2), true);
  assert.equal(a.getProject("shared"), null);
});

test("rejects invalid IDs and revisions with ordinary Error before any write", (t) => {
  const store = setup(t).open();
  const ordinaryError = (e: unknown) => e instanceof Error && e.constructor === Error;
  for (const id of ["", "a/b", "a.b", "é", "x\n", "a".repeat(101), 42, null]) {
    assert.throws(() => store.getProject(id as string), ordinaryError);
    assert.throws(() => store.saveProject(id as string, fixture(), 0), ordinaryError);
    assert.throws(() => store.deleteProject(id as string, 0), ordinaryError);
  }
  for (const revision of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "0", null, undefined]) {
    assert.throws(() => store.saveProject("valid", fixture(), revision as number), ordinaryError);
    assert.throws(() => store.deleteProject("valid", revision as number), ordinaryError);
  }
  assert.deepEqual(store.listProjects(), []);
  store.saveProject("A_z-09" + "x".repeat(94), createProject(createDocument()), 0);
});

test("schema-invalid replacement preserves the original and legacy input uses parseProject", (t) => {
  const f = setup(t), store = f.open();
  const original = store.saveProject("valid", fixture(), 0);
  const bad = fixture(); bad.pages[0]!.document.widgets[0]!.actions = { click: "missing" };
  for (const value of [bad, { ...fixture(), version: 9 }, null, undefined]) {
    assert.throws(() => store.saveProject("valid", value, 1), (e) => e instanceof Error && e.constructor === Error);
    assert.deepEqual(store.getProject("valid"), original);
    assert.equal(count(store.db, "node"), 2);
    integrity(store.db);
  }
  assert.deepEqual(store.saveProject("legacy", createDocument(), 0).project, createProject(createDocument()));
});

test("SQL failure midway through replacement rolls back document, revision and every normalized row", (t) => {
  const store = setup(t).open(), original = store.saveProject("atomic", fixture(), 0);
  const snapshot = () => tables.map((table) => store.db.prepare(`SELECT * FROM ${table}`).all());
  const before = snapshot();
  store.db.exec("CREATE TEMP TRIGGER fail_style BEFORE INSERT ON style_override BEGIN SELECT RAISE(ABORT, 'injected disk write failure'); END");
  assert.throws(() => store.saveProject("atomic", { ...fixture(), name: "Replacement" }, 1), /injected disk write failure/);
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(store.getProject("atomic"), original);
  store.db.exec("DROP TRIGGER fail_style");
  assert.equal(store.saveProject("atomic", fixture(), 1).revision, 2);
  integrity(store.db);
});

test("composite keys isolate repeated IDs and reject cross-project, cross-page and dangling raw references", (t) => {
  const f = setup(t), store = f.open();
  const first = fixture();
  first.pages[1]!.document.widgets.push({ ...structuredClone(first.pages[1]!.document.widgets[0]!), id: "only-on-details" });
  store.saveProject("one", first, 0);
  const other = fixture(); other.pages.push({ id: "exclusive", document: createDocument() });
  store.saveProject("two", other, 0);
  const db = f.raw();
  assert.equal(count(db, "node"), 5);
  assert.throws(() => db.prepare("UPDATE interaction SET target_page_id = 'exclusive' WHERE project_id = 'one'").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE node SET parent_id = 'missing' WHERE project_id = 'one'").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE node SET page_id = 'exclusive' WHERE project_id = 'one' AND page_id = 'home'").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE style_override SET node_id = 'missing' WHERE project_id = 'one' AND page_id = 'home'").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE animation_binding SET page_id = 'exclusive' WHERE project_id = 'one' AND page_id = 'home'").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE project SET start_page_id = 'exclusive' WHERE id = 'one'").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE node SET parent_id = 'only-on-details' WHERE project_id = 'one' AND page_id = 'home'").run(), /FOREIGN KEY/);
  integrity(db);
});

test("project deletion cascades owned data while shared library entries and another project survive", (t) => {
  const f = setup(t), store = f.open();
  store.saveProject("one", fixture(), 0);
  const survivor = store.saveProject("two", fixture(), 0);
  const db = f.raw();
  for (const table of ["user_preset", "user_widget_style", "logo"]) db.prepare(`INSERT INTO ${table} (id, name, document_json) VALUES (?, ?, ?)`).run("user-item", "Saved", "{}");
  db.prepare("INSERT INTO project_setting (project_id, key, value_json) VALUES (?, ?, ?)").run("one", "test", "true");
  // Exercise database-level cascades directly, independently of deleteProject.
  db.prepare("DELETE FROM project WHERE id = ?").run("one");
  for (const table of owned) assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE project_id = ?`).get("one")!["n"], 0, table);
  for (const table of ["user_preset", "user_widget_style", "logo"]) assert.equal(count(db, table), 1);
  assert.equal(count(db, "preset"), 75);
  assert.deepEqual(store.getProject("two"), survivor);
  assert.equal(store.deleteProject("two", 1), true);
  for (const table of owned) assert.equal(count(db, table), 0, table);
  integrity(db);
});

test("simultaneous independent workers allow exactly one save from the same revision", { timeout: 15000 }, async (t) => {
  const f = setup(t), store = f.open(); store.saveProject("race", fixture(), 0);
  const source = `
    const { parentPort, workerData } = require('node:worker_threads');
    (async () => {
      const { openStore, ConflictError } = await import(workerData.module);
      const store = openStore(workerData.path);
      const row = store.getProject('race');
      parentPort.once('message', () => {
        try { parentPort.postMessage({ result: 'saved', revision: store.saveProject('race', { ...row.project, name: workerData.name }, row.revision).revision }); }
        catch (error) { parentPort.postMessage({ result: error instanceof ConflictError ? 'conflict' : 'error', message: error.message }); }
        finally { store.close(); }
      });
      parentPort.postMessage({ ready: true });
    })().catch(error => { throw error; });
  `;
  const workers = ["Writer A", "Writer B"].map((name) => new Worker(source, { eval: true, workerData: { module: new URL("./database.ts", import.meta.url).href, path: f.path, name } }));
  t.after(async () => { await Promise.all(workers.map((worker) => worker.terminate())); });
  await Promise.all(workers.map(async (worker) => { const [ready] = await once(worker, "message"); assert.equal(ready.ready, true); }));
  const pending = workers.map((worker) => once(worker, "message"));
  for (const worker of workers) worker.postMessage("go");
  const results = (await Promise.all(pending)).map(([message]) => message);
  assert.deepEqual(results.map((r) => r.result).sort(), ["conflict", "saved"]);
  assert.equal(store.getProject("race")!.revision, 2);
  assert.ok(["Writer A", "Writer B"].includes(store.getProject("race")!.project.name));
  integrity(store.db);
});

test("failed migration rolls back DDL and version records and can be retried", (t) => {
  const f = setup(t), store = f.open(); store.close();
  const db = f.raw();
  // A fresh schema with a conflicting pre-existing object fails after earlier DDL.
  db.exec("PRAGMA foreign_keys = OFF");
  for (const table of [...tables].reverse()) db.exec(`DROP TABLE ${table}`);
  db.exec("PRAGMA foreign_keys = ON; CREATE TABLE node (sentinel TEXT)");
  assert.throws(() => migrate(db), /already exists/);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map((r) => r["name"]), ["node"]);
  db.exec("DROP TABLE node");
  migrate(db);
  assert.equal(count(db, "preset"), 75);
  assert.equal(count(db, "migration"), 2);
  integrity(db);
});

test("refuses future schema on migration and open without changing existing data", (t) => {
  const f = setup(t), store = f.open();
  const original = store.saveProject("future", fixture(), 0);
  store.db.prepare("INSERT INTO migration (version, applied_at) VALUES (?, ?)").run(99, "2099-01-01T00:00:00.000Z");
  const before = tables.map((table) => store.db.prepare(`SELECT * FROM ${table}`).all());
  assert.throws(() => migrate(store.db), /Unsupported SQLite schema version/);
  assert.throws(() => f.open(), /Unsupported SQLite schema version/);
  assert.deepEqual(tables.map((table) => store.db.prepare(`SELECT * FROM ${table}`).all()), before);
  assert.deepEqual(store.getProject("future"), original);
  integrity(store.db);
});

test("failed preset seed rolls back the whole migration and leaves a retryable empty database", (t) => {
  const f = setup(t), store = f.open(); store.close();
  const db = f.raw();
  db.exec("PRAGMA foreign_keys = OFF");
  for (const table of [...tables].reverse()) db.exec(`DROP TABLE ${table}`);
  db.exec("PRAGMA foreign_keys = ON");
  // Inject a duplicate in the imported in-memory seed, after all 75 valid rows.
  // No source file changes and no mocked SQLite operations are involved.
  designPresets.push(designPresets[0]!);
  try {
    assert.throws(() => migrate(db), /UNIQUE constraint failed: preset.id/);
  } finally {
    designPresets.pop();
  }
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all(), []);
  migrate(db);
  assert.equal(count(db, "preset"), 75);
  assert.equal(count(db, "migration"), 2);
  integrity(db);
});

test("revision exhaustion rejects a replacement without rounding or changing persisted data", (t) => {
  const store = setup(t).open(); store.saveProject("limit", fixture(), 0);
  store.db.prepare("UPDATE project SET revision = ? WHERE id = ?").run(Number.MAX_SAFE_INTEGER, "limit");
  const before = store.getProject("limit");
  assert.throws(() => store.saveProject("limit", fixture(), Number.MAX_SAFE_INTEGER), (e) => e instanceof Error && e.constructor === Error);
  assert.deepEqual(store.getProject("limit"), before);
  integrity(store.db);
});
