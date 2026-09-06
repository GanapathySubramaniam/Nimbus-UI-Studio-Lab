# M0 Local Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make one-command installation and startup create a real local SQLite store automatically, with tested persistence and lifecycle boundaries.

**Architecture:** A loopback-only Node HTTP service owns SQLite. Vite proxies same-origin `/api/nimbus` requests to the local service. A Node launcher owns both listeners in one process and cleans up on exit. Keep the current browser store unchanged until M3 wires canvas persistence; expose repository APIs now without claiming a project dashboard exists.

**Tech Stack:** Node >=22.16, built-in node:sqlite, existing pinned pnpm workspace, Vite/React/TypeScript. No external database or cloud account.

**Spec:** GOAL.md, especially sections 1–7 and 13. The complete M0–M11 scope remains active.

## Global Constraints

- No manual database step. No `.env` required for local use.
- Bind only to 127.0.0.1; reject untrusted Host/Origin and cross-site requests. Never expose arbitrary filesystem paths or SQL.
- Database opens with foreign keys, a busy timeout, transactional versioned migrations, and parameterized writes.
- Preserve existing uncommitted editor work. Do not close old protocol issues as if implemented.
- M0 adds the schema and current preset seed only. The named 75-token collection, 20 working motion presets, and 12 complete projects must land at their ordered milestones; empty seed records do not satisfy them.
- Existing Apache notices remain until the MIT relicensing boundary is audited; never silently remove third-party notices.

## Task 1: SQLite repository

Files: `tools/local/database.ts`, `tools/local/migrations.ts`, `tools/local/database.test.ts`.
Interface: `openStore(path)` returns `{ db, close(), getProject(id), listProjects(), saveProject(id, project, expectedRevision), deleteProject(id, expectedRevision) }`. Project rows return `{id, revision, createdAt, updatedAt, project}`. `expectedRevision=0` creates; stale writes throw `ConflictError`. Validation uses the existing `parseProject` contract.

- [x] Write tests against real temporary files: schema table coverage; repeat migration preserves data; project roundtrip including uploaded asset/style/motion/actions; stale write rejected; atomic invalid replacement; cascade cleanup; reopen durability.
- [x] Run `node --experimental-strip-types --test tools/local/database.test.ts` and record the missing-feature failure.
- [x] Implement project/page/node/style/animation/interaction normalization in transactions, preserve whole project document for exact import/export, seed the current 75 presets with stable IDs idempotently. Create tables for asset, user_preset, user_widget_style, logo, template, project_setting, migration, preset, animation_preset.
- [x] Repeat the tests and review the SQLite implementation independently.

## Task 2: Local HTTP boundary

Files: `tools/local/server.ts`, `tools/local/server.test.ts`. Consume `openStore` from Task 1. Export `createLocalServer({databasePath})` with standard Node server lifecycle.

- [x] Test real HTTP: health and project CRUD; schema-invalid project returns 400; optimistic revision conflict 409; untrusted Host/Origin returns 403; unsupported content type 415; malformed/oversized body rejected; no API response leaks filesystem or stack traces.
- [x] Implement `/api/nimbus/health`, `/api/nimbus/projects`, `/api/nimbus/projects/:id`, accepting JSON `{project, expectedRevision}` for PUT and revision for DELETE. No permissive CORS, no credentials or telemetry.
- [x] Verify tests with loopback sockets and temporary SQLite files.

## Task 3: One-command setup and start

Files: `tools/local/setup.mjs`, `tools/local/start.mjs`, `tools/local/dev.ts`, `tools/local/initialize.ts`, `package.json`, `apps/reference-vite/vite.config.ts`, `README.md`, `docs/local-development.md`.

- [x] Add launcher lifecycle tests for unsupported Node, dependency-not-installed diagnostic, migration failure, server port collision and signal cleanup where feasible.
- [x] `npm run setup` installs the exact packageManager version with frozen lockfile then initializes `.nimbus/studio.sqlite`. `npm run dev` launches the API plus Vite using installed binaries (no npx/network on start), starts migrations if necessary, and stops its own children on SIGINT/SIGTERM or startup failure. API port 4317, Studio port 5173; both strict loopback.
- [x] Vite proxies `/api/nimbus` to the API, preserves safe request Host semantics, and refuses fallback port drift.
- [x] Update README with accurate present/next boundaries and install/start instructions. Do not claim the editor saves to SQLite before M3.
- [x] Clean staged-source copy: run setup, start, GET health, write/reopen a project, and load Studio. Record exact outcomes.

## Task 4: Review and milestone release

- [x] Full workspace check plus local service tests, peer spec/security/code review, and browser startup/console check.
- [ ] Create only M0 issue now; use one dedicated branch and closing PR. Close issue through the merged PR only after checks pass. Do not bypass repository rules.
- [ ] Record M0 evidence and remaining M1–M11 work. Update wiki incrementally when publication is available.

## Continuation ledger

Previous goal turn: progress — shipped browser-local prototype and export validation, not completion of this stricter objective.
2026-09-06: Attached spec read in full. Current root remains at ea7543b plus uncommitted editor implementation. No M0 issue or SQLite implementation existed. M0 started; M1–M11 not claimed complete.
Ruling: Work in the user-requested saved checkout on a new milestone branch, carrying existing changes forward — preserves the running editor; separating older uncommitted changes into history will require explicit staged-file review.
Ruling: Preserve current preset seed faithfully at M0, replace with the specified original archetype tokens in M1 — avoids fake animation/template seeds before those implementations.
