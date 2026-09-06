import assert from 'node:assert/strict';
import { execFileSync, fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocument } from '../../packages/application-shell/src/studio/model.ts';
import { createProject } from '../../packages/application-shell/src/studio/project.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), 'nimbus-clean-install-'));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this check through npm run test:install.');
let child;
try {
  // A source snapshot includes current feature work without borrowing node_modules,
  // browser data, Git metadata, downloaded references or the developer database.
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of new Set(files)) {
    const destination = resolve(fixture, file);
    const within = relative(fixture, destination);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error('Unsafe fixture path.');
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(root, file), destination);
  }
  console.log('Installing a fresh source snapshot without node_modules or database files.');
  execFileSync(process.execPath, [npmCli, 'run', 'setup'], { cwd: fixture, stdio: 'inherit', windowsHide: true, timeout: 240_000 });
  const database = join(fixture, '.nimbus', 'studio.sqlite');
  assert.equal(readFileSync(database).subarray(0, 16).toString(), 'SQLite format 3\0');
  child = fork(join(fixture, 'tools/local/start.mjs'), ['--port', '0', '--api-port', '0'], { cwd: fixture, execArgv: [], silent: true });
  let logs = ''; child.stdout.on('data', data => { logs += data; }); child.stderr.on('data', data => { logs += data; });
  const exited = once(child, 'exit');
  const [ready] = await Promise.race([once(child, 'message'), exited.then(() => { throw new Error(`Clean start failed: ${logs}`); }), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Clean start exceeded 30 seconds.')), 30_000); timer.unref(); })]);
  assert.equal((await fetch(ready.studioUrl)).status, 200);
  const health = await fetch(`${ready.studioUrl}/api/nimbus/health`);
  assert.deepEqual(await health.json(), { status: 'ok', storage: 'sqlite' });
  const project = createProject(createDocument()); project.name = 'Clean install durability';
  const saved = await fetch(`${ready.studioUrl}/api/nimbus/projects/install-check`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: ready.studioUrl },
    body: JSON.stringify({ project, expectedRevision: 0 }),
  });
  assert.equal(saved.status, 201);
  child.send({ type: 'shutdown' });
  assert.equal((await exited)[0], 0, logs);
  const { openStore } = await import('./database.ts');
  const store = openStore(database);
  try { assert.deepEqual(store.getProject('install-check').project, project); }
  finally { store.close(); }
  console.log('PASS: fresh install, automatic migration, Studio/API start, proxy write, shutdown and SQLite reopen.');
  console.log('This is a clean source-snapshot check; clean Git-clone verification follows the milestone commit.');
} finally {
  if (child && child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
  const relativeToTemp = relative(resolve(tmpdir()), fixture);
  if (!relativeToTemp.startsWith('nimbus-clean-install-') || relativeToTemp.includes('..') || isAbsolute(relativeToTemp)) throw new Error('Refusing unsafe fixture cleanup.');
  rmSync(fixture, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
