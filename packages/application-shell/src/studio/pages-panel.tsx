import { useEffect, useRef } from "react";
import type { StudioProject } from "./project";
import { Icon } from "./icons";

export function PagesPanel({
  project,
  currentPageId,
  onSelect,
  onChange,
  onAdd,
  onDuplicate,
  onDelete,
  onClose,
}: {
  project: StudioProject;
  currentPageId: string;
  onSelect: (id: string) => void;
  onChange: (project: StudioProject) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const focus = document.activeElement as HTMLElement | null;
    const modal = ref.current;
    modal?.showModal();
    return () => { modal?.close(); focus?.focus(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className="studio-pages-dialog"
      aria-labelledby="pages-title"
      onCancel={onClose}
    >
      <header>
        <div>
          <span className="studio-eyebrow">PROJECT STRUCTURE</span>
          <h2 id="pages-title">Pages & navigation</h2>
        </div>
        <button
          className="studio-icon-btn"
          aria-label="Close pages"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <label className="studio-project-name">
        App name
        <input
          value={project.name}
          maxLength={120}
          onChange={(e) => {
            if (e.target.value.trim())
              onChange({ ...project, name: e.target.value });
          }}
        />
      </label>
      <p>
        Each page is an editable canvas. Set click targets in a widget’s Content
        properties to connect your prototype.
      </p>
      <div className="studio-pages-list">
        {project.pages.map((page, index) => (
          <div
            className="studio-page-row"
            key={page.id}
            data-active={page.id === currentPageId}
          >
            <span className="studio-page-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <label>
              <span className="studio-sr-only">Page {index + 1} name</span>
              <input
                value={page.document.name}
                maxLength={120}
                onChange={(e) =>
                  onChange({
                    ...project,
                    pages: project.pages.map((p) =>
                      p.id === page.id
                        ? {
                            ...p,
                            document: { ...p.document, name: e.target.value },
                          }
                        : p,
                    ),
                  })
                }
              />
              <small>
                {page.document.widgets.length} widgets · {page.document.width} ×{" "}
                {page.document.height}
              </small>
            </label>
            <div className="studio-page-row-actions">
              <button
                className="studio-plain-button"
                title="Make prototype start page"
                aria-label={`Set ${page.document.name} as start page`}
                aria-pressed={project.startPageId === page.id}
                onClick={() => onChange({ ...project, startPageId: page.id })}
              >
                {project.startPageId === page.id ? "Start page" : "Set start"}
              </button>
              <button
                className="studio-icon-btn"
                title="Duplicate page"
                aria-label={`Duplicate ${page.document.name}`}
                disabled={project.pages.length >= 50}
                onClick={() => onDuplicate(page.id)}
              >
                <Icon name="copy" />
              </button>
              <button
                className="studio-icon-btn"
                title="Delete page (undo restores it)"
                aria-label={`Delete ${page.document.name}`}
                disabled={project.pages.length === 1}
                onClick={() => onDelete(page.id)}
              >
                <Icon name="trash" />
              </button>
              <button
                className="studio-secondary"
                onClick={() => {
                  onSelect(page.id);
                  onClose();
                }}
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
      <footer>
        <span>{project.pages.length} / 50 pages · saved in this browser</span>
        <button
          className="studio-primary"
          disabled={project.pages.length >= 50}
          onClick={() => {
            onAdd();
            onClose();
          }}
        >
          <Icon name="plus" />
          Add blank page
        </button>
      </footer>
    </dialog>
  );
}
