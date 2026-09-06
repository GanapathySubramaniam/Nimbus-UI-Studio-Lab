import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import type {
  StudioDocument,
  Widget,
  WidgetKind,
} from "../../packages/application-shell/src/studio/types.ts";
import { widgetCatalog } from "../../packages/application-shell/src/studio/catalog.ts";
import {
  escapeHtml,
  renderPage,
  renderWidget,
  widgetFrameStyle,
  WIDGET_CSS,
} from "../../packages/application-shell/src/studio/render.ts";
import {
  exportHtml,
  exportReact,
} from "../../packages/application-shell/src/studio/export.ts";
import { DEFAULT_STYLE } from "../../packages/application-shell/src/studio/model.ts";

function widget(kind: WidgetKind = "card"): Widget {
  return {
    id: "example",
    kind,
    name: "Example",
    x: 24,
    y: 48,
    width: 320,
    height: 240,
    presetId: "test",
    hidden: false,
    locked: false,
    state: "default",
    style: {
      background: "#ffffff",
      color: "#172033",
      accent: "#2563eb",
      borderColor: "#e2e8f0",
      radius: 16,
      borderWidth: 1,
      padding: 20,
      fontSize: 14,
      fontFamily: "sans",
      fontWeight: 400,
      shadow: "small",
      opacity: 90,
    },
    content: {
      title: "Revenue",
      subtitle: "This month",
      value: "72",
      items: "Design | 20\nBuild | 30\nShip | 50",
      image: "",
      imageAlt: "",
    },
    motion: {
      entrance: "slide",
      hover: "lift",
      click: "press",
      duration: 320,
      delay: 80,
    },
  };
}
function document(widgets = [widget()]): StudioDocument {
  return {
    version: 1,
    name: "My dashboard",
    width: 1200,
    height: 900,
    background: "#f8fafc",
    grid: 8,
    widgets,
  };
}

test("catalog covers the contract exactly once and each definition renders useful content", () => {
  const kinds = [
    "sidebar", "navbar", "heading", "text", "stat", "line-chart", "bar-chart",
    "donut-chart", "table", "activity", "card", "button", "input", "textarea",
    "select", "checkbox", "switch", "badge", "avatar", "image", "progress",
    "alert", "tabs", "accordion", "breadcrumb", "pagination", "divider",
    "skeleton", "pricing", "login", "search", "chat", "composer", "agent",
    "approval", "file", "calendar", "list", "kanban", "tooltip",
  ];
  assert.deepEqual(
    widgetCatalog.map((entry) => entry.kind).sort(),
    kinds.sort(),
  );
  for (const entry of widgetCatalog) {
    assert.ok(entry.name && entry.category && entry.description && entry.title);
    assert.ok(entry.width > 0 && entry.height > 0);
    const item = widget(entry.kind);
    item.content = {
      ...item.content,
      title: entry.title,
      subtitle: entry.subtitle,
      value: entry.value,
      items: entry.items,
    };
    assert.ok(renderWidget(item).length > 80, entry.kind);
  }
});

test("HTML escaping covers text and quoted attributes without interpreting entities", () => {
  assert.equal(
    escapeHtml("<img \"x\" 'y'>&amp;"),
    "&lt;img &quot;x&quot; &#39;y&#39;&gt;&amp;amp;",
  );
});

