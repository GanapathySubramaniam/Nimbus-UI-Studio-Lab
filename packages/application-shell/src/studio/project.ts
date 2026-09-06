import type { StudioDocument } from "./types";
// @ts-ignore Explicit extension permits Node's native test runner and both bundlers.
import { parseDocument } from "./model.ts";

export interface StudioPage {
  id: string;
  document: StudioDocument;
}
export interface StudioProject {
  version: 2;
  name: string;
  startPageId: string;
  pages: StudioPage[];
}
export const MAX_PAGES = 50;
export const MAX_PROJECT_SIZE = 48 * 1024 * 1024;
export function createProject(document: StudioDocument): StudioProject {
  return {
    version: 2,
    name: "My Nimbus app",
    startPageId: "page-home",
    pages: [{ id: "page-home", document }],
  };
}
export function parseProject(raw: string): StudioProject {
  if (raw.length > MAX_PROJECT_SIZE)
    throw new Error("Project exceeds the 48 MB limit.");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a Nimbus project.");
  const p = value as Record<string, unknown>;
  if (p["version"] === 1) return createProject(parseDocument(raw));
  if (p["version"] !== 2)
    throw new Error("Unsupported Nimbus project version.");
  if (
    typeof p["name"] !== "string" ||
    !p["name"].trim() ||
    p["name"].length > 120
  )
    throw new Error("Project name must contain 1–120 characters.");
  if (
    !Array.isArray(p["pages"]) ||
    p["pages"].length < 1 ||
    p["pages"].length > MAX_PAGES
  )
    throw new Error("Projects must contain 1–50 pages.");
  const ids = new Set<string>();
  const pages: StudioPage[] = p["pages"].map((page: unknown) => {
    if (!page || typeof page !== "object" || Array.isArray(page))
      throw new Error("Invalid page.");
    const entry = page as Record<string, unknown>;
    const id = entry["id"];
    if (typeof id !== "string" || !/^[\w-]{1,100}$/.test(id) || ids.has(id))
      throw new Error("Page IDs must be valid and unique.");
    ids.add(id);
    return { id, document: parseDocument(JSON.stringify(entry["document"])) };
  });
  const startPageId = p["startPageId"];
  if (typeof startPageId !== "string" || !ids.has(startPageId))
    throw new Error("Choose an existing start page.");
  for (const page of pages)
    for (const widget of page.document.widgets)
      for (const target of Object.values(widget.actions ?? {})) {
        if (!ids.has(target))
          throw new Error("A page link points to a missing page.");
      }
  return { version: 2, name: p["name"], startPageId, pages };
}
export function replacePage(
  project: StudioProject,
  id: string,
  document: StudioDocument,
): StudioProject {
  if (!project.pages.some((p) => p.id === id)) return project;
  return {
    ...project,
    pages: project.pages.map((p) => (p.id === id ? { ...p, document } : p)),
  };
}
export function addPage(
  project: StudioProject,
  document: StudioDocument,
): StudioProject {
  if (project.pages.length >= MAX_PAGES) return project;
  return {
    ...project,
    pages: [...project.pages, { id: crypto.randomUUID(), document }],
  };
}
export function duplicatePage(
  project: StudioProject,
  id: string,
): StudioProject {
  const source = project.pages.find((p) => p.id === id);
  if (!source || project.pages.length >= MAX_PAGES) return project;
  const nextId = crypto.randomUUID();
  const document = structuredClone(source.document);
  document.name = document.name.slice(0, 115) + " copy";
  document.widgets = document.widgets.map((w) => ({
    ...w,
    id: crypto.randomUUID(),
    ...(w.actions
      ? {
          actions: Object.fromEntries(
            Object.entries(w.actions).map(([key, target]) => [
              key,
              target === id ? nextId : target,
            ]),
          ),
        }
      : {}),
  }));
  const pages = [...project.pages];
  pages.splice(pages.findIndex((p) => p.id === id) + 1, 0, {
    id: nextId,
    document,
  });
  return { ...project, pages };
}
export function removePage(project: StudioProject, id: string): StudioProject {
  if (project.pages.length === 1 || !project.pages.some((p) => p.id === id))
    return project;
  const pages = project.pages
    .filter((p) => p.id !== id)
    .map((page) => ({
      ...page,
      document: {
        ...page.document,
        widgets: page.document.widgets.map((w) =>
          w.actions
            ? {
                ...w,
                actions: Object.fromEntries(
                  Object.entries(w.actions).filter(
                    ([, target]) => target !== id,
                  ),
                ),
              }
            : w,
        ),
      },
    }));
  return {
    ...project,
    startPageId:
      project.startPageId === id ? pages[0]!.id : project.startPageId,
    pages,
  };
}
