# GOAL.md — Nimbus UI Studio Lab (v2)

> **How to use this file.** Sections 1 to 6 are the north star and should be loaded into
> every session. Sections 7 to 16 are reference specs, loaded per milestone.
> When the spec is silent or two instructions conflict, resolve in favour of the
> Terminal Objective and the Invariants. Do not expand scope beyond the current
> milestone. Do not mark a milestone complete until its exit criteria pass as
> executable checks.

---

## 1. Terminal Objective

Build a locally-run, enterprise-grade visual design environment where a person composes a
web application interface on a canvas by dragging widgets, styles them at a granular level,
wires interactions across pages, and exports code that renders **pixel identical** to what
they saw on the canvas. The exported code is a thin composition of components imported from
the `nimbus-ui` package, not hand-rolled markup, so an AI coding agent can read it, extend
it, and stay on-system without inventing anything.

Success is one sentence: **a designer builds a five-page dashboard prototype in Nimbus,
exports the ZIP, runs the two commands in the generated README, and sees in the browser
exactly what they saw on the canvas.**

Nimbus is a **design and export tool**. It is not an agent runtime, not a protocol library,
not a hosting platform, and not a general-purpose UI kit competing with MUI on breadth.

---

## 2. Why This Exists

Three failures compound when interfaces are built with AI coding agents today.

**Non-determinism.** Ask an agent for a settings page and it invents markup, class names and
spacing from scratch. Ask twice, get two different pages. Ask across a team of ten, get ten
design systems inside one product. The cause is not model quality. It is that no
machine-readable contract exists between what a person wants the interface to look like and
what the agent emits.

**Token cost.** A vibe-coded dashboard page in raw JSX with utility classes typically runs
600 to 1,500 lines. At roughly 12 to 15 tokens per line of dense JSX that is 10,000 to
20,000 output tokens to generate once. Worse, the cost recurs: every subsequent edit turn
reloads the whole file into context. The Nimbus equivalent of the same page is 40 to 90
lines of component composition, roughly 1,000 to 2,000 tokens. That is close to an order of
magnitude on first generation and on every turn after it. The second-order effect matters
more than the bill: context spent on markup is context not spent on logic, so shorter files
raise output quality, not just lower cost. **Measure this for real once three pages exist
both ways and publish the numbers in the README.**

**Standardization and handoff.** Designers hand over Figma files an agent cannot execute.
Developers hand over prose the agent has to guess at. Nobody can diff a design. A Nimbus
page file is executable, reviewable in a pull request, and identical for everyone who opens
it.

Nimbus is the missing contract. The canvas is the on-ramp. The package is the thing that
gets depended on.

---

## 3. The Non-Negotiable Gate

**Export fidelity is the product.** If exported code does not render identically to the
canvas, nothing else in this repo matters.

Implement this as an automated test before building features on top of it:

1. Render the canvas node tree to PNG at a fixed viewport.
2. Render the exported artifact in a headless browser to PNG at the same viewport.
3. Diff. **Structural similarity must exceed 0.99, or fewer than 1% of pixels may differ.**

This runs across every widget in every preset in both themes. Build it at Milestone 2 and
never let it go red.

---

## 4. Invariants

These hold at every commit. A change that breaks one is a regression regardless of what it
adds.

1. **Fidelity.** Canvas render and export render pass the similarity gate above.
2. **Zero console noise.** No errors or warnings in devtools during a full session: create
   project, add page, drag widgets, style, animate, link pages, preview, export.
3. **Accessibility floor.** Every component keyboard operable, visible focus, correct ARIA
   roles, text contrast meeting WCAG 2.2 AA against every preset surface, interactive
   targets at least 24 by 24 CSS pixels.
4. **Reduced motion.** Every animation respects `prefers-reduced-motion: reduce` and
   degrades to an instant state change or a short opacity fade. No exceptions.
5. **Local first.** One command installs, one command starts. SQLite is created and migrated
   automatically on first run. No cloud account, no external service, no network call
   required to use the app.
