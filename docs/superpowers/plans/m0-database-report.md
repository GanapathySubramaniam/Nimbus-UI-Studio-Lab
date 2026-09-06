# M0 Task 1: SQLite repository evidence

Date: 2026-09-06. Runtime: Node v22.16.0 on Windows.
Checkout: `C:/Users/ganap/Documents/project/nimbusUI/Nimbus-UI-Studio-Lab`.

Implemented only the SQLite repository task. Source/report writes in this session are confined to `tools/local/database.ts`, `tools/local/migrations.ts`, `tools/local/database.test.ts`, and this report. Tests create and clean up unique temporary directories outside the checkout. No commits, pushes, subagents, HTTP/launcher edits, configuration edits, or changes to the implementation plan.

## Consumer contract

```ts
import { openStore, ConflictError } from "./database.ts";

const store = openStore(databasePath);
// store.db: DatabaseSync
// store.close(): void                       -- idempotent
// store.getProject(id): ProjectRow | null
// store.listProjects(): ProjectRow[]         -- includes full project documents
// store.saveProject(id, project, expectedRevision): ProjectRow
// store.deleteProject(id, expectedRevision): boolean

// ProjectRow = { id, revision, createdAt, updatedAt, project }
```

`openStore(path)` uses the caller's disk path, creates missing parent directories, and runs migrations automatically. The normal launcher location is `.nimbus/studio.sqlite`; the repository does not hardcode a checkout location. Empty paths and `:memory:` are rejected. No environment file or network service is needed.

Project IDs must match `^[a-zA-Z0-9_-]{1,100}$`. Revisions must be nonnegative safe integers. Revision zero creates a missing project at revision one; an existing project requires its exact current revision. Saving a missing project with a nonzero revision conflicts. A successful replacement increments revision and preserves `createdAt`; timestamps are ISO UTC strings. An exhausted safe-integer revision produces an ordinary `Error` without writing. `deleteProject` returns false for a missing ID regardless of a valid supplied revision, true for a successful deletion, and throws `ConflictError` for a stale revision of an existing project.

Project input is serialized and validated through the existing `parseProject` runtime contract. Validation failures use ordinary `Error`, including serialization failures. Legacy version-one documents become version-two projects through that existing parser. The stored whole document is the complete **validated** project: accepted fields, image data, styling, motion, actions, and ordering roundtrip. Unknown fields discarded by the parser and original JSON whitespace are not retained.

`listProjects()` returns full rows, ordered by `updated_at DESC, id ASC`. HTTP response projection can omit heavy fields later. SQLite operational errors are allowed to propagate; HTTP status mapping and sanitization belong to the separately implemented server.

## Persistence and schema

Every store connection enables `foreign_keys=ON`, `busy_timeout=5000`, `journal_mode=WAL`, and `synchronous=FULL`. Migrations, saves, and deletes use `BEGIN IMMEDIATE` transactions. Revision checks occur after acquiring the write lock. Migration version one creates the schema and seeds data in the same transaction; unsupported recorded schema versions are refused. Failed startup closes its database connection.

All 15 required tables exist: `project`, `page`, `node`, `style_override`, `animation_binding`, `interaction`, `asset`, `preset`, `animation_preset`, `user_preset`, `user_widget_style`, `logo`, `template`, `project_setting`, and `migration`.

- `project.project_json` retains the whole validated document alongside project metadata and revision.
- Pages have project-scoped identities, positions, and document properties. Nodes have project/page-scoped identities, positions, geometry, content, state, preset reference, and visibility/lock fields.
- Node styles, motion, and individual navigation events populate their own tables. Page targets and node parents use composite foreign keys. Start-page validity is enforced by a deferred composite foreign key so a whole-project replacement remains atomic.
- Referenced widget images, page backgrounds, and widget backgrounds populate project-owned assets. SHA-256 IDs deduplicate identical sources within a project; references include the project key. Embedded images stay embedded on disk; remote HTTPS sources are retained without fetching them.
- Replacement removes obsolete normalized children/assets and rebuilds them within the same transaction. Deleting a project cascades its pages, nodes, styles, motion, interactions, assets, and settings. Shared user presets, widget styles, and logos remain independent of project ownership.
- The seed imports `designPresets` from the existing `presets.ts` using an explicit `.ts` import. All 75 current preset IDs and complete payloads are preserved. Reopening/repeating migration neither duplicates nor rewrites installed seed rows.
- No animation presets, templates, logos, or user-library entries are seeded. No third-party notices were changed.

## Red/green and verification record

The executing-plans and TDD skills guided implementation; systematic debugging isolated test-fixture failures; verification-before-completion required fresh command evidence. The user's explicit shared-checkout, four-file, and no-subagent constraints overrode workflow defaults about worktrees and delegation.

