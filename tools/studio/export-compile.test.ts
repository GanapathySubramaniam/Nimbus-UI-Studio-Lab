import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportReact } from "../../packages/application-shell/src/studio/export.ts";
import { renderPage } from "../../packages/application-shell/src/studio/render.ts";
import {
  createDocument,
  createWidget,
} from "../../packages/application-shell/src/studio/model.ts";
import { widgetCatalog } from "../../packages/application-shell/src/studio/catalog.ts";

test("exported TSX compiles and renders in a consumer React runtime with identical page markup", async () => {
  const doc = createDocument();
  doc.widgets = widgetCatalog.map((def) => createWidget(def));
  doc.widgets[0]!.content.title =
    'Literal </style><script>throw new Error("unsafe")</script> ${value}';
  const source = exportReact(doc);
  const appRequire = createRequire(
    new URL("../../apps/reference-vite/package.json", import.meta.url),
  );
  const { build } = await import(
    pathToFileURL(appRequire.resolve("vite")).href
  );
  const compiled = await build({
    configFile: false,
    root: fileURLToPath(new URL("../../apps/reference-vite/", import.meta.url)),
    logLevel: "silent",
    oxc: { jsx: { runtime: "automatic" } },
    plugins: [
      {
        name: "nimbus-consumer-fixture",
        resolveId(id: string) {
          return id.endsWith("virtual:nimbus-export")
            ? "\0NimbusPage.tsx"
            : undefined;
        },
        load(id: string) {
          return id === "\0NimbusPage.tsx" ? source : undefined;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: { entry: "virtual:nimbus-export", formats: ["cjs"] },
      rolldownOptions: { external: ["react/jsx-runtime", "react"] },
    },
  });
  const bundle = Array.isArray(compiled) ? compiled[0] : compiled;
  const output = bundle.output.find(
    (item: { type: string }) => item.type === "chunk",
  );
  assert.ok(output?.code, "Consumer build produced no JavaScript");
  const module = { exports: {} };
  new Function("require", "module", "exports", output.code)(
    appRequire,
    module,
    module.exports,
  );
  const component =
    typeof module.exports === "function"
      ? module.exports
      : (module.exports as { default: () => unknown }).default;
  const react = appRequire("react");
  const { renderToStaticMarkup } = appRequire("react-dom/server");
  const html = renderToStaticMarkup(react.createElement(component));
  assert.ok(
    html.includes(renderPage(doc)),
    "Consumer output differs from the canvas page renderer",
  );
  assert.ok(!html.includes("<script>throw new Error"));
  assert.ok(html.includes("&lt;script&gt;"));
});