6. **Derived, not copied.** See Section 8.
7. **Deterministic export.** The same canvas state exports byte-identical code every time.
8. **No orphan state.** Every property adjustable in the inspector persists to SQLite and
   restores on reload.
9. **No AI slop.** No placeholder components, no `TODO` markers in shipped code, no lorem
   filler in templates, no component that exists only to fill a checklist. A senior design
   engineer would ship every widget as-is.
10. **Motion is tokenized.** No hardcoded duration or easing anywhere. All motion reads
    `--nimbus-duration-*` and `--nimbus-easing-*`.

---

## 5. Non-Goals

Do not build these. Do not partially build these.

- Multi-user accounts, authentication, roles, collaboration, presence
- Cloud sync, hosting, or deployment of user projects
- Real backend data binding or live API integration inside user prototypes
- Framework targets other than React for the package export (standalone HTML is the second
  export path, not a second framework)
- **Agent protocol adapters (AG-UI, A2UI, A2A).** These belong to a different product. See
  the scope note in Section 16.
- The MCP connector that lets an agent drive the Studio. This is v2, after the core ships.
- Mobile or native app targets
- Internationalization beyond English in v1
- Billing, telemetry, analytics
- Server-side rendering, PWA, service workers

---

## 6. Definition of Done

Binary checks. All must pass.

**Setup and run**
- [ ] `npm run setup` on a clean clone installs dependencies, creates the SQLite database, runs migrations, and seeds 75 presets, 20 animation presets, and 12 project templates.
- [ ] `npm run dev` starts the app and it is usable at `localhost` with zero console errors.
- [ ] No manual database step. No `.env` required for local use.

**Projects and pages**
- [ ] Studio dashboard listing projects with create, open, duplicate, rename, delete, search, and last-edited sort.
- [ ] A project holds multiple pages. Pages can be created, renamed, reordered, duplicated, deleted.
- [ ] Button interactions link to other pages inside the project.
- [ ] Full-screen preview where linked pages are navigable as a working prototype.

**Design surface**
- [ ] All widgets in Section 9 exist, drag to canvas, and are styleable.
- [ ] All 75 presets in Section 10 complete for every widget.
- [ ] All 20 animations in Section 11 work on every trigger and are configurable per widget.
- [ ] Granular inspector: layout, position, size, spacing, radius, border, shadow, opacity, background, typography, text content, and per-element overrides such as the sidebar logo.
- [ ] Page background: solid, gradient (linear, radial, conic, multi-stop), uploaded image with fit and position controls, uploaded video looping and autoplaying muted.
- [ ] Logo creator: upload, paste from clipboard, drag-drop, or compose from text plus mark, with size, position, and colour controls.
- [ ] Users save custom widget styles, logos, and full presets, reusable across projects.
- [ ] Users create and place free text components and edit any widget's text inline.

**Export**
- [ ] React component using `nimbus-ui` imports, for a selected widget.
- [ ] React component using `nimbus-ui` imports, for a full page.
- [ ] Standalone HTML, for a selected widget and for a full page.
- [ ] ZIP of the whole project: all pages, routing, linked interactions, every referenced asset, `package.json`, and a README.
- [ ] Every generated README contains the `git clone` line, `npm install nimbus-ui`, the run command, and one paragraph explaining what the exported code is.
- [ ] All four paths pass the fidelity gate.

**Templates**
- [ ] Twelve templates in Section 12, each opening as a complete working project.

**Repo**
- [ ] `LICENSE` at root. MIT.
- [ ] README explaining the problem, the token-cost argument with measured numbers, and the standardization argument, with a demo GIF in the first screenful.
- [ ] Wiki pages for architecture, widget authoring, preset authoring, animation authoring, and export format.
- [ ] Every milestone tracked as a GitHub issue, closed by a merged PR referencing it.

---

## 7. Milestone Ladder

In order. Do not start a milestone before the previous exit criterion passes.

