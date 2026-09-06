import { useRef, useEffect, useState, type ReactNode } from "react";
import {
  readImage,
  safeImage,
  safePageTarget,
  commitNumericValue,
} from "./model";
import type {
  Background,
  TextStyle,
  TextRole,
  Widget,
  WidgetStyle,
} from "./types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Numeric({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  return (
    <Field label={label}>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onFocus={() => setFocused(true)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          const next = commitNumericValue(event.target.value, value, min, max);
          setDraft(String(next));
          setFocused(false);
          if (next !== value) onChange(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.value = String(value);
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
      />
    </Field>
  );
}
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="vp-color">
      <Field label={label}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      <input
        aria-label={`${label} hex`}
        key={value}
        defaultValue={value}
        maxLength={7}
        onBlur={(e) => {
          if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          else e.target.value = value;
        }}
      />
    </div>
  );
}
export function BackgroundEditor({
  value,
  fallback,
  onChange,
  announce,
  revision,
  disabled = false,
}: {
  value?: Background | undefined;
  fallback: string;
  onChange: (value: Background | undefined) => boolean | void;
  announce: (message: string) => void;
  revision: object | string;
  disabled?: boolean;
}) {
  const pending = useRef(0);
  const current = useRef({ revision, value, disabled, onChange });
  current.current = { revision, value, disabled, onChange };
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      pending.current++;
    },
    [],
  );
  const background: Background = value ?? { type: "solid", color: fallback };
  function update(next: Background | undefined) {
    pending.current++;
    setBusy(false);
    onChange(next);
  }
  function selectType(type: Background["type"]) {
    const stops =
      background.type === "linear" || background.type === "radial"
        ? background.stops
        : [
            { color: fallback, position: 0 },
            { color: "#6366f1", position: 100 },
          ];
    update(
      type === "solid"
        ? { type, color: fallback }
        : type === "linear"
          ? { type, angle: 135, stops }
          : type === "radial"
            ? { type, shape: "ellipse", centerX: 50, centerY: 50, stops }
            : {
                type,
                src: "",
                size: "cover",
                positionX: 50,
                positionY: 50,
                repeat: "no-repeat",
              },
    );
  }
  async function upload(file: File) {
    if (background.type !== "image") return;
    const version = ++pending.current;
    setBusy(true);
    try {
      const src = await readImage(file);
      if (pending.current !== version) return;
      if (
        current.current.revision !== revision ||
        current.current.value !== value ||
        current.current.disabled
      ) {
        announce(
          "Background upload skipped because the page or selection changed. Choose the image again.",
        );
        return;
      }
      const committed = current.current.onChange({ ...background, src });
      if (committed !== false)
        announce("Background image added and included in project exports.");
    } catch (error) {
      if (version === pending.current)
        announce(
          error instanceof Error ? error.message : "Image upload failed.",
        );
    } finally {
      if (version === pending.current) setBusy(false);
    }
  }
  return (
    <div className="vp-background">
      <Choice
        label="Background type"
        value={background.type}
        options={["solid", "linear", "radial", "image"]}
        onChange={selectType}
      />
      {background.type === "solid" && (
        <Color
          label="Solid color"
          value={background.color}
          onChange={(color) => update({ ...background, color })}
        />
      )}
      {(background.type === "linear" || background.type === "radial") && (
        <>
          {background.type === "linear" ? (
            <Numeric
              label="Gradient angle (degrees)"
              value={background.angle}
              min={0}
              max={360}
              onChange={(angle) => update({ ...background, angle })}
            />
          ) : (
            <>
              <Choice
                label="Gradient shape"
                value={background.shape}
                options={["circle", "ellipse"]}
                onChange={(shape) => update({ ...background, shape })}
              />
              <div className="studio-field-grid">
                <Numeric
                  label="Center X (%)"
                  value={background.centerX}
                  min={0}
                  max={100}
                  onChange={(centerX) => update({ ...background, centerX })}
                />
                <Numeric
                  label="Center Y (%)"
                  value={background.centerY}
                  min={0}
                  max={100}
                  onChange={(centerY) => update({ ...background, centerY })}
                />
              </div>
            </>
          )}
          <div className="vp-stops">
            {background.stops.map((stop, index) => (
              <div className="vp-stop" key={index}>
                <Color
                  label={`Stop ${index + 1} color`}
                  value={stop.color}
                  onChange={(color) =>
                    update({
                      ...background,
                      stops: background.stops.map((s, i) =>
                        i === index ? { ...s, color } : s,
                      ),
                    })
                  }
                />
                <div className="vp-stop-position">
                  <Numeric
                    label={`Stop ${index + 1} position (%)`}
                    value={stop.position}
                    min={background.stops[index - 1]?.position ?? 0}
                    max={background.stops[index + 1]?.position ?? 100}
                    onChange={(position) =>
                      update({
                        ...background,
                        stops: background.stops.map((s, i) =>
                          i === index ? { ...s, position } : s,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="studio-small-button"
                    aria-label={`Remove color stop ${index + 1}`}
                    disabled={background.stops.length <= 2}
                    onClick={() =>
                      update({
                        ...background,
                        stops: background.stops.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="studio-small-button"
            disabled={background.stops.length >= 8}
            onClick={() =>
              update({
                ...background,
                stops: [
                  ...background.stops,
                  { color: background.stops.at(-1)!.color, position: 100 },
                ],
              })
            }
          >
            Add color stop
          </button>
        </>
      )}
      {background.type === "image" && (
        <>
          <Field label="Background image URL">
            <input
              key={background.src}
              defaultValue={
                background.src.startsWith("https:") ? background.src : ""
              }
              placeholder="https://…"
              onBlur={(event) => {
                const src = event.target.value;
                if (!src) return;
                if (/^https:\/\//i.test(src) && safeImage(src))
                  update({ ...background, src });
                else {
                  event.target.value = background.src.startsWith("https:")
                    ? background.src
                    : "";
                  announce("Use a safe HTTPS raster image URL.");
                }
              }}
            />
          </Field>
          <Field label="Upload background image">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </Field>
          <p className="studio-help" role="status">
            {busy ? "Validating image…" : "PNG, JPEG, WebP or GIF · up to 2 MB"}
          </p>
          {background.src && (
            <>
              <img
                className="studio-upload-preview"
                src={background.src}
                alt="Background preview"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                className="studio-small-button"
                onClick={() => update({ ...background, src: "" })}
              >
                Remove background image
              </button>
            </>
          )}
          <Choice
            label="Image size"
            value={background.size}
            options={["cover", "contain", "auto"]}
            onChange={(size) => update({ ...background, size })}
          />
          <div className="studio-field-grid">
            <Numeric
              label="Image X (%)"
              value={background.positionX}
              min={0}
              max={100}
              onChange={(positionX) => update({ ...background, positionX })}
            />
            <Numeric
              label="Image Y (%)"
              value={background.positionY}
              min={0}
              max={100}
              onChange={(positionY) => update({ ...background, positionY })}
            />
          </div>
          <Choice
            label="Image repeat"
            value={background.repeat}
            options={["no-repeat", "repeat", "repeat-x", "repeat-y"]}
            onChange={(repeat) => update({ ...background, repeat })}
          />
        </>
      )}
      {value && (
        <button
          type="button"
          className="studio-small-button"
          onClick={() => update(undefined)}
        >
          Use base fill
        </button>
      )}
    </div>
  );
}

export function TextProperties({
  style,
  onChange,
}: {
  style: WidgetStyle;
  onChange: (patch: Partial<WidgetStyle>) => void;
}) {
  function patch(role: TextRole, value: Partial<TextStyle>) {
    onChange({
      text: { ...style.text, [role]: { ...style.text?.[role], ...value } },
    });
  }
  return (
    <div className="vp-text">
      {(["title", "subtitle", "value"] as const).map((role) => {
        const text = style.text?.[role] ?? {};
        return (
          <details key={role} className="vp-disclosure">
            <summary>
              {role === "title"
                ? "Title"
                : role === "subtitle"
                  ? "Subtitle / description"
                  : "Value / label"}
              <span>{Object.keys(text).length ? "Custom" : "Inherited"}</span>
            </summary>
            <div className="vp-disclosure-body">
              <Color
                label={`${role} color`}
                value={text.color ?? style.color}
                onChange={(color) => patch(role, { color })}
              />
              <Choice
                label={`${role} font`}
                value={text.fontFamily ?? style.fontFamily}
                options={["sans", "serif", "mono"]}
                onChange={(fontFamily) => patch(role, { fontFamily })}
              />
              <div className="studio-field-grid">
                <Numeric
                  label={`${role} size (px)`}
                  min={8}
                  max={160}
                  value={text.fontSize ?? style.fontSize}
                  onChange={(fontSize) => patch(role, { fontSize })}
                />
                <Numeric
                  label={`${role} weight`}
                  min={100}
                  max={900}
                  step={100}
                  value={text.fontWeight ?? style.fontWeight}
                  onChange={(fontWeight) => patch(role, { fontWeight })}
                />
                <Numeric
                  label={`${role} line height`}
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={text.lineHeight ?? 1.5}
                  onChange={(lineHeight) => patch(role, { lineHeight })}
                />
                <Numeric
                  label={`${role} tracking (px)`}
                  min={-10}
                  max={30}
                  step={0.1}
                  value={text.letterSpacing ?? 0}
                  onChange={(letterSpacing) => patch(role, { letterSpacing })}
                />
              </div>
              <Choice
                label={`${role} alignment`}
                value={text.align ?? "left"}
                options={["left", "center", "right", "justify"]}
                onChange={(align) => patch(role, { align })}
              />
              <Choice
                label={`${role} case`}
                value={text.transform ?? "none"}
                options={["none", "uppercase", "lowercase", "capitalize"]}
                onChange={(transform) => patch(role, { transform })}
              />
              <Choice
                label={`${role} decoration`}
                value={text.decoration ?? "none"}
                options={["none", "underline", "line-through"]}
                onChange={(decoration) => patch(role, { decoration })}
              />
              <label className="vp-check">
                <input
                  type="checkbox"
                  checked={text.italic ?? false}
                  onChange={(e) => patch(role, { italic: e.target.checked })}
                />
                Italic {role}
              </label>
              <button
                type="button"
                className="studio-small-button"
                disabled={!style.text?.[role]}
                onClick={() => {
                  const remaining = { ...style.text };
                  delete remaining[role];
                  onChange({ text: remaining });
                }}
              >
                Reset {role} styling
              </button>
            </div>
          </details>
        );
      })}
      <p className="studio-help">
        Overrides affect the corresponding visible text. Fields absent from a
        component have no visible effect.
      </p>
    </div>
  );
}

export function LogoProperties({
  style,
  onChange,
}: {
  style: WidgetStyle;
  onChange: (patch: Partial<WidgetStyle>) => void;
}) {
  const logo = style.logo ?? { width: 42, height: 42, fit: "cover" as const };
  return (
    <div className="vp-logo">
      <div className="studio-field-grid">
        <Numeric
          label="Logo width (px)"
          min={8}
          max={640}
          value={logo.width}
          onChange={(width) => onChange({ logo: { ...logo, width } })}
        />
        <Numeric
          label="Logo height (px)"
          min={8}
          max={640}
          value={logo.height}
          onChange={(height) => onChange({ logo: { ...logo, height } })}
        />
      </div>
      <Choice
        label="Logo fit"
        value={logo.fit}
        options={["contain", "cover", "fill", "scale-down", "none"]}
        onChange={(fit) => onChange({ logo: { ...logo, fit } })}
      />
    </div>
  );
}

export function ActionProperties({
  widget,
  pages = [],
  onChange,
}: {
  widget: Widget;
  pages?: { id: string; name: string }[] | undefined;
  onChange: (patch: Partial<Widget>) => void;
}) {
  const available = pages.filter((page) => safePageTarget(page.id));
  const items = widget.content.items
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  function target(key: string, value: string) {
    const actions = { ...widget.actions };
    if (value && available.some((page) => page.id === value))
      actions[key] = value;
    else delete actions[key];
    onChange({ actions });
  }
  function selector(key: string, label: string) {
    const value = widget.actions?.[key] ?? "";
    return (
      <Field label={label}>
        <select value={value} onChange={(e) => target(key, e.target.value)}>
          <option value="">No navigation</option>
          {value && !available.some((page) => page.id === value) && (
            <option value={value} disabled>
              Unavailable page
            </option>
          )}
          {available.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <div className="vp-actions">
      {selector("click", "Whole widget target")}
      {!available.length && (
        <p className="studio-help">
          Page destinations appear when project pages are available.
        </p>
      )}
      {widget.kind === "sidebar" && (
        <div className="vp-nav-items">
          {items.map((label, index) => (
            <div className="vp-nav-item" key={index}>
              <Field label={`Navigation ${index + 1} label`}>
                <input
                  key={label}
                  defaultValue={label}
                  maxLength={20000}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (!value || /[\r\n]/.test(value)) {
                      e.target.value = label;
                      return;
                    }
                    const next = items
                      .map((item, i) => (i === index ? value : item))
                      .join("\n");
                    if (next.length <= 20000)
                      onChange({ content: { ...widget.content, items: next } });
                    else e.target.value = label;
                  }}
                />
              </Field>
              {selector(`item:${index}`, `Navigation ${index + 1} target`)}
            </div>
          ))}
        </div>
      )}
      <p className="studio-help">
        Navigation runs in Preview and exported apps. Sidebar item targets take
        priority over the widget target.
      </p>
    </div>
  );
}

export function MotionProperties({
  motion,
  onChange,
}: {
  motion: Widget["motion"];
  onChange: (patch: Partial<Widget["motion"]>) => void;
}) {
  return (
    <div className="vp-motion">
      <Choice
        label="Easing"
        value={motion.easing ?? "ease"}
        options={["linear", "ease", "ease-in", "ease-out", "ease-in-out"]}
        onChange={(easing) => onChange({ easing })}
      />
      <Field label="Entrance repeat">
        <select
          value={motion.repeat === "infinite" ? "infinite" : "count"}
          onChange={(e) =>
            onChange({ repeat: e.target.value === "infinite" ? "infinite" : 1 })
          }
        >
          <option value="count">Finite</option>
          <option value="infinite">Continuous</option>
        </select>
      </Field>
      {motion.repeat !== "infinite" && (
        <Numeric
          label="Entrance count"
          min={1}
          max={20}
          value={motion.repeat ?? 1}
          onChange={(repeat) => onChange({ repeat: Math.round(repeat) })}
        />
      )}
      <Choice
        label="Loading appearance"
        value={motion.loading ?? "shimmer"}
        options={["shimmer", "pulse", "spinner", "static"]}
        onChange={(loading) => onChange({ loading })}
      />
      <p className="studio-help">
        Choose the Loading preview state to see its appearance. Loading
        indicators repeat while loading; the entrance count applies to entrance
        motion.
      </p>
    </div>
  );
}
