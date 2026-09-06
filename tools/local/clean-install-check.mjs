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
let stage = 'copy source';
let logs = '';
async function bounded(promise, label, timeout = 30_000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Clean-install ${label} exceeded ${timeout}ms. Stage: ${stage}. Child output: ${logs}`)), timeout);
    })]);
  } finally { clearTimeout(timer); }
}
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
  stage = 'start public launcher'; console.log(`Clean-install stage: ${stage}`);
  child = fork(join(fixture, 'tools/local/start.mjs'), ['--port', '0', '--api-port', '0'], { cwd: fixture, execArgv: [], silent: true });
  child.stdout.on('data', data => { logs += data; process.stdout.write(data); }); child.stderr.on('data', data => { logs += data; process.stderr.write(data); });
  const exited = once(child, 'exit');
  const [ready] = await bounded(Promise.race([once(child, 'message'), exited.then(() => { throw new Error(`Clean start failed: ${logs}`); })]), 'readiness');
  stage = 'fetch editor'; console.log(`Clean-install stage: ${stage}`);
  const editor = await fetch(ready.studioUrl, { signal: AbortSignal.timeout(15_000) });
  const editorBody = await editor.text();
  assert.equal(editor.status, 200, editorBody);
  stage = 'fetch health'; console.log(`Clean-install stage: ${stage}`);
  const health = await fetch(`${ready.studioUrl}/api/nimbus/health`, { signal: AbortSignal.timeout(15_000) });
  assert.deepEqual(await health.json(), { status: 'ok', storage: 'sqlite' });
  const project = createProject(createDocument()); project.name = 'Clean install durability';
  stage = 'save project'; console.log(`Clean-install stage: ${stage}`);
  const saved = await fetch(`${ready.studioUrl}/api/nimbus/projects/install-check`, {
    signal: AbortSignal.timeout(15_000),
    method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: ready.studioUrl },
    body: JSON.stringify({ project, expectedRevision: 0 }),
  });
  assert.equal(saved.status, 201);
  await saved.arrayBuffer();
  stage = 'shutdown'; console.log(`Clean-install stage: ${stage}`);
  child.send({ type: 'shutdown' });
  assert.equal((await bounded(exited, 'shutdown'))[0], 0, logs);
  stage = 'reopen database'; console.log(`Clean-install stage: ${stage}`);
  const { openStore } = await import('./database.ts');
  const store = openStore(database);
  try { assert.deepEqual(store.getProject('install-check').project, project); }
  finally { store.close(); }
  console.log('PASS: fresh install, automatic migration, Studio/API start, proxy write, shutdown and SQLite reopen.');
  console.log('This is a clean source-snapshot check; clean Git-clone verification follows the milestone commit.');
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit'); child.kill();
    try { await bounded(exited, 'failure cleanup', 5_000); }
    catch { child.kill('SIGKILL'); await bounded(exited, 'forced failure cleanup', 5_000); }
  }
  const relativeToTemp = relative(resolve(tmpdir()), fixture);
  if (!relativeToTemp.startsWith('nimbus-clean-install-') || relativeToTemp.includes('..') || isAbsolute(relativeToTemp)) throw new Error('Refusing unsafe fixture cleanup.');
  rmSync(fixture, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