| # | Milestone | Exit criterion |
|---|---|---|
| M0 | Repo, tooling, SQLite schema, migrations, one-command setup and start | `npm run setup && npm run dev` works on a clean clone |
| M1 | Token system and all 75 presets as pure token sets | Every preset renders a swatch sheet with no hardcoded values |
| M2 | Three widgets (Button, Card, Stat) plus the fidelity test harness | Fidelity gate green for 3 widgets across 75 presets |
| M3 | Canvas, drag and drop, node tree, selection, persistence | Reload restores exact canvas state |
| M4 | Full inspector: layout, style, typography, background, inline text editing | Every property persists and re-renders |
| M5 | Remaining widget library | Fidelity gate green for all widgets across all presets |
| M6 | Motion token system and all 20 animations | Every trigger fires, reduced motion honoured, Section 11.4 checklist clean |
| M7 | Assets, logo creator, image and video backgrounds | Assets persist, appear in export, video loops muted |
| M8 | Multi-page, button interactions, full-screen prototype preview | Five-page prototype navigable end to end |
| M9 | All four export paths plus ZIP with assets and README | Exported project runs from the generated README alone |
| M10 | Studio dashboard and the 12 templates | Each template opens as a working project |
| M11 | README, wiki, issue hygiene, demo GIF, first release | A stranger installs and understands it in five minutes |

---

## 8. Derived, Not Copied

`awesome-design-md` and `awesome-claude-design` contain DESIGN.md documents describing the
visual language of real commercial products: Claude, Cursor, Raycast, Ollama, Mistral,
ElevenLabs, Replicate, WIRED, Vodafone, BMW, Ferrari, Lamborghini, Tesla and others.

The source repository states its own position plainly: the files are curated starting points
inspired by publicly observable design patterns, they are not official design systems, they
are not affiliated with or endorsed by the named companies, all trademarks and proprietary
typefaces belong to their owners, downstream users are responsible for complying with those
companies' brand policies, and when in doubt a DESIGN.md should be used as inspiration for
an original system rather than a one-to-one clone.

Nimbus takes that at face value. Hard rules:

1. **Do not vendor, redistribute, or commit any DESIGN.md file into this repository.** Read
   them, extract the structural grammar, write original code.
2. **Do not name any preset after a company, product, or brand.** Descriptive archetype
   names only. See Section 10.
3. **Do not reproduce a brand's exact accent hex, proprietary typeface, or logo.** Original
   palettes, open-licensed typefaces with documented fallback stacks.
4. What transfers legitimately is the *grammar*: spacing scale, type hierarchy, border and
   radius discipline, density, elevation logic, motion character. That is design vocabulary,
   not identity.
5. Check the source repository's LICENSE before deriving anything. Record what was consulted
   in `docs/INSPIRATION.md` with links and dates.

The practical risk is trade dress and trademark, not copyright on a markdown file. A preset
named after a real product inside a design tool is what draws a takedown, and it arrives
exactly when the repo starts getting attention.

---

## 9. Widget Library

Every widget is an independent module with its own tokens, variants, animation bindings,
accessibility contract, and fidelity test.

**Layout** — page frame, section, grid, flex stack, split pane, sidebar, top nav, footer,
container, divider, spacer, scroll area, sticky region, aspect ratio box, resizable panel.

**Data display** — card, stat tile, KPI block, metric row, table, data grid (sortable,
selectable, resizable columns, sticky header, expandable rows, virtualized), list, tree,
timeline, feed item, avatar, avatar group, badge, tag, chip, tooltip, progress bar, progress
ring, meter, chart shells (line, bar, stacked bar, area, donut, sparkline, scatter, heatmap,
gauge), empty state, skeleton, code block, JSON viewer, diff viewer.

**Input** — button (primary, secondary, ghost, outline, destructive, icon, split, toggle),
button group, segmented control, input, textarea, number input, password input, select,
combobox, multi-select, tags input, checkbox, checkbox group, radio, radio group, switch,
slider, range slider, date picker, date range picker, time picker, calendar, colour picker,
file upload, drop zone, search field, OTP input, rating, form field wrapper, form group,
fieldset.

**Navigation** — tabs, breadcrumbs, pagination, stepper, wizard, menu, dropdown menu,
context menu, command palette, nav item, nav rail, sidebar nav, mobile bottom nav, skip
link.

