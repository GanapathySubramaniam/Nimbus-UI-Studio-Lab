import type { DatabaseSync } from "node:sqlite";
import { designPresets } from "../../packages/application-shell/src/studio/presets.ts";
import { tokenPresets } from "../../packages/application-shell/src/studio/token-catalog.ts";

const schemaV1 = `
  CREATE TABLE project (
    id TEXT PRIMARY KEY NOT NULL,
    revision INTEGER NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    name TEXT NOT NULL,
    start_page_id TEXT NOT NULL,
    project_json TEXT NOT NULL CHECK (json_valid(project_json)),
    FOREIGN KEY (id, start_page_id) REFERENCES page(project_id, id)
      DEFERRABLE INITIALLY DEFERRED
  ) STRICT;
  CREATE TABLE asset (
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    source TEXT NOT NULL,
    media_type TEXT,
    PRIMARY KEY (project_id, id)
  ) STRICT;
  CREATE TABLE page (
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    document_json TEXT NOT NULL CHECK (json_valid(document_json)),
    backdrop_asset_id TEXT,
    PRIMARY KEY (project_id, id),
    UNIQUE (project_id, position),
    FOREIGN KEY (project_id, backdrop_asset_id) REFERENCES asset(project_id, id)
  ) STRICT;
  CREATE TABLE node (
    project_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    id TEXT NOT NULL,
    parent_id TEXT,
    position INTEGER NOT NULL CHECK (position >= 0),
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    preset_id TEXT NOT NULL,
    content_json TEXT NOT NULL CHECK (json_valid(content_json)),
    state TEXT NOT NULL,
    locked INTEGER NOT NULL CHECK (locked IN (0, 1)),
    hidden INTEGER NOT NULL CHECK (hidden IN (0, 1)),
    image_asset_id TEXT,
    backdrop_asset_id TEXT,
    PRIMARY KEY (project_id, page_id, id),
    UNIQUE (project_id, page_id, position),
    FOREIGN KEY (project_id, page_id) REFERENCES page(project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (project_id, page_id, parent_id) REFERENCES node(project_id, page_id, id)
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (project_id, image_asset_id) REFERENCES asset(project_id, id),
    FOREIGN KEY (project_id, backdrop_asset_id) REFERENCES asset(project_id, id)
  ) STRICT;
  CREATE INDEX node_parent ON node(project_id, page_id, parent_id);
  CREATE TABLE style_override (
    project_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    style_json TEXT NOT NULL CHECK (json_valid(style_json)),
    PRIMARY KEY (project_id, page_id, node_id),
    FOREIGN KEY (project_id, page_id, node_id) REFERENCES node(project_id, page_id, id) ON DELETE CASCADE
  ) STRICT;
  CREATE TABLE animation_binding (
    project_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    motion_json TEXT NOT NULL CHECK (json_valid(motion_json)),
    PRIMARY KEY (project_id, page_id, node_id),
    FOREIGN KEY (project_id, page_id, node_id) REFERENCES node(project_id, page_id, id) ON DELETE CASCADE
  ) STRICT;
  CREATE TABLE interaction (
    project_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    event TEXT NOT NULL,
    target_page_id TEXT NOT NULL,
    PRIMARY KEY (project_id, page_id, node_id, event),
    FOREIGN KEY (project_id, page_id, node_id) REFERENCES node(project_id, page_id, id) ON DELETE CASCADE,
    FOREIGN KEY (project_id, target_page_id) REFERENCES page(project_id, id) ON DELETE CASCADE
  ) STRICT;
  CREATE INDEX interaction_target ON interaction(project_id, target_page_id);
  CREATE TABLE project_setting (
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value_json TEXT NOT NULL CHECK (json_valid(value_json)),
    PRIMARY KEY (project_id, key)
  ) STRICT;
  CREATE TABLE preset (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    preset_json TEXT NOT NULL CHECK (json_valid(preset_json))
  ) STRICT;
  CREATE TABLE animation_preset (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    document_json TEXT NOT NULL CHECK (json_valid(document_json))
  ) STRICT;
  CREATE TABLE user_preset (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    document_json TEXT NOT NULL CHECK (json_valid(document_json))
  ) STRICT;
  CREATE TABLE user_widget_style (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    document_json TEXT NOT NULL CHECK (json_valid(document_json))
  ) STRICT;
  CREATE TABLE logo (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    document_json TEXT NOT NULL CHECK (json_valid(document_json))
  ) STRICT;
  CREATE TABLE template (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    document_json TEXT NOT NULL CHECK (json_valid(document_json))
  ) STRICT;
`;

/** Each version is atomic. Only an explicit migration replaces built-in seeds. */
export function migrate(db: DatabaseSync): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS migration (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT`);
    const versions = db.prepare("SELECT version FROM migration ORDER BY version").all();
    if (versions.length > 2 || versions.some((row, index) => row["version"] !== index + 1)) {
      throw new Error("Unsupported SQLite schema version.");
    }
    if (versions.length === 0) {
      db.exec(schemaV1);
      db.prepare("INSERT INTO migration (version, applied_at) VALUES (?, ?)").run(1, new Date().toISOString());
    }
    if (versions.length < 2) {
      // The preset table contains built-ins only. User libraries and project
      // snapshots deliberately have no foreign key to these replaceable IDs.
      db.exec("DELETE FROM preset");
      const insert = db.prepare("INSERT INTO preset (id, name, preset_json) VALUES (?, ?, ?)");
      for (const preset of designPresets) {
        const tokens = tokenPresets.find(candidate => candidate.id === preset.id);
        if (!tokens) throw new Error(`Missing token seed: ${preset.id}`);
        insert.run(preset.id, preset.name, JSON.stringify({
          ...preset, tokenVersion: 1, themes: tokens.themes,
          density: tokens.density, preferredTheme: tokens.preferredTheme,
        }));
      }
      db.prepare("INSERT INTO migration (version, applied_at) VALUES (?, ?)").run(2, new Date().toISOString());
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
