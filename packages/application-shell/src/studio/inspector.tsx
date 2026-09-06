import { useState, useRef, useEffect, useId, type ReactNode } from "react";
import { PanelTabs } from "./panel-tabs";
import { designPresets } from "./presets";
import { Icon } from "./icons";
import { readImage, safeImage } from "./model";
import {
  BackgroundEditor,
  TextProperties,
  LogoProperties,
  ActionProperties,
  MotionProperties,
  Numeric,
} from "./visual-properties";
import type {
  StudioDocument,
  Widget,
  WidgetStyle,
  DesignPreset,
} from "./types";

export function Inspector({
  widget,
  document,
  onChange,
  onImage,
  onPage,
  onPreset,
  onDelete,
  onDuplicate,
  announce,
  replay,
  pages,
  pageId,
}: {
  widget: Widget | undefined;
  document: StudioDocument;
  onChange: (patch: Partial<Widget>) => boolean | void;
  onImage: (id: string, image: string) => boolean;
  onPage: (patch: Partial<StudioDocument>) => boolean | void;
  onPreset: (p: DesignPreset) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  announce: (s: string) => void;
  replay: () => void;
  pages?: { id: string; name: string }[];
  /** Stable page identity lets uploads merge into the latest edit safely. */
  pageId?: string;
}) {
  const [tab, setTab] = useState("design");
  const tabId = useId();
  const uploadVersion = useRef(0);
  const imageContext = useRef({ pageId, widget, onImage, announce });
  imageContext.current = { pageId, widget, onImage, announce };
  useEffect(
    () => () => {
      uploadVersion.current++;
    },
    [pageId, widget?.id, widget?.locked, widget?.content.image],
  );
  const supportsImage =
    widget && ["sidebar", "image", "avatar", "card"].includes(widget.kind);
  function setImage(image: string) {
    uploadVersion.current++;
    if (widget) onImage(widget.id, image);
  }
  async function upload(file: File) {
    if (!widget || widget.locked) return;
    const id = widget.id,
      originalImage = widget.content.image,
      version = ++uploadVersion.current;
    const isCurrentUpload = () => {
      const current = imageContext.current;
      return (
        version === uploadVersion.current &&
        current.pageId === pageId &&
        current.widget?.id === id &&
        !current.widget.locked &&
        current.widget.content.image === originalImage
      );
    };
    try {
      const image = await readImage(file);
      if (!isCurrentUpload()) return;
      // The current callback merges only the image into the latest document.
      if (imageContext.current.onImage(id, image))
        imageContext.current.announce(
          "Image added. It is included in your project and code exports.",
        );
    } catch (err) {
      if (isCurrentUpload())
        imageContext.current.announce(err instanceof Error ? err.message : "Image upload failed.");
    }
  }
  const patchStyle = (patch: Partial<WidgetStyle>) =>
    widget && onChange({ style: { ...widget.style, ...patch } });
  const patchContent = (key: keyof Widget["content"], value: string) =>
    widget && onChange({ content: { ...widget.content, [key]: value } });
  const patchMotion = (patch: Partial<Widget["motion"]>) =>
    widget && onChange({ motion: { ...widget.motion, ...patch } });
  const preset = designPresets.find((p) => p.id === widget?.presetId);
  return (
    <aside className="studio-inspector" aria-label="Properties inspector">
      <PanelTabs
        id={tabId}
        label="Property views"
        value={tab}
        onChange={setTab}
        options={["design", "content", "motion"].map((t) => ({
          id: t,
          label: t[0]?.toUpperCase() + t.slice(1),
        }))}
      />
      <div
        className="studio-inspector-body"
        role="tabpanel"
        id={`${tabId}-panel`}
        aria-labelledby={`${tabId}-${tab}`}
      >
        <div className="studio-selection-title">
          <span className="studio-selection-icon">
            <Icon name={widget ? "grid" : "monitor"} size={19} />
          </span>
          <div>
            <strong>{widget?.name ?? "Page settings"}</strong>
            <small>
              {widget ? widget.kind : "Select a widget to customize"}
            </small>
          </div>
          {widget && (
            <button
              className="studio-icon-btn"
              aria-label="Duplicate selected widget"
              onClick={onDuplicate}
            >
              <Icon name="copy" />
            </button>
          )}
        </div>
        {!widget ? (
          <>
            <Section title="Canvas">
              <Field label="Page name">
                <input
                  maxLength={120}
                  value={document.name}
                  onChange={(e) => onPage({ name: e.target.value })}
                />
              </Field>
              <div className="studio-field-grid">
                <NumberField
                  label="Page width"
                  value={document.width}
                  min={320}
                  max={2560}
                  onChange={(width) => onPage({ width })}
                />
                <NumberField
                  label="Page height"
                  value={document.height}
                  min={320}
                  max={6000}
                  onChange={(height) => onPage({ height })}
                />
              </div>
              <ColorField
                label="Page background"
                value={document.background}
                onChange={(background) =>
                  onPage({ background, backdrop: undefined })
                }
              />
              <BackgroundEditor
                key={pageId ?? "page-backdrop"}
                value={document.backdrop}
                fallback={document.background}
                onChange={(backdrop) => onPage({ backdrop })}
                announce={announce}
                revision={pageId ?? document}
              />
              <NumberField
                label="Snap grid"
                value={document.grid}
                min={1}
                max={64}
                onChange={(grid) => onPage({ grid })}
              />
            </Section>
            <Section title="A page of your own">
              <p className="studio-help">
                Add components from the library, then select one to edit its
                design, content and motion. Mix styles freely.
              </p>
              <p className="studio-help">
                Desktop preserves your exact layout. Tablet and mobile previews
                show the exported layout; smaller screens stack widgets in layer
                order.
              </p>
            </Section>
          </>
        ) : (
          <>
            {widget.locked && (
              <div className="studio-notice">
                This widget is locked. Unlock it in Layers to edit.
              </div>
            )}
            <fieldset
              className="studio-property-fields"
              disabled={widget.locked}
            >
              {tab === "design" && (
                <>
                  <Section
                    title="Design language"
                    trailing={<span className="studio-dot" />}
                  >
                    <Field label="Style preset">
                      <select
                        value={widget.presetId}
                        onChange={(e) => {
                          const p = designPresets.find(
                            (v) => v.id === e.target.value,
                          );
                          if (p) onPreset(p);
                        }}
                      >
                        {!preset && <option value={widget.presetId}>Saved custom / legacy style</option>}
                        {designPresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="studio-style-strip">
                      {[
                        widget.style.background,
                        widget.style.color,
                        widget.style.accent,
                        widget.style.borderColor,
                      ].map((c, i) => (
                        <span key={i} style={{ background: c }} />
                      ))}
                    </div>
                    <p className="studio-help">
                      {preset?.description ?? "Custom style"}
                    </p>
                    {preset?.source && (
                      <a
                        className="studio-source-link"
                        href={preset.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View design reference ↗
                      </a>
                    )}
                  </Section>
                  <Section title="Layout">
                    <div className="studio-field-grid">
                      <NumberField
                        label="X position"
                        value={widget.x}
                        min={0}
                        max={document.width - widget.width}
                        onChange={(x) => onChange({ x })}
                      />
                      <NumberField
                        label="Y position"
                        value={widget.y}
                        min={0}
                        max={document.height - widget.height}
                        onChange={(y) => onChange({ y })}
                      />
                      <NumberField
                        label="Width"
                        value={widget.width}
                        min={48}
                        max={document.width}
                        onChange={(width) => onChange({ width })}
                      />
                      <NumberField
                        label="Height"
                        value={widget.height}
                        min={32}
                        max={document.height}
                        onChange={(height) => onChange({ height })}
                      />
                    </div>
                    <Range
                      label="Padding"
                      value={widget.style.padding}
                      min={0}
                      max={80}
                      unit="px"
                      onChange={(padding) => patchStyle({ padding })}
                    />
                  </Section>
                  <Section title="Appearance">
                    <ColorField
                      label="Fill"
                      value={widget.style.background}
                      onChange={(background) =>
                        patchStyle({ background, backdrop: undefined })
                      }
                    />
                    <BackgroundEditor
                      key={`${pageId ?? ""}:${widget.id}`}
                      value={widget.style.backdrop}
                      fallback={widget.style.background}
                      onChange={(backdrop) => patchStyle({ backdrop })}
                      announce={announce}
                      revision={pageId ? `${pageId}:${widget.id}` : document}
                      disabled={widget.locked}
                    />
                    <ColorField
                      label="Text color"
                      value={widget.style.color}
                      onChange={(color) => patchStyle({ color })}
                    />
                    <ColorField
                      label="Accent"
                      value={widget.style.accent}
                      onChange={(accent) => patchStyle({ accent })}
                    />
                    <ColorField
                      label="Border color"
                      value={widget.style.borderColor}
                      onChange={(borderColor) => patchStyle({ borderColor })}
                    />
                    <div className="studio-field-grid">
                      <NumberField
                        label="Corner radius"
                        value={widget.style.radius}
                        min={0}
                        max={100}
                        onChange={(radius) => patchStyle({ radius })}
                      />
                      <NumberField
                        label="Border width"
                        value={widget.style.borderWidth}
                        min={0}
                        max={12}
                        onChange={(borderWidth) => patchStyle({ borderWidth })}
                      />
                    </div>
                    <Field label="Elevation">
                      <select
                        value={widget.style.shadow}
                        onChange={(e) =>
                          patchStyle({
                            shadow: e.target.value as WidgetStyle["shadow"],
                          })
                        }
                      >
                        {["none", "small", "medium", "large"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <Range
                      label="Opacity"
                      value={widget.style.opacity}
                      min={10}
                      max={100}
                      unit="%"
                      onChange={(opacity) => patchStyle({ opacity })}
                    />
                  </Section>
                  <Section title="Typography">
                    <Field label="Font family">
                      <select
                        value={widget.style.fontFamily}
                        onChange={(e) =>
                          patchStyle({
                            fontFamily: e.target
                              .value as WidgetStyle["fontFamily"],
                          })
                        }
                      >
                        <option value="sans">System sans · clean</option>
                        <option value="serif">Georgia · editorial</option>
                        <option value="mono">Monospace · technical</option>
                      </select>
                    </Field>
                    <div className="studio-field-grid">
                      <NumberField
                        label="Font size"
                        min={10}
                        max={96}
                        value={widget.style.fontSize}
                        onChange={(fontSize) => patchStyle({ fontSize })}
                      />
                      <Field label="Weight">
                        <select
                          value={widget.style.fontWeight}
                          onChange={(e) =>
                            patchStyle({ fontWeight: Number(e.target.value) })
                          }
                        >
                          {[300, 400, 500, 600, 700, 800].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </Section>
                  <Section title="Component state">
                    <Field label="Preview state">
                      <select
                        value={widget.state}
                        onChange={(e) =>
                          onChange({ state: e.target.value as Widget["state"] })
                        }
                      >
                        {[
                          "default",
                          "loading",
                          "disabled",
                          "error",
                          "success",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                  </Section>
                  <Section title="Granular text styling">
                    <TextProperties
                      style={widget.style}
                      onChange={patchStyle}
                    />
                  </Section>
                </>
              )}
              {tab === "content" && (
                <>
                  <Section title="Widget content">
                    <Field label="Layer name">
                      <input
                        value={widget.name}
                        maxLength={120}
                        onChange={(e) => onChange({ name: e.target.value })}
                      />
                    </Field>
                    <Field label="Title">
                      <textarea
                        rows={2}
                        value={widget.content.title}
                        maxLength={20000}
                        onChange={(e) => patchContent("title", e.target.value)}
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        rows={3}
                        value={widget.content.subtitle}
                        maxLength={20000}
                        onChange={(e) =>
                          patchContent("subtitle", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Value or button label">
                      <input
                        value={widget.content.value}
                        maxLength={20000}
                        onChange={(e) => patchContent("value", e.target.value)}
                      />
                    </Field>
                    <Field label="Items · one per line">
                      <textarea
                        rows={7}
                        value={widget.content.items}
                        maxLength={20000}
                        onChange={(e) => patchContent("items", e.target.value)}
                      />
                    </Field>
                    <p className="studio-help">
                      Table rows: separate columns with |. Chart values: enter a
                      label and number, separated by |.
                    </p>
                  </Section>
                  {supportsImage && (
                    <Section
                      title={
                        widget.kind === "sidebar" ? "Logo & image" : "Image"
                      }
                    >
                      <label className="studio-upload">
                        <Icon name="upload" size={22} />
                        <b>
                          {widget.kind === "sidebar"
                            ? "Upload sidebar logo"
                            : "Upload an image"}
                        </b>
                        <small>PNG, JPG, WebP, GIF · up to 2 MB</small>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          aria-label={
                            widget.kind === "sidebar"
                              ? "Upload sidebar logo"
                              : "Upload widget image"
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void upload(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {widget.content.image && (
                        <>
                          <img
                            className="studio-upload-preview"
                            src={widget.content.image}
                            alt="Uploaded asset preview"
                          />
                          <button
                            className="studio-small-button"
                            onClick={() => setImage("")}
                          >
                            Remove image
                          </button>
                        </>
                      )}
                      <Field label="Image description (alt text)">
                        <input
                          value={widget.content.imageAlt}
                          maxLength={1000}
                          onChange={(e) =>
                            patchContent("imageAlt", e.target.value)
                          }
                        />
                      </Field>
                      {widget.kind === "sidebar" && (
                        <LogoProperties
                          style={widget.style}
                          onChange={patchStyle}
                        />
                      )}
                      <Field label="Or paste an HTTPS image URL">
                        <input
                          key={widget.id + widget.content.image.slice(0, 50)}
                          defaultValue={
                            widget.content.image.startsWith("https:")
                              ? widget.content.image
                              : ""
                          }
                          placeholder="https://…"
                          onBlur={(e) => {
                            if (e.target.value && safeImage(e.target.value))
                              setImage(e.target.value);
                            else if (e.target.value)
                              announce("Use a valid HTTPS image URL.");
                          }}
                        />
                      </Field>
                    </Section>
                  )}
                  <Section title="Page navigation">
                    <ActionProperties
                      widget={widget}
                      pages={pages}
                      onChange={onChange}
                    />
                  </Section>
                </>
              )}
              {tab === "motion" && (
                <>
                  <Section title="Entrance animation">
                    <Field label="On load">
                      <select
                        value={widget.motion.entrance}
                        onChange={(e) =>
                          patchMotion({
                            entrance: e.target
                              .value as Widget["motion"]["entrance"],
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="fade">Fade in</option>
                        <option value="slide">Slide up</option>
                        <option value="scale">Scale in</option>
                      </select>
                    </Field>
                    <Range
                      label="Duration"
                      value={widget.motion.duration}
                      min={0}
                      max={2000}
                      unit="ms"
                      onChange={(duration) => patchMotion({ duration })}
                    />
                    <Range
                      label="Delay"
                      value={widget.motion.delay}
                      min={0}
                      max={2000}
                      unit="ms"
                      onChange={(delay) => patchMotion({ delay })}
                    />
                  </Section>
                  <Section title="Interaction">
                    <Field label="On hover">
                      <select
                        value={widget.motion.hover}
                        onChange={(e) =>
                          patchMotion({
                            hover: e.target.value as Widget["motion"]["hover"],
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="lift">Lift</option>
                        <option value="scale">Grow gently</option>
                        <option value="glow">Accent glow</option>
                      </select>
                    </Field>
                    <Field label="On press">
                      <select
                        value={widget.motion.click}
                        onChange={(e) =>
                          patchMotion({
                            click: e.target.value as Widget["motion"]["click"],
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="press">Press down</option>
                        <option value="pulse">Accent pulse</option>
                      </select>
                    </Field>
                    <button className="studio-secondary full" onClick={replay}>
                      <Icon name="play" />
                      Replay entrance
                    </button>
                    <p className="studio-help">
                      Use Preview to test hover and press interactions. Motion
                      respects the viewer’s reduced-motion preference.
                    </p>
                  </Section>
                  <Section title="Loading state">
                    <MotionProperties
                      motion={widget.motion}
                      onChange={patchMotion}
                    />
                    <Field label="Preview state">
                      <select
                        value={widget.state}
                        onChange={(e) =>
                          onChange({ state: e.target.value as Widget["state"] })
                        }
                      >
                        <option value="default">Default</option>
                        <option value="loading">Loading skeleton</option>
                        <option value="disabled">Disabled</option>
                        <option value="error">Error</option>
                        <option value="success">Success</option>
                      </select>
                    </Field>
                  </Section>
                </>
              )}
            </fieldset>
            <div className="studio-inspector-delete">
              <button
                className="studio-danger"
                disabled={widget.locked}
                onClick={onDelete}
              >
                <Icon name="trash" />
                Delete widget
              </button>
            </div>
          </>
        )}
      </div>
      <div className="studio-inspector-foot">
        <span className="studio-dot" />
        Changes apply to this widget only
      </div>
    </aside>
  );
}
function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="studio-property-section">
      <div className="studio-property-heading">
        {title}
        {trailing}
      </div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <Numeric
      label={label}
      value={value}
      min={min}
      max={max}
      onChange={onChange}
    />
  );
}
function Range({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="studio-range">
      <span>
        {label}
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="studio-color-field">
      <span>{label}</span>
      <span>
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          aria-label={`${label} hex`}
          key={value}
          defaultValue={value.toUpperCase()}
          maxLength={7}
          onBlur={(e) => {
            if (/^#[0-9a-f]{6}$/i.test(e.target.value))
              onChange(e.target.value);
            else e.target.value = value;
          }}
        />
      </span>
    </label>
  );
}
