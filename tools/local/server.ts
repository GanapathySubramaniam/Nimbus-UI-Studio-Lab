import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { openStore, ConflictError } from './database.ts';
import { parseProject } from '../../packages/application-shell/src/studio/project.ts';

export const MAX_BODY_BYTES = 50 * 1024 * 1024;
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function respond(res: ServerResponse, status: number, payload?: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  res.end(payload === undefined ? undefined : JSON.stringify(payload));
}

function authorize(req: IncomingMessage, studioOrigins: readonly string[]) {
  const port = req.socket.localPort;
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!hosts.includes(req.headers.host ?? '')) throw new HttpError(403, 'Local requests only.');
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Cross-site requests are not allowed.');
  const origin = req.headers.origin;
  if (origin !== undefined && ![...hosts.map(host => `http://${host}`), ...studioOrigins].includes(origin)) {
    throw new HttpError(403, 'Untrusted request origin.');
  }
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'Send application/json.');
  const declared = Number(req.headers['content-length'] ?? 0);
  if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) throw new HttpError(413, 'Request exceeds the 50 MB limit.');
  const chunks: Buffer[] = [];
  let size = 0;
  // Event-based collection lets us return 413 before closing a chunked request.
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { req.off('data', onData); req.off('end', onEnd); req.off('error', onError); req.off('aborted', onAbort); };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { cleanup(); req.resume(); reject(new HttpError(413, 'Request exceeds the 50 MB limit.')); }
      else chunks.push(chunk);
    };
    const onEnd = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new HttpError(400, 'Unable to read request.')); };
    const onAbort = () => { cleanup(); reject(new HttpError(400, 'Request was interrupted.')); };
    req.on('data', onData); req.on('end', onEnd); req.on('error', onError); req.on('aborted', onAbort);
  });
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Expected a JSON object.');
  return value as Record<string, unknown>;
}

export function createLocalServer(options: { databasePath: string; studioOrigins?: readonly string[] }) {
  const store = openStore(options.databasePath);
  const server = createServer((req, res) => {
    void (async () => {
      authorize(req, options.studioOrigins ?? ['http://127.0.0.1:5173', 'http://localhost:5173']);
      const path = (req.url ?? '').split('?')[0]!;
      if (path === '/api/nimbus/health' && req.method === 'GET') {
        respond(res, 200, { status: 'ok', storage: 'sqlite' }); return;
      }
      if (path === '/api/nimbus/projects' && req.method === 'GET') {
        respond(res, 200, { projects: store.listProjects().map(row => ({
          id: row.id, name: row.project.name, pageCount: row.project.pages.length,
          revision: row.revision, createdAt: row.createdAt, updatedAt: row.updatedAt,
        })) }); return;
      }
      const match = /^\/api\/nimbus\/projects\/([^/]+)$/.exec(path);
      if (!match) throw new HttpError(404, 'Endpoint not found.');
      let id: string;
      try { id = decodeURIComponent(match[1]!); } catch { throw new HttpError(400, 'Invalid project ID.'); }
      if (!ID.test(id)) throw new HttpError(400, 'Invalid project ID.');
      if (req.method === 'GET') {
        const row = store.getProject(id);
        if (!row) throw new HttpError(404, 'Project not found.');
        respond(res, 200, row); return;
      }
      if (req.method !== 'PUT' && req.method !== 'DELETE') throw new HttpError(405, 'Method not allowed.');
      const body = await readJson(req);
      const revision = body['expectedRevision'];
      if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) throw new HttpError(400, 'A nonnegative expectedRevision is required.');
      if (req.method === 'DELETE') {
        if (!store.deleteProject(id, revision)) throw new HttpError(404, 'Project not found.');
        respond(res, 204); return;
      }
      let project;
      try { project = parseProject(JSON.stringify(body['project'])); }
      catch { throw new HttpError(400, 'Invalid Nimbus project. Check its version, pages, properties and links.'); }
      const saved = store.saveProject(id, project, revision);
      respond(res, revision === 0 ? 201 : 200, saved);
    })().catch((error: unknown) => {
      if (res.destroyed) return;
      if (error instanceof HttpError) {
        if (error.status === 413) res.setHeader('Connection', 'close');
        respond(res, error.status, { error: error.message });
      } else if (error instanceof ConflictError) {
        respond(res, 409, { error: 'This project changed since it was loaded. Reload before saving again.' });
      } else {
        respond(res, 500, { error: 'Local storage operation failed. Your last committed project is preserved.' });
      }
    });
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.once('close', () => store.close());
  server.once('error', () => store.close());
  return server;
}