1. Wrote the first 12 real-file tests before production behavior. Ran `node --experimental-strip-types --test tools/local/database.test.ts`: exit **1**, missing `tools/local/database.ts` (`ERR_MODULE_NOT_FOUND`), as requested by the plan.
2. Added explicit unimplemented entry-point stubs to make the feature failures executable. Ran the same command: exit **1**, **0 passed / 12 failed**, each reaching `SQLite repository is not implemented yet.` These stubs were then fully replaced by the implementation.
3. First implementation run: exit **1**, **11 passed / 1 failed**. A raw constraint test updated multiple rows into one key, so SQLite raised a uniqueness error before the foreign-key error under test. Narrowed the mutation to one page. A subsequent run exposed the same issue in the style test after adding a second node on that page; narrowed that mutation as well. No production constraint was weakened.
4. The new strict local TypeScript configuration reported **25 TS4111 diagnostics**, all in the three owned TypeScript files. Changed SQLite result access to bracket notation. No configuration or server/launcher file changes were made.
5. Added three focused regression tests for future-schema refusal, seed-time migration rollback, and revision exhaustion. These tests passed against the existing implementation; they were additional coverage, not separately observed red-to-green feature cycles.
6. Final repository command: `node --experimental-strip-types --test tools/local/database.test.ts` — exit **0**, **15 passed / 0 failed / 0 skipped**.
7. Strict local check: `node node_modules/typescript/bin/tsc -p tools/local/tsconfig.json` — exit **0**, no diagnostics.
8. Existing validator regression check: `node --experimental-strip-types --test tools/studio/project.test.ts` — exit **0**, **5 passed / 0 failed**.

The 15 repository tests exercise:

1. Required table coverage, connection pragmas, all 75 seed payloads, empty future libraries, and empty-store API behavior.
2. Full project roundtrip with a real raster data URL, advanced style, logo sizing, motion, navigation, and raw normalized rows.
3. Repeat migrations, idempotent close, and durability across close/reopen.
4. Revision/timestamp behavior and removal of obsolete normalized rows during replacement.
5. Stale create/update/delete conflicts across two open connections and missing-delete behavior.
6. Runtime ID/revision rejection as ordinary `Error`, including the 100-character valid ID boundary.
7. Invalid replacement preservation and the existing legacy-project parser contract.
8. A SQLite trigger that aborts style insertion midway through replacement: every table's rows, the original document, and its revision remain unchanged; a later valid save succeeds.
9. Repeated project/page/node IDs and raw rejection of dangling, cross-project, and cross-page foreign keys, including node parents and start pages.
10. Raw SQL project deletion and repository deletion, owned-data cascades, and survival of shared libraries and another project.
11. Two independent worker threads/connections reading revision one before simultaneous release: exactly one saves, one returns `ConflictError`, and the final revision is two.
12. A DDL collision during migration: all earlier DDL/version changes roll back, and migration succeeds after the collision is removed.
13. Recorded future migration version: both direct migration and `openStore` refuse it while table snapshots remain unchanged.
14. A duplicate seed ID injected into the imported in-memory array after its 75 entries: seed insertion fails, the entire new schema/version/seed rolls back, and a clean retry succeeds. The array is restored in `finally`; no preset source file changes occur.
15. Maximum-safe-integer revision exhaustion without data loss or numeric rounding.

Tests inspect real SQLite tables through separate `DatabaseSync` connections and run `PRAGMA integrity_check` (`ok`) plus `PRAGMA foreign_key_check` (no violations). The competing writers use real worker threads, not mocked writes. Database and migration review was performed as a separate self-review pass; no independent peer/subagent review is claimed.

## Controller handoff and review status

The controller independently reported on 2026-09-06 that all 15 database tests and the strict local TypeScript check passed. The controller also reported successful fresh-source-snapshot setup, development startup, API proxy PUT, shutdown, and database reopen checks. Those integration results were supplied by the controller; they were not rerun or independently observed by this implementer.

The controller reports that reviewer James is examining the completed M0 files. No findings or approval from that review have been received in this task. Repository source is frozen pending explicitly requested review fixes. No unresolved failure was found in this task's tests/typecheck/self-review; the boundaries below remain relevant for integration and future milestones.

## Current boundaries

- This is Task 1, not completion of M0. HTTP/launcher integration, browser persistence wiring, full-workspace release checks, and browser QA were not performed here.
- The existing project parser describes flat widgets. The node schema provides a parent key and ordering, but current saves use null parents. Hierarchical editor behavior is not implemented by this task.
- Shared libraries, animation presets, templates, and extra project settings have real tables but no repository CRUD in this interface. Future features will require their own validation, APIs, and versioned migrations. Current animation bindings store existing widget motion; they do not claim the later 20 motion presets.
- Asset support matches the existing parser's raster uploads and HTTPS image references. Video, external asset-file management, image decoding, and remote fetching are outside this task. Whole-document and normalized storage intentionally duplicate some payload data to preserve export fidelity.
- `node:sqlite` and type stripping emit Node v22.16.0 experimental warnings. The checks succeeded with those warnings visible. Disk-full/power-loss fault injection and sustained-load benchmarks were not run; rollback tests inject SQL-level DDL, constraint, and trigger failures.
- The raw `db` handle is exposed because the plan requires it. Direct caller SQL can bypass document validation and desynchronize JSON from normalized data; application project writes should use repository methods.