**Feedback and overlay** — modal, alert dialog, drawer, sheet, bottom sheet, popover, hover
card, toast, alert, banner, inline message, callout, confirmation dialog, loading overlay,
status dot, connection indicator.

**Content** — heading, paragraph, rich text block, link, image, video, icon, logo slot,
blockquote, kbd, inline code, list (ordered, unordered, description), separator, marquee,
free text component.

**Application shells** — chat message, chat composer, agent thread, message actions,
settings panel, profile card, pricing tier, checkout summary, payment form, auth card, order
row, invoice line, notification item, activity row.

Quality bar: no widget ships until it has all applicable states (default, hover,
focus-visible, active, disabled, loading, invalid, read-only, selected, expanded,
indeterminate, empty, error, truncated), a keyboard contract, a screen-reader contract, and a
fidelity test across all 75 presets.

---

## 10. The 75 Presets

Descriptive archetypes grouped into ten families, mirroring the nine content categories the
source collections cover plus an institutional family. Each preset is a complete token set:
palette, type scale, spacing rhythm, radius, border weight, elevation, density, and motion
character.

**A. AI and agent platforms (8)**
1. Editorial Warm — warm neutral canvas, serif display, generous leading, single earth accent
2. Void Terminal — near-black canvas, monospace, one vivid accent, no elevation
3. Neon Slate — dark slate with saturated neon accent pair, tight radii
4. Waveform Dark — cinematic black, curved dividers, gradient accent
5. Gradient Compute — light canvas, multi-stop gradient headers, data-dense cards
6. Monochrome Local — pure greyscale, terminal spacing, zero chroma
7. Coral Canvas — off-white with a single warm coral action colour, editorial rhythm
8. Blueprint Model — technical grid lines, annotation labels, drafting aesthetic

**B. Developer tools (8)**
9. IDE Graphite — editor-chrome greys, monospace UI, dense vertical rhythm
10. Terminal Native — true black, phosphor accent, boxed borders
11. Diff Contrast — red and green semantic pair carried through the whole system
12. Docs Paper — high-legibility long-form reading, wide measure, quiet chrome
13. Package Neutral — registry-flat, small type, hairline dividers
14. Commit Ledger — timeline-first, left rule, monospace metadata
15. Syntax Bright — light canvas with a full syntax-derived accent palette
16. Console Amber — dark with amber and warm grey, retro terminal warmth

**C. Infrastructure and backend (7)**
17. Rack Steel — cool industrial greys, sharp corners, heavy borders
18. Observability Dark — charcoal, chart-first, threshold colour semantics
19. Status Grid — tile-heavy, status colour as primary signal, minimal type
20. Latency Cool — desaturated blues, sparkline-centric, compact rows
21. Pipeline Slate — directional arrows, stage chips, flow-oriented spacing
22. Region Map — map-adjacent muted earth palette, pin and label components
23. Node Mesh — graph-first, connector lines, node cards with ports

**D. Productivity and workspace (8)**
24. Soft Neutral — off-white, large radii, low contrast, airy spacing
25. Notebook Cream — paper-warm, serif body, ruled dividers
26. Kanban Calm — column-oriented, pastel status tints, medium radii
27. Focus Minimal — maximum whitespace, one accent, near-invisible chrome
28. Inbox Crisp — list-dense, unread weight contrast, tight leading
29. Sidebar Deep — dark navigation against light content, strong split
30. Meeting Light — time-block grid, soft shadows, rounded chips
31. Task Dense — highest information density in the family, small type, tight rows

**E. Design and creative tools (7)**
32. Canvas Grey — neutral mid-grey chrome framing a light artboard
33. Swatch Studio — colour-forward, large swatch tiles, minimal type
34. Layer Panel — nested indentation, drag affordances, compact controls
35. Vector Precision — hairline everything, zero radius, exact numeric inputs
36. Palette Vivid — saturated multi-accent, playful chips
37. Grid Draft — visible baseline grid, measurement annotations
38. Type Specimen — oversized display type, minimal colour, spec-sheet layout

