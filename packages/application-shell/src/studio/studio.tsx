"use client";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "./canvas";
import { Library } from "./library";
import { Inspector } from "./inspector";
import { download } from "./download";
import { Icon } from "./icons";
import { useStudioViewport } from './viewport';
import { widgetCatalog } from "./catalog";
import { applyPresetStyle, themedPreset } from './presets';
import {
  createWidget,
  constrainWidget,
  duplicateInDocument,
  updateWidgetContent,
} from "./model";
import {
  createHistory,
  commitHistory,
  undoHistory,
  redoHistory,
} from "./history";
import { createTemplate, type TemplateId } from "./templates";
import { PagesPanel } from "./pages-panel";
import { PrototypePreview } from "./prototype-preview";
import {
  createProject,
  parseProject,
  replacePage,
  addPage,
  duplicatePage,
  removePage,
  MAX_PROJECT_SIZE,
  type StudioProject,
} from "./project";
import { loadProject, saveProject } from "./project-storage";
import type { StudioDocument, Widget, WidgetKind, DesignPreset } from "./types";

const ExportDialog = lazy(() => import("./export-dialog").then(module => ({default:module.ExportDialog})));
const TemplateGallery = lazy(() => import("./template-gallery").then(module => ({default:module.TemplateGallery})));
const TokenStudio = lazy(() => import('./token-studio').then(module => ({ default: module.TokenStudio })));

