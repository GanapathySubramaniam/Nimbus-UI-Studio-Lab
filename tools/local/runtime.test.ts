import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test, { type TestContext } from 'node:test';
import { assertSupportedNode, resolveDatabasePath } from './runtime.mjs';

function directories(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'nimbus-runtime-test-'));
  const publicDirectory = join(root, 'public');
  const privateDirectory = join(root, 'private');
  mkdirSync(publicDirectory);
  mkdirSync(privateDirectory);
  const links: string[] = [];
  t.after(() => {
    // Remove only links and the unique temporary directory owned by this test.
    // Unlink junctions explicitly before recursively removing the test tree.
    for (const link of links.reverse()) unlinkSync(link);
    rmSync(root, { recursive: true, force: true });
  });
  function directoryLink(target: string, link: string) {
    symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    links.push(link);
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(realpathSync.native(link), realpathSync.native(target));
    return link;
  }
  return { root, publicDirectory, privateDirectory, directoryLink };
}

test('rejects direct public files and ..cache descendants using path components', (t) => {
  const f = directories(t);
  for (const path of [join(f.publicDirectory, 'studio.sqlite'), join(f.publicDirectory, '..cache', 'studio.sqlite'), join(f.publicDirectory, '..cache', 'nested', 'studio.db')]) {
    assert.throws(() => resolveDatabasePath(path, f.publicDirectory), /outside/);
  }
  const publicWithExtension = join(f.root, 'served.sqlite');
  mkdirSync(publicWithExtension);
  assert.throws(() => resolveDatabasePath(publicWithExtension, publicWithExtension), /outside/);
});

test('allows genuine outside files, public siblings and paths on the parent directory', (t) => {
  const f = directories(t);
  for (const path of [join(f.privateDirectory, 'studio.sqlite'), join(f.root, 'public-sibling', 'studio.db'), join(f.root, '..cache', 'studio.SQLITE'), join(f.root, 'studio.DB')]) {
    const result = resolveDatabasePath(path, f.publicDirectory);
    assert.equal(result, join(realpathSync.native(f.root), relative(f.root, path)));
  }
});

test('rejects a real outside junction into public with existing and missing database ancestors', (t) => {
  const f = directories(t);
  writeFileSync(join(f.publicDirectory, 'existing.sqlite'), '');
  const alias = f.directoryLink(f.publicDirectory, join(f.privateDirectory, 'public-alias'));
  for (const suffix of ['existing.sqlite', 'new.sqlite', join('missing', 'nested', 'studio.db')]) {
    assert.throws(() => resolveDatabasePath(join(alias, suffix), f.publicDirectory), /outside/);
  }
});

test('returns the canonical outside filename for the launcher, including missing parents', (t) => {
  const f = directories(t);
  const alias = f.directoryLink(f.privateDirectory, join(f.root, 'private-alias'));
  writeFileSync(join(f.privateDirectory, 'existing.db'), '');
  for (const suffix of ['existing.db', 'new.sqlite', join('missing', 'nested', 'studio.sqlite')]) {
    const result = resolveDatabasePath(join(alias, suffix), f.publicDirectory);
    assert.equal(result, join(realpathSync.native(f.privateDirectory), suffix));
    assert.ok(!result.includes('private-alias'));
  }
});

test('canonicalizes a public directory junction before checking physical database locations', (t) => {
  const f = directories(t);
  const publicAlias = f.directoryLink(f.publicDirectory, join(f.root, 'served-alias'));
  assert.throws(() => resolveDatabasePath(join(f.publicDirectory, 'studio.sqlite'), publicAlias), /outside/);
  assert.throws(() => resolveDatabasePath(join(publicAlias, '..cache', 'studio.db'), publicAlias), /outside/);
  assert.equal(resolveDatabasePath(join(f.privateDirectory, 'studio.sqlite'), publicAlias), join(realpathSync.native(f.privateDirectory), 'studio.sqlite'));
});

test('still rejects a caller path inside public when its junction points outside', (t) => {
  const f = directories(t);
  const alias = f.directoryLink(f.privateDirectory, join(f.publicDirectory, 'private-alias'));
  assert.throws(() => resolveDatabasePath(join(alias, 'studio.sqlite'), f.publicDirectory), /outside/);
});

test('canonicalizes missing public directories through their existing junction ancestors', (t) => {
  const f = directories(t);
  const alias = f.directoryLink(f.privateDirectory, join(f.root, 'app-alias'));
  const publicDirectory = join(alias, 'not-created', 'public');
  assert.throws(() => resolveDatabasePath(join(f.privateDirectory, 'not-created', 'public', '..cache', 'studio.sqlite'), publicDirectory), /outside/);
  assert.equal(resolveDatabasePath(join(alias, 'not-created', 'data', 'studio.db'), publicDirectory), join(realpathSync.native(f.privateDirectory), 'not-created', 'data', 'studio.db'));
});

test('rejects invalid extensions including bare .sqlite and .db names', (t) => {
  const f = directories(t);
  for (const filename of ['studio.json', 'studio.sqlite.bak', 'studio.db.exe', 'studio', '.sqlite', '.db', 'studio.sqlite ']) {
    assert.throws(() => resolveDatabasePath(join(f.privateDirectory, filename), f.publicDirectory), /sqlite/);
  }
});

test('refuses a broken junction instead of treating it as a missing directory', (t) => {
  const f = directories(t);
  const target = join(f.privateDirectory, 'target');
  mkdirSync(target);
  const alias = f.directoryLink(target, join(f.root, 'broken-alias'));
  // This directory was created by this test and is empty.
  rmdirSync(target);
  assert.throws(() => resolveDatabasePath(join(alias, 'missing', 'studio.sqlite'), f.publicDirectory));
});

test('accepts supported stable Node releases and rejects malformed or old version strings', () => {
  for (const version of ['22.16.0', '22.17.1', '24.0.0', process.versions.node]) {
    assert.doesNotThrow(() => assertSupportedNode(version));
  }
  for (const version of ['20.19.0', '22.15.99', '', '22.16', '22.16.bad', '22.16.-1', '22.16.0.extra', '22.16.0-rc.1', 'x.16.0']) {
    assert.throws(() => assertSupportedNode(version), /22\.16/);
  }
});
