#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createDocument,
  createProject,
  createTemplate,
  createWidget,
  constrainWidget,
  duplicateInDocument,
  applyPresetStyle,
  replacePage,
  addPage,
  parseProject,
  scopeProject,
  exportProjectReact,
  exportProjectHtml,
  createReactPackage,
  createZip,
  templateCatalog,
  type StudioDocument,
  type Widget,
  type WidgetKind,
} from "@nimbus-ui-studio/application-shell/studio-engine";
import { WIDGET_KINDS, widgetCatalog, designPresets, findDefinition, findPreset } from "./engine";
import { getProject, setProject, getDocument, onProjectChange, listSavedComponents, addSavedComponent, findSavedComponent } from "./store";
import { startBridge, broadcast, bridgeStatus } from "./bridge";
import { syncSkillReferences } from "./skill-sync";

const server = new McpServer({ name: "nimbus-ui-studio", version: "0.1.0" });

function text(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}
function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** Every mutation goes through here: commits the doc and returns the fresh project. */
function commitDocument(pageId: string, doc: StudioDocument) {
  const next = replacePage(getProject(), pageId, doc);
  setProject(next, pageId);
  return next;
}

function widgetLine(w: Widget): string {
  const preview = (w.content.title || w.content.value || "").slice(0, 28);
  return `${w.id}  ${w.kind}  (${w.x},${w.y} ${w.width}x${w.height})  "${preview}"`;
}

// setProject() is the single place that mutates the working project; every
// change reaches connected Studio tabs through this one listener.
onProjectChange((next) => broadcast(next));

server.registerTool(
  "list_widget_kinds",
  {
    title: "List widget kinds",
    description:
      "List every widget kind the add_widget tool accepts, with default size and category. Call once per session; the result rarely changes.",
    inputSchema: { category: z.string().optional().describe("Filter to one category (e.g. \"Forms\", \"Agentic\").") },
  },
  ({ category }) => {
    const items = category ? widgetCatalog.filter((w) => w.category.toLowerCase() === category.toLowerCase()) : widgetCatalog;
    const lines = items.map((w) => `${w.kind}\t${w.name}\t${w.category}\t${w.width}x${w.height}`);
    return text(lines.join("\n"));
  },
);

server.registerTool(
  "list_style_presets",
  {
    title: "List style presets",
    description: "List style preset ids for the presetId argument on add_widget/update_widget.",
    inputSchema: { category: z.string().optional() },
  },
  ({ category }) => {
    const items = category ? designPresets.filter((p) => p.category.toLowerCase() === category.toLowerCase()) : designPresets;
    return text(items.map((p) => `${p.id}\t${p.name}\t${p.category}`).join("\n"));
  },
);

server.registerTool(
  "list_templates",
  { title: "List starter templates", description: "List starter page templates for new_project/add_page." },
  () => text(["blank\tBlank page\t—", ...templateCatalog.map((t) => `${t.id}\t${t.name}\t${t.category}`)].join("\n")),
);

server.registerTool(
  "new_project",
  {
    title: "Start a new project",
    description: "Start a fresh in-memory project, replacing the current one. Use before designing a new UI from scratch.",
    inputSchema: { name: z.string().min(1).max(120).optional(), template: z.string().optional().describe("Template id from list_templates, or omit for blank.") },
  },
  ({ name, template }) => {
    const doc = template && template !== "blank" ? createTemplate(template as never) : createDocument();
    let project = createProject(doc);
    if (name) project = { ...project, name };
    setProject(project);
    const page = project.pages[0]!;
    return text(`Project "${project.name}" created. Page "${page.id}" has ${page.document.widgets.length} widget(s).`);
  },
);

server.registerTool(
  "list_pages",
  { title: "List pages", description: "List the pages in the current project." },
  () => text(getProject().pages.map((p) => `${p.id}\t${p.document.name}\t${p.document.widgets.length} widgets`).join("\n")),
);

server.registerTool(
  "add_page",
  {
    title: "Add a page",
    description: "Add a new page to the current project.",
    inputSchema: { template: z.string().optional(), name: z.string().optional() },
  },
  ({ template, name }) => {
    const doc = template && template !== "blank" ? createTemplate(template as never) : createDocument();
    const withName = name ? { ...doc, name } : doc;
    const next = addPage(getProject(), withName);
    setProject(next, next.pages.at(-1)!.id);
    return text(`Page "${next.pages.at(-1)!.id}" added.`);
  },
);

