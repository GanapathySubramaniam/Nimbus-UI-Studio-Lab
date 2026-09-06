import type { Background, StudioDocument, Widget, TextRole } from "./types";
// @ts-ignore Explicit extension supports the native Node strip-types test runner.
import * as visualModel from "./model.ts";
const {
  parseBackground,
  parseTextStyle,
  parseLogoStyle,
  safePageTarget,
} = visualModel;

/** React-compatible properties. Invalid direct input produces no override. */
export function backgroundProperties(
  backdrop?: Background,
): Record<string, string> {
  if (!backdrop) return {};
  try {
    const b = parseBackground(backdrop);
    if (b.type === "solid")
      return { backgroundColor: b.color, backgroundImage: "none" };
    if (b.type === "image") {
      // Encode CSS delimiters as URL bytes, not HTML entities. This remains safe in
      // raw style attributes AND React style objects, including data URLs.
      const src = b.src.startsWith("data:")
        ? b.src
        : b.src.replace(
            /["'()<>;{}]/g,
            (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
          );
      return {
        backgroundImage: src ? `url(${src})` : "none",
        backgroundPosition: `${b.positionX}% ${b.positionY}%`,
        backgroundSize: b.size,
        backgroundRepeat: b.repeat,
      };
    }
    const stops = b.stops.map((s) => `${s.color} ${s.position}%`).join(",");
    const gradient =
      b.type === "linear"
        ? `linear-gradient(${b.angle}deg,${stops})`
        : `radial-gradient(${b.shape} at ${b.centerX}% ${b.centerY}%,${stops})`;
    return {
      backgroundImage: gradient,
      backgroundPosition: "0% 0%",
      backgroundSize: "auto",
      backgroundRepeat: "no-repeat",
    };
  } catch {
    return {};
  }
}
/** Declaration-only CSS; apply after the legacy background color. */
export function backgroundStyle(backdrop?: Background): string {
  return Object.entries(backgroundProperties(backdrop))
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${value}`,
    )
    .join(";");
}
const fonts = {
  sans: "Inter,ui-sans-serif,system-ui,sans-serif",
  serif: "Georgia,ui-serif,serif",
  mono: "ui-monospace,SFMono-Regular,Consolas,monospace",
};
function visualVariables(widget: Widget): string[] {
  const output: string[] = [];
  for (const role of ["title", "subtitle", "value"] as const) {
    if (!widget.style.text?.[role]) continue;
    try {
      const text = parseTextStyle(widget.style.text[role]);
      const fields = {
        color: text.color,
        "font-size":
          text.fontSize === undefined ? undefined : `${text.fontSize}px`,
        "font-family":
          text.fontFamily === undefined ? undefined : fonts[text.fontFamily],
        "font-weight": text.fontWeight,
        "line-height": text.lineHeight,
        "letter-spacing":
          text.letterSpacing === undefined
            ? undefined
            : `${text.letterSpacing}px`,
        "text-align": text.align,
        "text-transform": text.transform,
        "text-decoration": text.decoration,
        "font-style":
          text.italic === undefined
            ? undefined
            : text.italic
              ? "italic"
              : "normal",
      };
      for (const [key, value] of Object.entries(fields))
        if (value !== undefined) output.push(`--nw-${role}-${key}:${value}`);
    } catch {
      /* Ignore unsafe direct editor overrides, just as for backgrounds. */
    }
  }
  if (widget.style.logo)
    try {
      const logo = parseLogoStyle(widget.style.logo);
      output.push(
        `--nw-logo-width:${logo.width}px`,
        `--nw-logo-height:${logo.height}px`,
        `--nw-logo-fit:${logo.fit}`,
      );
    } catch {
      /* Keep the legacy logo dimensions. */
    }
  return output;
}
function text(
  widget: Widget,
  role: TextRole,
  value = widget.content[role],
  tag: "span" | "tspan" = "span",
): string {
  const escaped = escapeHtml(value);
  return widget.style.text?.[role]
    ? `<${tag} data-nw-text="${role}">${escaped}</${tag}>`
    : escaped;
}
function action(widget: Widget, key = "click"): string {
  const target = widget.actions?.[key];
  return widget.state !== "disabled" &&
    widget.state !== "loading" &&
    safePageTarget(target)
    ? ` data-nimbus-page="${escapeHtml(target)}"`
    : "";
}

/** Escape at the HTML boundary, including attributes; never accept user HTML. */
export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function number(value: number, fallback: number, min = 0, max = 10000): number {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

// Styles may also arrive directly from the editor: do not rely on import validation.
function color(value: string, fallback: string): string {
  const candidate = value.trim();
  if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(candidate))
    return candidate;
  if (/^(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\)$/i.test(candidate))
    return candidate;
  if (
    /^(?:transparent|currentcolor|black|white|red|green|blue|gray|grey|navy|teal|purple|orange|yellow|pink|silver|maroon|olive|lime|aqua|fuchsia)$/i.test(
      candidate,
    )
  )
    return candidate;
  return fallback;
}

/** A declaration-only string safe to place inside a quoted, inline style. */
export function widgetFrameStyle(widget: Widget): string {
  const { style, motion } = widget;
  const shadows = {
    none: "none",
    small: "0 2px 6px #0f172a0a",
    medium: "0 8px 24px #0f172a12",
    large: "0 20px 48px #0f172a24",
  };
  const entrance = ["fade", "slide", "scale"].includes(motion.entrance)
    ? `nw-${motion.entrance}`
    : "none";
  return [
    `left:${number(widget.x, 0, -10000)}px`,
    `top:${number(widget.y, 0, -10000)}px`,
    `width:${number(widget.width, 320, 1)}px`,
    `height:${number(widget.height, 200, 1)}px`,
    `--nw-background:${color(style.background, "#ffffff")}`,
    `--nw-color:${color(style.color, "#172033")}`,
    `--nw-accent:${color(style.accent, "#2563eb")}`,
    `--nw-border:${color(style.borderColor, "#e2e8f0")}`,
    `--nw-radius:${number(style.radius, 12, 0, 1000)}px`,
    `--nw-border-width:${number(style.borderWidth, 1, 0, 24)}px`,
    `--nw-padding:${number(style.padding, 20, 0, 200)}px`,
    `--nw-font-size:${number(style.fontSize, 14, 8, 120)}px`,
    `--nw-font-family:${Object.hasOwn(fonts, style.fontFamily) ? fonts[style.fontFamily] : fonts.sans}`,
    `--nw-font-weight:${number(style.fontWeight, 400, 100, 900)}`,
    `--nw-shadow:${Object.hasOwn(shadows, style.shadow) ? shadows[style.shadow] : shadows.small}`,
    // The document model and inspector store percentages, not CSS fractions.
    `--nw-opacity:${number(style.opacity, 100, 10, 100) / 100}`,
    `--nw-duration:${number(motion.duration, 300, 0, 10000)}ms`,
    `--nw-delay:${number(motion.delay, 0, 0, 10000)}ms`,
    `--nw-entrance:${entrance}`,
    `--nw-hover-y:${motion.hover === "lift" ? "-4px" : "0px"}`,
    `--nw-hover-scale:${motion.hover === "scale" ? "1.025" : "1"}`,
    `--nw-hover-shadow:${motion.hover === "glow" ? "0 0 0 3px color-mix(in srgb,var(--nw-accent) 28%,transparent),var(--nw-shadow)" : "var(--nw-shadow)"}`,
    `--nw-click-scale:${motion.click === "press" ? ".97" : "var(--nw-hover-scale)"}`,
    `--nw-click-animation:${motion.click === "pulse" ? "nw-pulse" : "none"}`,
    `--nw-easing:${["linear", "ease", "ease-in", "ease-out", "ease-in-out"].includes(motion.easing ?? "") ? motion.easing : "ease"}`,
    `--nw-repeat:${motion.repeat === "infinite" ? "infinite" : Number.isInteger(motion.repeat) ? number(motion.repeat!, 1, 1, 20) : 1}`,
    ...visualVariables(widget),
    ...(style.backdrop ? [backgroundStyle(style.backdrop)] : []),
  ].join(";");
}

function safeImage(source: string): string | undefined {
  if (
    /^data:image\/(?:png|jpeg|webp|gif);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      source,
    ) &&
    source.length > source.indexOf(",") + 1
  )
    return source;
  if (!/^https:\/\//i.test(source) || /[\u0000-\u0020\u007f\\]/.test(source))
    return undefined;
  try {
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      /\.(?:svgz?|x?html?)(?:$|\/)/i.test(decodeURIComponent(url.pathname))
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function imageMarkup(widget: Widget, className: string): string {
  const source = safeImage(widget.content.image);
  return source
    ? `<img class="${className}" src="${escapeHtml(source)}" alt="${escapeHtml(widget.content.imageAlt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : "";
}

function items(widget: Widget): string[] {
  return widget.content.items
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pair(item: string): [string, string] {
  const [label = "", ...detail] = item.split("|");
  return [label.trim(), detail.join("|").trim()];
}

function heading(widget: Widget): string {
  const { title, subtitle } = widget.content;
  return `<header class="nw-header"><h2 class="nw-title">${text(widget, "title", title)}</h2>${subtitle ? `<p class="nw-muted">${text(widget, "subtitle", subtitle)}</p>` : ""}</header>`;
}

function button(widget: Widget, label: string, secondary = false): string {
  return `<button type="button" class="nw-button${secondary ? " nw-secondary" : ""}"${widget.state === "disabled" ? " disabled" : ""}>${text(widget, label === widget.content.title ? "title" : "value", label)}</button>`;
}

function badge(
  label: string,
  widget?: Widget,
  role: TextRole = "value",
): string {
  return `<span class="nw-badge">${widget ? text(widget, role, label) : escapeHtml(label)}</span>`;
}

function rows(widget: Widget, className = "nw-list"): string {
  return `<ul class="${className}">${items(widget)
    .map((item) => {
      const [label, detail] = pair(item);
      return `<li class="nw-list-item"><span class="nw-dot" aria-hidden="true"></span><div><span class="nw-item-title">${escapeHtml(label)}</span>${detail ? `<small class="nw-muted">${escapeHtml(detail)}</small>` : ""}</div></li>`;
    })
    .join("")}</ul>`;
}

function field(
  widget: Widget,
  kind: "input" | "textarea" | "select" | "search",
): string {
  const { title, subtitle, value } = widget.content;
  const disabled = widget.state === "disabled" ? " disabled" : "";
  const invalid = widget.state === "error" ? ' aria-invalid="true"' : "";
  const attributes = `class="nw-field"${widget.style.text?.value ? ' data-nw-text="value"' : ""}${disabled}${invalid}`;
  let control: string;
  if (kind === "textarea")
    control = `<textarea ${attributes} rows="3">${escapeHtml(value)}</textarea>`;
  else if (kind === "select")
    control = `<select ${attributes}>${items(widget)
      .map(
        (option) =>
          `<option${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`,
      )
      .join("")}</select>`;
  else
    control = `<input ${attributes} type="${kind === "search" ? "search" : "text"}" value="${escapeHtml(value)}">`;
  return `<label class="nw-label"><span>${text(widget, "title", title)}</span>${control}${subtitle ? `<small class="nw-muted">${text(widget, "subtitle", subtitle)}</small>` : ""}</label>`;
}

function skeleton(widget: Widget): string {
  const mode = ["shimmer", "pulse", "spinner", "static"].includes(
    widget.motion.loading ?? "",
  )
    ? widget.motion.loading
    : "shimmer";
  return `<div class="nw-skeleton-group nw-loading-${mode}" aria-hidden="true">${mode === "spinner" ? '<span class="nw-spinner"></span>' : '<span class="nw-skeleton nw-skeleton-short"></span><span class="nw-skeleton nw-skeleton-large"></span><span class="nw-skeleton"></span><span class="nw-skeleton nw-skeleton-short"></span>'}</div>`;
}

/** Charts contain only our SVG primitives; labels never become SVG markup or paths. */
function chart(widget: Widget): string {
  const data = items(widget)
    .slice(0, 12)
    .map((item, index) => {
      const [label, raw] = pair(item);
      return {
        label,
        value: number(Number.parseFloat(raw), (index + 1) * 12, 0, 1000000),
      };
    });
  if (!data.length)
    return `${heading(widget)}<p class="nw-muted">Add items as label | number to display a chart.</p>`;
  const max = Math.max(1, ...data.map((item) => item.value));
  let shapes = "";
  if (widget.kind === "donut-chart") {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let offset = 0;
    shapes =
      '<circle cx="180" cy="100" r="68" fill="none" stroke="currentColor" opacity=".1" stroke-width="22"/>';
    for (const [index, item] of data.entries()) {
      const portion = total ? (item.value / total) * 100 : 0;
      shapes += `<circle class="nw-chart-mark" cx="180" cy="100" r="68" fill="none" stroke-width="22" pathLength="100" stroke-dasharray="${portion} ${100 - portion}" stroke-dashoffset="${-offset}" transform="rotate(-90 180 100)" opacity="${1 - (index / data.length) * 0.65}"/>`;
      offset += portion;
    }
    shapes += `<text x="180" y="104" text-anchor="middle" class="nw-chart-total">${text(widget, "value", widget.content.value || String(total), "tspan")}</text>`;
  } else {
    shapes = [40, 80, 120, 160]
      .map((y) => `<path d="M24 ${y} H344" class="nw-chart-grid"/>`)
      .join("");
    const point = (index: number, value: number): [number, number] => [
      24 + (index * 320) / Math.max(1, data.length - 1),
      160 - (value / max) * 132,
    ];
    if (widget.kind === "line-chart") {
      const points = data
        .map((item, index) => point(index, item.value).join(","))
        .join(" ");
      shapes += `<polygon points="24,160 ${points} ${point(data.length - 1, 0)[0]},160" class="nw-chart-area"/><polyline points="${points}" class="nw-chart-line"/>`;
      shapes += data
        .map((item, index) => {
          const [x, y] = point(index, item.value);
          return `<circle cx="${x}" cy="${y}" r="4" class="nw-chart-mark"/>`;
        })
        .join("");
    } else {
      const step = 320 / data.length;
      shapes += data
        .map(
          (item, index) =>
            `<rect x="${24 + index * step + step * 0.2}" y="${160 - (item.value / max) * 132}" width="${step * 0.6}" height="${(item.value / max) * 132}" rx="5" class="nw-chart-mark" opacity="${0.55 + (index / data.length) * 0.45}"/>`,
        )
        .join("");
    }
    shapes += data
      .map(
        (item, index) =>
          `<text x="${widget.kind === "bar-chart" ? 24 + ((index + 0.5) * 320) / data.length : point(index, 0)[0]}" y="187" text-anchor="middle" class="nw-chart-label">${escapeHtml(item.label.slice(0, 10))}</text>`,
      )
      .join("");
  }
  const legend = `<ul class="nw-chart-legend">${data.map((item) => `<li>${escapeHtml(item.label)} <strong>${item.value}</strong></li>`).join("")}</ul>`;
  return `${heading(widget)}<svg class="nw-chart" viewBox="0 0 368 204" role="img" aria-label="${escapeHtml(widget.content.title)}"><title>${escapeHtml(widget.content.title)}: ${escapeHtml(data.map((item) => `${item.label} ${item.value}`).join(", "))}</title>${shapes}</svg>${legend}`;
}

function renderContent(widget: Widget): string {
  const { title, subtitle, value } = widget.content;
  const disabled = widget.state === "disabled" ? " disabled" : "";
  switch (widget.kind) {
    case "sidebar":
      return `<nav class="nw-sidebar" aria-label="${escapeHtml(title)}"><div class="nw-brand">${imageMarkup(widget, "nw-logo") || `<span class="nw-monogram" aria-hidden="true">${text(widget, "value", value.slice(0, 3) || title.slice(0, 2))}</span>`}<strong>${text(widget, "title", title)}</strong></div><p class="nw-muted">${text(widget, "subtitle", subtitle)}</p><div class="nw-nav-list">${items(
        widget,
      )
        .map(
          (item, index) =>
            `<button type="button" class="nw-nav-item${index === 0 ? " nw-selected" : ""}"${disabled}${action(widget, `item:${index}`)}${index === 0 ? ' aria-current="page"' : ""}><span class="nw-nav-icon" aria-hidden="true">${["◫", "◷", "▤", "◉", "⚙"][index % 5]}</span>${escapeHtml(item)}</button>`,
        )
        .join(
          "",
        )}</div><small class="nw-muted nw-nav-footer">Workspace navigation · Preview</small></nav>`;
    case "navbar":
      return `<div class="nw-navbar"><div><strong>${text(widget, "title", title)}</strong><small class="nw-muted">${text(widget, "subtitle", subtitle)}</small></div><nav class="nw-actions" aria-label="${escapeHtml(title)}">${items(
        widget,
      )
        .map((item) => button(widget, item, true))
        .join(
          "",
        )}</nav><span class="nw-monogram">${text(widget, "value", value.slice(0, 3))}</span></div>`;
    case "heading":
      return `<h1 class="nw-display">${text(widget, "title", title)}</h1><p class="nw-muted">${text(widget, "subtitle", subtitle)}</p>`;
    case "text":
      return `${heading(widget)}${value ? `<p class="nw-prose">${text(widget, "value", value)}</p>` : ""}${rows(widget)}`;
    case "stat":
      return `<p class="nw-eyebrow">${text(widget, "title", title)}</p><strong class="nw-metric">${text(widget, "value", value)}</strong><div class="nw-stat-footer">${badge(items(widget)[0] || "Overview")}<span class="nw-muted">${text(widget, "subtitle", subtitle)}</span></div>`;
    case "line-chart":
    case "bar-chart":
    case "donut-chart":
      return chart(widget);
    case "table": {
      const [headers = "", ...body] = items(widget);
      const columns = headers.split("|");
      return `${heading(widget)}<div class="nw-table-scroll"><table class="nw-table"><caption class="nw-sr-only">${text(widget, "title", title)}</caption><thead><tr>${columns.map((cell) => `<th scope="col">${escapeHtml(cell.trim())}</th>`).join("")}</tr></thead><tbody>${body
        .map((row) => {
          const cells = row.split("|");
          return `<tr>${columns.map((_, index) => `<td>${escapeHtml(cells[index]?.trim() || "—")}</td>`).join("")}</tr>`;
        })
        .join("")}</tbody></table></div>`;
    }
    case "activity":
      return `${heading(widget)}${rows(widget, "nw-list nw-timeline")}`;
    case "card":
      return `${imageMarkup(widget, "nw-card-image")}${heading(widget)}${rows(widget)}${value ? `<div class="nw-actions nw-card-action">${button(widget, value)}</div>` : ""}`;
    case "button":
      return `<div class="nw-center">${button(widget, title || value)}${subtitle ? `<small class="nw-muted">${text(widget, "subtitle", subtitle)}</small>` : ""}</div>`;
    case "input":
    case "textarea":
    case "select":
    case "search":
      return field(widget, widget.kind);
    case "checkbox":
    case "switch":
      return `<label class="nw-check-label"><input class="${widget.kind === "switch" ? "nw-switch" : "nw-checkbox"}" type="checkbox"${widget.kind === "switch" ? ' role="switch"' : ""}${/^(?:true|on|yes|1|checked)$/i.test(value) ? " checked" : ""}${disabled}><span><strong>${text(widget, "title", title)}</strong><small class="nw-muted">${text(widget, "subtitle", subtitle)}</small></span></label>`;
    case "badge":
      return `<div class="nw-center">${badge(title || value, widget, title ? "title" : "value")}</div>`;
    case "avatar":
      return `<div class="nw-identity">${imageMarkup(widget, "nw-avatar") || `<span class="nw-monogram">${text(widget, "value", value.slice(0, 3) || title.slice(0, 2))}</span>`}<div><strong>${text(widget, "title", title)}</strong><small class="nw-muted">${text(widget, "subtitle", subtitle)}</small></div></div>`;
    case "image":
      return `<figure class="nw-figure">${imageMarkup(widget, "nw-image") || `<div class="nw-image-placeholder" role="img" aria-label="${escapeHtml(widget.content.imageAlt || title)}"><span aria-hidden="true">▧</span><small>Add an image</small></div>`}<figcaption><strong>${text(widget, "title", title)}</strong><small class="nw-muted">${text(widget, "subtitle", subtitle)}</small></figcaption></figure>`;
    case "progress": {
      const percent = number(Number.parseFloat(value), 0, 0, 100);
      return `${heading(widget)}<label class="nw-label"><span class="nw-progress-label">${text(widget, "title", title)}<strong>${text(widget, "value", `${percent}%`)}</strong></span><progress class="nw-progress" max="100" value="${percent}">${percent}%</progress></label>`;
    }
    case "alert":
      return `<div class="nw-notice" role="alert"><span class="nw-notice-icon" aria-hidden="true">ⓘ</span><div>${heading(widget)}${value ? badge(value, widget) : ""}</div></div>`;
    case "tabs":
      return `${heading(widget)}<div class="nw-tabs" role="group" aria-label="${escapeHtml(title)}">${items(
        widget,
      )
        .map((item, index) => {
          const [label, detail] = pair(item);
          return `<label class="nw-tab"><input class="nw-tab-radio" type="radio" aria-label="${escapeHtml(label)}" name="${escapeHtml(`nw-tabs-${widget.id}`)}"${index === 0 ? " checked" : ""}${disabled}><span class="nw-tab-label">${escapeHtml(label)}</span><span class="nw-tab-panel">${escapeHtml(detail || subtitle)}</span></label>`;
        })
        .join("")}</div>`;
    case "accordion":
      return `${heading(widget)}<div class="nw-accordion">${items(widget)
        .map((item) => {
          const [question, answer] = pair(item);
          return `<details class="nw-details"><summary>${escapeHtml(question)}</summary><p class="nw-prose">${escapeHtml(answer)}</p></details>`;
        })
        .join("")}</div>`;
    case "breadcrumb":
      return `<nav aria-label="${escapeHtml(title || "Breadcrumb")}"><ol class="nw-breadcrumb">${items(
        widget,
      )
        .map(
          (item, index, all) =>
            `<li${index === all.length - 1 ? ' aria-current="page"' : ""}>${escapeHtml(item)}</li>`,
        )
        .join("")}</ol></nav>`;
    case "pagination":
      return `<nav class="nw-pagination" aria-label="${escapeHtml(title)}">${items(
        widget,
      )
        .map(
          (item) =>
            `<button class="nw-page-button" type="button"${item === value ? ' aria-current="page"' : ""}${disabled}>${escapeHtml(item)}</button>`,
        )
        .join(
          "",
        )}</nav><small class="nw-muted">${text(widget, "subtitle", subtitle)}</small>`;
    case "divider":
      return `<div class="nw-divider"><span>${text(widget, "title", title)}</span></div>`;
    case "skeleton":
      return `<div role="status" aria-label="${escapeHtml(title || "Loading content")}" aria-busy="true">${skeleton(widget)}<span class="nw-sr-only">${text(widget, "title", title)}</span></div>`;
    case "pricing":
      return `${badge("Monthly plan")}${heading(widget)}<p class="nw-price">${text(widget, "value", value)}<small class="nw-muted"> / month</small></p>${rows(widget, "nw-list nw-features")}<div class="nw-card-action">${button(widget, "Choose plan")}</div>`;
    case "login":
      return `${heading(widget)}<div class="nw-form"><label class="nw-label">Email address<input class="nw-field" type="email" autocomplete="email" placeholder="you@example.com"${disabled}></label><label class="nw-label">Password<input class="nw-field" type="password" autocomplete="current-password"${disabled}></label>${button(widget, value || "Sign in")}<small class="nw-muted">Interface preview · Sign-in is not connected.</small></div>`;
    case "chat":
      return `${heading(widget)}<ol class="nw-chat" aria-label="Conversation">${items(
        widget,
      )
        .map((item) => {
          const [speaker, message] = pair(item);
          return `<li class="nw-message${/^(you|user)$/i.test(speaker) ? " nw-message-user" : ""}"><strong class="nw-message-speaker">${escapeHtml(speaker)}</strong><p class="nw-prose">${escapeHtml(message)}</p></li>`;
        })
        .join("")}</ol>`;
    case "composer":
      return `<label class="nw-label"><span>${text(widget, "title", title)}</span><textarea class="nw-field" rows="2" placeholder="${escapeHtml(subtitle)}"${disabled}></textarea></label><div class="nw-composer-footer"><small class="nw-muted">Preview · Messages are not sent</small>${button(widget, value || "Send message")}</div>`;
    case "agent":
      return `<div class="nw-actions">${badge(value || "Ready", widget)}<span class="nw-muted">Agent preview</span></div>${heading(widget)}${rows(widget)}`;
    case "approval":
      return `${badge(value || "Awaiting review", widget)}${heading(widget)}${rows(widget)}<div class="nw-actions">${button(widget, "Approve")}${button(widget, "Decline", true)}</div><small class="nw-muted">Preview · No action will be executed</small>`;
    case "file":
      return `<div class="nw-identity"><span class="nw-file-icon" aria-hidden="true">${text(widget, "value", value.slice(0, 5) || "FILE")}</span><div><strong>${text(widget, "title", title)}</strong><small class="nw-muted">${text(widget, "subtitle", subtitle)}</small></div></div>`;
    case "calendar": {
      const selected = number(Number.parseInt(value, 10), 7, 1, 30);
      return `${heading(widget)}<table class="nw-calendar"><caption class="nw-sr-only">${escapeHtml(title)} · September 2026 sample</caption><thead><tr>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<th scope="col">${day}</th>`).join("")}</tr></thead><tbody>${Array.from(
        { length: 5 },
        (_, week) =>
          `<tr>${Array.from({ length: 7 }, (_, day) => {
            const date = week * 7 + day;
            return `<td>${date > 0 && date <= 30 ? `<span${date === selected ? ' class="nw-calendar-selected" aria-current="date"' : ""}>${date}</span>` : ""}</td>`;
          }).join("")}</tr>`,
      ).join("")}</tbody></table>${rows(widget)}`;
    }
    case "list":
      return `${heading(widget)}${rows(widget)}`;
    case "kanban": {
      const columns = new Map<string, string[]>();
      for (const item of items(widget)) {
        const [column, task] = pair(item);
        columns.set(column, [...(columns.get(column) ?? []), task]);
      }
      return `${heading(widget)}<div class="nw-kanban">${[...columns].map(([column, tasks]) => `<section class="nw-kanban-column"><h3 class="nw-kanban-title">${escapeHtml(column)}<span class="nw-count">${tasks.length}</span></h3>${tasks.map((task) => `<div class="nw-task">${escapeHtml(task)}</div>`).join("")}</section>`).join("")}</div>`;
    }
    case "tooltip":
      return `<div class="nw-tooltip">${heading(widget)}<details class="nw-details"><summary>${text(widget, "value", value || "More information")}</summary><p class="nw-prose">${text(widget, "subtitle", subtitle)}</p></details></div>`;
    default: {
      const exhaustive: never = widget.kind;
      return `<p class="nw-muted">Unsupported widget: ${escapeHtml(String(exhaustive))}</p>`;
    }
  }
}

/** Inner content only. Editor and exports share the same .nw-node frame contract. */
export function renderWidget(widget: Widget): string {
  if (widget.state === "loading")
    return `<div class="nw-surface nw-loading" role="status" aria-busy="true" aria-label="${escapeHtml(`Loading ${widget.content.title}`)}">${skeleton(widget)}<span class="nw-sr-only">Loading ${escapeHtml(widget.content.title)}</span></div>`;
  const disabled = widget.state === "disabled";
  const status =
    widget.state === "error"
      ? '<p class="nw-state-message nw-error" role="alert">Something went wrong. Please try again.</p>'
      : widget.state === "success"
        ? '<p class="nw-state-message nw-success" role="status">Completed successfully.</p>'
        : "";
  const target = action(widget);
  return `<div class="nw-surface${disabled ? " nw-disabled" : ""}"${disabled ? ' aria-disabled="true" inert' : ""}${target}${target ? ` tabindex="0" role="link" aria-label="${escapeHtml(widget.content.title || widget.name)}"` : ""}>${status}${renderContent(widget)}</div>`;
}

/** A page fragment; no scripts, global styles, editor handles, or backend behavior. */
export function renderPage(document: StudioDocument): string {
  const style = `width:${number(document.width, 1200, 1)}px;min-height:${number(document.height, 900, 1)}px;background:${color(document.background, "#f8fafc")}${document.backdrop ? `;${backgroundStyle(document.backdrop)}` : ""}`;
  return `<main class="nw-page" aria-label="${escapeHtml(document.name)}" style="${escapeHtml(style)}">${document.widgets
    .filter((widget) => !widget.hidden)
    .map(
      (widget) =>
        `<section class="nw-node" data-id="${escapeHtml(widget.id)}" style="${escapeHtml(widgetFrameStyle(widget))}">${renderWidget(widget)}</section>`,
    )
    .join("")}</main>`;
}

/** Self-contained styles, scoped to nw classes so editor chrome is unaffected. */
export const WIDGET_CSS = `
${(["title", "subtitle", "value"] as const).map((role) => `.nw-node [data-nw-text="${role}"] {${["color", "font-size", "font-family", "font-weight", "line-height", "letter-spacing", "text-align", "text-transform", "text-decoration", "font-style"].map((property) => `${property}:var(--nw-${role}-${property},inherit)`).join(";")}}`).join("\n")}
.nw-node span[data-nw-text] { display:block; min-width:0 }
.nw-node .nw-muted:has(>[data-nw-text="subtitle"]) { opacity:1 }
.nw-surface[data-nimbus-page] { cursor:pointer }
.nw-surface[data-nimbus-page]:focus-visible { outline:3px solid var(--nw-accent); outline-offset:-3px }
.nw-node .nw-logo,.nw-brand>.nw-monogram { width:var(--nw-logo-width,42px); height:var(--nw-logo-height,42px); object-fit:var(--nw-logo-fit,cover) }
.nw-loading-static .nw-skeleton { animation:none }
.nw-loading-pulse .nw-skeleton { animation:nw-loading-pulse var(--nw-duration,1200ms) var(--nw-easing,ease-in-out) var(--nw-delay,0ms) infinite }
.nw-loading-shimmer .nw-skeleton { background:linear-gradient(100deg,color-mix(in srgb,currentColor 8%,transparent) 20%,color-mix(in srgb,currentColor 20%,transparent) 50%,color-mix(in srgb,currentColor 8%,transparent) 80%); background-size:200% 100%; animation:nw-loading-shimmer var(--nw-duration,1200ms) var(--nw-easing,ease) var(--nw-delay,0ms) infinite }
.nw-loading-spinner { place-items:center; align-content:center; min-height:80px }
.nw-spinner { width:32px; height:32px; border:3px solid color-mix(in srgb,var(--nw-accent) 20%,transparent); border-top-color:var(--nw-accent); border-radius:50%; animation:nw-spin var(--nw-duration,800ms) var(--nw-easing,linear) var(--nw-delay,0ms) infinite }
@keyframes nw-spin { to { transform:rotate(360deg) } }
@keyframes nw-loading-pulse { 50% { opacity:.35 } }
@keyframes nw-loading-shimmer { from { background-position:200% 0 } to { background-position:-200% 0 } }
.nw-page {
  position:relative;
  isolation:isolate;
  box-sizing:border-box;
  max-width:none;
  margin:0 auto;
  color:#172033;
  font-family:Inter,ui-sans-serif,system-ui,sans-serif
}

.nw-node {
  position:absolute;
  box-sizing:border-box;
  min-width:0;
  color:var(--nw-color,#172033);
  background:var(--nw-background,#fff);
  border:var(--nw-border-width,1px) solid var(--nw-border,#e2e8f0);
  border-radius:var(--nw-radius,12px);
  box-shadow:var(--nw-shadow,none);
  opacity:var(--nw-opacity,1);
  font:var(--nw-font-weight,400) var(--nw-font-size,14px)/1.5 var(--nw-font-family,system-ui,sans-serif);
  transition:translate var(--nw-duration,300ms) var(--nw-easing,ease) var(--nw-delay,0ms),scale var(--nw-duration,300ms) var(--nw-easing,ease) var(--nw-delay,0ms),box-shadow var(--nw-duration,300ms) var(--nw-easing,ease) var(--nw-delay,0ms)
}

.nw-node:hover {
  translate:0 var(--nw-hover-y,0px);
  scale:var(--nw-hover-scale,1);
  box-shadow:var(--nw-hover-shadow,var(--nw-shadow,none))
}

.nw-node:active {
  scale:var(--nw-click-scale,1);
  animation:var(--nw-click-animation,none) var(--nw-duration,300ms) var(--nw-easing,ease) var(--nw-delay,0ms)
}

.nw-node:has(.nw-disabled) {
  translate:none;
  scale:none;
  animation:none
}

.nw-surface {
  box-sizing:border-box;
  width:100%;
  height:100%;
  padding:var(--nw-padding,20px);
  overflow:auto;
  border-radius:inherit;
  overflow-wrap:anywhere;
  animation:var(--nw-entrance,none) var(--nw-duration,300ms) var(--nw-easing,ease) var(--nw-delay,0ms) var(--nw-repeat,1) both
}

.nw-surface *,.nw-surface *::before,.nw-surface *::after {
  box-sizing:border-box
}

.nw-surface :where(h1,h2,h3,p,ul,ol,figure) {
  margin:0
}

.nw-surface :where(button,input,textarea,select) {
  font:inherit;
  color:inherit
}

.nw-surface :where(button,input,textarea,select,summary):focus-visible {
  outline:3px solid var(--nw-accent,#2563eb);
  outline-offset:3px
}

.nw-header {
  margin-bottom:16px
}

.nw-title {
  font-size:1.12em;
  font-weight:650;
  letter-spacing:-.025em;
  line-height:1.3
}

.nw-header .nw-muted {
  margin-top:5px
}

.nw-muted {
  color:inherit;
  opacity:.68;
  font-size:.86em;
  line-height:1.5
}

.nw-identity small,.nw-list-item small,.nw-navbar small,.nw-check-label small,.nw-figure small {
  display:block;
  margin-top:3px
}

.nw-display {
  font-size:2.25em;
  line-height:1.12;
  letter-spacing:-.045em;
  font-weight:700;
  margin-bottom:10px!important
}

.nw-prose {
  white-space:pre-wrap;
  line-height:1.65
}

.nw-eyebrow {
  font-size:.9em;
  opacity:.7
}

.nw-metric {
  display:block;
  font-size:2.55em;
  line-height:1.25;
  letter-spacing:-.055em;
  font-weight:680;
  font-variant-numeric:tabular-nums;
  margin:6px 0 8px
}

.nw-stat-footer {
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap
}

.nw-actions {
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap
}

.nw-center {
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  flex-direction:column
}

.nw-card-action {
  margin-top:20px
}

.nw-card-image {
  display:block;
  width:100%;
  height:auto;
  aspect-ratio:16 / 9;
  max-height:180px;
  object-fit:cover;
  border-radius:calc(var(--nw-radius,12px)*.6);
  margin-bottom:16px
}

.nw-button {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:40px;
  padding:9px 16px;
  border:1px solid transparent;
  border-radius:calc(var(--nw-radius,12px)*.6);
  background:var(--nw-accent,#2563eb);
  color:#fff!important;
  font-weight:600!important;
  line-height:1.25;
  cursor:pointer;
  max-width:100%;
  white-space:normal
}

.nw-button:hover {
  filter:brightness(.94)
}

.nw-secondary {
  background:transparent;
  color:inherit!important;
  border-color:var(--nw-border,#e2e8f0)
}

.nw-button:disabled,.nw-field:disabled,.nw-surface input:disabled {
  cursor:not-allowed;
  opacity:.55
}

.nw-badge {
  display:inline-flex;
  align-items:center;
  gap:6px;
  border-radius:999px;
  padding:4px 10px;
  font-size:.78em;
  font-weight:650;
  line-height:1.4;
  color:var(--nw-accent,#2563eb);
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 12%,transparent)
}

.nw-list {
  list-style:none;
  padding:0;
  display:grid;
  gap:14px;
  margin-top:12px!important
}

.nw-list-item {
  display:flex;
  gap:11px;
  align-items:flex-start
}

.nw-item-title {
  font-size:.94em
}

.nw-dot {
  width:7px;
  height:7px;
  border-radius:50%;
  background:var(--nw-accent,#2563eb);
  flex:0 0 auto;
  margin-top:.55em
}

.nw-timeline .nw-list-item {
  position:relative;
  padding-bottom:8px
}

.nw-timeline .nw-list-item:not(:last-child)::after {
  content:'';
  position:absolute;
  left:3px;
  top:20px;
  bottom:-9px;
  width:1px;
  background:var(--nw-border,#e2e8f0)
}

.nw-sidebar {
  display:flex;
  flex-direction:column;
  min-height:100%;
  gap:16px
}

.nw-brand,.nw-identity {
  display:flex;
  align-items:center;
  gap:12px
}

.nw-brand strong {
  font-size:1.1em;
  letter-spacing:-.03em
}

.nw-monogram,.nw-logo,.nw-avatar {
  width:42px;
  height:42px;
  flex-shrink:0;
  border-radius:30%;
  object-fit:cover
}

.nw-monogram {
  display:grid;
  place-items:center;
  background:var(--nw-accent,#2563eb);
  color:#fff;
  font-weight:700
}

.nw-avatar {
  border-radius:50%
}

.nw-nav-list {
  display:grid;
  gap:6px;
  margin-top:14px
}

.nw-nav-item {
  display:flex;
  align-items:center;
  gap:12px;
  text-align:left;
  padding:12px;
  border:0;
  border-radius:8px;
  background:transparent;
  cursor:pointer
}

.nw-nav-item:hover,.nw-selected {
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 11%,transparent);
  color:var(--nw-accent,#2563eb)
}

.nw-nav-icon {
  width:18px;
  text-align:center;
  font-size:1.2em
}

.nw-nav-footer {
  margin-top:auto;
  padding-top:24px
}

.nw-surface:has(>.nw-navbar) {
  padding-block:min(var(--nw-padding,20px),10px)
}

.nw-navbar .nw-monogram {
  width:36px;
  height:36px
}

.nw-navbar .nw-button {
  min-height:36px;
  padding-block:7px
}

.nw-navbar {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  min-height:100%
}

.nw-label {
  display:grid;
  gap:7px;
  font-size:.93em;
  font-weight:550
}

.nw-label small {
  font-weight:400
}

.nw-field {
  display:block;
  width:100%;
  min-width:0;
  min-height:40px;
  border:1px solid var(--nw-border,#e2e8f0);
  border-radius:7px;
  padding:9px 11px;
  background:var(--nw-background,#fff);
  box-shadow:0 1px 2px #00000005;
  line-height:1.5
}

.nw-field[aria-invalid=true] {
  border-color:#dc2626
}

.nw-field::placeholder {
  color:inherit;
  opacity:.5
}

.nw-surface textarea {
  resize:vertical
}

.nw-check-label {
  display:flex;
  align-items:center;
  gap:12px;
  cursor:pointer
}

.nw-checkbox,.nw-switch {
  accent-color:var(--nw-accent,#2563eb);
  width:18px;
  height:18px;
  flex-shrink:0
}

.nw-switch {
  appearance:none;
  width:38px;
  height:22px;
  border-radius:99px;
  background:color-mix(in srgb,var(--nw-color,#172033) 22%,var(--nw-background,#fff));
  position:relative;
  cursor:pointer
}

.nw-switch::after {
  content:'';
  position:absolute;
  top:3px;
  left:3px;
  width:16px;
  height:16px;
  background:#fff;
  border-radius:50%;
  box-shadow:0 1px 3px #0002;
  transition:translate var(--nw-duration,300ms) ease var(--nw-delay,0ms)
}

.nw-switch:checked {
  background:var(--nw-accent,#2563eb)
}

.nw-switch:checked::after {
  translate:16px 0
}

.nw-form {
  display:grid;
  gap:18px
}

.nw-figure {
  display:flex;
  flex-direction:column;
  gap:12px;
  height:100%
}

.nw-image {
  display:block;
  width:100%;
  min-height:0;
  flex:1;
  object-fit:cover;
  border-radius:calc(var(--nw-radius,12px)*.6)
}

.nw-image-placeholder {
  min-height:80px;
  flex:1;
  display:grid;
  align-content:center;
  justify-items:center;
  gap:8px;
  border-radius:8px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--nw-accent,#2563eb) 12%,transparent),color-mix(in srgb,var(--nw-accent,#2563eb) 3%,transparent));
  border:1px dashed var(--nw-border,#e2e8f0)
}

.nw-image-placeholder>span {
  font-size:3em;
  opacity:.5
}

.nw-progress-label {
  display:flex;
  justify-content:space-between;
  gap:12px
}

.nw-progress {
  width:100%;
  height:10px;
  appearance:none;
  border:none;
  border-radius:99px;
  overflow:hidden;
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 12%,transparent);
  accent-color:var(--nw-accent,#2563eb)
}

.nw-progress::-webkit-progress-bar {
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 12%,transparent)
}

.nw-progress::-webkit-progress-value {
  background:var(--nw-accent,#2563eb);
  border-radius:99px
}

.nw-progress::-moz-progress-bar {
  background:var(--nw-accent,#2563eb);
  border-radius:99px
}

.nw-chart {
  display:block;
  width:100%;
  height:calc(100% - 88px);
  min-height:100px;
  max-height:210px;
  overflow:visible
}

.nw-chart-grid {
  stroke:currentColor;
  opacity:.09;
  fill:none
}

.nw-chart-line {
  fill:none;
  stroke:var(--nw-accent,#2563eb);
  stroke-width:3;
  stroke-linejoin:round;
  stroke-linecap:round
}

.nw-chart-area {
  fill:var(--nw-accent,#2563eb);
  opacity:.1
}

.nw-chart-mark {
  fill:var(--nw-accent,#2563eb);
  stroke:var(--nw-accent,#2563eb)
}

.nw-chart circle[fill=none] {
  fill:none
}

.nw-chart-label {
  fill:currentColor;
  font-size:10px;
  opacity:.65
}

.nw-chart-total {
  fill:currentColor;
  font-size:24px;
  font-weight:700
}

.nw-chart-legend {
  list-style:none;
  padding:0;
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
  gap:6px 16px;
  font-size:.75em;
  opacity:.8
}

.nw-chart-legend strong {
  margin-left:5px;
  font-variant-numeric:tabular-nums
}

.nw-table-scroll {
  overflow:auto
}

.nw-table {
  border-collapse:collapse;
  width:100%;
  text-align:left;
  font-size:.88em
}

.nw-table th {
  font-weight:550;
  opacity:.65;
  font-size:.9em;
  background:color-mix(in srgb,var(--nw-color,#172033) 3%,transparent)
}

.nw-table th,.nw-table td {
  padding:8px 14px;
  border-bottom:1px solid var(--nw-border,#e2e8f0);
  white-space:nowrap
}

.nw-table tbody tr:hover {
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 5%,transparent)
}

.nw-notice {
  display:flex;
  align-items:flex-start;
  gap:12px
}

.nw-notice-icon {
  font-size:1.4em;
  color:var(--nw-accent,#2563eb)
}

.nw-notice .nw-header {
  margin-bottom:8px
}

.nw-state-message {
  display:flex;
  align-items:center;
  gap:8px;
  padding:9px 12px;
  margin-bottom:12px!important;
  border-radius:7px;
  font-size:.85em;
  font-weight:550
}

.nw-error {
  background:#fef2f2;
  color:#991b1b;
  border:1px solid #fecaca
}

.nw-success {
  background:#f0fdf4;
  color:#166534;
  border:1px solid #bbf7d0
}

.nw-disabled {
  opacity:.55;
  cursor:not-allowed;
  user-select:none
}

.nw-details {
  border-bottom:1px solid var(--nw-border,#e2e8f0);
  padding:10px 0
}

.nw-details summary {
  cursor:pointer;
  font-weight:550;
  min-height:28px
}

.nw-details .nw-prose {
  margin-top:8px;
  font-size:.9em;
  opacity:.75
}

.nw-tabs {
  display:flex;
  position:relative;
  flex-wrap:wrap;
  gap:4px;
  padding-bottom:90px
}

.nw-tab {
  cursor:pointer
}

.nw-tab-radio {
  position:absolute;
  width:1px;
  height:1px;
  opacity:0
}

.nw-tab-label {
  display:block;
  padding:9px 14px;
  border-radius:7px;
  font-size:.9em
}

.nw-tab-radio:checked+.nw-tab-label {
  color:var(--nw-accent,#2563eb);
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 12%,transparent);
  font-weight:600
}

.nw-tab-radio:focus-visible+.nw-tab-label {
  outline:3px solid var(--nw-accent,#2563eb);
  outline-offset:2px
}

.nw-tab-panel {
  display:none;
  position:absolute;
  left:0;
  right:0;
  top:56px;
  cursor:default;
  line-height:1.6;
  font-size:.92em;
  white-space:pre-wrap
}

.nw-tab-radio:checked~.nw-tab-panel {
  display:block
}

.nw-breadcrumb {
  list-style:none;
  padding:0;
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  font-size:.9em
}

.nw-breadcrumb li:not(:last-child) {
  opacity:.6
}

.nw-breadcrumb li+li::before {
  content:'/';
  margin-right:10px;
  opacity:.4
}

.nw-pagination {
  display:flex;
  gap:5px;
  margin-bottom:7px
}

.nw-page-button {
  min-width:36px;
  min-height:36px;
  border:1px solid var(--nw-border,#e2e8f0);
  background:transparent;
  border-radius:7px;
  cursor:pointer
}

.nw-page-button[aria-current] {
  background:var(--nw-accent,#2563eb);
  color:#fff
}

.nw-divider {
  display:flex;
  align-items:center;
  gap:16px;
  min-height:100%;
  font-size:.8em;
  opacity:.6
}

.nw-divider::before,.nw-divider::after {
  content:'';
  height:1px;
  background:var(--nw-border,#e2e8f0);
  flex:1
}

.nw-skeleton-group {
  display:grid;
  gap:12px;
  align-content:center;
  min-height:100%
}

.nw-skeleton {
  display:block;
  min-height:12px;
  border-radius:6px;
  background:color-mix(in srgb,var(--nw-color,#172033) 9%,var(--nw-background,#fff));
  animation:nw-shimmer var(--nw-duration,1200ms) ease-in-out var(--nw-delay,0ms) infinite alternate
}

.nw-skeleton-short {
  width:58%
}

.nw-skeleton-large {
  height:50px
}

.nw-price {
  font-size:2.7em;
  letter-spacing:-.055em;
  font-weight:700;
  margin:16px 0!important
}

.nw-price small {
  font-size:.3em;
  font-weight:400;
  letter-spacing:0
}

.nw-features .nw-dot {
  border-radius:2px
}

.nw-surface>.nw-badge {
  margin-bottom:14px
}

.nw-chat {
  list-style:none;
  padding:0;
  display:flex;
  flex-direction:column;
  gap:12px
}

.nw-message {
  max-width:90%;
  padding:12px 14px;
  border-radius:12px 12px 12px 3px;
  background:color-mix(in srgb,var(--nw-color,#172033) 5%,transparent)
}

.nw-message-user {
  align-self:flex-end;
  border-radius:12px 12px 3px 12px;
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 12%,transparent)
}

.nw-message-speaker {
  font-size:.75em;
  opacity:.65
}

.nw-message .nw-prose {
  font-size:.9em;
  margin-top:4px
}

.nw-composer-footer {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-top:10px
}

.nw-file-icon {
  display:grid;
  place-items:center;
  width:48px;
  height:56px;
  flex-shrink:0;
  background:color-mix(in srgb,var(--nw-accent,#2563eb) 10%,transparent);
  border:1px solid var(--nw-border,#e2e8f0);
  border-radius:8px;
  color:var(--nw-accent,#2563eb);
  font-size:.75em;
  font-weight:700
}

.nw-calendar {
  width:100%;
  table-layout:fixed;
  text-align:center;
  font-size:.84em;
  border-spacing:2px
}

.nw-calendar th {
  font-size:.75em;
  font-weight:500;
  opacity:.6
}

.nw-calendar td {
  height:32px
}

.nw-calendar td span {
  display:inline-grid;
  place-items:center;
  width:28px;
  height:28px;
  border-radius:50%
}

.nw-calendar-selected {
  background:var(--nw-accent,#2563eb);
  color:#fff
}

.nw-kanban {
  display:flex;
  align-items:flex-start;
  gap:12px;
  overflow:auto
}

.nw-kanban-column {
  flex:1;
  min-width:140px;
  padding:12px;
  border-radius:9px;
  background:color-mix(in srgb,var(--nw-color,#172033) 4%,transparent)
}

.nw-kanban-title {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  font-size:.85em;
  font-weight:600;
  margin-bottom:12px!important
}

.nw-count {
  font-size:.8em;
  opacity:.6
}

.nw-task {
  padding:12px;
  margin-top:8px;
  background:var(--nw-background,#fff);
  border:1px solid var(--nw-border,#e2e8f0);
  border-radius:7px;
  box-shadow:0 1px 2px #00000004;
  font-size:.88em
}

.nw-sr-only {
  position:absolute;
  width:1px;
  height:1px;
  padding:0;
  margin:-1px;
  overflow:hidden;
  clip-path:inset(50%);
  white-space:nowrap;
  border:0
}

@keyframes nw-fade {
  from {
    opacity:0
  }
  to {
    opacity:1
  }
}

@keyframes nw-slide {
  from {
    opacity:0;
    transform:translateY(14px)
  }
  to {
    opacity:1;
    transform:translateY(0)
  }
}

@keyframes nw-scale {
  from {
    opacity:0;
    transform:scale(.94)
  }
  to {
    opacity:1;
    transform:scale(1)
  }
}

@keyframes nw-pulse {
  50% {
    filter:brightness(1.12);
    box-shadow:0 0 0 6px color-mix(in srgb,var(--nw-accent,#2563eb) 20%,transparent)
  }
}

@keyframes nw-shimmer {
  from {
    opacity:.45
  }
  to {
    opacity:1
  }
}

@media (max-width:600px) {
  .nw-page {
    width:100%!important;
    min-height:100vh!important;
    display:flex;
    flex-direction:column;
    gap:16px;
    padding:16px
  }
  .nw-page>.nw-node {
    position:relative;
    left:auto!important;
    top:auto!important;
    width:100%!important;
    height:auto!important;
    min-height:64px;
    flex-shrink:0
  }
  .nw-page>.nw-node>.nw-surface {
    height:auto;
    min-height:inherit
  }
  .nw-page .nw-navbar {
    flex-wrap:wrap
  }
  .nw-page .nw-navbar .nw-actions {
    order:3;
    width:100%
  }
  .nw-page .nw-kanban {
    flex-direction:column
  }
  .nw-page .nw-kanban-column {
    width:100%;
    min-width:0
  }
  .nw-page .nw-composer-footer {
    flex-wrap:wrap
  }
  .nw-page .nw-chart {
    max-height:240px
  }
  .nw-page .nw-image {
    min-height:180px
  }
  .nw-page .nw-loading {
    min-height:160px!important
  }
}

@media (prefers-reduced-motion:reduce) {
  .nw-node,.nw-surface,.nw-surface *,.nw-surface *::before,.nw-surface *::after {
    animation:none!important;
    transition:none!important;
    scroll-behavior:auto!important
  }
  .nw-node:hover,.nw-node:active {
    translate:none;
    scale:none
  }
}

@media (forced-colors:active) {
  .nw-node,.nw-button,.nw-badge,.nw-field,.nw-page-button {
    border:1px solid CanvasText
  }
  .nw-switch {
    appearance:auto
  }
  .nw-switch::after {
    display:none
  }
  .nw-chart-mark {
    fill:CanvasText;
    stroke:CanvasText
  }
  .nw-chart-line {
    stroke:CanvasText
  }
  .nw-tab-radio:checked+.nw-tab-label {
    outline:2px solid Highlight
  }
}
`;
