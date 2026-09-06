import type { StudioProject } from "./project";
// @ts-ignore -- explicit extensions support the Node strip-types test runner.
import { RUNTIME_SOURCE } from "./runtime-source.ts";
// @ts-ignore -- explicit extensions support the Node strip-types test runner.
import { createZip } from "./zip.ts";
import type { ZipEntry } from "./zip";

export interface ExportOptions {
  scope?: "app" | "page" | "widget";
  currentPageId?: string;
  widgetId?: string;
}

// One field allowlist for extraction and the emitted runtime's local-path resolution.
const IMAGE_FIELDS: readonly string[] = ["image", "src", "url", "imageUrl"];

/** Clone before filtering so exporting never mutates editor state or undo history. */
export function scopeProject(input: StudioProject, options: ExportOptions = {}) {
  const project = structuredClone(input);
  const scope = options.scope ?? "app";
  if (!project.pages.length) throw new Error("Cannot export an empty project");
  if (scope !== "app") {
    const page = project.pages.find((page) => page.id === (options.currentPageId ?? project.startPageId));
    if (!page) throw new Error("Export page was not found");
    project.pages = [page];
    project.startPageId = page.id;
    project.name = page.document.name.trim() ? page.document.name : "Untitled page";
    if (scope === "widget") {
      const widget = page.document.widgets.find((widget) => widget.id === options.widgetId);
      if (!widget) throw new Error("Export widget was not found");
      page.document = { ...page.document, name: widget.name,
        width: Math.max(320, widget.width), height: Math.max(320, widget.height),
        widgets: [{ ...widget, x: 0, y: 0, hidden: false }] };
      project.name = widget.name.trim() ? widget.name : "Untitled widget";
    }
  }
  const ids = new Set(project.pages.map((page) => page.id));
  if (!ids.has(project.startPageId)) project.startPageId = project.pages[0]!.id;
  const warnings = new Set<string>();
  for (const page of project.pages) for (const widget of page.document.widgets) {
    for (const [action, target] of Object.entries(widget.actions ?? {})) {
      if (!ids.has(target)) {
        warnings.add(`Unavailable target "${target}" (${widget.name}, ${action}): this page is outside the export scope. Navigation is disabled.`);
        delete widget.actions![action];
      }
    }
  }
  return { project, warnings: [...warnings] };
}

const projectType = `import type { StudioDocument } from "./types";
export interface StudioProject { version: 2; name: string; startPageId: string; pages: { id: string; document: StudioDocument }[] }
`;

// Assets use a reserved safe HTTPS placeholder during shared rendering, then replace that exact
// generated URL with a local path. The renderer's untrusted-URL policy stays intact.
const runtimeIndex = `"use client";
import { useEffect, useState } from "react";
import { exportProjectHtml } from "./export";
import type { StudioProject } from "./project";
export type { StudioProject } from "./project";
export type { StudioDocument, Widget } from "./types";
export { renderPage, renderWidget, WIDGET_CSS } from "./render";
export { exportProjectHtml } from "./export";

export function NimbusPrototype({ project, assetBaseUrl = "./", startPageId }: {
  project: StudioProject; assetBaseUrl?: string; startPageId?: string;
}) {
  const [srcDoc, setSrcDoc] = useState("");
  useEffect(() => {
    const paths = new Map<string, string>();
    const prepared = JSON.parse(JSON.stringify(project, (key, value: unknown) => {
      if (${JSON.stringify(IMAGE_FIELDS)}.includes(key) && typeof value === "string" && /^assets\\/image-[1-9]\\d*\\.(png|jpeg|webp|gif)$/.test(value)) {
        const placeholder = "https://nimbus-export.invalid/" + value;
        paths.set(placeholder, value);
        return placeholder;
      }
      return value;
    })) as StudioProject;
    let html = exportProjectHtml(prepared, startPageId);
    for (const [placeholder, path] of paths) {
      const url = new URL(path, new URL(assetBaseUrl, window.location.href));
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Serve the exported project over HTTP or HTTPS");
      // Preserve CSS url() delimiters as well as HTML attributes and JSON strings.
      const safe = url.href.replace(/[<>&\"'(){};]/g, char => "%" + char.charCodeAt(0).toString(16).toUpperCase());
      html = html.split(placeholder).join(safe);
    }
    setSrcDoc(html);
  }, [project, startPageId, assetBaseUrl]);
  return <iframe title={project.name} sandbox="allow-scripts" srcDoc={srcDoc}
    style={{ border: 0, width: "100%", height: "100vh", display: "block" }} />;
}
`;

/** Copy companion: install the local package from the ZIP; never a registry-only dependency. */
export function exportProjectReact(project: StudioProject): string {
  const json = JSON.stringify(project, null, 2).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `"use client";
// Requires packages/runtime from the React ZIP: npm install ./packages/runtime
// Keep its Apache-2.0 LICENSE and THIRD_PARTY_NOTICES.md when redistributing.
import { NimbusPrototype } from "@nimbus-ui/runtime";
import type { StudioProject } from "@nimbus-ui/runtime";
const project = ${json} satisfies StudioProject;
export default function NimbusApp() { return <NimbusPrototype project={project} />; }
`;
}

