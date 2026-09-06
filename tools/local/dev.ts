import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { assertSupportedNode, resolveDatabasePath } from './runtime.mjs';
import { join } from 'node:path';
import { createLocalServer } from './server.ts';

// Own both listeners in one process: no shell process trees or orphaned database daemon.
let api: ReturnType<typeof createLocalServer> | undefined;
let studio: { close(): Promise<void>; environments: Record<string, { close(): Promise<void> }> } | undefined;
let stopping: Promise<void> | undefined;
let startupFinished = false;
let shutdownRequested = false;
function stop(code = 0) {
  stopping ??= (async () => {
    if (studio) {
      // Drain cold-start transforms before Vite closes its watcher. Vite 8.2.2
      // closes these in parallel; a late addWatchFile can reopen that watcher.
      await Promise.all(Object.values(studio.environments).map(environment => environment.close()));
      await studio.close();
    }
    if (api?.listening) {
      api.closeAllConnections();
      await new Promise<void>(resolve => api!.close(() => resolve()));
    } else if (api) api.close();
    process.exitCode = code;
    if (process.connected) process.disconnect?.();
  })();
  return stopping;
}
function requestShutdown() {
  shutdownRequested = true;
  if (startupFinished) void stop();
}
process.once('SIGINT', requestShutdown);
process.once('SIGTERM', requestShutdown);
process.on('message', message => {
  if (message && typeof message === 'object' && 'type' in message && message.type === 'shutdown') requestShutdown();
});

try {
  assertSupportedNode();
  const { values } = parseArgs({ options: { port: { type: 'string', default: '5173' }, 'api-port': { type: 'string', default: '4317' }, database: { type: 'string', default: fileURLToPath(new URL('../../.nimbus/studio.sqlite', import.meta.url)) } } });
  const port = Number(values.port), apiPort = Number(values['api-port']);
  if (![port, apiPort].every(value => Number.isInteger(value) && value >= 0 && value <= 65535)) throw new Error('Ports must be integers from 0 to 65535.');
  const app = realpathSync.native(fileURLToPath(new URL('../../apps/reference-vite/', import.meta.url)));
  if (!existsSync(new URL('../../apps/reference-vite/node_modules/vite/package.json', import.meta.url))) throw new Error('Dependencies are missing. Run npm run setup first.');
  const require = createRequire(new URL('../../apps/reference-vite/package.json', import.meta.url));
  const vite = await import(pathToFileURL(require.resolve('vite')).href);
  const studioOrigins: string[] = [];
  api = createLocalServer({ databasePath: resolveDatabasePath(values.database!, join(app, 'public')), studioOrigins });
  api.listen(apiPort, '127.0.0.1');
  await once(api, 'listening');
  const apiAddress = api.address();
  if (!apiAddress || typeof apiAddress === 'string') throw new Error('API did not bind a local port.');
  const server = await vite.createServer({ root: app, server: {
    host: '127.0.0.1', port, strictPort: true,
    proxy: { '/api/nimbus': { target: `http://127.0.0.1:${apiAddress.port}`, changeOrigin: true } },
  } });
  studio = server;
  await server.listen();
  const address = server.httpServer.address();
  const studioUrl = `http://127.0.0.1:${address.port}`;
  studioOrigins.push(studioUrl, `http://localhost:${address.port}`);
  startupFinished = true;
  if (shutdownRequested) await stop();
  else {
    console.log(`Nimbus Studio: ${studioUrl}\nLocal SQLite service: http://127.0.0.1:${apiAddress.port}\nPress Ctrl+C to stop both services.`);
    process.send?.({ type: 'ready', studioUrl, studioPort: address.port, apiPort: apiAddress.port });
  }
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  console.error(code === 'EADDRINUSE' ? 'Nimbus could not start: a required port is already in use. Stop the existing instance and try again.' : error instanceof Error ? error.message : 'Nimbus could not start.');
  await stop(1);
}