server.registerTool(
  "list_widgets",
  {
    title: "List widgets on a page",
    description: "List widgets on a page: id, kind, position, size, and a short content preview.",
    inputSchema: { pageId: z.string().optional() },
  },
  ({ pageId }) => {
    const { document } = getDocument(pageId);
    if (document.widgets.length === 0) return text("(no widgets on this page yet)");
    return text(document.widgets.map(widgetLine).join("\n"));
  },
);

const widgetContentShape = {
  title: z.string().max(20000).optional(),
  subtitle: z.string().max(20000).optional(),
  value: z.string().max(20000).optional(),
  items: z.string().max(20000).optional().describe("One item per line; a row's columns separated by \" | \"."),
};

server.registerTool(
  "add_widget",
  {
    title: "Add a widget",
    description:
      "Add one widget to a page at an exact position. Cheapest way to assemble UI: call this once per widget instead of writing JSX. Position and size are in the page's own pixel grid (default page is 1200x1000).",
    inputSchema: {
      pageId: z.string().optional(),
      kind: z.enum(WIDGET_KINDS).describe("See list_widget_kinds for the full catalog."),
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().min(1).optional().describe("Defaults to the kind's catalog size."),
      height: z.number().min(1).optional(),
      presetId: z.string().optional().describe("See list_style_presets. Defaults to muted-enterprise."),
      ...widgetContentShape,
    },
  },
  ({ pageId, kind, x, y, width, height, presetId, title, subtitle, value, items }) => {
    const { pageId: resolvedPageId, document } = getDocument(pageId);
    if (document.widgets.length >= 200) return fail("This page has reached the 200 widget limit.");
    const def = findDefinition(kind as WidgetKind);
    const preset = findPreset(presetId);
    const widget = createWidget(def, preset, x, y);
    if (width !== undefined || height !== undefined) {
      Object.assign(widget, constrainWidget({ ...widget, width: width ?? widget.width, height: height ?? widget.height }, document.width, document.height, document.grid));
    } else {
      Object.assign(widget, constrainWidget(widget, document.width, document.height, document.grid));
    }
    const contentPatch: Partial<Widget["content"]> = {};
    if (title !== undefined) contentPatch.title = title;
    if (subtitle !== undefined) contentPatch.subtitle = subtitle;
    if (value !== undefined) contentPatch.value = value;
    if (items !== undefined) contentPatch.items = items;
    if (Object.keys(contentPatch).length > 0) widget.content = { ...widget.content, ...contentPatch };
    commitDocument(resolvedPageId, { ...document, widgets: [...document.widgets, widget] });
    return text(widgetLine(widget));
  },
);

server.registerTool(
  "update_widget",
  {
    title: "Update a widget",
    description: "Patch one widget's position, size, content, or style preset. Only the fields you pass are changed.",
    inputSchema: {
      pageId: z.string().optional(),
      widgetId: z.string(),
      x: z.number().min(0).optional(),
      y: z.number().min(0).optional(),
      width: z.number().min(1).optional(),
      height: z.number().min(1).optional(),
      presetId: z.string().optional(),
      ...widgetContentShape,
    },
  },
  ({ pageId, widgetId, x, y, width, height, presetId, title, subtitle, value, items }) => {
    const { pageId: resolvedPageId, document } = getDocument(pageId);
    const current = document.widgets.find((w) => w.id === widgetId);
    if (!current) return fail(`No widget with id "${widgetId}" on this page.`);
    if (current.locked) return fail(`Widget "${widgetId}" is locked.`);
    let next: Widget = {
      ...current,
      x: x ?? current.x,
      y: y ?? current.y,
      width: width ?? current.width,
      height: height ?? current.height,
    };
    Object.assign(next, constrainWidget(next, document.width, document.height, document.grid));
    const contentPatch: Partial<Widget["content"]> = {};
    if (title !== undefined) contentPatch.title = title;
    if (subtitle !== undefined) contentPatch.subtitle = subtitle;
    if (value !== undefined) contentPatch.value = value;
    if (items !== undefined) contentPatch.items = items;
    if (Object.keys(contentPatch).length > 0) next.content = { ...next.content, ...contentPatch };
    if (presetId) next = applyPresetStyle(next, findPreset(presetId));
    commitDocument(resolvedPageId, {
      ...document,
      widgets: document.widgets.map((w) => (w.id === widgetId ? next : w)),
    });
    return text(widgetLine(next));
  },
);

