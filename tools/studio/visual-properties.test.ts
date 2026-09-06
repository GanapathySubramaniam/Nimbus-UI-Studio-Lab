import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDocument,
  createWidget,
  parseDocument,
} from "../../packages/application-shell/src/studio/model.ts";
import { widgetCatalog } from "../../packages/application-shell/src/studio/catalog.ts";
import * as renderer from "../../packages/application-shell/src/studio/render.ts";
import * as model from "../../packages/application-shell/src/studio/model.ts";

function fixture() {
  const doc = createDocument();
  doc.widgets = [
    createWidget(widgetCatalog.find((w) => w.kind === "sidebar")!),
  ];
  return doc;
}
const stops = [
  { color: "#123456", position: 0 },
  { color: "#abcdef", position: 100 },
];
const backgrounds = [
  { type: "solid", color: "#112233" },
  { type: "linear", angle: 135, stops },
  { type: "radial", shape: "ellipse", centerX: 30, centerY: 70, stops },
  {
    type: "image",
    src: "https://example.com/photo.png",
    size: "contain",
    positionX: 25,
    positionY: 75,
    repeat: "no-repeat",
  },
] as const;

test("optional visuals round trip without adding fields to legacy documents", () => {
  const doc = fixture();
  assert.deepEqual(parseDocument(JSON.stringify(doc)), doc);
  for (const backdrop of backgrounds) {
    const enhanced = {
      ...doc,
      backdrop,
      widgets: [
        {
          ...doc.widgets[0],
          style: {
            ...doc.widgets[0]!.style,
            backdrop,
            text: {
              title: {
                color: "#112233",
                fontSize: 32,
                fontFamily: "serif",
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: 2,
                align: "center",
                transform: "uppercase",
                decoration: "underline",
                italic: true,
              },
              subtitle: { fontSize: 12 },
              value: { color: "#abcdef" },
            },
            logo: { width: 120, height: 48, fit: "contain" },
          },
          motion: {
            ...doc.widgets[0]!.motion,
            loading: "spinner",
            easing: "ease-in-out",
            repeat: 3,
          },
          actions: { click: "overview", "item:0": "billing" },
        },
      ],
    };
    assert.deepEqual(parseDocument(JSON.stringify(enhanced)), enhanced);
  }
});

test("background parser rejects unsafe images, raw CSS and unbounded geometry", () => {
  for (const backdrop of [
    { type: "solid", color: "red;background:url(https://evil.test)" },
    { ...backgrounds[1], angle: 361 },
    { ...backgrounds[1], stops: [stops[0]] },
    { ...backgrounds[1], stops: [...stops].reverse() },
    {
      ...backgrounds[1],
      stops: [{ color: "#123456", position: -1 }, stops[1]],
    },
    { ...backgrounds[2], centerX: -1 },
    { ...backgrounds[2], shape: "url(evil)" },
    { ...backgrounds[3], size: "cover;position:fixed" },
    { ...backgrounds[3], positionY: 101 },
    ...[
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "https://example.com/a.svg",
      "https://u:p@example.com/a.png",
      "http://example.com/a.png",
    ].map((src) => ({ ...backgrounds[3], src })),
  ]) {
    assert.throws(
      () => parseDocument(JSON.stringify({ ...fixture(), backdrop })),
      JSON.stringify(backdrop),
    );
  }
});

test("text, logo, loading, easing and repetition reject unsupported values", () => {
  for (const patch of [
    { style: { text: { title: { fontSize: 1000 } } } },
    { style: { text: { value: { lineHeight: 0 } } } },
    { style: { text: { subtitle: { color: "url(evil)" } } } },
    { style: { text: { title: { align: "absolute", italic: "yes" } } } },
    { style: { logo: { width: 0, height: 48, fit: "contain" } } },
    { style: { logo: { width: 48, height: 48, fit: "url(evil)" } } },
    { motion: { loading: "script" } },
    { motion: { easing: "cubic-bezier(evil)" } },
    { motion: { repeat: -1 } },
    { motion: { repeat: 1.5 } },
    { motion: { repeat: 21 } },
  ]) {
    const doc = fixture(),
      widget = doc.widgets[0]!;
    const raw = {
      ...doc,
      widgets: [
        {
          ...widget,
          style: { ...widget.style, ...patch.style },
          motion: { ...widget.motion, ...patch.motion },
        },
      ],
    };
    assert.throws(
      () => parseDocument(JSON.stringify(raw)),
      JSON.stringify(patch),
    );
  }
});

