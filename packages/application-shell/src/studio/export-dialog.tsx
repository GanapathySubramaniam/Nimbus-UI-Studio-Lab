import { useEffect, useMemo, useRef, useState } from "react";
import { exportProjectHtml } from "./export";
import { createReactPackage, exportProjectReact, scopeProject } from "./package-export";
import { createZip } from "./zip";
import { Icon } from "./icons";
import type { StudioProject } from "./project";
import type { StudioDocument, Widget } from "./types";

export function download(content: string | Uint8Array, name: string, type: string) {
  const part = typeof content === "string" ? content : new Uint8Array(content).buffer;
  const url = URL.createObjectURL(new Blob([part], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExportDialog({
  document,
  selected,
  onClose,
  project,
  currentPageId,
}: {
  document: StudioDocument;
  selected: Widget | undefined;
  onClose: () => void;
  project?: StudioProject;
  currentPageId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    text = useRef<HTMLTextAreaElement>(null);
  const [format, setFormat] = useState<"react" | "html" | "json">("react");
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState<"app" | "page" | "widget">(project ? "app" : "page");
  const sourceProject = useMemo<StudioProject>(() => project ?? {
    version: 2, name: document.name, startPageId: "page", pages: [{ id: "page", document }],
  }, [project, document]);
  const scoped = useMemo(() => scopeProject(sourceProject, {
    scope: scope === "widget" && !selected ? "page" : scope,
    currentPageId: currentPageId ?? sourceProject.startPageId,
    ...(selected ? { widgetId: selected.id } : {}),
  }), [sourceProject, scope, currentPageId, selected]);
  const code = useMemo(() =>
    format === "react"
      ? exportProjectReact(scoped.project)
      : format === "html"
        ? exportProjectHtml(scoped.project)
        : JSON.stringify(scoped.project, null, 2), [format, scoped]);
  useEffect(() => {
    const dialog = ref.current;
    const focus = documentGlobal().activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      focus?.focus();
    };
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Code copied to clipboard.");
    } catch {
      text.current?.focus();
      text.current?.select();
      setStatus(
        "Clipboard unavailable. Code selected — press Ctrl+C or ⌘C to copy.",
      );
    }
  }
  function downloadZip() {
    try {
      const result = createReactPackage(sourceProject, {
        scope: scope === "widget" && !selected ? "page" : scope,
        currentPageId: currentPageId ?? sourceProject.startPageId,
        ...(selected ? { widgetId: selected.id } : {}),
      });
      download(createZip(result.entries), "nimbus-react-project.zip", "application/zip");
      setStatus(`React ZIP downloaded. ${result.warnings.length ? result.warnings.join(" ") : "Unzip, run npm install, then npm run dev."}`);
    } catch (error) {
      setStatus(`Export failed: ${error instanceof Error ? error.message : "Unable to create ZIP"}`);
    }
  }
  return (
    <dialog
      ref={ref}
      className="studio-export-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="export-title"
    >
      <div className="studio-dialog-head">
        <span className="studio-selection-icon">
          <Icon name="code" size={22} />
        </span>
        <div>
          <h2 id="export-title">Your design. Ready to build.</h2>
          <p>Export the same markup and styles used on your canvas.</p>
        </div>
        <button
          className="studio-icon-btn"
          onClick={onClose}
          aria-label="Close export"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="studio-export-options">
        {(["react", "html", "json"] as const).map((f) => (
          <button
            key={f}
            aria-pressed={f === format}
            onClick={() => {
              setFormat(f);
              setStatus("");
            }}
          >
            {f === "react"
              ? "React component"
              : f === "html"
                ? "Standalone HTML"
                : "Nimbus project"}
          </button>
        ))}
      </div>
      {(project || selected) && (
        <div
          className="studio-export-options"
          role="group"
          aria-label="Export scope"
        >
          {project && <button aria-pressed={scope === "app"} onClick={() => { setScope("app"); setStatus(""); }}>
            Whole app
          </button>}
          <button
            aria-pressed={scope === "page"}
            onClick={() => { setScope("page"); setStatus(""); }}
          >
            Whole page
          </button>
          {selected && <button
            aria-pressed={scope === "widget"}
            onClick={() => { setScope("widget"); setStatus(""); }}
          >
            Selected widget only
          </button>}
        </div>
      )}
      <p className="studio-export-help">
        {format === "react"
          ? "Save as NimbusApp.tsx. This component uses @nimbus-ui/runtime from the React ZIP: copy packages/runtime into your app and run npm install ./packages/runtime. The ZIP includes the full shared renderer, validation, styles, licenses, and a runnable Vite app."
          : format === "html"
            ? "Save as index.html and open in a browser. Included page links navigate with a fixed script. Uploaded images stay embedded; external image URLs require network access. Native controls are interactive; business data is sample content."
            : "Reopen this editable project through Import project. Includes all widget styles, positions, content and uploaded images."}
      </p>
      {scoped.warnings.length > 0 && <ul className="studio-export-help" aria-label="Export notices">
        {scoped.warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>}
      <p className="studio-export-help">React ZIP: unzip, run <code>npm install</code>, then <code>npm run dev</code>. Build with <code>npm run build</code>. Uploaded raster files are included in public/assets; external URLs require network access, so offline availability is not guaranteed.</p>
      <textarea
        ref={text}
        readOnly
        aria-label="Generated code"
        value={code}
        spellCheck={false}
      />
      <div className="studio-export-note">
        <Icon name="check" />
        Matching desktop geometry · Responsive stacking · Reduced-motion support
      </div>
      <div className="studio-dialog-footer">
        <span role="status">
          {status ||
            `${scoped.project.pages.length} pages · ${scoped.project.pages.reduce((total, page) => total + page.document.widgets.filter((w) => !w.hidden).length, 0)} visible widgets · ${Math.round(new Blob([code]).size / 1024)} KB`}
        </span>
        <button className="studio-secondary" onClick={downloadZip}>
          <Icon name="download" /> Download React ZIP
        </button>
        <button
          className="studio-secondary"
          onClick={() =>
            download(
              code,
              format === "react"
                ? "NimbusApp.tsx"
                : format === "html"
                  ? "index.html"
                  : "nimbus-project.json",
              format === "html" ? "text/html" : "text/plain",
            )
          }
        >
          <Icon name="download" />
          Download
        </button>
        <button className="studio-primary" onClick={() => void copy()}>
          <Icon name="copy" />
          Copy {format === "json" ? "project" : "code"}
        </button>
      </div>
    </dialog>
  );
}
function documentGlobal() {
  return window.document;
}