**F. Fintech and data (8)**
39. Ledger Precision — tabular figures, right-aligned numerics, hairline rules
40. Dense Data — compact rows, small type, maximum density, muted chrome
41. Trading Dark — black canvas, red and green semantics, monospace numerics
42. Statement Serif — serif headings on white, formal document rhythm
43. Vault Navy — deep navy, gold accent, conservative elevation
44. Chart Muted — desaturated categorical palette designed for many series
45. Compliance Neutral — accessible by default, no decoration, high contrast
46. Yield Emerald — white canvas, single emerald accent, generous card padding

**G. Commerce and retail (7)**
47. Product Bright — large imagery, white canvas, bold price typography
48. Marketplace Warm — warm neutrals, card grid, review and rating components
49. Checkout Clean — single-column focus, step indicator, minimal distraction
50. Catalog Grid — tight image grid, hover reveal, filter rail
51. Boutique Serif — luxury retail, serif display, wide margins
52. Flash Vivid — high-saturation promotional accents, countdown components
53. Cart Compact — dense line items, sticky summary, tight controls

**H. Editorial and media (8)**
54. Broadsheet Ink — paper white, serif body, ink-blue links, high density
55. Magazine Contrast — full-bleed imagery, oversized display, strong black
56. Longform Serif — reading-first, wide measure, drop caps, quiet chrome
57. Feed Compact — infinite-scroll rhythm, small thumbnails, timestamp emphasis
58. Ink Blue — near-black text, single deep blue accent, print restraint
59. Masthead Bold — heavy uppercase display, rule-separated sections
60. Column Rule — multi-column layout, vertical rules, justified rhythm
61. Byline Quiet — author-forward, small caps metadata, minimal colour

**I. Luxury and automotive (7)**
62. Cinema Black — true black, monumental display, extreme sparseness
63. Chiaroscuro — black and white editorial with one saturated accent
64. Monolith Gold — dark cathedral surfaces, gold accent, wide letter spacing
65. Chrome Precision — dark premium surfaces, engineered spacing, metallic hairlines
66. Aurora Vivid — vivid multi-stop gradients, zero-radius controls
67. Radical Subtraction — near-empty layouts, full-viewport imagery, minimal chrome
68. Showroom Light — bright white, large product imagery, thin type

**J. Enterprise and institutional (7)**
69. Muted Enterprise — conservative corporate neutral, accessible defaults
70. Government Neutral — plain, high-legibility, zero decoration
71. Health Calm — soft cool palette, generous spacing, gentle elevation
72. Telecom Bold — monumental uppercase display, saturated chapter bands
73. Print Grid — Swiss discipline, strong baseline grid, black on white
74. Accessible Default — WCAG AAA contrast throughout, largest targets
75. High Contrast Max — forced-colors-ready, maximum contrast, no reliance on colour alone

**Constraint:** any widget must be swappable to any preset independently of its neighbours,
so one canvas can legitimately mix presets and still export cleanly.

---

## 11. Motion System

### 11.1 Motion tokens

The W3C DTCG token format does not yet cover motion, so Nimbus defines its own schema.
Material 3, Carbon, Fluent and Polaris all publish motion tokens; follow that precedent.

```
--nimbus-duration-instant   : 80ms
--nimbus-duration-rapid     : 120ms
--nimbus-duration-fast      : 160ms
--nimbus-duration-standard  : 240ms
--nimbus-duration-slow      : 360ms
--nimbus-duration-expressive: 520ms

--nimbus-easing-standard    : cubic-bezier(0.2, 0, 0, 1)
--nimbus-easing-accelerate  : cubic-bezier(0.4, 0, 1, 1)
--nimbus-easing-decelerate  : cubic-bezier(0, 0, 0.2, 1)
--nimbus-easing-emphasized  : cubic-bezier(0.2, 0, 0, 1.4)
--nimbus-easing-spring-gentle / -stiff
--nimbus-easing-linear      : linear   /* loading only */
```

Each preset overrides these to carry its own motion character. Kinetic presets lean
emphasized and spring; Print Grid and Compliance Neutral lean standard and short.

