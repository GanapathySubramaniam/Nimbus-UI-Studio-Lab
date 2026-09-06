import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:net';

test('public JavaScript entry diagnoses an uninstalled checkout before importing the TypeScript app', async (t) => {
  assert.ok(existsSync(new URL('./start.mjs', import.meta.url)), 'A flag-free public JavaScript entry must exist');
  const dir = await mkdtemp(join(tmpdir(), 'nimbus-entry-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'tools/local'), { recursive: true });
  for (const file of ['start.mjs', 'runtime.mjs']) await copyFile(new URL(file, import.meta.url), join(dir, 'tools/local', file));
  const child = fork(join(dir, 'tools/local/start.mjs'), [], { execArgv: [], silent: true });
  let stderr = ''; child.stderr!.on('data', data => { stderr += data; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
  assert.match(stderr, /Run npm run setup first/);
  assert.doesNotMatch(stderr, /ERR_MODULE_NOT_FOUND|Unknown file extension|bad option/);
});

for (const failure of ['corrupt', 'future'] as const) {
  test(`public startup refuses ${failure} SQLite without resetting the existing file`, { timeout: 20_000 }, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'nimbus-entry-db-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, 'studio.sqlite');
    if (failure === 'corrupt') await writeFile(path, 'not a SQLite database');
    else {
      const db = new DatabaseSync(path);
      db.exec("CREATE TABLE migration(version INTEGER PRIMARY KEY, applied_at TEXT); INSERT INTO migration VALUES(99, 'future');");
      db.close();
    }
    const child = fork(new URL('./start.mjs', import.meta.url), ['--port', '0', '--api-port', '0', '--database', path], { execArgv: [], silent: true });
    let stderr = ''; child.stderr!.on('data', data => { stderr += data; });
    const [code] = await once(child, 'exit', { signal: t.signal });
    assert.equal(code, 1);
    assert.match(stderr, failure === 'corrupt' ? /not a database/ : /Unsupported SQLite schema/);
    if (failure === 'future') {
      const db = new DatabaseSync(path);
      try { assert.equal(db.prepare('SELECT version FROM migration').get()?.['version'], 99); }
      finally { db.close(); }
    }
  });
}

test('occupied Studio port closes the already-started API and preserves the other listener', { timeout: 20_000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'nimbus-entry-port-'));
  const occupied = createServer(); occupied.listen(0, '127.0.0.1'); await once(occupied, 'listening');
  const studioAddress = occupied.address(); assert.ok(studioAddress && typeof studioAddress !== 'string');
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const apiAddress = reservation.address(); assert.ok(apiAddress && typeof apiAddress !== 'string');
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  t.after(async () => { await new Promise<void>(resolve => occupied.close(() => resolve())); await rm(dir, { recursive: true, force: true }); });
  const child = fork(new URL('./start.mjs', import.meta.url), ['--port', String(studioAddress.port), '--api-port', String(apiAddress.port), '--database', join(dir, 'studio.sqlite')], { execArgv: [], silent: true });
  let logs = ''; child.stderr!.on('data', data => { logs += data; });
  const [code] = await once(child, 'exit', { signal: t.signal });
  assert.equal(code, 1, logs);
  assert.match(logs, /already in use/);
  assert.equal(occupied.listening, true);
  const probe = createServer(); probe.listen(apiAddress.port, '127.0.0.1'); await once(probe, 'listening');
  await new Promise<void>(resolve => probe.close(() => resolve()));
});

test('terminating the public launcher releases both listeners without another daemon', { timeout: 20_000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'nimbus-entry-signal-'));
  const child = fork(new URL('./start.mjs', import.meta.url), ['--port', '0', '--api-port', '0', '--database', join(dir, 'studio.sqlite')], { execArgv: [], silent: true });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill(); await exit; }
    await rm(dir, { recursive: true, force: true });
  });
  // Drain pipes so startup cannot stall behind an unread diagnostic buffer.
  child.stdout!.resume(); child.stderr!.resume();
  const exit = once(child, 'exit', { signal: t.signal });
  const [ready] = await Promise.race([once(child, 'message', { signal: t.signal }), exit.then(() => { throw new Error('Launcher exited before readiness.'); })]);
  child.kill('SIGTERM');
  await exit;
  assert.ok(child.exitCode !== null || child.signalCode !== null);
  for (const port of [ready.apiPort, ready.studioPort]) {
    const probe = createServer(); probe.listen(port, '127.0.0.1');
    await once(probe, 'listening'); await new Promise<void>(resolve => probe.close(() => resolve()));
  }
});
