import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "../../packages/application-shell/src/studio/model.ts";
import { designPresets } from "../../packages/application-shell/src/studio/presets.ts";
import { renderPage } from "../../packages/application-shell/src/studio/render.ts";
import type { StudioDocument } from "../../packages/application-shell/src/studio/types.ts";

// Use the real consumer bundler: studio imports follow TypeScript's bundler resolution.
const appRequire = createRequire(
  new URL("../../apps/reference-vite/package.json", import.meta.url),
);
const { build } = await import(pathToFileURL(appRequire.resolve("vite")).href);
const built = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    write: false,
    minify: false,
    lib: {
      entry: fileURLToPath(
        new URL(
          "../../packages/application-shell/src/studio/templates.ts",
          import.meta.url,
        ),
      ),
      formats: ["cjs"],
    },
  },
});
const bundle = Array.isArray(built) ? built[0] : built;
const code = bundle.output.find(
  (item: { type: string }) => item.type === "chunk",
)?.code;
assert.ok(code);
const module = { exports: {} };
new Function("require", "module", "exports", code)(
  appRequire,
  module,
  module.exports,
);
const { createTemplate, templateCatalog } = module.exports as {
  createTemplate: (id: string) => StudioDocument;
  templateCatalog: {
    id: string;
    name: string;
    description: string;
    category: string;
  }[];
};

test("gallery offers 17 complete pages and a separate blank without removing any of the 75 presets", () => {
  assert.equal(templateCatalog?.length, 17);
  assert.equal(new Set(templateCatalog.map((entry) => entry.id)).size, 17);
  assert.equal(new Set(templateCatalog.map((entry) => entry.name)).size, 17);
  assert.ok(!templateCatalog.some((entry) => entry.id === "blank"));
  for (const id of ["dashboard", "agent", "settings"]) {
    assert.ok(
      templateCatalog.some((entry) => entry.id === id),
      `Legacy ID ${id}`,
    );
  }
  for (const entry of templateCatalog) {
    assert.ok(entry.name && entry.description && entry.category);
    assert.equal(createTemplate(entry.id).name, entry.name);
  }
  assert.equal(designPresets.length, 75);
  assert.deepEqual(createTemplate("blank").widgets, []);
});

test("every template has bounded nonoverlapping geometry, stable unique IDs and exact JSON round trips", () => {
  assert.equal(templateCatalog?.length, 17);
  const allIds = new Set<string>();
  for (const id of [...templateCatalog.map((entry) => entry.id), "blank"]) {
    const doc = createTemplate(id);
    assert.deepEqual(
      parseDocument(JSON.stringify(doc)),
      doc,
      `${id}: round trip`,
    );
    assert.deepEqual(
      createTemplate(id),
      doc,
      `${id}: deterministic composition`,
    );
    if (id !== "blank")
      assert.ok(doc.widgets.length >= 8, `${id}: complete page`);
    for (const widget of doc.widgets) {
      assert.ok(!allIds.has(widget.id), `${id}: duplicate ${widget.id}`);
      allIds.add(widget.id);
      assert.equal(widget.locked, false);
      assert.equal(widget.hidden, false);
      assert.ok(
        [widget.x, widget.y, widget.width, widget.height].every(
          Number.isFinite,
        ),
      );
      assert.ok(
        widget.x >= 0 &&
          widget.y >= 0 &&
          widget.width >= 48 &&
          widget.height >= 32,
      );
      assert.ok(
        widget.x + widget.width <= doc.width &&
          widget.y + widget.height <= doc.height,
        `${widget.id}: out of bounds`,
      );
    }
    for (let i = 0; i < doc.widgets.length; i++) {
      for (const b of doc.widgets.slice(i + 1)) {
        const a = doc.widgets[i]!;
        assert.ok(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
          `${id}: overlap ${a.name} / ${b.name}`,
        );
      }
    }
    assert.ok(!renderPage(doc).includes("Unsupported widget"));
  }
});

test("pages differ in structure as well as copy and palette, with fresh editable objects", () => {
  assert.equal(templateCatalog?.length, 17);
  const signatures = new Set<string>();
  for (const { id } of templateCatalog) {
    const doc = createTemplate(id);
    const signature = JSON.stringify(
      doc.widgets.map(({ kind, x, y, width, height }) => [
        kind,
        x,
        y,
        width,
        height,
      ]),
    );
    assert.ok(!signatures.has(signature), `${id}: palette-only duplicate`);
    signatures.add(signature);
    assert.equal(
      doc.widgets.filter((widget) => widget.kind === "heading").length,
      1,
    );
    const pristine = JSON.stringify(createTemplate(id));
    doc.widgets[0]!.content.title = "Edited locally";
    doc.widgets[0]!.style.accent = "#ff0000";
    assert.equal(
      JSON.stringify(createTemplate(id)),
      pristine,
      `${id}: shared mutable template`,
    );
  }
});

test("gallery compiles for React and renders 17 sandboxed miniatures, labeled selection and a separate blank action", async () => {
  const built = await build({
    configFile: false,
    logLevel: "silent",
    oxc: { jsx: { runtime: "automatic" } },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(
          new URL(
            "../../packages/application-shell/src/studio/template-gallery.tsx",
            import.meta.url,
          ),
        ),
        formats: ["cjs"],
      },
      rolldownOptions: { external: ["react", "react/jsx-runtime"] },
    },
  });
  const bundle = Array.isArray(built) ? built[0] : built;
  const code = bundle.output.find(
    (item: { type: string }) => item.type === "chunk",
  )?.code;
  assert.ok(code);
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    appRequire,
    module,
    module.exports,
  );
  const { TemplateGallery } = module.exports as {
    TemplateGallery: () => unknown;
  };
  const react = appRequire("react");
  const { renderToStaticMarkup } = appRequire("react-dom/server");
  const html = renderToStaticMarkup(
    react.createElement(TemplateGallery, { onSelect() {}, onClose() {} }),
  );
  assert.equal((html.match(/<iframe\b/g) ?? []).length, 17);
  assert.equal((html.match(/sandbox=""/g) ?? []).length, 17);
  assert.equal((html.match(/tabindex="-1"/g) ?? []).length, 17);
  assert.ok(html.includes("<dialog"));
  assert.ok(html.includes("aria-labelledby="));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes("Start with a blank page"));
  assert.ok(html.includes("Close template gallery"));
  assert.ok(html.includes("17 of 17 page templates"));
  // Miniatures must use the real safe renderer, not palette-only placeholders.
  assert.ok(html.includes("nw-page"));
  assert.ok(html.includes("Content-Security-Policy"));
  assert.ok(!html.includes("allow-scripts"));
});