server.registerTool(
  "remove_widget",
  {
    title: "Remove a widget",
    description: "Remove one widget from a page.",
    inputSchema: { pageId: z.string().optional(), widgetId: z.string() },
  },
  ({ pageId, widgetId }) => {
    const { pageId: resolvedPageId, document } = getDocument(pageId);
    if (!document.widgets.some((w) => w.id === widgetId)) return fail(`No widget with id "${widgetId}" on this page.`);
    commitDocument(resolvedPageId, { ...document, widgets: document.widgets.filter((w) => w.id !== widgetId) });
    return text(`Removed ${widgetId}.`);
  },
);

server.registerTool(
  "duplicate_widget",
  {
    title: "Duplicate a widget",
    description: "Duplicate one widget on the same page, offset by 24px.",
    inputSchema: { pageId: z.string().optional(), widgetId: z.string() },
  },
  ({ pageId, widgetId }) => {
    const { pageId: resolvedPageId, document } = getDocument(pageId);
    const next = duplicateInDocument(document, widgetId);
    if (next === document) return fail(`Could not duplicate "${widgetId}" (missing, or the page is full).`);
    commitDocument(resolvedPageId, next);
    return text(widgetLine(next.widgets.at(-1)!));
  },
);

server.registerTool(
  "export_code",
  {
    title: "Export generated code",
    description:
      "Export the current design as code — the exact same generator the Studio app's own Export dialog uses, so this always matches what a human would see on screen.",
    inputSchema: {
      format: z.enum(["react", "html", "json"]),
      scope: z.enum(["app", "page", "widget"]).default("page"),
      pageId: z.string().optional(),
      widgetId: z.string().optional(),
    },
  },
  ({ format, scope, pageId, widgetId }) => {
    try {
      const { pageId: resolvedPageId } = getDocument(pageId);
      const { project } = scopeProject(getProject(), { scope, currentPageId: resolvedPageId, ...(widgetId ? { widgetId } : {}) });
      const code = format === "react" ? exportProjectReact(project) : format === "html" ? exportProjectHtml(project) : JSON.stringify(project, null, 2);
      return text(code);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Export failed.");
    }
  },
);

server.registerTool(
  "export_package",
  {
    title: "Write a runnable React package to disk",
    description:
      "Write the same downloadable React ZIP the Studio's \"Download React ZIP\" button produces to a local file path, instead of returning it as text (avoids spending tokens on a whole project's code).",
    inputSchema: {
      path: z.string().min(1).describe("Local file path to write the .zip to."),
      scope: z.enum(["app", "page", "widget"]).default("app"),
      pageId: z.string().optional(),
      widgetId: z.string().optional(),
    },
  },
  ({ path, scope, pageId, widgetId }) => {
    try {
      const { pageId: resolvedPageId } = getDocument(pageId);
      const result = createReactPackage(getProject(), { scope, currentPageId: resolvedPageId, ...(widgetId ? { widgetId } : {}) });
      writeFileSync(path, createZip(result.entries));
      const notes = result.warnings.length ? ` Notices: ${result.warnings.join(" ")}` : "";
      return text(`Wrote ${result.entries.length} files to ${path}.${notes}`);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Package export failed.");
    }
  },
);

server.registerTool(
  "get_project_json",
  { title: "Get the full project JSON", description: "Return the complete current project as JSON. Costs more tokens than the other tools — use only for a full backup or handoff." },
  () => text(JSON.stringify(getProject(), null, 2)),
);

server.registerTool(
  "load_project_json",
  {
    title: "Load a project from JSON",
    description: "Replace the current project with one from JSON (e.g. an exported nimbus-project.json, or a project a teammate shared).",
    inputSchema: { json: z.string() },
  },
  ({ json }) => {
    try {
      const project = parseProject(json);
      setProject(project);
      return text(`Loaded "${project.name}" (${project.pages.length} page(s)).`);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Invalid project JSON.");
    }
  },
);

