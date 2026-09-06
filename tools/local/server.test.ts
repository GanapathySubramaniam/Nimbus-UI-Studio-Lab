import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { request } from 'node:http';
import { createDocument } from '../../packages/application-shell/src/studio/model.ts';
import { createProject } from '../../packages/application-shell/src/studio/project.ts';

async function fixture(t: TestContext) {
  assert.ok(existsSync(new URL('./server.ts', import.meta.url)), 'The local HTTP service must exist');
  const { createLocalServer } = await import('./server.ts');
  const dir = await mkdtemp(join(tmpdir(), 'nimbus-api-'));
  const server = createLocalServer({ databasePath: join(dir, 'studio.sqlite') });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  });
  return { url: `http://127.0.0.1:${address.port}`, port: address.port };
}
const project = () => createProject(createDocument());
const json = (value: unknown) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

test('local HTTP health and revisioned project CRUD survive exact project content', async (t) => {
  const { url } = await fixture(t);
  const health = await fetch(`${url}/api/nimbus/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).storage, 'sqlite');
  const input = project();
  input.name = 'Operations — Q3';
  let response = await fetch(`${url}/api/nimbus/projects/demo`, json({ project: input, expectedRevision: 0 }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).revision, 1);
  response = await fetch(`${url}/api/nimbus/projects/demo`);
  assert.deepEqual((await response.json()).project, input);
  response = await fetch(`${url}/api/nimbus/projects`);
  const list = await response.json();
  assert.equal(list.projects[0].name, input.name);
  assert.equal(list.projects[0].project, undefined, 'list excludes full image-heavy documents');
  response = await fetch(`${url}/api/nimbus/projects/demo`, json({ project: input, expectedRevision: 0 }));
  assert.equal(response.status, 409);
  response = await fetch(`${url}/api/nimbus/projects/demo`, { ...json({ expectedRevision: 1 }), method: 'DELETE' });
  assert.equal(response.status, 204);
  assert.equal((await fetch(`${url}/api/nimbus/projects/demo`)).status, 404);
});

test('local HTTP rejects malformed projects and stale deletes without changing the saved record', async (t) => {
  const { url } = await fixture(t);
  await fetch(`${url}/api/nimbus/projects/demo`, json({ project: project(), expectedRevision: 0 }));
  for (const body of [{ project: { version: 3 }, expectedRevision: 1 }, { project: project(), expectedRevision: -1 }, { project: project() }]) {
    assert.equal((await fetch(`${url}/api/nimbus/projects/demo`, json(body))).status, 400);
  }
  assert.equal((await fetch(`${url}/api/nimbus/projects/demo`, { ...json({ expectedRevision: 0 }), method: 'DELETE' })).status, 409);
  assert.equal((await (await fetch(`${url}/api/nimbus/projects/demo`)).json()).revision, 1);
});

test('local HTTP blocks cross-site origins, opaque sandbox origins and DNS rebinding hosts', async (t) => {
  const { url, port } = await fixture(t);
  for (const headers of [{ Origin: 'https://evil.example' }, { Origin: 'null' }, { Host: 'evil.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    // Node fetch replaces Host; use a real low-level request to exercise wire headers.
    const response = await new Promise<{ status: number; cors: string | string[] | undefined }>((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path: '/api/nimbus/health', headers }, res => {
        res.resume(); res.on('end', () => resolve({ status: res.statusCode!, cors: res.headers['access-control-allow-origin'] }));
      });
      req.on('error', reject); req.end();
    });
    assert.equal(response.status, 403, JSON.stringify(headers));
    assert.equal(response.cors, undefined);
  }
  assert.equal((await fetch(`${url}/api/nimbus/health`, { headers: { Origin: 'http://127.0.0.1:5173' } })).status, 200);
});

test('local HTTP rejects unsupported bodies, invalid ids and unsupported methods', async (t) => {
  const { url } = await fixture(t);
  assert.equal((await fetch(`${url}/api/nimbus/projects/demo`, { method: 'PUT', body: '{}' })).status, 415);
  assert.equal((await fetch(`${url}/api/nimbus/projects/demo`, { ...json({}), body: '{broken' })).status, 400);
  assert.equal((await fetch(`${url}/api/nimbus/projects/bad%20id`)).status, 400);
  assert.equal((await fetch(`${url}/api/nimbus/projects/demo`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${url}/api/nimbus/missing`)).status, 404);
});

test('local HTTP refuses oversized declared bodies before buffering and never exposes disk paths', async (t) => {
  const { port } = await fixture(t);
  const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/api/nimbus/projects/demo', method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': 60 * 1024 * 1024 } }, res => {
      let body = ''; res.on('data', data => { body += data; });
      res.on('end', () => { resolve({ status: res.statusCode!, body }); req.destroy(); });
    });
    req.on('error', reject); req.flushHeaders();
  });
  assert.equal(result.status, 413);
  assert.ok(!result.body.includes(tmpdir()));
});
