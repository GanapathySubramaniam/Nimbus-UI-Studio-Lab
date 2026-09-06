import { useEffect, useRef, useState } from "react";
import type { StudioProject } from "./project";
import { exportProjectHtml } from "./export";
import { Icon } from "./icons";

export function PrototypePreview({
  project,
  initialPageId,
  onClose,
}: {
  project: StudioProject;
  initialPageId: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    frame = useRef<HTMLIFrameElement>(null),
    shell = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose),
    projectRef = useRef(project);
  closeRef.current = onClose;
  projectRef.current = project;
  const [openedPage, setOpenedPage] = useState(initialPageId),
    [currentPage, setCurrentPage] = useState(initialPageId);
  const [width, setWidth] = useState(0),
    [replay, setReplay] = useState(0),
    [message, setMessage] = useState("");
  useEffect(() => {
    const focus = document.activeElement as HTMLElement | null;
    const fullscreenTarget = shell.current;
    const modal = dialog.current;
    modal?.showModal();
    const handle = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      if (event.data.type === "nimbus:close-preview") closeRef.current();
      if (
        event.data.type === "nimbus:page" &&
        projectRef.current.pages.some((p) => p.id === event.data.pageId)
      )
        setCurrentPage(event.data.pageId);
    };
    window.addEventListener("message", handle);
    return () => {
      window.removeEventListener("message", handle);
      if (document.fullscreenElement === fullscreenTarget)
        void document.exitFullscreen().catch(() => {});
      modal?.close();
      focus?.focus();
    };
  }, []);
  function navigate(id: string) {
    setOpenedPage(id);
    setCurrentPage(id);
    setReplay((v) => v + 1);
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch {
      setMessage(
        "Browser fullscreen is unavailable here. The preview still fills the app window.",
      );
    }
  }
  return (
    <dialog
      className="studio-prototype"
      ref={dialog}
      aria-labelledby="prototype-title"
      onCancel={onClose}
    >
      <div className="studio-prototype-shell" ref={shell}>
        <header className="studio-prototype-toolbar">
          <div>
            <strong id="prototype-title" title={project.name}>{project.name}</strong>
            <span>Interactive prototype</span>
          </div>
          <label>
            <span className="studio-sr-only">Preview page</span>
            <select
              aria-label="Preview page"
              value={currentPage}
              onChange={(e) => navigate(e.target.value)}
            >
              {project.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.document.name}
                </option>
              ))}
            </select>
          </label>
          <div
            className="studio-prototype-devices"
            role="group"
            aria-label="Preview device"
          >
            {[
              { width: 0, label: "Full width", icon: "monitor" },
              { width: 768, label: "Tablet", icon: "tablet" },
              { width: 390, label: "Mobile", icon: "phone" },
            ].map((d) => (
              <button
                key={d.width}
                className="studio-icon-btn"
                aria-label={d.label}
                aria-pressed={width === d.width}
                onClick={() => setWidth(d.width)}
              >
                <Icon name={d.icon} />
              </button>
            ))}
          </div>
          <button
            className="studio-plain-button"
            onClick={() => navigate(project.startPageId)}
          >
            Restart
          </button>
          <button
            className="studio-secondary"
            onClick={() => void fullscreen()}
          >
            Fullscreen
          </button>
          <button className="studio-primary" onClick={onClose}>
            <Icon name="close" />
            Back to editor
          </button>
        </header>
        {message && (
          <p className="studio-preview-message" role="status">
            {message}
          </p>
        )}
        <div className="studio-prototype-stage">
          <iframe
            ref={frame}
            key={replay}
            title="Full-screen interactive prototype"
            sandbox="allow-scripts"
            srcDoc={exportProjectHtml(project, openedPage)}
            style={{ width: width || "100%" }}
          />
        </div>
      </div>
    </dialog>
  );
}
