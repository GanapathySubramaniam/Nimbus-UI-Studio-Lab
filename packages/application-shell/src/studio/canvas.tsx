import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { renderWidget, widgetFrameStyle, WIDGET_CSS, backgroundProperties } from "./render";
import { exportHtml } from "./export";
import { constrainWidget } from "./model";
import { Icon } from "./icons";
import type { StudioDocument, Widget, WidgetKind } from "./types";

interface Gesture {
  id: string;
  pointerId: number;
  target: HTMLDivElement;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  initial: Widget;
  latest: Widget;
  document: StudioDocument;
  scale: number;
  snap: boolean;
}

const sameGeometry = (a: Widget, b: Widget) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
export function Canvas({
  document,
  selectedId,
  onSelect,
  onUpdate,
  onAdd,
  preview,
  device,
  zoom,
  snap,
  showGrid,
  replayKey,
  onZoomChange,
}: {
  document: StudioDocument;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Widget>) => void;
  onAdd: (kind: WidgetKind, x: number, y: number) => void;
  preview: boolean;
  device: number;
  zoom: number;
  snap: boolean;
  showGrid: boolean;
  replayKey: number;
  onZoomChange: (scale: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    page = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<Widget | null>(null);
  const [available, setAvailable] = useState(900);
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const first = entries[0];
      if (first) setAvailable(first.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const pageWidth = device || document.width;
  const scale =
    zoom || Math.min(1, Math.max(0.15, (available - 80) / pageWidth));
  useEffect(() => onZoomChange(scale), [scale, onZoomChange]);
  const clearGesture = useCallback(() => {
    const g = gesture.current;
    // Clear first: releasing capture can synchronously dispatch a lost event.
    gesture.current = null;
    setDraft(null);
    if (g?.target.hasPointerCapture(g.pointerId))
      g.target.releasePointerCapture(g.pointerId);
    return g;
  }, []);
  useLayoutEffect(() => {
    const g = gesture.current;
    if (
      g &&
      (g.document !== document ||
        selectedId !== g.id ||
        preview ||
        device > 0 ||
        g.scale !== scale ||
        g.snap !== snap)
    )
      clearGesture();
  }, [document, selectedId, preview, device, scale, snap, clearGesture]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearGesture();
    };
    const cancel = () => {
      clearGesture();
    };
    // Capture phase runs before the editor deselects/unmounts a resize handle.
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", cancel);
      clearGesture();
    };
  }, [clearGesture]);
  function start(
    e: PointerEvent<HTMLDivElement>,
    widget: Widget,
    mode: "move" | "resize",
  ) {
    if (
      preview ||
      device > 0 ||
      e.button !== 0 ||
      !e.isPrimary ||
      gesture.current
    )
      return;
    e.stopPropagation();
    onSelect(widget.id);
    const target = page.current;
    if (widget.locked || !target) return;
    e.preventDefault();
    target.setPointerCapture(e.pointerId);
    gesture.current = {
      id: widget.id,
      pointerId: e.pointerId,
      target,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initial: widget,
      latest: widget,
      document,
      scale,
      snap,
    };
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    if ((e.buttons & 1) === 0) {
      clearGesture();
      return;
    }
    const dx = (e.clientX - g.startX) / scale,
      dy = (e.clientY - g.startY) / scale;
    const box =
      g.mode === "move"
        ? { ...g.initial, x: g.initial.x + dx, y: g.initial.y + dy }
        : {
            ...g.initial,
            width: g.initial.width + dx,
            height: g.initial.height + dy,
          };
    const next = {
      ...g.initial,
      ...constrainWidget(
        box,
        document.width,
        document.height,
        snap ? document.grid : 1,
      ),
    };
    g.latest = next;
    setDraft(next);
  }
  function finish(e: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    clearGesture();
    if (!cancel && !sameGeometry(g.initial, g.latest))
      onUpdate(g.id, {
        x: g.latest.x,
        y: g.latest.y,
        width: g.latest.width,
        height: g.latest.height,
      });
  }
  const selectedWidget = document.widgets.find(
    (w) => w.id === selectedId && !w.hidden,
  );
  const selection =
    selectedWidget &&
    (draft?.id === selectedWidget.id ? draft : selectedWidget);
  return (
    <div
      className={`studio-canvas-host ${preview ? "is-preview" : ""}`}
      ref={host}
    >
      <div className="studio-canvas-label">
        <span>
          <Icon name="monitor" size={13} />
          {document.name}
          <span className="studio-muted">
            / {preview ? "Preview" : "Canvas"}
          </span>
        </span>
        <span>
          {pageWidth} × {document.height}
        </span>
      </div>
      <div
        className="studio-stage-scroll"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onSelect(null);
        }}
      >
        <div
          className="studio-page-space"
          style={{ width: pageWidth * scale, height: document.height * scale }}
        >
          {preview || device > 0 ? (
            <iframe
              key={`${device}-${replayKey}`}
              title="Live page preview"
              className="studio-preview-frame"
              sandbox="allow-forms"
              srcDoc={exportHtml(document)}
              style={{
                width: pageWidth,
                height: document.height,
                transform: `scale(${scale})`,
              }}
            />
          ) : (
            <div
              ref={page}
              role="region"
              aria-label="Page canvas"
              className={`studio-page ${showGrid ? "has-grid" : ""} ${dragOver ? "is-drag-over" : ""}`}
              style={
                {
                  width: document.width,
                  height: document.height,
                  backgroundColor: document.background,
                  ...backgroundProperties(document.backdrop),
                  transform: `scale(${scale})`,
                  "--canvas-grid": `${document.grid}px`,
                } as React.CSSProperties
              }
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) onSelect(null);
              }}
              onPointerMove={move}
              onPointerUp={(e) => finish(e)}
              onPointerCancel={(e) => finish(e, true)}
              onLostPointerCapture={(e) => finish(e, true)}
              onDragOver={(e) => {
                if (
                  e.dataTransfer.types.includes("application/nimbus-widget")
                ) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  setDragOver(true);
                }
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const kind = e.dataTransfer.getData(
                  "application/nimbus-widget",
                ) as WidgetKind;
                const rect = page.current?.getBoundingClientRect();
                if (kind && rect)
                  onAdd(
                    kind,
                    (e.clientX - rect.left) / scale,
                    (e.clientY - rect.top) / scale,
                  );
              }}
            >
              <style>{WIDGET_CSS}</style>
              {document.widgets
                .filter((w) => !w.hidden)
                .map((widget) => {
                  const w = draft?.id === widget.id ? draft : widget;
                  const selected = selectedId === w.id;
                  return (
                    <div
                      key={w.id}
                      className={`studio-canvas-widget ${selected ? "is-selected" : ""} ${w.locked ? "is-locked" : ""}`}
                      data-widget-id={w.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${w.name} widget${w.locked ? ", locked" : ""}. Select to edit; arrow keys move; shift and arrows move 10 pixels.`}
                      aria-pressed={selected}
                      style={{
                        left: w.x,
                        top: w.y,
                        width: w.width,
                        height: w.height,
                      }}
                      onFocus={() => onSelect(w.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(w.id);
                      }}
                      onPointerDown={(e) => start(e, w, "move")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(w.id);
                        }
                        if (w.locked) return;
                        const delta = e.shiftKey ? 10 : 1;
                        const offsets: Record<string, [number, number]> = {
                          ArrowLeft: [-delta, 0],
                          ArrowRight: [delta, 0],
                          ArrowUp: [0, -delta],
                          ArrowDown: [0, delta],
                        };
                        const offset = offsets[e.key];
                        if (offset) {
                          e.preventDefault();
                          e.stopPropagation();
                          onUpdate(
                            w.id,
                            constrainWidget(
                              { ...w, x: w.x + offset[0], y: w.y + offset[1] },
                              document.width,
                              document.height,
                            ),
                          );
                        }
                      }}
                    >
                      <div
                        key={replayKey}
                        className="studio-widget-render"
                        aria-hidden="true"
                        inert
                        dangerouslySetInnerHTML={{
                          __html: `<div class="nw-node" style="${widgetFrameStyle({ ...w, x: 0, y: 0 })}">${renderWidget(w)}</div>`,
                        }}
                      />
                    </div>
                  );
                })}
              {!document.widgets.length && (
                <div className="studio-blank-page">
                  <span>
                    <Icon name="plus" size={32} />
                  </span>
                  <h2>Your next interface starts here</h2>
                  <p>
                    Drag a component onto the page, or choose a starter layout.
                  </p>
                </div>
              )}
              {selection && (
                <div
                  className="studio-selection-overlay"
                  style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: selection.height,
                  }}
                >
                  <span
                    className="studio-widget-tag"
                    style={{ fontSize: 11 / scale }}
                  >
                    {selection.name}
                    {selection.locked ? " · Locked" : ""}
                  </span>
                  {!selection.locked && (
                    <>
                      <i className="studio-selection-corner tl" />
                      <i className="studio-selection-corner tr" />
                      <i className="studio-selection-corner bl" />
                      <div
                        className="studio-resize-handle"
                        title="Drag to resize; dimensions can also be edited in Layout"
                        role="button"
                        tabIndex={0}
                        aria-label={`Resize ${selection.name}`}
                        onPointerDown={(e) => start(e, selection, "resize")}
                        onKeyDown={(e) => {
                          const delta = e.shiftKey ? 10 : 1;
                          let width = selection.width,
                            height = selection.height;
                          if (e.key === "ArrowRight") width += delta;
                          else if (e.key === "ArrowLeft") width -= delta;
                          else if (e.key === "ArrowDown") height += delta;
                          else if (e.key === "ArrowUp") height -= delta;
                          else return;
                          e.preventDefault();
                          e.stopPropagation();
                          onUpdate(
                            selection.id,
                            constrainWidget(
                              { ...selection, width, height },
                              document.width,
                              document.height,
                            ),
                          );
                        }}
                      />
                    </>
                  )}
                  <span
                    className="studio-widget-dimensions"
                    style={{ fontSize: 10 / scale }}
                  >
                    {Math.round(selection.width)} ×{" "}
                    {Math.round(selection.height)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