### 11.2 The two-tier rule

Carbon's productive-versus-expressive split is the right model, and Atlassian states the
frequency rule directly: match motion expression to how often it is seen. High-frequency
interactions such as hover states, button presses and list items should use minimal,
near-instant transitions that stay out of the way. Reserve longer, more expressive motion
for low-frequency moments. If someone triggers it dozens of times a day, keep it under
150ms.

So:

- **Productive motion** (high frequency, task focus): 80 to 160ms. Buttons, toggles,
  dropdowns, hover, focus, table rows.
- **Expressive motion** (low frequency, significant moments): 240 to 520ms. Page entrance,
  modal open, first run, primary action confirmation.

Duration scales with distance and size. A large surface travelling far needs longer than a
small one moving slightly, or the fast one reads as sluggish and the slow one as abrupt.

Animate `transform` and `opacity` only. Compositor-only properties, always.

### 11.3 The 20 animations

Each configurable per widget: duration, easing, delay, stagger interval, distance or scale
amount, iteration, and trigger. Triggers: `mount`, `hover`, `press`, `focus`, `in-view`,
`state-change`, `exit`.

**Productive (80 to 160ms)**
1. **Press Depress** — scale to 0.97 with shadow reduction on pointer down
2. **Ripple Press** — radial fill originating at the pointer coordinate
3. **Hover Lift** — translateY minus 2px with elevation increase
4. **Focus Ring Bloom** — ring scales from 1.4 to 1 with opacity, on focus-visible only
5. **Toggle Slide** — thumb travel with track colour cross-fade
6. **Cross Dissolve** — state swap with no layout shift

**Standard (160 to 300ms)**
7. **Rise Fade** — translateY with opacity, the workhorse entrance
8. **Stagger Cascade** — children sequenced at a configurable interval
9. **Scale In** — spring-eased scale from 0.94, for modals and popovers
10. **Slide Draw** — edge-anchored entry for drawers, sheets and sidebars
11. **Collapse Expand** — height with opacity, for accordions and disclosures
12. **Magnetic Hover** — subtle cursor-following offset or tilt, capped at 8px

**Expressive (300 to 520ms)**
13. **Blur Reveal** — blur 12px to sharp with opacity
14. **Path Draw** — SVG stroke-dashoffset for charts, icons, dividers
15. **Number Roll** — count-up for stat tiles and KPI blocks, tabular figures locked
16. **Shared Element Morph** — bounding-box interpolation between two states via FLIP

**Loading**
17. **Skeleton Shimmer** — linear-eased sweep, infinite
18. **Progress Sweep** — indeterminate bar and arc
19. **Pulse Breathe** — opacity oscillation for pending regions
20. **Spinner Arc** — rotating arc with variable dash length

### 11.4 Why animations are not firing right now

Interactions and loading animations reportedly do not work. Work this list in order before
writing new animation code. These are the usual causes in a canvas-based editor:

1. **The OS has reduced motion enabled.** Check system settings first. This silently kills
   everything and is the most common false alarm on a developer machine.
2. **Mount animations never re-trigger** because the canvas node is updated rather than
   unmounted and remounted. Fix with a `key` that changes when the animation config changes,
   or replay imperatively via the Web Animations API.
3. **React re-render replaces the DOM node** mid-animation, cancelling it. Stabilize node
   identity.
4. **`animation-fill-mode` is not set.** Without `both` or `forwards` the element snaps back
   to its pre-animation state and the animation looks like it never ran.
5. **The element is already in its end state** when the animation starts, so there is nothing
   to interpolate. Entrance animations need an explicit initial state.
6. **The preview iframe never receives the keyframes.** If preview renders in an iframe,
   styles must be injected into that document, not the parent.
7. **Keyframe name collisions across presets.** Namespace every `@keyframes` per preset.
8. **`display: none` at animation start.** Nothing animates from `none`. Use visibility plus
   opacity, or delay the animation until after the display change paints.
