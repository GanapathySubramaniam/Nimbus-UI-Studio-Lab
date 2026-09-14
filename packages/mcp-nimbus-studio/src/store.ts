import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createProject,
  createTemplate,
  type StudioProject,
  type StudioDocument,
  type Widget,
} from "@nimbus-ui-studio/application-shell/studio-engine";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "..", "data");
// Overridable so manual test runs don't write into the real, shared,
// git-tracked component library.
const COMPONENTS_PATH = process.env["NIMBUS_COMPONENTS_PATH"] ?? join(DATA_DIR, "saved-components.json");

export interface SavedComponent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kinds: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly widgets: readonly Widget[];
  readonly createdAt: string;
}

let project: StudioProject = createProject(createTemplate("blank"));
let activePageId: string = project.startPageId;

export function getProject(): StudioProject {
  return project;
}

export function getActivePageId(pageId?: string): string {
  if (pageId) return pageId;
  if (project.pages.some((page) => page.id === activePageId)) return activePageId;
  return project.startPageId;
}

export function getDocument(pageId?: string): { pageId: string; document: StudioDocument } {
  const id = getActivePageId(pageId);
  const page = project.pages.find((entry) => entry.id === id) ?? project.pages[0];
  if (!page) throw new Error("The current project has no pages.");
  return { pageId: page.id, document: page.document };
}

export type ProjectListener = (next: StudioProject) => void;
const listeners = new Set<ProjectListener>();

export function onProjectChange(listener: ProjectListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setProject(next: StudioProject, pageId?: string): void {
  project = next;
  activePageId = pageId ?? next.startPageId;
  for (const listener of listeners) listener(next);
}

function readComponentsFile(): SavedComponent[] {
  if (!existsSync(COMPONENTS_PATH)) return [];
  const raw = readFileSync(COMPONENTS_PATH, "utf8").trim();
  if (!raw) return [];
  return JSON.parse(raw) as SavedComponent[];
}

export function listSavedComponents(): SavedComponent[] {
  return readComponentsFile();
}

export function addSavedComponent(entry: SavedComponent): void {
  const all = readComponentsFile();
  all.push(entry);
  mkdirSync(dirname(COMPONENTS_PATH), { recursive: true });
  writeFileSync(COMPONENTS_PATH, JSON.stringify(all, null, 2) + "\n", "utf8");
}

export function findSavedComponent(id: string): SavedComponent | undefined {
  return readComponentsFile().find((entry) => entry.id === id);
}
