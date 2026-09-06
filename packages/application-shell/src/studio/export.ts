import type { StudioDocument } from "./types";
import type { StudioProject } from "./project";
// Explicit .ts supports the dependency-free Node 22 strip-types test runner.
// @ts-ignore -- the workspace's bundler resolves .ts; its shared config omits allowImportingTsExtensions.
import { escapeHtml, renderPage, WIDGET_CSS } from "./render.ts";

// Plain-text excerpt of THIRD_PARTY_NOTICES.md, kept with portable exports.
// Regression tests compare the complete MIT text and revision to that source.
// This constant intentionally contains no imported analysis or Markdown payload.
const PRESET_ATTRIBUTION = `Adapted preset token data: VoltAgent/awesome-design-md.
Source: https://github.com/VoltAgent/awesome-design-md
Source commit: 8147538b4226ae41e2487a9179e3bcc1f68e8554
Pinned source: https://github.com/VoltAgent/awesome-design-md/tree/8147538b4226ae41e2487a9179e3bcc1f68e8554/design-md
Presets are independent interpretations, not official company design systems.

MIT License

Copyright (c) 2026 VoltAgent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export function exportHtml(document: StudioDocument): string {
  return `<!doctype html>
<!--
${PRESET_ATTRIBUTION}
-->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(document.name)}</title>
<style>${WIDGET_CSS}</style>
</head>
<body style="margin:0">${renderPage(document)}</body>
</html>`;
}

/** JSON strings prevent template interpolation and source/HTML closing-tag injection. */
function literal(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function exportReact(document: StudioDocument): string {
  return `/*
${PRESET_ATTRIBUTION}
*/
// Portable React TSX. Uses the automatic JSX runtime; no Nimbus dependencies.
// Native fields work locally. Sample business actions are not connected to services.
const html = ${literal(renderPage(document))};
const css = ${literal(WIDGET_CSS)};

export default function NimbusPage() {
  return (
    <>
      <style>{css}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
`;
}

/** Only allowlisted action keys and destinations enter the navigation payload. */
export function projectPages(project: StudioProject) {
  if (!project.pages.length) throw new Error("Cannot export an empty project");
  const ids = new Set(project.pages.map((page) => page.id));
  if (ids.size !== project.pages.length) throw new Error("Duplicate project page ID");
  return project.pages.map((page) => ({
    id: page.id,
    name: page.document.name,
    html: renderPage(page.document),
    actions: Object.fromEntries(page.document.widgets
      .filter((widget) => !widget.hidden && widget.state !== "disabled" && widget.state !== "loading")
      .map((widget) => [widget.id, Object.fromEntries(Object.entries(widget.actions ?? {})
        .filter(([key, target]) => /^(?:click|item:(?:0|[1-9]\d*))$/.test(key) && ids.has(target)))])),
  }));
}

// Fixed application code. User data lives exclusively in escaped JSON and safe renderer output.
// Also used verbatim by the bundled React runtime inside its isolated iframe.
export const PROJECT_NAVIGATION_SCRIPT = `(() => {
  "use strict";
  const data = JSON.parse(document.getElementById("nimbus-data").textContent);
  const host = document.getElementById("nimbus-root");
  let current;
  const show = (id, focus) => {
    const page = data.pages.find(page => page.id === id);
    if (!page) return;
    current = page;
    host.innerHTML = page.html;
    document.title = page.name;
    for (const node of host.querySelectorAll("[data-id]")) {
      const actions = Object.hasOwn(page.actions, node.getAttribute("data-id")) ? page.actions[node.getAttribute("data-id")] : null;
      if (actions && Object.hasOwn(actions, "click") && !node.querySelector(".nw-surface[data-nimbus-page]")) {
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "link");
      }
      for (const item of node.querySelectorAll("[data-nimbus-page]")) {
        if (!data.pages.some(page => page.id === item.getAttribute("data-nimbus-page"))) {
          if (item.classList.contains("nw-surface")) {
            item.removeAttribute("tabindex"); item.removeAttribute("role");
          } else item.setAttribute("aria-disabled", "true");
        }
      }
    }
    if (focus) {
      const main = host.querySelector("main");
      if (main) { main.setAttribute("tabindex", "-1"); main.focus(); }
    }
    if (window.parent !== window) window.parent.postMessage({ type: "nimbus:page", pageId: page.id }, "*");
  };
  const navigate = (event) => {
    if (!event.target || typeof event.target.closest !== "function") return;
    const node = event.target.closest("[data-id]");
    if (!node || event.target.closest('[inert], [aria-disabled="true"], :disabled')) return;
    const item = event.target.closest("[data-nimbus-page]");
    const sidebarItem = event.target.closest(".nw-nav-item");
    if (sidebarItem && !sidebarItem.hasAttribute("data-nimbus-page")) return;
    const nativeControl = event.target.closest("input,textarea,select,a[href],summary");
    if (nativeControl && (!item || item.classList.contains("nw-surface"))) return;
    if (event.type === "keydown") {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target !== node && !item) return;
      if (event.repeat) return;
    }
    const id = node.getAttribute("data-id");
    const actions = Object.hasOwn(current.actions, id) ? current.actions[id] : null;
    if (!actions) return;
    const target = item ? item.getAttribute("data-nimbus-page") : actions.click;
    if (!Object.values(actions).includes(target)) return;
    if (!data.pages.some(page => page.id === target)) return;
    event.preventDefault();
    show(target, true);
  };
  host.addEventListener("click", navigate);
  host.addEventListener("keydown", navigate);
  host.addEventListener("submit", event => event.preventDefault());
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && window.parent !== window) {
      window.parent.postMessage({ type: "nimbus:close-preview" }, "*");
    }
  });
  show(data.startPageId, false);
})();`;

export function exportProjectHtml(project: StudioProject, startPageId?: string): string {
  const pages = projectPages(project);
  const start = pages.find((page) => page.id === startPageId)
    ?? pages.find((page) => page.id === project.startPageId) ?? pages[0]!;
  const payload = JSON.stringify({ startPageId: start.id, pages })
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<!doctype html>
<!--\n${PRESET_ATTRIBUTION}\n-->
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(project.name)}</title><style>${WIDGET_CSS}</style></head>
<body style="margin:0"><div id="nimbus-root">${start.html}</div>
<script id="nimbus-data" type="application/json">${payload}</script>
<script>${PROJECT_NAVIGATION_SCRIPT}</script></body></html>`;
}
