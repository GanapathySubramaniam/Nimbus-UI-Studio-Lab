"use client";

import { useMemo, useRef, useState } from "react";
import type {
  DragEvent,
  KeyboardEvent,
  PointerEvent,
} from "react";

type Variant = "solid" | "outline" | "ghost";
type Tone = "accent" | "violet" | "amber" | "neutral";
type CanvasBackground = "grid" | "aurora" | "paper" | "void";

type WidgetType =
  | "heading"
  | "stat-tile"
  | "button"
  | "agent-card"
  | "prompt-field"
  | "nav-pill"
  | "badge"
  | "avatar-group"
  | "data-row"
  | "toggle";

interface WidgetProps {
  readonly label: string;
  readonly helper: string;
  readonly value: string;
  readonly variant: Variant;
  readonly tone: Tone;
}

interface CanvasNode {
  readonly id: string;
  readonly type: WidgetType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly z: number;
  readonly props: WidgetProps;
}

interface PaletteItem {
  readonly type: WidgetType;
  readonly name: string;
  readonly glyph: string;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly defaultProps: WidgetProps;
}

interface DragState {
  readonly id: string;
  readonly mode: "move" | "resize";
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startX: number;
  readonly startY: number;
  readonly startWidth: number;
  readonly startHeight: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

const CANVAS_WIDTH = 1120;
const CANVAS_HEIGHT = 620;
const GRID_SIZE = 8;
const MIN_WIDTH = 96;
const MIN_HEIGHT = 44;
const NUDGE = 1;
const NUDGE_LARGE = 8;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.4;

const paletteItems: readonly PaletteItem[] = [
  {
    type: "heading",
    name: "Section heading",
    glyph: "▬",
    defaultWidth: 340,
    defaultHeight: 64,
    defaultProps: {
      label: "Portfolio overview",
      helper: "Live · updated 2m ago",
      value: "",
      variant: "ghost",
      tone: "neutral",
    },
  },
  {
    type: "stat-tile",
    name: "Stat tile",
    glyph: "▣",
    defaultWidth: 220,
    defaultHeight: 120,
    defaultProps: {
      label: "Active agents",
      helper: "↗ 12% vs last week",
      value: "24",
      variant: "solid",
      tone: "accent",
    },
  },
  {
    type: "button",
    name: "Action button",
    glyph: "▸",
    defaultWidth: 190,
    defaultHeight: 52,
    defaultProps: {
      label: "Launch agent run",
      helper: "",
      value: "",
      variant: "solid",
      tone: "accent",
    },
  },
  {
    type: "agent-card",
    name: "Agent card",
    glyph: "◎",
    defaultWidth: 300,
    defaultHeight: 108,
    defaultProps: {
      label: "Research agent",
      helper: "Ready · 12 tools connected",
      value: "",
      variant: "solid",
      tone: "violet",
    },
  },
  {
    type: "prompt-field",
    name: "Prompt field",
    glyph: "⌁",
    defaultWidth: 340,
    defaultHeight: 96,
    defaultProps: {
      label: "Prompt instruction",
      helper: "⌘ Enter to run",
      value: "Summarize this run",
      variant: "solid",
      tone: "accent",
    },
  },
  {
    type: "nav-pill",
    name: "Nav pill",
    glyph: "⌘",
    defaultWidth: 150,
    defaultHeight: 44,
    defaultProps: {
      label: "Overview",
      helper: "",
      value: "",
      variant: "solid",
      tone: "accent",
    },
  },
  {
    type: "badge",
    name: "Status badge",
    glyph: "●",
    defaultWidth: 130,
    defaultHeight: 34,
    defaultProps: {
      label: "Operational",
      helper: "",
      value: "",
      variant: "solid",
      tone: "accent",
    },
  },
  {
    type: "avatar-group",
    name: "Avatar group",
    glyph: "◐",
    defaultWidth: 150,
    defaultHeight: 56,
    defaultProps: {
      label: "Reviewers",
      helper: "",
      value: "3",
      variant: "solid",
      tone: "neutral",
    },
  },
  {
    type: "data-row",
    name: "Data row",
    glyph: "▦",
    defaultWidth: 360,
    defaultHeight: 48,
    defaultProps: {
      label: "Customer feedback synthesis",
      helper: "Complete",
      value: "$2.17",
      variant: "ghost",
      tone: "accent",
    },
  },
  {
    type: "toggle",
    name: "Toggle control",
    glyph: "⇄",
    defaultWidth: 210,
    defaultHeight: 44,
    defaultProps: {
      label: "Interface motion",
      helper: "",
      value: "",
      variant: "solid",
      tone: "accent",
    },
  },
];

let idSeed = 0;
function createId(prefix: string): string {
  idSeed += 1;
  return `${prefix}-${idSeed}-${Math.random().toString(36).slice(2, 7)}`;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function roundToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function findPaletteItem(type: WidgetType): PaletteItem | undefined {
  return paletteItems.find((entry) => entry.type === type);
}

function paletteName(type: WidgetType): string {
  const item = findPaletteItem(type);
  return item ? item.name : type;
}

function toComponentName(type: WidgetType): string {
  switch (type) {
    case "heading":
      return "Heading";
    case "stat-tile":
      return "StatTile";
    case "button":
      return "Button";
    case "agent-card":
      return "AgentCard";
    case "prompt-field":
      return "PromptField";
    case "nav-pill":
      return "NavPill";
    case "badge":
      return "Badge";
    case "avatar-group":
      return "AvatarGroup";
    case "data-row":
      return "DataRow";
    case "toggle":
      return "Toggle";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function generateCode(nodes: readonly CanvasNode[]): string {
  if (nodes.length === 0) {
    return "// Drag a component from the library onto the canvas to generate code.";
  }
  const ordered = [...nodes].sort((a, b) => a.z - b.z);
  const lines = ordered.map((node) => {
    const attrs = [`variant="${node.props.variant}"`, `tone="${node.props.tone}"`];
    if (node.props.label) attrs.push(`label={${JSON.stringify(node.props.label)}}`);
    if (node.props.helper) attrs.push(`helper={${JSON.stringify(node.props.helper)}}`);
    if (node.props.value) attrs.push(`value={${JSON.stringify(node.props.value)}}`);
    attrs.push(
      `style={{ position: "absolute", left: ${Math.round(node.x)}, top: ${Math.round(node.y)}, width: ${Math.round(node.width)}, height: ${Math.round(node.height)} }}`,
    );
    return `      <${toComponentName(node.type)} ${attrs.join(" ")} />`;
  });
  return ["<div className=\"dashboard-canvas\">", ...lines, "</div>"].join("\n");
}

function WidgetVisual({ node }: { readonly node: CanvasNode }) {
  const { type, props } = node;
  switch (type) {
    case "heading":
      return (
        <div className={`nimbus-widget nimbus-widget-heading tone-${props.tone}`}>
          <h3>{props.label || "Section heading"}</h3>
          {props.helper ? <p>{props.helper}</p> : null}
        </div>
      );
    case "stat-tile":
      return (
        <div className={`nimbus-widget nimbus-widget-stat is-${props.variant} tone-${props.tone}`}>
          <span className="nimbus-widget-label">{props.label || "Metric"}</span>
          <strong>{props.value || "0"}</strong>
          {props.helper ? <small>{props.helper}</small> : null}
        </div>
      );
    case "button":
      return (
        <div className={`nimbus-widget nimbus-widget-button is-${props.variant} tone-${props.tone}`}>
          <span>{props.label || "Button"}</span>
          <i aria-hidden="true">↗</i>
        </div>
      );
    case "agent-card":
      return (
        <div className={`nimbus-widget nimbus-widget-agent is-${props.variant} tone-${props.tone}`}>
          <span className="nimbus-widget-avatar">{(props.label || "A").charAt(0).toUpperCase()}</span>
          <div>
            <b>{props.label || "Agent"}</b>
            <small>{props.helper || "Ready"}</small>
          </div>
          <i className="nimbus-widget-dot" aria-hidden="true" />
        </div>
      );
    case "prompt-field":
      return (
        <div className={`nimbus-widget nimbus-widget-prompt is-${props.variant} tone-${props.tone}`}>
          <span>{props.label || "Prompt"}</span>
          <div>
            <em>{props.value || "Ask anything…"}</em>
            <i aria-hidden="true">↑</i>
          </div>
          {props.helper ? <small>{props.helper}</small> : null}
        </div>
      );
    case "nav-pill":
      return (
        <div className={`nimbus-widget nimbus-widget-nav is-${props.variant} tone-${props.tone}`}>
          {props.label || "Nav"}
        </div>
      );
    case "badge":
      return (
        <div className={`nimbus-widget nimbus-widget-badge is-${props.variant} tone-${props.tone}`}>
          <i aria-hidden="true" />
          {props.label || "Status"}
        </div>
      );
    case "avatar-group":
      return (
        <div className={`nimbus-widget nimbus-widget-avatars tone-${props.tone}`}>
          <span>A</span>
          <span>B</span>
          <span>C</span>
          {props.value ? <em>+{props.value}</em> : null}
        </div>
      );
    case "data-row":
      return (
        <div className={`nimbus-widget nimbus-widget-row is-${props.variant} tone-${props.tone}`}>
          <b>{props.label || "Row label"}</b>
          <span>{props.helper || "State"}</span>
          <strong>{props.value || "$0.00"}</strong>
        </div>
      );
    case "toggle":
      return (
        <div className={`nimbus-widget nimbus-widget-toggle tone-${props.tone}`}>
          <span>{props.label || "Toggle"}</span>
          <i className={props.variant === "solid" ? "is-on" : ""} aria-hidden="true" />
        </div>
      );
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function CanvasStudio() {
  const [nodes, setNodes] = useState<readonly CanvasNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [background, setBackground] = useState<CanvasBackground>("grid");
  const [snap, setSnap] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const nextZRef = useRef(0);
  const cascadeRef = useRef(0);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;
  const code = useMemo(() => generateCode(nodes), [nodes]);

  function selectNode(id: string) {
    setSelectedId(id);
  }

  function cascadeOffset(): number {
    cascadeRef.current = (cascadeRef.current + 1) % 6;
    return cascadeRef.current * 18 - 45;
  }

  function addNode(type: WidgetType, dropX: number, dropY: number) {
    const item = findPaletteItem(type);
    if (!item) return;
    const canvasEl = canvasRef.current;
    const canvasWidth = canvasEl ? canvasEl.getBoundingClientRect().width / zoom : CANVAS_WIDTH;
    const canvasHeight = canvasEl ? canvasEl.getBoundingClientRect().height / zoom : CANVAS_HEIGHT;
    const rawX = dropX - item.defaultWidth / 2;
    const rawY = dropY - item.defaultHeight / 2;
    const x = clamp(snap ? roundToGrid(rawX) : rawX, 0, Math.max(0, canvasWidth - item.defaultWidth));
    const y = clamp(snap ? roundToGrid(rawY) : rawY, 0, Math.max(0, canvasHeight - item.defaultHeight));
    nextZRef.current += 1;
    const node: CanvasNode = {
      id: createId(type),
      type,
      x,
      y,
      width: item.defaultWidth,
      height: item.defaultHeight,
      z: nextZRef.current,
      props: { ...item.defaultProps },
    };
    setNodes((current) => [...current, node]);
    setSelectedId(node.id);
  }

  function addNodeFromPalette(type: WidgetType) {
    addNode(type, CANVAS_WIDTH / 2 + cascadeOffset(), CANVAS_HEIGHT / 2 + cascadeOffset());
  }

  function removeNode(id: string) {
    setNodes((current) => current.filter((node) => node.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  function duplicateNode(id: string) {
    const source = nodes.find((node) => node.id === id);
    if (!source) return;
    nextZRef.current += 1;
    const clone: CanvasNode = {
      ...source,
      props: { ...source.props },
      id: createId(source.type),
      x: clamp(source.x + 16, 0, Math.max(0, CANVAS_WIDTH - source.width)),
      y: clamp(source.y + 16, 0, Math.max(0, CANVAS_HEIGHT - source.height)),
      z: nextZRef.current,
    };
    setNodes((current) => [...current, clone]);
    setSelectedId(clone.id);
  }

  function bringToFront(id: string) {
    nextZRef.current += 1;
    const z = nextZRef.current;
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, z } : node)));
  }

  function sendToBack(id: string) {
    const minZ = nodes.reduce((min, node) => Math.min(min, node.z), 0);
    const z = minZ - 1;
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, z } : node)));
  }

  function clearCanvas() {
    setNodes([]);
    setSelectedId(null);
  }

  function updateNodeProp<K extends keyof WidgetProps>(id: string, key: K, value: WidgetProps[K]) {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, props: { ...node.props, [key]: value } } : node)),
    );
  }

  function updateNodeGeometry(
    id: string,
    patch: Partial<Pick<CanvasNode, "x" | "y" | "width" | "height">>,
  ) {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== id) return node;
        const width = clamp(patch.width ?? node.width, MIN_WIDTH, CANVAS_WIDTH);
        const height = clamp(patch.height ?? node.height, MIN_HEIGHT, CANVAS_HEIGHT);
        const x = clamp(patch.x ?? node.x, 0, Math.max(0, CANVAS_WIDTH - width));
        const y = clamp(patch.y ?? node.y, 0, Math.max(0, CANVAS_HEIGHT - height));
        return { ...node, x, y, width, height };
      }),
    );
  }

  function moveNodeBy(id: string, dx: number, dy: number) {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== id) return node;
        const x = clamp(node.x + dx, 0, Math.max(0, CANVAS_WIDTH - node.width));
        const y = clamp(node.y + dy, 0, Math.max(0, CANVAS_HEIGHT - node.height));
        return { ...node, x, y };
      }),
    );
  }

  function resizeNodeBy(id: string, dw: number, dh: number) {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== id) return node;
        const width = clamp(node.width + dw, MIN_WIDTH, Math.max(MIN_WIDTH, CANVAS_WIDTH - node.x));
        const height = clamp(node.height + dh, MIN_HEIGHT, Math.max(MIN_HEIGHT, CANVAS_HEIGHT - node.y));
        return { ...node, width, height };
      }),
    );
  }

  function beginDrag(event: PointerEvent<HTMLElement>, id: string, mode: "move" | "resize") {
    event.stopPropagation();
    selectNode(id);
    const node = nodes.find((entry) => entry.id === id);
    const canvasEl = canvasRef.current;
    if (!node || !canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    dragStateRef.current = {
      id,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: node.x,
      startY: node.y,
      startWidth: node.width,
      startHeight: node.height,
      canvasWidth: rect.width / zoom,
      canvasHeight: rect.height / zoom,
    };
    setDraggingId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleNodePointerMove(event: PointerEvent<HTMLElement>) {
    const drag = dragStateRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const deltaX = (event.clientX - drag.startClientX) / zoom;
    const deltaY = (event.clientY - drag.startClientY) / zoom;
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== drag.id) return node;
        if (drag.mode === "move") {
          const rawX = drag.startX + deltaX;
          const rawY = drag.startY + deltaY;
          const x = clamp(snap ? roundToGrid(rawX) : rawX, 0, Math.max(0, drag.canvasWidth - node.width));
          const y = clamp(snap ? roundToGrid(rawY) : rawY, 0, Math.max(0, drag.canvasHeight - node.height));
          return { ...node, x, y };
        }
        const rawWidth = drag.startWidth + deltaX;
        const rawHeight = drag.startHeight + deltaY;
        const maxWidth = Math.max(MIN_WIDTH, drag.canvasWidth - node.x);
        const maxHeight = Math.max(MIN_HEIGHT, drag.canvasHeight - node.y);
        const width = clamp(snap ? roundToGrid(rawWidth) : rawWidth, MIN_WIDTH, maxWidth);
        const height = clamp(snap ? roundToGrid(rawHeight) : rawHeight, MIN_HEIGHT, maxHeight);
        return { ...node, width, height };
      }),
    );
  }

  function handleNodePointerUp() {
    dragStateRef.current = null;
    setDraggingId(null);
  }

  function handleNodeKeyDown(event: KeyboardEvent<HTMLDivElement>, id: string) {
    const step = event.shiftKey ? NUDGE_LARGE : NUDGE;
    const resizing = event.ctrlKey || event.metaKey;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        if (resizing) resizeNodeBy(id, 0, -step);
        else moveNodeBy(id, 0, -step);
        break;
      case "ArrowDown":
        event.preventDefault();
        if (resizing) resizeNodeBy(id, 0, step);
        else moveNodeBy(id, 0, step);
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (resizing) resizeNodeBy(id, -step, 0);
        else moveNodeBy(id, -step, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (resizing) resizeNodeBy(id, step, 0);
        else moveNodeBy(id, step, 0);
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        removeNode(id);
        break;
      case "Escape":
        setSelectedId(null);
        break;
      default:
        break;
    }
  }

  function handlePaletteDragStart(event: DragEvent<HTMLButtonElement>, type: WidgetType) {
    event.dataTransfer.setData("text/nimbus-widget-type", type);
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  }

  function handleCanvasDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setIsDragOver(false);
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const raw = event.dataTransfer.getData("text/nimbus-widget-type");
    const item = paletteItems.find((entry) => entry.type === raw);
    if (!item) return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    addNode(item.type, x, y);
  }

  function handleCanvasBackgroundPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setSelectedId(null);
  }

  function zoomBy(delta: number) {
    setZoom((current) => Math.round(clamp(current + delta, MIN_ZOOM, MAX_ZOOM) * 100) / 100);
  }

  async function copyGeneratedCode() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access unavailable");
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="nimbus-panel nimbus-studio-panel" aria-labelledby="canvas-studio-title">
      <div className="nimbus-panel-head">
        <div>
          <p className="nimbus-overline">Component library</p>
          <h2 id="canvas-studio-title">Canvas studio</h2>
        </div>
        <span className="nimbus-lab-status">
          <i /> DRAG · DROP · RESIZE
        </span>
      </div>

      <div className="nimbus-studio-toolbar">
        <div className="nimbus-studio-toolbar-group">
          <label className="nimbus-toolbar-select">
            Surface
            <select
              value={background}
              onChange={(event) => setBackground(event.target.value as CanvasBackground)}
            >
              <option value="grid">Graphite</option>
              <option value="aurora">Cool gray</option>
              <option value="paper">Studio paper</option>
              <option value="void">Deep void</option>
            </select>
          </label>
          <button
            aria-pressed={snap}
            className="nimbus-toggle-chip"
            onClick={() => setSnap((value) => !value)}
            type="button"
          >
            Snap to grid
          </button>
        </div>
        <div className="nimbus-studio-toolbar-group">
          <div className="nimbus-zoom-control">
            <button aria-label="Zoom out" onClick={() => zoomBy(-0.1)} type="button">
              −
            </button>
            <output>{Math.round(zoom * 100)}%</output>
            <button aria-label="Zoom in" onClick={() => zoomBy(0.1)} type="button">
              +
            </button>
          </div>
          <span className="nimbus-studio-count">
            {nodes.length} widget{nodes.length === 1 ? "" : "s"} placed
          </span>
          <button
            className="nimbus-link-button"
            disabled={nodes.length === 0}
            onClick={clearCanvas}
            type="button"
          >
            Clear canvas
          </button>
        </div>
      </div>

      <div className="nimbus-studio-grid">
        <aside className="nimbus-studio-palette" aria-label="Component library">
          <p className="nimbus-overline">Drag onto canvas</p>
          {paletteItems.map((item) => (
            <button
              className="nimbus-palette-item"
              draggable
              key={item.type}
              onClick={() => addNodeFromPalette(item.type)}
              onDragStart={(event) => handlePaletteDragStart(event, item.type)}
              type="button"
            >
              <span aria-hidden="true">{item.glyph}</span>
              {item.name}
            </button>
          ))}
        </aside>

        <div className="nimbus-studio-canvas-scroll">
          <div className="nimbus-studio-canvas-wrap" style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom }}>
            <div
              className={`nimbus-studio-canvas is-${background}${isDragOver ? " is-drag-over" : ""}`}
              onDragLeave={handleCanvasDragLeave}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              onPointerDown={handleCanvasBackgroundPointerDown}
              ref={canvasRef}
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              {nodes.length === 0 ? (
                <p className="nimbus-studio-empty">
                  Drag a component from the library, or press Enter on a library item to place it here.
                </p>
              ) : null}
              {nodes.map((node) => (
                <div
                  aria-label={`${paletteName(node.type)} widget${node.props.label ? `: ${node.props.label}` : ""}. Use arrow keys to move, hold Control and arrow keys to resize, Delete to remove.`}
                  aria-pressed={selectedId === node.id}
                  className={`nimbus-node${selectedId === node.id ? " is-selected" : ""}${draggingId === node.id ? " is-dragging" : ""}`}
                  key={node.id}
                  onFocus={() => selectNode(node.id)}
                  onKeyDown={(event) => handleNodeKeyDown(event, node.id)}
                  onPointerCancel={handleNodePointerUp}
                  onPointerDown={(event) => beginDrag(event, node.id, "move")}
                  onPointerMove={handleNodePointerMove}
                  onPointerUp={handleNodePointerUp}
                  role="button"
                  style={{ left: node.x, top: node.y, width: node.width, height: node.height, zIndex: node.z }}
                  tabIndex={0}
                >
                  <WidgetVisual node={node} />
                  <span
                    aria-hidden="true"
                    className="nimbus-node-handle"
                    onPointerCancel={handleNodePointerUp}
                    onPointerDown={(event) => beginDrag(event, node.id, "resize")}
                    onPointerMove={handleNodePointerMove}
                    onPointerUp={handleNodePointerUp}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="nimbus-panel nimbus-studio-inspector" aria-label="Widget inspector">
          <div className="nimbus-panel-head">
            <div>
              <p className="nimbus-overline">Inspector</p>
              <h2>{selectedNode ? paletteName(selectedNode.type) : "No selection"}</h2>
            </div>
          </div>
          {selectedNode ? (
            <div className="nimbus-inspector-body">
              <label className="nimbus-edit-label">
                Primary text
                <input
                  maxLength={48}
                  onChange={(event) => updateNodeProp(selectedNode.id, "label", event.target.value)}
                  value={selectedNode.props.label}
                />
              </label>
              <label className="nimbus-edit-label">
                Secondary text
                <input
                  maxLength={48}
                  onChange={(event) => updateNodeProp(selectedNode.id, "helper", event.target.value)}
                  value={selectedNode.props.helper}
                />
              </label>
              <label className="nimbus-edit-label">
                Value
                <input
                  maxLength={16}
                  onChange={(event) => updateNodeProp(selectedNode.id, "value", event.target.value)}
                  value={selectedNode.props.value}
                />
              </label>
              <fieldset>
                <legend>Variant</legend>
                <div className="nimbus-segmented">
                  {(["solid", "outline", "ghost"] as const).map((variant) => (
                    <button
                      aria-pressed={selectedNode.props.variant === variant}
                      key={variant}
                      onClick={() => updateNodeProp(selectedNode.id, "variant", variant)}
                      type="button"
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="nimbus-control">
                <div>
                  <label>Tone</label>
                </div>
                <div className="nimbus-swatches">
                  {(["accent", "violet", "amber", "neutral"] as const).map((tone) => (
                    <button
                      aria-label={`Set tone ${tone}`}
                      aria-pressed={selectedNode.props.tone === tone}
                      className={`nimbus-tone-swatch tone-${tone}`}
                      key={tone}
                      onClick={() => updateNodeProp(selectedNode.id, "tone", tone)}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <div className="nimbus-geometry-grid">
                <label>
                  X
                  <input
                    onChange={(event) => updateNodeGeometry(selectedNode.id, { x: Number(event.target.value) })}
                    type="number"
                    value={Math.round(selectedNode.x)}
                  />
                </label>
                <label>
                  Y
                  <input
                    onChange={(event) => updateNodeGeometry(selectedNode.id, { y: Number(event.target.value) })}
                    type="number"
                    value={Math.round(selectedNode.y)}
                  />
                </label>
                <label>
                  W
                  <input
                    onChange={(event) => updateNodeGeometry(selectedNode.id, { width: Number(event.target.value) })}
                    type="number"
                    value={Math.round(selectedNode.width)}
                  />
                </label>
                <label>
                  H
                  <input
                    onChange={(event) => updateNodeGeometry(selectedNode.id, { height: Number(event.target.value) })}
                    type="number"
                    value={Math.round(selectedNode.height)}
                  />
                </label>
              </div>
              <div className="nimbus-inspector-actions">
                <button onClick={() => bringToFront(selectedNode.id)} type="button">
                  Bring to front
                </button>
                <button onClick={() => sendToBack(selectedNode.id)} type="button">
                  Send to back
                </button>
                <button onClick={() => duplicateNode(selectedNode.id)} type="button">
                  Duplicate
                </button>
                <button
                  className="nimbus-danger"
                  onClick={() => removeNode(selectedNode.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <p className="nimbus-inspector-empty">
              Select a widget on the canvas to edit its content, tone, and geometry.
            </p>
          )}
        </aside>
      </div>

      <div className="nimbus-studio-code">
        <div className="nimbus-code-head">
          <span>Generated code</span>
          <button onClick={() => void copyGeneratedCode()} type="button">
            {copyState === "copied" ? "Copied" : copyState === "error" ? "Retry" : "Copy code"}
          </button>
        </div>
        <pre>
          <code>{code}</code>
        </pre>
        <span aria-live="polite" className="nimbus-sr-only">
          {copyState === "copied"
            ? "Dashboard code copied to clipboard"
            : copyState === "error"
              ? "Could not copy dashboard code"
              : ""}
        </span>
      </div>
    </section>
  );
}