test("every widget escapes hostile content and renders all five states", () => {
  const attack = '\"><script>alert(1)</script><img src=x onerror=alert(2)>';
  for (const entry of widgetCatalog) {
    for (const state of [
      "default",
      "loading",
      "disabled",
      "error",
      "success",
    ] as const) {
      const item = widget(entry.kind);
      item.state = state;
      item.id = attack;
      item.content = {
        title: attack,
        subtitle: attack,
        value: attack,
        items: attack + "\n" + attack,
        image: "javascript:alert(1)",
        imageAlt: attack,
      };
      const html = renderWidget(item);
      assert.doesNotMatch(
        html,
        /<script|<img[^>]*onerror|javascript:/i,
        entry.kind,
      );
      assert.doesNotMatch(html, /<[a-z][^<>]*\son\w+="/i, entry.kind);
      if (state === "loading") {
        assert.match(html, /nw-skeleton/);
        assert.match(html, /aria-busy="true"/);
      }
      if (state === "error") assert.match(html, /role="alert"/);
      if (state === "success") assert.match(html, /role="status"/);
      if (state === "disabled") {
        assert.match(html, /aria-disabled="true"/);
        for (const tag of html.match(
          /<(?:input|button|select|textarea)\b[^>]*>/g,
        ) ?? [])
          assert.match(tag, /\sdisabled(?:\s|>)/);
      }
    }
  }
});

test("image sources allow raster data and HTTPS only, including sidebar logos", () => {
  for (const kind of ["image", "avatar", "sidebar", "card"] as const) {
    for (const src of [
      "javascript:alert(1)",
      "http://example.com/a.png",
      "//example.com/a.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "https://user:pass@example.com/a",
      "https://example.com/a.svg",
      "https://example.com/a.svg?x=1",
      "https://example.com/\nattack",
    ]) {
      const item = widget(kind);
      item.content.image = src;
      assert.doesNotMatch(renderWidget(item), /<img\b/, src);
    }
    for (const src of [
      "https://example.com/photo.png?a=1&b=2",
      ...["png", "jpeg", "webp", "gif"].map(
        (type) => `data:image/${type};base64,aGVsbG8=`,
      ),
    ]) {
      const item = widget(kind);
      item.content.image = src;
      item.content.imageAlt = 'A "portrait"';
      assert.match(renderWidget(item), /<img\b/);
      assert.match(renderWidget(item), /alt="A &quot;portrait&quot;"/);
    }
  }
});

test("cards render optional safe hero images before their content without empty image space", () => {
  const card = widget("card");
  const plain = renderWidget(card);
  assert.doesNotMatch(plain, /<img\b|nw-card-image/);
  card.content.image = "https://example.com/hero.png";
  card.content.imageAlt = 'A "calm" workspace <preview>';
  const illustrated = renderWidget(card);
  assert.match(
    illustrated,
    /<img class="nw-card-image" src="https:\/\/example.com\/hero.png"/,
  );
  assert.match(
    illustrated,
    /alt="A &quot;calm&quot; workspace &lt;preview&gt;"/,
  );
  assert.ok(illustrated.indexOf("<img") < illustrated.indexOf("<header"));
  assert.ok(illustrated.includes('<h2 class="nw-title">Revenue</h2>'));
  const doc = document([card]);
  assert.ok(exportHtml(doc).includes(illustrated));
  const reactHtml = exportReact(doc).match(/const html = ("(?:[^"\\]|\\.)*");/);
  assert.ok(reactHtml);
  assert.ok(JSON.parse(reactHtml[1]!).includes(illustrated));
  card.content.image = "data:image/svg+xml;base64,PHN2Zz4=";
  assert.equal(renderWidget(card), plain);
});

test("image policy rejects document extensions and encoded SVG paths", () => {
  for (const source of [
    "https://example.com/page.html",
    "https://example.com/page.xhtml?q=1",
    "https://example.com/image.%73vg",
    "https://example.com/image.svgz",
    "data:text/html;base64,aGVsbG8=",
  ]) {
    const item = widget("image");
    item.content.image = source;
    assert.doesNotMatch(renderWidget(item), /<img\b/, source);
  }
});

test("rendering is pure and numeric chart items change the SVG output", () => {
  const item = widget("bar-chart");
  const doc = document([item]);
  const before = JSON.stringify(doc);
  const original = renderWidget(item);
  renderPage(doc);
  exportHtml(doc);
  exportReact(doc);
  widgetFrameStyle(item);
  assert.equal(JSON.stringify(doc), before);
  item.content.items = "Design | 80\nBuild | 5";
  const changed = renderWidget(item);
  assert.notEqual(changed, original);
  assert.match(changed, /Design 80, Build 5/);
  item.content.items = "A | NaN\nB | Infinity\nC | -20\nD | 0";
  assert.doesNotMatch(renderWidget(item), /NaN|Infinity|height="-/);
});

test("frames carry geometry and isolated style/motion variables without injection", () => {
  const item = widget();
  const style = widgetFrameStyle(item);
  for (const expected of [
    "left:24px",
    "top:48px",
    "width:320px",
    "height:240px",
    "--nw-background:#ffffff",
    "--nw-accent:#2563eb",
    "--nw-radius:16px",
    "--nw-duration:320ms",
    "--nw-delay:80ms",
  ])
    assert.ok(style.includes(expected), expected);
  item.style.background =
    "red;position:fixed;background:url(https://evil.test)";
  item.style.color = "</style><script>bad</script>";
  item.style.radius = NaN;
  item.width = Infinity;
  item.motion.entrance = "url(https://evil.test)" as never;
  assert.doesNotMatch(widgetFrameStyle(item), /evil|script|NaN|Infinity|url\(/);
});

test("model and inspector percentage opacity becomes fractional CSS opacity", () => {
  const item = widget();
  item.style = { ...DEFAULT_STYLE };
  assert.match(widgetFrameStyle(item), /(?:^|;)--nw-opacity:1(?:;|$)/);
  for (const [input, expected] of [
    [10, "0.1"],
    [50, "0.5"],
    [90, "0.9"],
    [100, "1"],
    [-5, "0.1"],
    [150, "1"],
    [NaN, "1"],
    [Infinity, "1"],
  ] as const) {
    item.style.opacity = input;
    const declarations = Object.fromEntries(
      widgetFrameStyle(item)
        .split(";")
        .map((part) => part.split(":")),
    );
    assert.equal(declarations["--nw-opacity"], expected, `Opacity ${input}%`);
  }
});

test("zero-origin canvas frames preserve export styling and all motion options", () => {
  const item = widget();
  const nonPositionStyles = (style: string) =>
    style.split(";").filter((part) => !/^(left|top):/.test(part));
  for (const entrance of ["none", "fade", "slide", "scale"] as const) {
    for (const hover of ["none", "lift", "scale", "glow"] as const) {
      for (const click of ["none", "press", "pulse"] as const) {
        item.motion = { entrance, hover, click, duration: 640, delay: 120 };
        const editorStyle = widgetFrameStyle({ ...item, x: 0, y: 0 });
        assert.match(editorStyle, /^left:0px;top:0px;/);
        assert.deepEqual(
          nonPositionStyles(editorStyle),
          nonPositionStyles(widgetFrameStyle(item)),
        );
        assert.ok(
          editorStyle.includes(
            `--nw-entrance:${entrance === "none" ? "none" : `nw-${entrance}`}`,
          ),
        );
        assert.ok(editorStyle.includes("--nw-duration:640ms;--nw-delay:120ms"));
        const inner = renderWidget(item);
        assert.match(inner, /^<div class="nw-surface/);
        assert.doesNotMatch(inner, /class="nw-node"/);
      }
    }
  }
});

test("page positions visible widgets in layer order and escapes metadata", () => {
  const first = widget();
  first.id = 'a" onclick="bad';
  const hidden = widget();
  hidden.id = "hidden-widget";
  hidden.hidden = true;
  const last = widget("heading");
  last.id = "last";
  const html = renderPage(document([first, hidden, last]));
  assert.equal((html.match(/class="nw-node"/g) ?? []).length, 2);
  assert.match(html, /data-id="a&quot; onclick=&quot;bad"/);
  assert.doesNotMatch(html, /hidden-widget/);
  assert.ok(html.indexOf('data-id="last"') > html.indexOf('data-id="a'));
  assert.ok(html.includes(renderWidget(first)));
  assert.ok(html.includes(widgetFrameStyle(first)));
});

test("native fields retain accessible labels and numeric progress is bounded", () => {
  for (const kind of [
    "input",
    "textarea",
    "select",
    "checkbox",
    "switch",
    "search",
    "composer",
    "login",
  ] as const) {
    const html = renderWidget(widget(kind));
    assert.match(html, /<label\b/);
    assert.match(html, /<(?:input|textarea|select)\b/);
  }
  assert.match(renderWidget(widget("accordion")), /<details\b[\s\S]*<summary/);
  const progress = widget("progress");
  progress.content.value = "900";
  assert.match(renderWidget(progress), /<progress[^>]*value="100"/);
  progress.content.value = "-3";
  assert.match(renderWidget(progress), /<progress[^>]*value="0"/);
});

test("tab radio labels remain stable when their content panel becomes visible", () => {
  const item = widget("tabs");
  item.content.items = "Overview | Summary\nActivity | Recent changes";
  const html = renderWidget(item);
  assert.match(html, /<input[^>]*aria-label="Overview"/);
  assert.match(html, /<input[^>]*aria-label="Activity"/);
});

test("SVG charts are deterministic, accessible, and contain no imported markup", () => {
  for (const kind of ["line-chart", "bar-chart", "donut-chart"] as const) {
    const item = widget(kind);
    assert.equal(renderWidget(item), renderWidget(item));
    assert.match(renderWidget(item), /<svg[^>]*role="img"/);
    assert.match(renderWidget(item), /<title>/);
    assert.doesNotMatch(
      renderWidget(item),
      /NaN|Infinity|<foreignObject|<image|<script/,
    );
  }
});

test("exports embed identical shared rendering and CSS and safely serialize TSX source", () => {
  const doc = document();
  doc.name = "</title><script>bad</script>";
  doc.widgets[0]!.content.title = "</script> `${alert(1)}` \\ \u2028";
  const html = exportHtml(doc);
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /name="viewport"/);
  assert.ok(html.includes(renderPage(doc)));
  assert.ok(html.includes(WIDGET_CSS));
  assert.doesNotMatch(html, /<script(?:\s|>)/i);
  const react = exportReact(doc);
  assert.match(react, /export default function/);
  assert.doesNotMatch(react, /import .*nimbus/i);
  // Decode generated literals: parity tests catch any divergence in either exporter.
  const htmlLiteral = react.match(/const html = ("(?:[^"\\]|\\.)*");/);
  const cssLiteral = react.match(/const css = ("(?:[^"\\]|\\.)*");/);
  assert.ok(htmlLiteral && cssLiteral);
  assert.equal(JSON.parse(htmlLiteral[1]!), renderPage(doc));
  assert.equal(JSON.parse(cssLiteral[1]!), WIDGET_CSS);
  assert.doesNotMatch(react, /\u2028|<script(?:\s|>)/i);
});

test("exports retain the complete pinned MIT attribution in comments without Markdown", () => {
  const notice = readFileSync(
    new URL("../../THIRD_PARTY_NOTICES.md", import.meta.url),
    "utf8",
  ).replace(/\r\n/g, "\n");
  const mit = notice.match(
    /### Complete upstream MIT notice\s+```text\n([\s\S]*?)\n```/,
  )?.[1];
  const commit = notice.match(/Source commit: \[`([a-f0-9]{40})`\]/)?.[1];
  assert.ok(
    mit && commit,
    "The source notice must supply the full license and pinned revision",
  );
  const doc = document();
  doc.widgets[0]!.presetId = "airbnb";
  for (const [output, pattern] of [
    [exportHtml(doc), /<!--([\s\S]*?)-->/g],
    [exportReact(doc), /\/\*([\s\S]*?)\*\//g],
  ] as const) {
    const comment = [...output.matchAll(pattern)]
      .map((match) => match[1]!)
      .find((text) => text.includes("MIT License"));
    assert.ok(comment, "License must be a non-rendered comment");
    assert.ok(
      comment.includes(mit),
      "Full upstream copyright, permission and warranty text must survive export",
    );
    assert.equal(
      comment.split("\n").find((line) => line.startsWith("Source: ")),
      "Source: https://github.com/VoltAgent/awesome-design-md",
    );
    assert.ok(comment.includes(commit));
    assert.doesNotMatch(comment, /```|^\s*#|\]\(https?:/m);
  }
});

test("React default component matches the export dialog NimbusPage contract", () => {
  assert.match(
    exportReact(document()),
    /export default function NimbusPage\(\)/,
  );
});

test("shared CSS supplies standalone frames, mobile flow, and reduced motion", () => {
  assert.match(WIDGET_CSS, /\.nw-node\s*\{[^}]*position:\s*absolute/s);
  assert.match(WIDGET_CSS, /@media\s*\(max-width:\s*600px\)/);
  assert.match(WIDGET_CSS, /prefers-reduced-motion:\s*reduce/);
  for (const motion of ["fade", "slide", "scale", "pulse"])
    assert.ok(WIDGET_CSS.includes(`nw-${motion}`));
  assert.doesNotMatch(WIDGET_CSS, /(?:^|\})\s*(?:body|html|:root|\*)\s*\{/);
});

test("every mobile layout selector is limited to the exported page context", () => {
  const mediaStart = WIDGET_CSS.indexOf("@media (max-width:600px)");
  assert.ok(mediaStart >= 0);
  const bodyStart = WIDGET_CSS.indexOf("{", mediaStart) + 1;
  let depth = 1,
    end = bodyStart;
  while (depth && end < WIDGET_CSS.length) {
    if (WIDGET_CSS[end] === "{") depth++;
    if (WIDGET_CSS[end] === "}") depth--;
    end++;
  }
  const rules = [
    ...WIDGET_CSS.slice(bodyStart, end - 1).matchAll(/([^{}]+)\{[^{}]*\}/g),
  ];
  assert.ok(
    rules.length > 3,
    "Inspect the mobile descendants as well as the outer page",
  );
  for (const rule of rules) {
    for (const selector of rule[1]!.split(",")) {
      assert.match(
        selector.trim(),
        /^\.nw-page(?:$|\s|>)/,
        `Mobile rule leaks into canvas: ${selector.trim()}`,
      );
    }
  }
});
