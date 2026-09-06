import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, realpathSync } from 'node:fs';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';

test('local launcher rejects unsupported Node with an actionable diagnostic', async () => {
  assert.ok(existsSync(new URL('./runtime.mjs', import.meta.url)), 'Node runtime preflight must exist');
  const { assertSupportedNode } = await import('./runtime.mjs');
  assert.throws(() => assertSupportedNode('20.19.0'), /22.16/);
  assert.throws(() => assertSupportedNode('22.15.0'), /22.16/);
  assert.doesNotThrow(() => assertSupportedNode('22.16.0'));
  assert.doesNotThrow(() => assertSupportedNode('24.0.0'));
});

test('database location refuses public assets and extensions outside the private-file deny contract', async () => {
  const { resolveDatabasePath } = await import('./runtime.mjs');
  const publicDir = join(tmpdir(), 'nimbus-public');
  assert.throws(() => resolveDatabasePath(join(publicDir, 'private.sqlite'), publicDir), /outside/);
  assert.throws(() => resolveDatabasePath(join(tmpdir(), 'private.json'), publicDir), /sqlite/);
  assert.equal(resolveDatabasePath(join(tmpdir(), 'private.sqlite'), publicDir), join(realpathSync.native(tmpdir()), 'private.sqlite'));
});

test('one-process launcher creates SQLite, serves Studio and API, and frees both ports on shutdown', { timeout: 45_000 }, async (t) => {
  assert.ok(existsSync(new URL('./dev.ts', import.meta.url)), 'The full-app launcher must exist');
  const privateRoot = fileURLToPath(new URL('../../.nimbus/', import.meta.url));
  await mkdir(privateRoot, { recursive: true });
  const dir = await mkdtemp(join(privateRoot, 'nimbus-launch-'));
  const child = fork(new URL('./start.mjs', import.meta.url), ['--port', '0', '--api-port', '0', '--database', join(dir, 'studio.sqlite')], { execArgv: [], silent: true });
  let logs = ''; child.stdout!.on('data', data => { logs += data; }); child.stderr!.on('data', data => { logs += data; });
  let stage = 'startup';
  t.after(async () => {
    t.diagnostic(`Launcher reached ${stage}; exit=${child.exitCode}, signal=${child.signalCode}. ${logs}`);
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    await rm(dir, { recursive: true, force: true });
  });
  const exit = once(child, 'exit');
  const [message] = await Promise.race([once(child, 'message'), exit.then(() => { throw new Error(`Launcher exited early: ${logs}`); })]);
  assert.equal(message.type, 'ready');
  stage = 'ready';
  assert.ok(existsSync(join(dir, 'studio.sqlite')));
  assert.equal((await fetch(message.studioUrl)).status, 200);
  assert.equal((await (await fetch(`${message.studioUrl}/api/nimbus/health`)).json()).storage, 'sqlite');
  stage = 'http-read';
  const rebound = await new Promise<number>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: message.studioPort, path: '/api/nimbus/health', headers: { Host: '127.0.0.2:9999' } }, res => {
      res.resume(); res.once('end', () => resolve(res.statusCode!));
    });
    req.once('error', reject); req.end();
  });
  assert.equal(rebound, 403, 'Proxy must reject hostile original Host before rewriting it');
  const fileUrl = `/@fs/${join(dir, 'studio.sqlite').replaceAll('\\', '/')}`;
  assert.equal((await fetch(`${message.studioUrl}${fileUrl}`)).status, 403, 'Vite must never serve the SQLite file');
  child.send({ type: 'shutdown' });
  stage = 'shutdown-requested';
  const [code] = await exit;
  assert.equal(code, 0, logs);
  stage = 'exited';
  for (const port of [message.studioPort, message.apiPort]) {
    const probe = createServer(); probe.listen(port, '127.0.0.1');
    await once(probe, 'listening'); await new Promise<void>(resolve => probe.close(() => resolve()));
  }
});

test('occupied API port fails startup without stealing or terminating the existing listener', { timeout: 20_000 }, async (t) => {
  assert.ok(existsSync(new URL('./dev.ts', import.meta.url)), 'The full-app launcher must exist');
  const occupied = createServer(); occupied.listen(0, '127.0.0.1'); await once(occupied, 'listening');
  const address = occupied.address(); assert.ok(address && typeof address !== 'string');
  const dir = await mkdtemp(join(tmpdir(), 'nimbus-collision-'));
  t.after(async () => { await new Promise<void>(resolve => occupied.close(() => resolve())); await rm(dir, { recursive: true, force: true }); });
  const child = fork(new URL('./start.mjs', import.meta.url), ['--port', '0', '--api-port', String(address.port), '--database', join(dir, 'studio.sqlite')], { execArgv: [], silent: true });
  let logs = ''; child.stderr!.on('data', data => { logs += data; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
  assert.match(logs, /already in use/);
  assert.equal(occupied.listening, true);
});
