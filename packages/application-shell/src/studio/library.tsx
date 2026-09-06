import { useState, useId } from "react";
import { PanelTabs } from "./panel-tabs";
import { widgetCatalog } from "./catalog";
import { designPresets } from "./presets";
import { Icon } from "./icons";
import type { DesignPreset, Widget, WidgetKind } from "./types";

export function Library({
  widgets,
  selectedId,
  onAdd,
  onSelect,
  onPreset,
  onAction,
  onTemplate,
}: {
  widgets: Widget[];
  selectedId: string | null;
  onAdd: (kind: WidgetKind) => void;
  onSelect: (id: string) => void;
  onPreset: (preset: DesignPreset) => void;
  onAction: (id: string, action: "hide" | "lock" | "up" | "down") => void;
  onTemplate: (name: "dashboard" | "blank" | "agent" | "settings") => void;
}) {
  const [tab, setTab] = useState("components");
  const tabId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = widgetCatalog.filter(
    (w) =>
      (category === "All" || category === w.category) &&
      `${w.name} ${w.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = widgets.find((w) => w.id === selectedId);
  return (
    <aside className="studio-library" aria-label="Design library">
      <PanelTabs
        id={tabId}
        label="Library views"
        value={tab}
        onChange={setTab}
        options={["components", "styles", "layers"].map((t) => ({
          id: t,
          label: t[0]?.toUpperCase() + t.slice(1),
          icon: (
            <Icon
              name={
                t === "components"
                  ? "grid"
                  : t === "styles"
                    ? "palette"
                    : "layers"
              }
            />
          ),
        }))}
      />
      <div
        className="studio-library-body"
        role="tabpanel"
        id={`${tabId}-panel`}
        aria-labelledby={`${tabId}-${tab}`}
      >
        {tab !== "layers" && (
          <label className="studio-search">
            <Icon name="search" />
            <input
              aria-label={
                tab === "styles" ? "Search design styles" : "Search components"
              }
              placeholder={
                tab === "styles" ? "Find a design style…" : "Search components…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>/</kbd>
          </label>
        )}
        {tab === "components" && (
          <>
            <div className="studio-section-title">
              COMPONENT LIBRARY <span>{widgetCatalog.length}</span>
            </div>
            <div className="studio-category-list">
              {["All", ...new Set(widgetCatalog.map((w) => w.category))].map(
                (c) => (
                  <button
                    className={c === category ? "is-active" : ""}
                    key={c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
            <div className="studio-widget-list">
              {filtered.map((w) => (
                <button
                  key={w.kind}
                  className="studio-widget-tile"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/nimbus-widget", w.kind);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAdd(w.kind)}
                  title={`${w.description}. Click to add or drag onto the page.`}
                  aria-label={`Add ${w.name}`}
                >
                  <span className={`studio-mini is-${w.kind}`}>
                    <Miniature kind={w.kind} />
                  </span>
                  <span>{w.name}</span>
                  <Icon name="plus" size={12} />
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="studio-empty">
                No matching components. Try another search.
              </p>
            )}
            <div className="studio-section-title">START WITH A PAGE</div>
            <div className="studio-template-list">
              {(
                [
                  ["dashboard", "Analytics dashboard"],
                  ["agent", "Agent workspace"],
                  ["settings", "Account settings"],
                  ["blank", "Blank canvas"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} onClick={() => onTemplate(id)}>
                  <Icon name={id === "blank" ? "plus" : "grid"} />
                  {label}
                  <Icon name="arrow" size={14} />
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "styles" && (
          <>
            <div className="studio-section-title">
              DESIGN PRESETS <span>{designPresets.length}</span>
            </div>
            <p className="studio-help">
              {selected
                ? `Apply to ${selected.name}. Your other widgets keep their styles.`
                : "Select a widget on the canvas to apply a style."}
            </p>
            <div className="studio-preset-list">
              {designPresets
                .filter((p) =>
                  `${p.name} ${p.category}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <button
                    disabled={!selected || selected.locked}
                    className={selected?.presetId === p.id ? "is-selected" : ""}
                    key={p.id}
                    onClick={() => onPreset(p)}
                    title={p.description}
                  >
                    <span
                      className="studio-preset-swatch"
                      style={{
                        background: p.style.background,
                        color: p.style.color,
                        borderColor: p.style.borderColor,
                      }}
                    >
                      <span
                        style={{
                          background: p.style.accent,
                          borderRadius: Math.min(p.style.radius, 10),
                        }}
                      />
                      Aa
                    </span>
                    <span>
                      <b>{p.name}</b>
                      <small>{p.category}</small>
                    </span>
                    {selected?.presetId === p.id && <Icon name="check" />}
                  </button>
                ))}
            </div>
            <p className="studio-help">
              Independent interpretations of design analyses. No brand
              affiliation. Attribution is included with exports.
            </p>
          </>
        )}
        {tab === "layers" && (
          <>
            <div className="studio-section-title">
              PAGE LAYERS <span>{widgets.length}</span>
            </div>
            <p className="studio-help">
              Top rows appear in front. Use arrows to change stacking order.
            </p>
            <div className="studio-layer-list">
              {[...widgets].reverse().map((w) => (
                <div
                  className={selectedId === w.id ? "is-selected" : ""}
                  key={w.id}
                >
                  <button
                    className="studio-layer-name"
                    onClick={() => onSelect(w.id)}
                  >
                    <Icon name={w.kind === "image" ? "image" : "grid"} />
                    <span>{w.name}</span>
                  </button>
                  <button
                    title="Move layer forward"
                    aria-label={`Move ${w.name} forward`}
                    onClick={() => onAction(w.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    title="Move layer backward"
                    aria-label={`Move ${w.name} backward`}
                    onClick={() => onAction(w.id, "down")}
                  >
                    ↓
                  </button>
                  <button
                    aria-label={`${w.hidden ? "Show" : "Hide"} ${w.name}`}
                    aria-pressed={w.hidden}
                    onClick={() => onAction(w.id, "hide")}
                  >
                    <Icon name="eye" size={13} />
                  </button>
                  <button
                    aria-label={`${w.locked ? "Unlock" : "Lock"} ${w.name}`}
                    aria-pressed={w.locked}
                    onClick={() => onAction(w.id, "lock")}
                  >
                    <Icon name={w.locked ? "lock" : "unlock"} size={13} />
                  </button>
                </div>
              ))}
            </div>
            {!widgets.length && (
              <p className="studio-empty">
                Your page is empty. Add a component to get started.
              </p>
            )}
          </>
        )}
      </div>
      <div className="studio-library-foot">
        <Icon name="move" size={14} />
        <span>Drag to canvas or click to add</span>
      </div>
    </aside>
  );
}
function Miniature({ kind }: { kind: WidgetKind }) {
  if (kind.includes("chart"))
    return (
      <svg viewBox="0 0 100 50" aria-hidden="true">
        <path d="M7 40H93 M7 25H93 M7 10H93" stroke="#e5e7eb" fill="none" />
        <path
          d={
            kind === "bar-chart"
              ? "M15 40V25h9v15 M37 40V17h9v23 M59 40V9h9v31 M81 40V19h9v21"
              : "m7 36 12-8 12 4 12-14 12 6 12-15 12 5 14-10"
          }
          stroke="#8185d8"
          fill={kind === "bar-chart" ? "#a5a7df" : "none"}
          strokeWidth="2"
        />
      </svg>
    );
  if (kind === "stat")
    return (
      <>
        <i />
        <strong>24,890</strong>
        <small>↗ 12.8%</small>
      </>
    );
  if (kind === "sidebar")
    return (
      <span className="mini-sidebar">
        <b>◈</b>
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  if (kind === "table" || kind === "list" || kind === "activity")
    return (
      <span className="mini-table">
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  if (kind === "button" || kind === "badge")
    return <span className="mini-button">Continue →</span>;
  if (kind === "heading" || kind === "text")
    return (
      <>
        <strong className="mini-heading">Aa</strong>
        <i />
      </>
    );
  if (kind === "image") return <Icon name="image" size={28} />;
  if (kind === "input" || kind === "search" || kind === "composer")
    return <span className="mini-input">Type something…</span>;
  return (
    <>
      <Icon
        name={
          kind === "avatar" ? "eye" : kind === "progress" ? "chart" : "grid"
        }
        size={22}
      />
      <i />
    </>
  );
}
