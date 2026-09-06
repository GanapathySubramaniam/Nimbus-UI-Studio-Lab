import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import { parseProject, type StudioProject } from "../../packages/application-shell/src/studio/project.ts";
import { migrate } from "./migrations.ts";

export class ConflictError extends Error {
  constructor(message = "Project revision conflict.") {
    super(message);
    this.name = "ConflictError";
  }
}

export interface ProjectRow {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  project: StudioProject;
}

export interface LocalStore {
  db: DatabaseSync;
  close(): void;
  getProject(id: string): ProjectRow | null;
  listProjects(): ProjectRow[];
  saveProject(id: string, project: unknown, expectedRevision: number): ProjectRow;
  deleteProject(id: string, expectedRevision: number): boolean;
}

function validateId(id: string): void {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    throw new Error("Project ID must contain 1–100 letters, numbers, underscores or hyphens.");
  }
}

function validateRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("Expected revision must be a non-negative safe integer.");
  }
}

function validateProject(value: unknown): StudioProject {
  try {
    const raw = JSON.stringify(value);
    if (raw === undefined) throw new Error("Expected a Nimbus project.");
    return parseProject(raw);
  } catch (error) {
    // Keep runtime validation errors on the ordinary Error contract, including
    // JSON serialization failures (cycles, BigInt, undefined).
    throw new Error(error instanceof Error ? error.message : "Invalid Nimbus project.");
  }
}

function projectRow(row: Record<string, SQLOutputValue>): ProjectRow {
  return {
    id: String(row["id"]), revision: Number(row["revision"]),
    createdAt: String(row["created_at"]), updatedAt: String(row["updated_at"]),
    project: JSON.parse(String(row["project_json"])) as StudioProject,
  };
}

/** The caller chooses the disk location (normally .nimbus/studio.sqlite). */
export function openStore(path: string): LocalStore {
  if (typeof path !== "string" || !path.trim() || path === ":memory:") {
    throw new Error("Choose a local SQLite file path.");
  }
  const databasePath = resolve(path);
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  try {
    db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL");
    migrate(db);
  } catch (error) {
    db.close();
    throw error;
  }

  const select = db.prepare("SELECT id, revision, created_at, updated_at, project_json FROM project WHERE id = ?");
  const selectAll = db.prepare("SELECT id, revision, created_at, updated_at, project_json FROM project ORDER BY updated_at DESC, id ASC");
  let closed = false;

  function transaction<T>(write: () => T): T {
    // Acquire the write lock BEFORE reading the current revision. Independent
    // connections then see the committed winner and reject a stale revision.
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = write();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function normalize(id: string, project: StudioProject): void {
    // Deleting pages cascades their nodes/styles/motion/actions. Shared library
    // entries have no project owner and are never touched by replacement.
    db.prepare("DELETE FROM page WHERE project_id = ?").run(id);
    db.prepare("DELETE FROM asset WHERE project_id = ?").run(id);
    const addAsset = db.prepare("INSERT INTO asset (project_id, id, source, media_type) VALUES (?, ?, ?, ?) ON CONFLICT (project_id, id) DO NOTHING");
    const assets = new Map<string, string>();
    function asset(source: string | undefined): string | null {
      if (!source) return null;
      const existing = assets.get(source);
      if (existing) return existing;
      const assetId = createHash("sha256").update(source).digest("hex");
      addAsset.run(id, assetId, source, /^data:([^;]+);/.exec(source)?.[1] ?? null);
      assets.set(source, assetId);
      return assetId;
    }
    const addPage = db.prepare("INSERT INTO page (project_id, id, position, document_json, backdrop_asset_id) VALUES (?, ?, ?, ?, ?)");
    // Insert every page first so actions may point forward or back in page order.
    for (const [position, page] of project.pages.entries()) {
      const { widgets: _widgets, ...document } = page.document;
      addPage.run(id, page.id, position, JSON.stringify(document), asset(document.backdrop?.type === "image" ? document.backdrop.src : undefined));
    }
    const addNode = db.prepare(`INSERT INTO node (
      project_id, page_id, id, parent_id, position, kind, name, x, y, width, height,
      preset_id, content_json, state, locked, hidden, image_asset_id, backdrop_asset_id
    ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const addStyle = db.prepare("INSERT INTO style_override (project_id, page_id, node_id, style_json) VALUES (?, ?, ?, ?)");
    const addMotion = db.prepare("INSERT INTO animation_binding (project_id, page_id, node_id, motion_json) VALUES (?, ?, ?, ?)");
    const addAction = db.prepare("INSERT INTO interaction (project_id, page_id, node_id, event, target_page_id) VALUES (?, ?, ?, ?, ?)");
    for (const page of project.pages) {
      for (const [position, widget] of page.document.widgets.entries()) {
        addNode.run(id, page.id, widget.id, position, widget.kind, widget.name,
          widget.x, widget.y, widget.width, widget.height, widget.presetId,
          JSON.stringify(widget.content), widget.state, Number(widget.locked), Number(widget.hidden),
          asset(widget.content.image), asset(widget.style.backdrop?.type === "image" ? widget.style.backdrop.src : undefined));
        addStyle.run(id, page.id, widget.id, JSON.stringify(widget.style));
        addMotion.run(id, page.id, widget.id, JSON.stringify(widget.motion));
        for (const [event, target] of Object.entries(widget.actions ?? {})) addAction.run(id, page.id, widget.id, event, target);
      }
    }
  }

  return {
    db,
    close() {
      if (!closed) { db.close(); closed = true; }
    },
    getProject(id) {
      validateId(id);
      const row = select.get(id);
      return row ? projectRow(row) : null;
    },
    listProjects() {
      return selectAll.all().map(projectRow);
    },
    saveProject(id, value, expectedRevision) {
      validateId(id);
      validateRevision(expectedRevision);
      const project = validateProject(value);
      const json = JSON.stringify(project);
      return transaction(() => {
        const existing = select.get(id);
        if ((existing ? Number(existing["revision"]) : 0) !== expectedRevision) throw new ConflictError();
        if (expectedRevision === Number.MAX_SAFE_INTEGER) throw new Error("Project revision limit reached.");
        const revision = expectedRevision + 1;
        const now = new Date().toISOString();
        const createdAt = existing ? String(existing["created_at"]) : now;
        if (existing) {
          db.prepare("UPDATE project SET revision = ?, updated_at = ?, name = ?, start_page_id = ?, project_json = ? WHERE id = ?")
            .run(revision, now, project.name, project.startPageId, json, id);
        } else {
          db.prepare("INSERT INTO project (id, revision, created_at, updated_at, name, start_page_id, project_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(id, revision, createdAt, now, project.name, project.startPageId, json);
        }
        normalize(id, project);
        return { id, revision, createdAt, updatedAt: now, project };
      });
    },
    deleteProject(id, expectedRevision) {
      validateId(id);
      validateRevision(expectedRevision);
      return transaction(() => {
        const existing = select.get(id);
        if (!existing) return false;
        if (Number(existing["revision"]) !== expectedRevision) throw new ConflictError();
        db.prepare("DELETE FROM project WHERE id = ?").run(id);
        return true;
      });
    },
  };
}