9. **No IntersectionObserver** wired for `in-view` triggers.
10. **Animating layout properties** rather than `transform` and `opacity`, making the
    animation janky enough to look broken.
11. **Event handlers attached to the canvas wrapper rather than the widget**, so `press` and
    `hover` never reach the element.
12. **Missing stacking context or `will-change`**, so the animation is composited away inside
    a scrolled container.

Write a regression test per animation per trigger. An animation that is not tested will
break again.

---

## 12. Project Templates

Twelve, each opening as a complete working multi-page project, not a single screen.

1. **Agent chat** — thread list, conversation, composer, message actions, tool call cards, streaming placeholder states
2. **Analytics dashboard** — KPI row, charts, data table, filter bar, date range
3. **History and search** — result list, faceted filters, saved views, empty and no-results states
4. **Payment portal** — plan selection, checkout form, order summary, confirmation, receipt
5. **Sign in** — email, password, OAuth row, magic link, error and loading states
6. **Sign out and session** — signed-out confirmation, session expired, re-authenticate
7. **Admin console** — member directory, role matrix, settings panels, audit list
8. **Settings** — profile, appearance, notifications, security, danger zone
9. **Onboarding** — multi-step wizard, progress, validation, completion
10. **Marketing landing** — hero, feature grid, pricing tiers, testimonial, footer CTA
11. **Data table workbench** — dense grid, column controls, bulk actions, detail drawer
12. **Empty project** — page frame and nothing else

Every template ships with real copy, not lorem. Every template links its pages so preview
works as a prototype immediately.

---

## 13. Data Model

SQLite, created and migrated on first run, no manual step.

`project`, `page`, `node` (self-referencing tree with ordering), `style_override`,
`animation_binding`, `interaction` (source node, event, target page or action), `asset`
(images and video, blob or path plus metadata), `preset`, `animation_preset`, `user_preset`,
`user_widget_style`, `logo`, `template`, `project_setting`, `migration`.

Users save their own widget styles, logos, and full presets, reusable across projects.
Deleting a project cascades to its pages, nodes, and orphaned assets, but never to shared
user presets or logos.

---

## 14. Export Format

Four paths, all passing the fidelity gate.

**React component (widget or page)** — imports from `nimbus-ui`, props only, no inline style
objects except user overrides, no utility class soup. A page should read as composition, not
markup.

**Standalone HTML (widget or page)** — self-contained, inlined critical CSS, no build step,
opens by double-click.

**Project ZIP** — every page, routing between them, all interactions wired, every referenced
image and video, `package.json`, and a README containing:

```
git clone <repo>
cd <project>
npm install
npm run dev
```

plus one paragraph explaining what the exported code is and how to extend it with an agent.

The README is part of the product. An export a person cannot run is a failed export.

---

## 15. Working Agreement

- One GitHub issue per milestone, one branch per milestone, one PR that closes the issue.
- Write the test before the feature wherever the fidelity gate is involved.
- Update README and wiki as capabilities land, not at the end.
- Prefer fewer excellent components over many mediocre ones.
- When visual polish and the fidelity gate conflict, the gate wins.
- Report honestly. If a milestone is 80% done, say 80%. Do not mark it complete.
- Do not open the next milestone's issue until the current one's PR is merged.

---

## 16. Scope Note on the Existing Master Plan

A prior planning document describes an enterprise agentic React design system with AG-UI,
A2UI and A2A protocol adapters, normalized agent event envelopes, ten locales, PWA shells,
dual Vite and Next.js reference applications, and a ten-milestone road to a 1.0 release.

That is a different product from this one, and roughly ten times the scope. Its centre of
gravity is protocol adapters and agent conversation surfaces. This product's centre of
gravity is a canvas, a widget library, and a pixel-identical export. Nothing in the protocol
layer moves the fidelity gate.

If Codex runs against that plan, the likely outcome is a well-architected protocol adapter
library with no working canvas. Treat that document as a v2 backlog. Build this first.

The two converge later: once the canvas and export loop work, the agent-facing surfaces in
that plan become an excellent widget family to add, and the MCP connector becomes the
bridge. The order matters, and the order is canvas first.