export function VisualStudio() {
  const [history, setHistory] = useState(() =>
    createHistory(createProject(createTemplate("dashboard"))),
  );
  const project = history.present;
  const projectRef = useRef(project);
  projectRef.current = project;
  const [pageId, setPageId] = useState("page-home");
  const currentPage =
    project.pages.find((p) => p.id === pageId) ?? project.pages[0]!;
  const currentPageId = currentPage.id;
  const activePageRef = useRef(currentPageId);
  activePageRef.current = currentPageId;
  const doc = currentPage.document;
  const [pagesOpen, setPagesOpen] = useState(false),
    [templatesOpen, setTemplatesOpen] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const documentRef = useRef(doc);
  documentRef.current = doc;
  const [pageEpoch, setPageEpoch] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = doc.widgets.find((w) => w.id === selectedId);
  const [preview, setPreview] = useState(false),
    [device, setDevice] = useState(0),
    [zoom, setZoom] = useState(0),
    [actualZoom, setActualZoom] = useState(1);
  const [snap, setSnap] = useState(true),
    [grid, setGrid] = useState(false),
    [replay, setReplay] = useState(0);
  const [exportOpen, setExportOpen] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [helpOpen, setHelpOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<
    "components" | "canvas" | "properties"
  >("canvas");
  const [notice, setNotice] = useState(""),
    [saveState, setSaveState] = useState("Loading project…");
  const [ready, setReady] = useState(false);
  const viewportRef = useStudioViewport(ready);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null),
    lastSaved = useRef("");
  const importGeneration = useRef(0);
  useEffect(() => {
    let active = true;
    void loadProject()
      .then((restored) => {
        if (!active) return;
        if (restored) {
          setHistory(createHistory(restored));
          setPageId(restored.startPageId);
          lastSaved.current = JSON.stringify(restored);
          setSaveState("Saved locally");
        } else setSaveState("Ready to design");
      })
      .catch(() => {
        if (!active) return;
        setNotice(
          "Your saved project could not be restored. The original is retained until you make a new edit.",
        );
        setRestoreFailed(true);
        setSaveState("Recovery needed");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || restoreFailed) return;
    const serialized = JSON.stringify(project);
    if (serialized === lastSaved.current) {
      setSaveState("Saved locally");
      return;
    }
    let active = true;
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      // A dispatched write may outlive this effect. Until its active completion,
      // the old saved snapshot is not a safe reason to skip an undo's write.
      lastSaved.current = "";
      void saveProject(project)
        .then(() => {
          if (!active) return;
          lastSaved.current = serialized;
          setSaveState("Saved locally");
        })
        .catch(() => {
          if (active) setSaveState("Not saved — download project");
        });
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [project, ready, restoreFailed]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  const commitProject = useCallback((next: StudioProject) => {
    if (JSON.stringify(next) === JSON.stringify(projectRef.current))
      return false;
    try {
      parseProject(JSON.stringify(next));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Invalid project change.");
      return false;
    }
    projectRef.current = next;
    importGeneration.current++;
    const page =
      next.pages.find((p) => p.id === activePageRef.current) ?? next.pages[0]!;
    documentRef.current = page.document;
    setRestoreFailed(false);
    setSaveState("Saving…");
    setHistory((h) => commitHistory(h, next));
    return true;
  }, []);
  const commit = useCallback(
    (next: StudioDocument) => {
      return commitProject(
        replacePage(projectRef.current, activePageRef.current, next),
      );
    },
    [commitProject],
  );
  const selectPage = useCallback((id: string) => {
    importGeneration.current++;
    setPageId(id);
    setPageEpoch((v) => v + 1);
    setSelectedId(null);
    setDevice(0);
    setPreview(false);
  }, []);
  function createPage(name: TemplateId = "blank") {
    const next = addPage(projectRef.current, createTemplate(name));
    if (next === projectRef.current) {
      setNotice("This app has reached the 50 page limit.");
      return;
    }
    if (commitProject(next)) {
      selectPage(next.pages.at(-1)!.id);
      setNotice("Page added. Connect widgets using Content → Page links.");
    }
  }
  function copyPage(id: string) {
    const next = duplicatePage(projectRef.current, id);
    if (commitProject(next)) {
      const index = next.pages.findIndex((p) => p.id === id);
      selectPage(next.pages[index + 1]!.id);
    }
  }
  function deletePage(id: string) {
    const next = removePage(projectRef.current, id);
    if (commitProject(next)) {
      if (activePageRef.current === id) selectPage(next.startPageId);
      setNotice("Page removed and incoming links cleared. Undo restores both.");
    }
  }
  const changeWidget = useCallback(
    (id: string, patch: Partial<Widget>) => {
      const currentDoc = documentRef.current;
      const current = currentDoc.widgets.find((w) => w.id === id);
      if (!current || current.locked) return false;
      const next = { ...current, ...patch };
      Object.assign(
        next,
        constrainWidget(next, currentDoc.width, currentDoc.height),
      );
      return commit({
        ...currentDoc,
        widgets: currentDoc.widgets.map((w) => (w.id === id ? next : w)),
      });
    },
    [commit],
  );
  function add(kind: WidgetKind, x?: number, y?: number) {
    const def = widgetCatalog.find((w) => w.kind === kind);
    if (!def) return;
    if (doc.widgets.length >= 200) {
      setNotice("This page has reached the 200 widget limit.");
      return;
    }
    const offset = (doc.widgets.length % 8) * 24;
    const w = createWidget(
      def,
      themedPreset('muted-enterprise', 'light'),
      x ?? 240 + offset,
      y ?? 200 + offset,
    );
    Object.assign(
      w,
      constrainWidget(w, doc.width, doc.height, snap ? doc.grid : 1),
    );
    if (!commit({ ...doc, widgets: [...doc.widgets, w] })) return;
    setSelectedId(w.id);
    setDevice(0);
    setPreview(false);
    setNotice(`${def.name} added. Edit its properties on the right.`);
  }
  const duplicate = useCallback(() => {
    if (!selected || doc.widgets.length >= 200) return;
    const next = duplicateInDocument(doc, selected.id);
    if (!commit(next)) return;
    setSelectedId(next.widgets.at(-1)?.id ?? null);
    setNotice("Widget duplicated.");
  }, [selected, doc, commit]);
  const remove = useCallback(() => {
    if (!selected || selected.locked) return;
    commit({
      ...doc,
      widgets: doc.widgets.filter((w) => w.id !== selected.id),
    });
    setSelectedId(null);
    setNotice("Widget deleted. Undo to restore.");
  }, [selected, doc, commit]);
  const undo = useCallback(() => {
    importGeneration.current++;
    setPageEpoch((v) => v + 1);
    setHistory(undoHistory);
  }, []);
  const redo = useCallback(() => {
    importGeneration.current++;
    setPageEpoch((v) => v + 1);
    setHistory(redoHistory);
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.closest(
        "input,textarea,select,[contenteditable=true]",
      );
      if (
        exportOpen ||
        pagesOpen ||
        templatesOpen ||
        tokensOpen ||
        fullscreenPreview ||
        !ready ||
        typing
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setPreview(false);
        setMenuOpen(false);
        setHelpOpen(false);
      } else if (e.key === "/") {
        e.preventDefault();
        setMobilePanel("components");
        requestAnimationFrame(() =>
          window.document
            .querySelector<HTMLInputElement>(".studio-search input")
            ?.focus(),
        );
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    undo,
    redo,
    duplicate,
    remove,
    exportOpen,
    pagesOpen,
    templatesOpen,
    tokensOpen,
    fullscreenPreview,
    ready,
  ]);
  function applyPreset(preset: DesignPreset) {
    if (selected && !selected.locked) {
      changeWidget(selected.id, applyPresetStyle(selected, preset));
      setNotice(`${preset.name} applied to ${selected.name}.`);
    }
  }
  function layerAction(id: string, action: "hide" | "lock" | "up" | "down") {
    const index = doc.widgets.findIndex((w) => w.id === id);
    const w = doc.widgets[index];
    if (!w) return;
    const widgets = [...doc.widgets];
    if (action === "hide") widgets[index] = { ...w, hidden: !w.hidden };
    else if (action === "lock") widgets[index] = { ...w, locked: !w.locked };
    else {
      const next = index + (action === "up" ? 1 : -1);
      if (next < 0 || next >= widgets.length) return;
      widgets.splice(index, 1);
      widgets.splice(next, 0, w);
    }
    commit({ ...doc, widgets });
  }
  function pageChange(patch: Partial<StudioDocument>) {
    const next = { ...doc, ...patch };
    next.widgets = next.widgets.map((w) => ({
      ...w,
      ...constrainWidget(w, next.width, next.height),
    }));
    return commit(next);
  }
  function template(name: TemplateId) {
    commit(createTemplate(name));
    setPageEpoch((v) => v + 1);
    setSelectedId(null);
    setDevice(0);
    setPreview(false);
    setNotice("Starter page loaded. Undo restores your previous page.");
  }
  async function importProject(file: File) {
    const generation = ++importGeneration.current;
    try {
      if (file.size > MAX_PROJECT_SIZE)
        throw new Error("Project exceeds the 48 MB import limit.");
      const restored = parseProject(await file.text());
      if (generation !== importGeneration.current) return;
      commitProject(restored);
      setPageId(restored.startPageId);
      setPageEpoch((v) => v + 1);
      setSelectedId(null);
      setNotice("Project imported. Undo restores your previous page.");
    } catch (err) {
      if (generation !== importGeneration.current) return;
      setNotice(
        err instanceof Error ? err.message : "Unable to import project.",
      );
    }
  }
  if (!ready)
    return (
      <div className="studio-loading-overlay" role="status">
        Opening your Nimbus project…
      </div>
    );
  return (
    <div ref={viewportRef} className={`studio-app mobile-${mobilePanel}`}>
      <h1 className="studio-sr-only">Nimbus visual page studio</h1>
      <a className="studio-skip" href="#studio-workspace">
        Skip to canvas workspace
      </a>
      <header className="studio-topbar">
        <a
          className="studio-brand"
          href="#studio-workspace"
          aria-label="Nimbus UI Studio"
        >
          <span className="studio-logo">
            <svg viewBox="0 0 28 28" aria-hidden="true">
              <path
                d="M5 22V6l9 11V6h9v16l-9-11v11"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <strong>
            Nimbus<span>UI Studio</span>
          </strong>
        </a>
        <div className="studio-header-divider" />
        <div className="studio-project-menu">
          <button
            className="studio-project-button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name="folder" />
            <span>{project.name}</span>
            <Icon name="down" size={13} />
          </button>
          {menuOpen && (
            <div className="studio-dropdown">
              <button
                onClick={() => {
                  createPage("blank");
                  setMenuOpen(false);
                }}
              >
                <Icon name="plus" />
                New blank page
              </button>
              <button
                onClick={() => {
                  fileRef.current?.click();
                  setMenuOpen(false);
                }}
              >
                <Icon name="upload" />
                Import project
              </button>
              <button
                onClick={() => {
                  download(
                    JSON.stringify(project, null, 2),
                    "nimbus-project.json",
                    "application/json",
                  );
                  setMenuOpen(false);
                }}
              >
                <Icon name="download" />
                Download project
              </button>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setMenuOpen(false);
                  setMobilePanel("properties");
                }}
              >
                <Icon name="settings" />
                Page settings
              </button>
            </div>
          )}
        </div>
        <span
          className={`studio-save-state ${saveState.startsWith("Not") ? "is-error" : ""}`}
        >
          <Icon
            name={saveState === "Saved locally" ? "check" : "folder"}
            size={13}
          />
          {saveState}
        </span>
        <div className="studio-header-actions">
          <button
            className="studio-icon-btn"
            onClick={undo}
            disabled={!history.past.length}
            title="Undo (Ctrl/⌘ Z)"
            aria-label="Undo"
          >
            <Icon name="undo" />
          </button>
          <button
            className="studio-icon-btn"
            onClick={redo}
            disabled={!history.future.length}
            title="Redo (Ctrl/⌘ Shift Z)"
            aria-label="Redo"
          >
            <Icon name="redo" />
          </button>
          <span className="studio-header-divider" />
          <button
            className="studio-secondary"
            onClick={() => setFullscreenPreview(true)}
            aria-pressed={fullscreenPreview}
          >
            <Icon name={preview ? "grid" : "play"} />
            {preview ? "Back to editor" : "Preview"}
          </button>
          <button
            className="studio-primary"
            onClick={() => setExportOpen(true)}
          >
            <Icon name="code" />
            Export code
          </button>
        </div>
      </header>
      <div className="studio-subbar">
        <div>
          <span className="studio-live-dot" />
          <b>Design workspace</b>
          <span className="studio-muted">
            Build it visually. Make it yours.
          </span>
        </div>
        <button
          className="studio-plain-button"
          onClick={() => setHelpOpen(!helpOpen)}
        >
          <Icon name="help" size={14} />
          Quick guide
        </button>
      </div>
      <nav className="studio-mobile-tabs" aria-label="Editor panels">
        {(["components", "canvas", "properties"] as const).map((p) => (
          <button
            key={p}
            aria-pressed={mobilePanel === p}
            onClick={() => setMobilePanel(p)}
          >
            {p}
          </button>
        ))}
      </nav>
      <div className="studio-workbench" id="studio-workspace" tabIndex={-1}>
        <Library
          widgets={doc.widgets}
          selectedId={selectedId}
          onAdd={(kind) => add(kind)}
          onSelect={(id) => {
            setSelectedId(id);
            setMobilePanel("properties");
          }}
          onPreset={applyPreset}
          onAction={layerAction}
          onTemplate={template}
          onOpenTokens={() => setTokensOpen(true)}
        />
        <main className="studio-center" aria-label="Page editor">
          <div className="studio-pagebar">
            <label>
              <Icon name="folder" />
              <select
                aria-label="Current page"
                value={currentPageId}
                onChange={(e) => selectPage(e.target.value)}
              >
                {project.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.document.name || "Untitled page"}
                  </option>
                ))}
              </select>
            </label>
            <span className="studio-page-count">
              {project.pages.length}{" "}
              {project.pages.length === 1 ? "page" : "pages"}
            </span>
            <button
              className="studio-secondary"
              onClick={() => setPagesOpen(true)}
            >
              Manage pages
            </button>
            <button className="studio-secondary" onClick={() => add("text")}>
              <Icon name="plus" size={13} /> Text
            </button>
            <button
              className="studio-secondary"
              onClick={() => setTemplatesOpen(true)}
            >
              <Icon name="grid" size={13} />
              17 templates
            </button>
          </div>
          <div className="studio-canvas-toolbar">
            <div className="studio-tool-group">
              <button
                className={
                  !preview && device === 0
                    ? "studio-icon-btn is-active"
                    : "studio-icon-btn"
                }
                onClick={() => {
                  setPreview(false);
                  setDevice(0);
                }}
                aria-label="Edit canvas"
                title="Edit canvas"
              >
                <Icon name="move" />
              </button>
              <button
                className="studio-icon-btn"
                onClick={() => setSelectedId(null)}
                aria-label="Edit page settings"
                title="Page settings"
              >
                <Icon name="settings" />
              </button>
              <span className="studio-toolbar-line" />
              <button
                className={`studio-icon-btn ${grid ? "is-active" : ""}`}
                aria-pressed={grid}
                onClick={() => setGrid(!grid)}
                aria-label="Toggle canvas grid"
                title="Canvas grid"
              >
                <Icon name="grid" />
              </button>
              <button
                className={`studio-snap-button ${snap ? "is-active" : ""}`}
                aria-pressed={snap}
                onClick={() => setSnap(!snap)}
                title="Snap dragging to the page grid"
              >
                Snap
              </button>
            </div>
            <div
              className="studio-device-toggle"
              role="group"
              aria-label="Responsive viewport"
            >
              {[
                { width: 0, name: "Desktop", icon: "monitor" },
                { width: 768, name: "Tablet", icon: "tablet" },
                { width: 390, name: "Mobile", icon: "phone" },
              ].map((d) => (
                <button
                  key={d.width}
                  aria-label={`${d.name} viewport`}
                  aria-pressed={device === d.width}
                  onClick={() => setDevice(d.width)}
                  title={d.name}
                >
                  <Icon name={d.icon} />
                </button>
              ))}
            </div>
            <label className="studio-zoom">
              <span className="studio-sr-only">Canvas zoom</span>
              <select
                aria-label="Canvas zoom"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              >
                <option value={0}>Fit · {Math.round(actualZoom * 100)}%</option>
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => (
                  <option key={z} value={z}>
                    {z * 100}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(preview || device > 0) && (
            <div className="studio-preview-banner">
              <Icon name="eye" size={14} />
              {device > 0
                ? "Responsive preview — return to Desktop to edit positions."
                : "Interactive preview — try native controls, hover and press animations."}
              <button
                onClick={() => {
                  setPreview(false);
                  setDevice(0);
                }}
              >
                Back to editing
              </button>
            </div>
          )}
          <Canvas
            document={doc}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={changeWidget}
            onAdd={add}
            preview={preview}
            device={device}
            zoom={zoom}
            snap={snap}
            showGrid={grid}
            replayKey={replay}
            onZoomChange={setActualZoom}
          />
          <footer className="studio-canvas-status">
            <span>
              <Icon name="layers" size={13} />
              {doc.widgets.length} components
              <span className="studio-toolbar-line" />{" "}
              {selected ? selected.name : "No selection"}
            </span>
            <span>
              {snap ? `${doc.grid}px snap` : "Free positioning"}
              <span className="studio-toolbar-line" />
              React + CSS
            </span>
          </footer>
        </main>
        <Inspector
          key={`${currentPageId}-${pageEpoch}-${selectedId ?? "page"}`}
          widget={selected}
          pageId={currentPageId}
          pages={project.pages.map((p) => ({
            id: p.id,
            name: p.document.name,
          }))}
          document={doc}
          onChange={(patch) => {
            return selected ? changeWidget(selected.id, patch) : false;
          }}
          onImage={(id, image) =>
            commit(updateWidgetContent(documentRef.current, id, { image }))
          }
          onPage={pageChange}
          onPreset={applyPreset}
          onDelete={remove}
          onDuplicate={duplicate}
          announce={setNotice}
          replay={() => setReplay((v) => v + 1)}
        />
      </div>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".json,application/json"
        aria-label="Import Nimbus project"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importProject(file);
          e.target.value = "";
        }}
      />
      {notice && (
        <div className="studio-toast" role="status">
          <Icon name="check" />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {pagesOpen && (
        <PagesPanel
          project={project}
          currentPageId={currentPageId}
          onSelect={selectPage}
          onChange={commitProject}
          onAdd={() => createPage()}
          onDuplicate={copyPage}
          onDelete={deletePage}
          onClose={() => setPagesOpen(false)}
        />
      )}
      {templatesOpen && (
        <Suspense fallback={<div className="studio-loading-overlay" role="status">Opening templates…</div>}>
        <TemplateGallery
          onSelect={(id) => {
            createPage(id);
            setTemplatesOpen(false);
          }}
          onClose={() => setTemplatesOpen(false)}
        />
        </Suspense>
      )}
      {fullscreenPreview && (
        <PrototypePreview
          project={project}
          initialPageId={currentPageId}
          onClose={() => setFullscreenPreview(false)}
        />
      )}
      {exportOpen && (
        <Suspense fallback={<div className="studio-loading-overlay" role="status">Preparing export tools…</div>}>
        <ExportDialog
          project={project}
          currentPageId={currentPageId}
          document={doc}
          selected={selected}
          onClose={() => setExportOpen(false)}
        />
        </Suspense>
      )}
      {tokensOpen && (
        <Suspense fallback={<div className="studio-loading-overlay" role="status">Opening Token Studio…</div>}>
          <TokenStudio selected={selected} onApply={applyPreset} onClose={() => setTokensOpen(false)} />
        </Suspense>
      )}
      {helpOpen && (
        <div className="studio-guide" role="region" aria-label="Quick guide">
          <button
            className="studio-icon-btn"
            aria-label="Close guide"
            onClick={() => setHelpOpen(false)}
          >
            <Icon name="close" />
          </button>
          <h2>A canvas, without the constraints.</h2>
          <p>1. Click or drag a component from the library.</p>
          <p>
            2. Choose a design language in Styles. Each widget is independent.
          </p>
          <p>3. Edit layout, color, text, images and motion in Properties.</p>
          <p>4. Add pages and connect them in Content → Page links.</p>
          <p>
            5. Preview full-screen, then download your React app ZIP or
            standalone HTML.
          </p>
          <dl>
            <dt>Move</dt>
            <dd>Arrow keys · Shift for 10px</dd>
            <dt>Duplicate</dt>
            <dd>Ctrl / ⌘ D</dd>
            <dt>Undo / redo</dt>
            <dd>Ctrl / ⌘ Z · Shift Z</dd>
            <dt>Delete</dt>
            <dd>Delete or Backspace</dd>
            <dt>Deselect</dt>
            <dd>Escape</dd>
          </dl>
          <small>
            Projects save in this browser. Download JSON for a portable editable
            backup. UI samples are not connected to backend services.
          </small>
        </div>
      )}
    </div>
  );
}
