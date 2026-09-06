import { useEffect, useId, useMemo, useRef, useState } from "react";
import { renderPage, WIDGET_CSS } from "./render";
import { createTemplate, templateCatalog } from "./templates";
import type { TemplateId } from "./templates";

function TemplatePreview({ id }: { id: TemplateId }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const srcDoc = useMemo(() => {
    const page = createTemplate(id);
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'"><style>${WIDGET_CSS}\nhtml,body{margin:0;overflow:hidden}*,*::before,*::after{animation:none!important;transition:none!important}</style></head><body>${renderPage(page)}</body></html>`;
  }, [id]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="studio-template-preview" ref={ref} aria-hidden="true" inert>
      <iframe
        title={`${id} page miniature`}
        srcDoc={srcDoc}
        sandbox=""
        loading="lazy"
        tabIndex={-1}
        style={{
          width: 1200,
          height: 1000,
          transform: `scale(${width / 1200})`,
        }}
      />
    </div>
  );
}

/** Mount to open. Selection calls onSelect, then onClose; Escape/close only call onClose. */
export function TemplateGallery({
  onSelect,
  onClose,
}: {
  onSelect: (id: TemplateId) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [query, setQuery] = useState("");
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = templateCatalog.filter((template) => {
    const text =
      `${template.name} ${template.description} ${template.category}`.toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    searchRef.current?.focus();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  function select(id: TemplateId) {
    onSelect(id);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="studio-template-gallery"
      aria-labelledby={`${labelId}-title`}
      aria-describedby={`${labelId}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const controls = dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)",
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        // A click on blank space inside the dialog must not dismiss it.
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <header className="studio-template-header">
        <div>
          <span className="studio-template-eyebrow">
            THE PAGE COLLECTION / 17 STARTING POINTS
          </span>
          <h2 id={`${labelId}-title`}>Start with a little momentum.</h2>
          <p id={`${labelId}-description`}>
            Complete, editable pages for your next idea. Sample data included.
          </p>
        </div>
        <button
          type="button"
          className="studio-template-close"
          aria-label="Close template gallery"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="studio-template-toolbar">
        <label className="studio-template-search">
          <span>Find a template</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Try sales, team, or operations…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="studio-template-blank"
          onClick={() => select("blank")}
        >
          <span aria-hidden="true">＋</span> Start with a blank page
        </button>
      </div>

      <div
        className="studio-template-results"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {filtered.length} of {templateCatalog.length} page templates
        <span>All 75 style presets remain available in the editor.</span>
      </div>
      <div className="studio-template-grid">
        {filtered.map((template) => (
          <article className="studio-template-card" key={template.id}>
            <TemplatePreview id={template.id} />
            <div className="studio-template-card-copy">
              <span className="studio-template-category">
                {template.category}
              </span>
              <h3>
                <button
                  type="button"
                  onClick={() => select(template.id)}
                  aria-describedby={`${labelId}-${template.id}`}
                >
                  {template.name}
                  <span aria-hidden="true">↗</span>
                </button>
              </h3>
              <p id={`${labelId}-${template.id}`}>{template.description}</p>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="studio-template-empty">
          <h3>No matching pages yet.</h3>
          <p>Try a broader term, or begin with a blank page.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              searchRef.current?.focus();
            }}
          >
            Clear search
          </button>
        </div>
      )}
    </dialog>
  );
}