server.registerTool(
  "save_component",
  {
    title: "Save a reusable component",
    description:
      "Save one or more widgets as a named, reusable component for future projects. Insert it later with insert_saved_component instead of rebuilding it from scratch — this is how the component library (and this skill's reference docs) grow over time.",
    inputSchema: {
      pageId: z.string().optional(),
      widgetIds: z.array(z.string()).min(1),
      name: z.string().min(1).max(80),
      description: z.string().max(400).optional(),
    },
  },
  ({ pageId, widgetIds, name, description }) => {
    const { document } = getDocument(pageId);
    const widgets = widgetIds.map((id) => document.widgets.find((w) => w.id === id)).filter((w): w is Widget => Boolean(w));
    if (widgets.length === 0) return fail("None of the given widget ids were found on this page.");
    const originX = Math.min(...widgets.map((w) => w.x));
    const originY = Math.min(...widgets.map((w) => w.y));
    const maxX = Math.max(...widgets.map((w) => w.x + w.width));
    const maxY = Math.max(...widgets.map((w) => w.y + w.height));
    const normalized = widgets.map((w) => ({ ...w, x: w.x - originX, y: w.y - originY }));
    addSavedComponent({
      id: randomUUID(),
      name,
      description: description ?? "",
      kinds: [...new Set(widgets.map((w) => w.kind))],
      width: maxX - originX,
      height: maxY - originY,
      widgets: normalized,
      createdAt: new Date().toISOString(),
    });
    syncSkillReferences();
    return text(`Saved "${name}" (${widgets.length} widget(s)). The skill's saved-components reference has been updated.`);
  },
);

server.registerTool(
  "list_saved_components",
  {
    title: "List saved reusable components",
    description: "List components previously saved with save_component, across all sessions.",
    inputSchema: { query: z.string().optional() },
  },
  ({ query }) => {
    const all = listSavedComponents();
    const filtered = query ? all.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase())) : all;
    if (filtered.length === 0) return text("(none saved yet)");
    return text(filtered.map((c) => `${c.id}\t${c.name}\t${c.width}x${c.height}\t${c.kinds.join(",")}`).join("\n"));
  },
);

server.registerTool(
  "insert_saved_component",
  {
    title: "Insert a saved component",
    description: "Instantiate a previously saved component onto a page at a given position.",
    inputSchema: { pageId: z.string().optional(), componentId: z.string(), x: z.number().min(0), y: z.number().min(0) },
  },
  ({ pageId, componentId, x, y }) => {
    const saved = findSavedComponent(componentId);
    if (!saved) return fail(`No saved component with id "${componentId}". Use list_saved_components.`);
    const { pageId: resolvedPageId, document } = getDocument(pageId);
    if (document.widgets.length + saved.widgets.length > 200) return fail("Inserting this component would exceed the 200 widget page limit.");
    const inserted = saved.widgets.map((w) => {
      const placed = { ...w, id: randomUUID(), x: w.x + x, y: w.y + y };
      Object.assign(placed, constrainWidget(placed, document.width, document.height, document.grid));
      return placed;
    });
    commitDocument(resolvedPageId, { ...document, widgets: [...document.widgets, ...inserted] });
    return text(`Inserted "${saved.name}": ${inserted.length} widget(s).\n${inserted.map(widgetLine).join("\n")}`);
  },
);

server.registerTool(
  "studio_bridge_status",
  {
    title: "Live-sync status",
    description: "Check whether the local live-sync server is running and whether a Studio browser tab is connected to it.",
  },
  () => {
    const status = bridgeStatus();
    if (!status.running) return text("Live sync is not running.");
    return text(
      `Live sync running at http://127.0.0.1:${status.port}. ${status.connectedTabs} Studio tab(s) connected.` +
        (status.connectedTabs === 0
          ? " Open the Studio app and click \"Connect agent\" in its header to see live updates."
          : ""),
    );
  },
);

const configuredPort = Number(process.env["NIMBUS_BRIDGE_PORT"]);
const bridgeResult = await startBridge(Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : undefined);
if (!bridgeResult.started) {
  process.stderr.write(`[nimbus-studio-mcp] Live sync disabled: ${bridgeResult.reason ?? "unknown error"}\n`);
} else {
  process.stderr.write(`[nimbus-studio-mcp] Live sync listening on http://127.0.0.1:${bridgeResult.port}\n`);
}

await server.connect(new StdioServerTransport());
