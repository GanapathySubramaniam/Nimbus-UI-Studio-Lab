import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from './database.ts';
import { migrate } from './migrations.ts';
import { createProject } from '../../packages/application-shell/src/studio/project.ts';
import { createDocument } from '../../packages/application-shell/src/studio/model.ts';

test('upgrading installed v1 replaces only built-in presets and is idempotent', t => {
  const directory = mkdtempSync(join(tmpdir(), 'nimbus-preset-upgrade-'));
  const store = openStore(join(directory, 'studio.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  const saved = store.saveProject('existing', createProject(createDocument()), 0);
  for (const table of ['user_preset', 'user_widget_style', 'logo']) store.db.prepare(`INSERT INTO ${table}(id,name,document_json) VALUES('mine','My item','{"color":"#aabbcc"}')`).run();
  // Reconstruct a populated v1 database using its unchanged public schema.
  store.db.exec("DELETE FROM migration WHERE version > 1; DELETE FROM preset; INSERT INTO preset(id,name,preset_json) VALUES('legacy','Legacy','{}')");
  migrate(store.db);
  assert.deepEqual(store.db.prepare('SELECT version FROM migration ORDER BY version').all().map(row => row['version']), [1, 2]);
  const rows = store.db.prepare('SELECT id,preset_json FROM preset ORDER BY id').all();
  assert.equal(rows.length, 75);
  assert.equal(rows.some(row => row['id'] === 'legacy'), false);
  const warm = JSON.parse(String(rows.find(row => row['id'] === 'editorial-warm')?.['preset_json']));
  assert.equal(warm.name, 'Editorial Warm'); assert.equal(warm.tokenVersion, 1);
  assert.notEqual(warm.themes.light.color.surface, warm.themes.dark.color.surface);
  assert.deepEqual(store.getProject('existing'), saved);
  for (const table of ['user_preset', 'user_widget_style', 'logo']) assert.equal(store.db.prepare(`SELECT document_json FROM ${table}`).get()?.['document_json'], '{"color":"#aabbcc"}');
  migrate(store.db);
  assert.deepEqual(store.db.prepare('SELECT id,preset_json FROM preset ORDER BY id').all(), rows);
});

test('a failed v1 preset upgrade restores the old catalog and does not advance the version', t => {
  const directory = mkdtempSync(join(tmpdir(), 'nimbus-preset-rollback-'));
  const store = openStore(join(directory, 'studio.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  store.db.exec("DELETE FROM migration WHERE version > 1; DELETE FROM preset; INSERT INTO preset(id,name,preset_json) VALUES('legacy','Saved catalog','{}'); CREATE TRIGGER fail_token_seed BEFORE INSERT ON preset BEGIN SELECT RAISE(ABORT,'seed rejected'); END");
  assert.throws(() => migrate(store.db), /seed rejected/);
  assert.equal(store.db.prepare('SELECT name FROM preset').get()?.['name'], 'Saved catalog');
  assert.equal(store.db.prepare('SELECT MAX(version) AS version FROM migration').get()?.['version'], 1);
  store.db.exec('DROP TRIGGER fail_token_seed');
  migrate(store.db);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM preset').get()?.['count'], 75);
});

test('migration rejects version gaps instead of guessing missing history', t => {
  const directory = mkdtempSync(join(tmpdir(), 'nimbus-preset-gap-'));
  const store = openStore(join(directory, 'studio.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  store.db.exec('DELETE FROM migration WHERE version = 1');
  assert.throws(() => migrate(store.db), /Unsupported/);
});
