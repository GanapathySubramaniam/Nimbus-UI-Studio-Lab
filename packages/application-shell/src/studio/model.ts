import type {
  StudioDocument,
  Widget,
  WidgetDefinition,
  WidgetStyle,
  DesignPreset,
  Background,
  TextStyle,
  LogoStyle,
} from "./types";

export const DEFAULT_STYLE: WidgetStyle = {
  background: "#ffffff",
  color: "#24272e",
  accent: "#6366f1",
  borderColor: "#e5e7eb",
  radius: 8,
  borderWidth: 1,
  padding: 20,
  fontSize: 14,
  fontFamily: "sans",
  fontWeight: 400,
  shadow: "none",
  opacity: 100,
};
export const STORAGE_KEY = "nimbus.visual-studio.v1";
export const MAX_PROJECT_BYTES = 12 * 1024 * 1024;
/** Only clamp a finished numeric draft; partial keystrokes belong to the input. */
export function commitNumericValue(
  draft: string,
  current: number,
  min: number,
  max: number,
): number {
  const parsed = draft.trim() ? Number(draft) : NaN;
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : current;
}
const kinds = new Set([
  "sidebar",
  "navbar",
  "heading",
  "text",
  "stat",
  "line-chart",
  "bar-chart",
  "donut-chart",
  "table",
  "activity",
  "card",
  "button",
  "input",
  "textarea",
  "select",
  "checkbox",
  "switch",
  "badge",
  "avatar",
  "image",
  "progress",
  "alert",
  "tabs",
  "accordion",
  "breadcrumb",
  "pagination",
  "divider",
  "skeleton",
  "pricing",
  "login",
  "search",
  "chat",
  "composer",
  "agent",
  "approval",
  "file",
  "calendar",
  "list",
  "kanban",
  "tooltip",
]);
export function createDocument(): StudioDocument {
  return {
    version: 1,
    name: "Untitled page",
    width: 1200,
    height: 1000,
    background: "#f8f9fb",
    grid: 8,
    widgets: [],
  };
}
export function createWidget(
  def: WidgetDefinition,
  preset?: DesignPreset,
  x = 32,
  y = 32,
): Widget {
  return {
    id: crypto.randomUUID(),
    kind: def.kind,
    name: def.name,
    x,
    y,
    width: def.width,
    height: def.height,
    presetId: preset?.id ?? "nimbus",
    style: { ...(preset?.style ?? DEFAULT_STYLE) },
    content: {
      title: def.title,
      subtitle: def.subtitle,
      value: def.value,
      items: def.items,
      image: "",
      imageAlt: "",
    },
    motion: {
      entrance: "none",
      hover: "none",
      click: "none",
      duration: 240,
      delay: 0,
    },
    state: "default",
    locked: false,
    hidden: false,
  };
}
export function duplicateInDocument(
  doc: StudioDocument,
  id: string,
): StudioDocument {
  const source = doc.widgets.find((w) => w.id === id);
  if (!source || doc.widgets.length >= 200) return doc;
  const widget = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name.slice(0, 115)} copy`,
    locked: false,
    ...constrainWidget(
      { ...source, x: source.x + 24, y: source.y + 24 },
      doc.width,
      doc.height,
    ),
  };
  return { ...doc, widgets: [...doc.widgets, widget] };
}
export function updateWidgetContent(
  doc: StudioDocument,
  id: string,
  content: Partial<Widget["content"]>,
): StudioDocument {
  const widget = doc.widgets.find((w) => w.id === id);
  if (!widget || widget.locked) return doc;
  return {
    ...doc,
    widgets: doc.widgets.map((w) =>
      w.id === id ? { ...w, content: { ...w.content, ...content } } : w,
    ),
  };
}
export function safeImage(value: string): boolean {
  if (!value) return true;
  if (
    /^data:image\/(?:png|jpeg|webp|gif);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    ) &&
    value.length > value.indexOf(",") + 1
  )
    return true;
  if (!/^https:\/\//i.test(value) || /[\u0000-\u0020\u007f\\]/.test(value))
    return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !/\.(?:svgz?|x?html?)(?:$|\/)/i.test(decodeURIComponent(url.pathname))
    );
  } catch {
    return false;
  }
}
export function constrainWidget(
  box: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
  grid = 1,
) {
  const snap = (n: number) =>
    Math.round((Number.isFinite(n) ? n : 0) / grid) * grid;
  const width = Math.min(pageWidth, Math.max(48, snap(box.width)));
  const height = Math.min(pageHeight, Math.max(32, snap(box.height)));
  return {
    x: Math.max(0, Math.min(pageWidth - width, snap(box.x))),
    y: Math.max(0, Math.min(pageHeight - height, snap(box.y))),
    width,
    height,
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a project object.");
  return value as Record<string, unknown>;
}
function string(value: unknown, limit = 20000): string {
  if (typeof value !== "string" || value.length > limit)
    throw new Error("Invalid or oversized text field.");
  return value;
}
function number(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Numeric value must be between ${min} and ${max}.`);
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T))
    throw new Error("Unsupported project option.");
  return value as T;
}
function bool(value: unknown): boolean {
  if (typeof value !== "boolean")
    throw new Error("Invalid visibility or lock state.");
  return value;
}
function color(value: unknown): string {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
    throw new Error("Colors must use six-digit hex notation.");
  return value;
}
/** Shared strict parser: renderer also calls this for untrusted direct input. */
export function parseBackground(value: unknown): Background {
  const b = object(value);
  const type = choice(b["type"], ["solid", "linear", "radial", "image"]);
  if (type === "solid") return { type, color: color(b["color"]) };
  if (type === "image") {
    const src = string(b["src"], 3 * 1024 * 1024);
    if (!safeImage(src))
      throw new Error("Choose a safe raster background image.");
    return {
      type,
      src,
      size: choice(b["size"], ["cover", "contain", "auto"]),
      positionX: number(b["positionX"], 0, 100),
      positionY: number(b["positionY"], 0, 100),
      repeat: choice(b["repeat"], [
        "no-repeat",
        "repeat",
        "repeat-x",
        "repeat-y",
      ]),
    };
  }
  if (
    !Array.isArray(b["stops"]) ||
    b["stops"].length < 2 ||
    b["stops"].length > 8
  )
    throw new Error("Gradients need 2 to 8 ordered color stops.");
  let previous = -1;
  const stops = b["stops"].map((raw: unknown) => {
    const stop = object(raw),
      position = number(stop["position"], 0, 100);
    if (position < previous) throw new Error("Gradient stops must be ordered.");
    previous = position;
    return { color: color(stop["color"]), position };
  });
  return type === "linear"
    ? { type, angle: number(b["angle"], 0, 360), stops }
    : {
        type,
        shape: choice(b["shape"], ["circle", "ellipse"]),
        centerX: number(b["centerX"], 0, 100),
        centerY: number(b["centerY"], 0, 100),
        stops,
      };
}
export function parseTextStyle(value: unknown): TextStyle {
  const t = object(value);
  return {
    ...(t["color"] !== undefined ? { color: color(t["color"]) } : {}),
    ...(t["fontSize"] !== undefined
      ? { fontSize: number(t["fontSize"], 8, 160) }
      : {}),
    ...(t["fontFamily"] !== undefined
      ? { fontFamily: choice(t["fontFamily"], ["sans", "serif", "mono"]) }
      : {}),
    ...(t["fontWeight"] !== undefined
      ? { fontWeight: number(t["fontWeight"], 100, 900) }
      : {}),
    ...(t["lineHeight"] !== undefined
      ? { lineHeight: number(t["lineHeight"], 0.5, 3) }
      : {}),
    ...(t["letterSpacing"] !== undefined
      ? { letterSpacing: number(t["letterSpacing"], -10, 30) }
      : {}),
    ...(t["align"] !== undefined
      ? { align: choice(t["align"], ["left", "center", "right", "justify"]) }
      : {}),
    ...(t["transform"] !== undefined
      ? {
          transform: choice(t["transform"], [
            "none",
            "uppercase",
            "lowercase",
            "capitalize",
          ]),
        }
      : {}),
    ...(t["decoration"] !== undefined
      ? {
          decoration: choice(t["decoration"], [
            "none",
            "underline",
            "line-through",
          ]),
        }
      : {}),
    ...(t["italic"] !== undefined ? { italic: bool(t["italic"]) } : {}),
  };
}
export function parseLogoStyle(value: unknown): LogoStyle {
  const l = object(value);
  return {
    width: number(l["width"], 8, 640),
    height: number(l["height"], 8, 640),
    fit: choice(l["fit"], ["contain", "cover", "fill", "scale-down", "none"]),
  };
}
export function safePageTarget(value: unknown): value is string {
  return typeof value === "string" && /^[\w-]{1,100}$/.test(value);
}
function parseActions(value: unknown): Record<string, string> {
  const entries = Object.entries(object(value));
  if (entries.length > 10001) throw new Error("Too many page actions.");
  for (const [key, target] of entries)
    if (
      !/^(?:click|item:(?:0|[1-9]\d{0,3}))$/.test(key) ||
      !safePageTarget(target)
    )
      throw new Error("Actions must map click or item:N to a page ID.");
  return Object.fromEntries(entries) as Record<string, string>;
}
function parseRepeat(value: unknown): number | "infinite" {
  if (value === "infinite") return value;
  const count = number(value, 1, 20);
  if (!Number.isInteger(count))
    throw new Error("Repeat must be a whole number.");
  return count;
}
export function parseDocument(raw: string): StudioDocument {
  if (raw.length > MAX_PROJECT_BYTES)
    throw new Error("Project exceeds the 12 MB import limit.");
  const doc = object(JSON.parse(raw));
  if (doc["version"] !== 1)
    throw new Error("Unsupported project version. Expected Nimbus v1.");
  const width = number(doc["width"], 320, 2560),
    height = number(doc["height"], 320, 6000);
  if (!Array.isArray(doc["widgets"]) || doc["widgets"].length > 200)
    throw new Error("A page may contain up to 200 widgets.");
  const ids = new Set<string>();
  const widgets: Widget[] = doc["widgets"].map((rawWidget: unknown) => {
    const w = object(rawWidget),
      s = object(w["style"]),
      c = object(w["content"]),
      m = object(w["motion"]);
    const id = string(w["id"], 100);
    if (!/^[\w-]+$/.test(id) || ids.has(id))
      throw new Error("Widget IDs must be unique and valid.");
    ids.add(id);
    const kind = string(w["kind"], 50);
    if (!kinds.has(kind)) throw new Error("Unknown widget type.");
    const img = string(c["image"], 3 * 1024 * 1024);
    if (!safeImage(img))
      throw new Error(
        "Images must be HTTPS URLs or PNG, JPEG, WebP or GIF uploads.",
      );
    const geometry = {
      x: number(w["x"], 0, width),
      y: number(w["y"], 0, height),
      width: number(w["width"], 48, width),
      height: number(w["height"], 32, height),
    };
    if (
      geometry.x + geometry.width > width + 1 ||
      geometry.y + geometry.height > height + 1
    )
      throw new Error("A widget extends outside the page.");
    return {
      id,
      kind: kind as Widget["kind"],
      name: string(w["name"], 120),
      ...geometry,
      presetId: string(w["presetId"], 100),
      style: {
        ...(s["backdrop"] !== undefined
          ? { backdrop: parseBackground(s["backdrop"]) }
          : {}),
        ...(s["logo"] !== undefined ? { logo: parseLogoStyle(s["logo"]) } : {}),
        ...(s["text"] !== undefined
          ? {
              text: Object.fromEntries(
                Object.entries(object(s["text"])).map(([role, value]) => [
                  choice(role, ["title", "subtitle", "value"]),
                  parseTextStyle(value),
                ]),
              ),
            }
          : {}),
        background: color(s["background"]),
        color: color(s["color"]),
        accent: color(s["accent"]),
        borderColor: color(s["borderColor"]),
        radius: number(s["radius"], 0, 100),
        borderWidth: number(s["borderWidth"], 0, 12),
        padding: number(s["padding"], 0, 80),
        fontSize: number(s["fontSize"], 10, 96),
        fontFamily: choice(s["fontFamily"], ["sans", "serif", "mono"]),
        fontWeight: number(s["fontWeight"], 100, 900),
        shadow: choice(s["shadow"], ["none", "small", "medium", "large"]),
        opacity: number(s["opacity"], 10, 100),
      },
      content: {
        title: string(c["title"]),
        subtitle: string(c["subtitle"]),
        value: string(c["value"]),
        items: string(c["items"]),
        image: img,
        imageAlt: string(c["imageAlt"], 1000),
      },
      motion: {
        ...(m["loading"] !== undefined
          ? {
              loading: choice(m["loading"], [
                "shimmer",
                "pulse",
                "spinner",
                "static",
              ]),
            }
          : {}),
        ...(m["easing"] !== undefined
          ? {
              easing: choice(m["easing"], [
                "linear",
                "ease",
                "ease-in",
                "ease-out",
                "ease-in-out",
              ]),
            }
          : {}),
        ...(m["repeat"] !== undefined
          ? { repeat: parseRepeat(m["repeat"]) }
          : {}),
        entrance: choice(m["entrance"], ["none", "fade", "slide", "scale"]),
        hover: choice(m["hover"], ["none", "lift", "scale", "glow"]),
        click: choice(m["click"], ["none", "press", "pulse"]),
        duration: number(m["duration"], 0, 2000),
        delay: number(m["delay"], 0, 2000),
      },
      state: choice(w["state"], [
        "default",
        "loading",
        "disabled",
        "error",
        "success",
      ]),
      locked: bool(w["locked"]),
      hidden: bool(w["hidden"]),
      ...(w["actions"] !== undefined
        ? { actions: parseActions(w["actions"]) }
        : {}),
    };
  });
  return {
    version: 1,
    name: string(doc["name"], 120),
    width,
    height,
    background: color(doc["background"]),
    grid: number(doc["grid"], 1, 64),
    widgets,
    ...(doc["backdrop"] !== undefined
      ? { backdrop: parseBackground(doc["backdrop"]) }
      : {}),
  };
}
export async function readImage(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
  if (file.size > 2 * 1024 * 1024)
    throw new Error("Images must be under 2 MB.");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Unable to read image."));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      img.width * img.height <= 40_000_000
        ? resolve()
        : reject(new Error("Image dimensions are too large."));
    img.onerror = () =>
      reject(new Error("This file is not a decodable image."));
    img.src = data;
  });
  return data;
}
