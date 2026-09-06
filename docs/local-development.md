# Local development and data

## Install and start

Install Node.js 22.16 or newer. From the repository root:

```sh
npm run setup
npm run dev
```

Setup installs the pinned workspace dependencies and creates/migrates `.nimbus/studio.sqlite`. It is safe to repeat: migrations do not reset existing projects. The current 75 visual presets are seeded by stable ID; the forthcoming original-token, motion and multi-page template catalogs are not represented by fake empty records.

Start serves the editor at `http://127.0.0.1:5173` and the database HTTP service at `http://127.0.0.1:4317`. Both listeners run in one process, bind only to loopback, and close on Ctrl+C. No external database executable, cloud service, account or `.env` is required. The first installation uses the network; normal startup does not download dependencies. Node 22.16 prints experimental notices for its built-in SQLite and TypeScript stripping APIs; these are Node runtime notices, not browser console errors.

If a port is occupied, stop the other instance or use `node tools/local/start.mjs --port 5180 --api-port 4318`. On Windows, use `npm.cmd run dev -- --port 5180 --api-port 4318` if forwarding arguments through npm; the PowerShell npm wrapper can drop these named flags. The default `npm run dev` needs no arguments. Do not expose this development service on a public interface. The server validates Host/Origin, does not allow permissive CORS, caps request bodies, and uses optimistic revisions. It is a single-user local tool, not an authenticated multi-tenant server.

## Storage boundary

M0 supplies transactional, versioned SQLite storage and project APIs. The current editor still uses its existing IndexedDB autosave until M3 completes migration and UI wiring. Do not assume that the presence of a SQLite file means the browser's project was copied into it. Export browser JSON before clearing any browser data.

The SQLite repository keeps a validated canonical project document plus normalized page, widget, style, motion and interaction records. A write replaces them in one transaction. An expected revision prevents a stale client from overwriting a newer project. Shared style/logo tables are outside project cascade ownership.

## Backup

Stop Nimbus before copying the entire `.nimbus` directory to a safe location. SQLite may have `-wal` and `-shm` files while it is running; copying only the main file during a live write is not a safe backup. This directory is ignored by Git. Keep the browser's exported JSON separately until the persistence migration ships.

Do not delete the database to repair an error. Keep a backup and inspect the startup diagnostic. A newer unsupported schema is rejected instead of being silently downgraded.

## API and checks

`GET /api/nimbus/health` returns `{ "status": "ok", "storage": "sqlite" }`. Project routes use `/api/nimbus/projects` and `/api/nimbus/projects/:id`. Writes require `application/json`, a valid project and `expectedRevision`; zero creates, subsequent writes use the returned revision. A stale write returns 409. Delete also requires the current revision. API responses never include local filesystem paths or stack traces.

```sh
npm run test:local
npm exec --yes --package=pnpm@12.3.4 --call "pnpm check"
```

Tests use real SQLite files in temporary directories and real loopback HTTP sockets. Launcher tests exercise the combined app/API startup and shutdown, not a mocked database service.