export function createReactPackage(input: StudioProject, options: ExportOptions = {}) {
  const { project, warnings } = scopeProject(input, options);
  const entries: ZipEntry[] = [];
  const images = new Map<string, string>();
  const remote = new Set<string>();
  // Apply to image fields at every depth, including page/widget backdrops and logo assets.
  function assets(value: unknown, key = ""): unknown {
    if (Array.isArray(value)) return value.map((item) => assets(item));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, assets(value, key)]));
    if (typeof value !== "string" || !IMAGE_FIELDS.includes(key)) return value;
    if (/^https?:\/\//i.test(value)) remote.add(value);
    if (!/^data:/i.test(value)) return value;
    const match = /^data:image\/(png|jpeg|webp|gif);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(value);
    if (!match || !match[2]) throw new Error("Only base64 PNG, JPEG, WebP and GIF raster image assets can be packaged");
    const binary = atob(match[2]);
    // Deduplicate decoded bytes, not names supplied by users (which never become ZIP paths).
    const identity = match[1] + ":" + binary;
    let path = images.get(identity);
    if (!path) {
      path = `assets/image-${images.size + 1}.${match[1]}`;
      images.set(identity, path);
      entries.push({ name: "public/" + path, data: Uint8Array.from(binary, (char) => char.charCodeAt(0)) });
    }
    return path;
  }
  const packagedProject = assets(project) as StudioProject;
  for (const url of remote) warnings.push(`External asset requires network access; offline availability is not guaranteed: ${url}`);
  const add = (name: string, data: string) => entries.push({ name, data });
  for (const name of ["render.ts", "types.ts", "model.ts", "export.ts"]) {
    const source = RUNTIME_SOURCE[name];
    if (!source) throw new Error("Runtime source missing. Run the runtime source sync command.");
    add("packages/runtime/src/" + name, source);
  }
  add("packages/runtime/src/project.ts", projectType);
  add("packages/runtime/src/index.tsx", runtimeIndex);
  for (const name of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
    add(name, RUNTIME_SOURCE[name]!);
    add("packages/runtime/" + name, RUNTIME_SOURCE[name]!);
  }
  add("packages/runtime/package.json", JSON.stringify({ name: "@nimbus-ui/runtime", version: "0.0.0",
    private: true, type: "module", license: "Apache-2.0", exports: { ".": "./src/index.tsx" },
    peerDependencies: { react: "^19.2.8" } }, null, 2));
  add("package.json", JSON.stringify({ name: "nimbus-prototype", version: "0.0.0", private: true,
    type: "module", scripts: { dev: "vite", build: "tsc --noEmit && vite build", preview: "vite preview" },
    dependencies: { "@nimbus-ui/runtime": "file:./packages/runtime", react: "19.2.8", "react-dom": "19.2.8" },
    devDependencies: { "@types/react": "19.2.18", "@types/react-dom": "19.2.7", typescript: "7.0.2", vite: "8.2.2" },
    engines: { node: ">=22.16.0" } }, null, 2));
  add("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"],
    module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, noEmit: true,
    exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
    allowImportingTsExtensions: true, resolveJsonModule: true, esModuleInterop: true, skipLibCheck: true },
    include: ["src", "packages/runtime/src"] }, null, 2));
  add("vite.config.ts", 'import { defineConfig } from "vite";\nexport default defineConfig({ base: "./" });\n');
  add("index.html", '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nimbus prototype</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n');
  add("src/project.json", JSON.stringify(packagedProject, null, 2));
  add("src/env.d.ts", '/// <reference types="vite/client" />\n');
  add("src/App.tsx", 'import { NimbusPrototype } from "@nimbus-ui/runtime";\nimport type { StudioProject } from "@nimbus-ui/runtime";\nimport project from "./project.json";\nexport default function App() { return <NimbusPrototype project={project as StudioProject} />; }\n');
  add("src/main.tsx", 'import { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./styles.css";\ncreateRoot(document.getElementById("root")!).render(<App />);\n');
  add("src/styles.css", "html,body,#root{margin:0;min-height:100%;width:100%}body{font-family:system-ui,sans-serif}\n");
  add("README.md", `# ${project.name.replace(/[\r\n]/g, " ")}\n\nRun with Node 22.16+ and npm:\n\n\`\`\`sh\nnpm install\nnpm run dev\nnpm run build\nnpm run preview\n\`\`\`\n\nThe first install requires network access for React, TypeScript and Vite. The local file dependency @nimbus-ui/runtime is included in full under packages/runtime; no unpublished registry package is required.\n\nThe React component renders a sandboxed iframe using the full shared Nimbus renderer, types, CSS and fixed navigation source. Edit src/project.json or the runtime source. Page actions only navigate within included pages. Native fields are local; sample business actions have no backend.\n\nUploaded raster bytes are deduplicated in public/assets. Keep this folder with the app. External image URLs require network access and cannot be promised offline.\n\nCopy integration: copy packages/runtime into your app and run npm install ./packages/runtime; keep its licenses. The React copy uses this bundled package. When moving the ZIP's project.json, also copy public/assets; assetBaseUrl can point to your public base URL.\n\nNext.js: add @nimbus-ui/runtime to transpilePackages in next.config, use a client component importing NimbusPrototype, and copy assets into public/assets. Vite is the runnable scaffold supplied here.\n\nLicensing: retain LICENSE (Apache-2.0), THIRD_PARTY_NOTICES.md and the runtime copies. Preset attribution retains its complete MIT text and pinned source revision.\n\n${warnings.length ? "## Export notices\n\n" + warnings.map((warning) => "- " + warning).join("\n") : "All referenced pages are included; no external image URLs were found."}\n`);
  return { entries, warnings, project: packagedProject };
}

export function exportReactZip(project: StudioProject, options: ExportOptions = {}): Uint8Array {
  return createZip(createReactPackage(project, options).entries);
}