test("page actions accept IDs only and reject executable keys or targets", () => {
  for (const actions of [
    { onclick: "page" },
    { "item:-1": "page" },
    { "item:01": "page" },
    { click: "javascript:alert(1)" },
    { click: "https://example.com" },
    { click: "" },
    JSON.parse('{"__proto__":"page"}'),
  ]) {
    const doc = fixture();
    assert.throws(() =>
      parseDocument(
        JSON.stringify({ ...doc, widgets: [{ ...doc.widgets[0], actions }] }),
      ),
    );
  }
});

test("backgroundStyle emits safe declarations for page and widget parity", () => {
  assert.equal(
    typeof renderer.backgroundStyle,
    "function",
    "shared background helper must exist",
  );
  assert.equal(renderer.backgroundStyle(), "");
  assert.deepEqual(renderer.backgroundProperties(backgrounds[3] as never), {
    backgroundImage: "url(https://example.com/photo.png)",
    backgroundPosition: "25% 75%",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
  });
  const linear = renderer.backgroundStyle(backgrounds[1] as never);
  assert.match(
    linear,
    /background-image:linear-gradient\(135deg,#123456 0%,#abcdef 100%\)/,
  );
  assert.match(
    renderer.backgroundStyle(backgrounds[2] as never),
    /radial-gradient\(ellipse at 30% 70%/,
  );
  assert.match(
    renderer.backgroundStyle(backgrounds[3] as never),
    /background-position:25% 75%;background-size:contain;background-repeat:no-repeat/,
  );
  for (const src of [
    'https://example.com/a.png?x=";color:red;<style>',
    "javascript:alert(1)",
  ]) {
    const css = renderer.backgroundStyle({ ...backgrounds[3], src } as never);
    assert.doesNotMatch(css, /[<>"']|javascript:|;color:red/);
  }
  const doc = fixture();
  doc.backdrop = backgrounds[1] as never;
  doc.widgets[0]!.style.backdrop = backgrounds[1] as never;
  assert.ok(renderer.renderPage(doc).includes(linear));
  assert.ok(renderer.widgetFrameStyle(doc.widgets[0]!).includes(linear));
});

test("rendered text roles and sidebar logo honor granular styles", () => {
  const widget = fixture().widgets[0]!;
  widget.content.image = "https://example.com/logo.png";
  widget.style.text = {
    title: { fontSize: 32, color: "#112233" },
    subtitle: { italic: true },
    value: { fontWeight: 800 },
  };
  widget.style.logo = { width: 120, height: 48, fit: "contain" };
  const html = renderer.renderWidget(widget),
    css = renderer.widgetFrameStyle(widget);
  assert.match(html, /data-nw-text="title"/);
  assert.match(html, /data-nw-text="subtitle"/);
  assert.match(css, /--nw-title-font-size:32px/);
  assert.match(css, /--nw-title-color:#112233/);
  assert.match(css, /--nw-subtitle-font-style:italic/);
  assert.match(
    css,
    /--nw-logo-width:120px;--nw-logo-height:48px;--nw-logo-fit:contain/,
  );
});

test("action markup is inert metadata with keyboard target and item precedence", () => {
  const widget = fixture().widgets[0]!;
  widget.content.items = "Overview\nBilling";
  widget.actions = { click: "home", "item:1": "billing" };
  const html = renderer.renderWidget(widget);
  assert.match(html, /data-nimbus-page="home"/);
  assert.match(html, /<button[^>]*data-nimbus-page="billing"/);
  assert.match(html, /tabindex="0"/);
  assert.doesNotMatch(html, /\sonclick=|<script/);
  widget.actions = { click: 'bad" onclick="alert(1)' };
  assert.doesNotMatch(
    renderer.renderWidget(widget),
    /data-nimbus-page|\sonclick=/,
  );
  widget.actions = { click: "home" };
  widget.state = "disabled";
  assert.doesNotMatch(renderer.renderWidget(widget), /data-nimbus-page/);
});

test("loading modes and motion variables render with reduced motion protection", () => {
  const widget = fixture().widgets[0]!;
  widget.state = "loading";
  for (const loading of ["shimmer", "pulse", "spinner", "static"] as const) {
    widget.motion = {
      ...widget.motion,
      loading,
      easing: "ease-in-out",
      repeat: "infinite",
    };
    assert.match(
      renderer.renderWidget(widget),
      new RegExp(`nw-loading-${loading}`),
    );
    assert.match(renderer.renderWidget(widget), /aria-busy="true"/);
    assert.match(
      renderer.widgetFrameStyle(widget),
      /--nw-easing:ease-in-out;--nw-repeat:infinite/,
    );
  }
  assert.match(renderer.WIDGET_CSS, /prefers-reduced-motion:reduce/);
  assert.match(renderer.WIDGET_CSS, /animation:none!important/);
});

test("uploaded raster background remains a usable data URL", () => {
  const src = "data:image/png;base64,aGVsbG8=";
  assert.equal(
    renderer.backgroundProperties({ ...backgrounds[3], src } as never)
      .backgroundImage,
    `url(${src})`,
  );
});

test("granular visible titles and descriptions work beyond header-based widgets", () => {
  for (const kind of [
    "navbar",
    "checkbox",
    "switch",
    "avatar",
    "image",
    "file",
    "divider",
    "button",
  ] as const) {
    const widget = createWidget(
      widgetCatalog.find((entry) => entry.kind === kind)!,
    );
    widget.style.text = {
      title: { fontSize: 31 },
      subtitle: { fontSize: 19 },
      value: { fontSize: 25 },
    };
    const html = renderer.renderWidget(widget);
    assert.match(html, /data-nw-text="title"/, kind);
    if (!["divider"].includes(kind) && widget.content.subtitle)
      assert.match(html, /data-nw-text="subtitle"/, kind);
  }
});

test("badge labels, monograms, and chart values retain text overrides without importing markup", () => {
  for (const kind of [
    "badge",
    "agent",
    "approval",
    "avatar",
    "file",
    "donut-chart",
    "tooltip",
  ] as const) {
    const widget = createWidget(
      widgetCatalog.find((entry) => entry.kind === kind)!,
    );
    widget.style.text = {
      title: { fontSize: 30 },
      value: { color: "#123456" },
    };
    const html = renderer.renderWidget(widget);
    assert.match(
      html,
      kind === "badge" ? /data-nw-text="title"/ : /data-nw-text="value"/,
      kind,
    );
    assert.doesNotMatch(html, /<script|<foreignObject/);
    if (kind === "donut-chart")
      assert.match(html, /<tspan data-nw-text="value"/);
  }
});

test("numeric drafts commit bounded finite values and preserve the current value for empty or invalid input", () => {
  assert.equal(typeof model.commitNumericValue, "function");
  for (const [draft, expected] of [
    ["12", 12],
    ["8", 8],
    ["1", 8],
    ["999", 640],
    ["", 120],
    ["-", 120],
    ["NaN", 120],
    ["Infinity", 120],
    ["12.5", 12.5],
  ] as const)
    assert.equal(model.commitNumericValue(draft, 120, 8, 640), expected, draft);
  assert.equal(model.commitNumericValue("-2.5", 0, -10, 30), -2.5);
});

test("progress percentage applies value text overrides while retaining bounded native progress", () => {
  const widget = createWidget(widgetCatalog.find((entry) => entry.kind === "progress")!);
  widget.style.text = { value: { color: "#123456", fontSize: 32, fontWeight: 800 } };
  for (const [value, percent] of [["72", 72], ["999", 100], ["-9", 0]] as const) {
    widget.content.value = value;
    const html = renderer.renderWidget(widget);
    assert.ok(html.includes(`<strong><span data-nw-text="value">${percent}%</span></strong>`));
    assert.ok(html.includes(`<progress class="nw-progress" max="100" value="${percent}">${percent}%</progress>`));
    assert.match(renderer.widgetFrameStyle(widget), /--nw-value-font-size:32px/);
  }
});
