# Preset authoring

Nimbus styles are original descriptive archetypes, not official company design systems. The built-in catalog is defined in `packages/application-shell/src/studio/token-catalog.ts`; its contract, validation, contrast audit and serializers live in `tokens.ts`.

## Public model

A `TokenPreset` has a stable kebab-case ID, descriptive name, family, short design rationale, density, preferred theme, and complete `light` and `dark` token sets. A token set contains:

| Group | Purpose |
| --- | --- |
| color | Four surfaces, primary/muted text, decorative/control borders, accent states, on-accent text, focus and semantic statuses |
| font | Body/display/monospace categories resolved to local generic system stacks |
| type | Caption/body/label/heading/display scale, line heights, weights and tracking |
| space | Six steps of the spacing rhythm |
| shape | Three radius sizes, border width and control height |
| elevation | Small/medium/large shadows, including a true no-elevation treatment |
| motion | Six durations and four cubic-bezier curves; animation bindings are separate |

Catalog entries are complete resolved data. Shared recipe generation is allowed, but merely renaming an identical theme is not a new design language. Review each archetype's typography, rhythm, density and geometry as well as its palette.

## Authoring rules

1. Use the names and intended visual grammar in GOAL.md section 10. Do not add brand names, brand logos, exact brand accent values, copied DESIGN.md files or proprietary font assets.
2. Supply both themes. Keep text readable on every supported surface, not only the canvas color.
3. Validate with `validateTokens`. Invalid/incomplete values must fail before CSS or JSON serialization. There is no arbitrary CSS execution or general third-party token import path.
4. Run `auditTokens`. Normal text and semantic colored text require 4.5:1; on-accent text must pass on both accent states. Control/focus boundaries require 3:1. Accessible Default and High Contrast Max use a 7:1 text gate. Ratios are never rounded before deciding pass/fail.
5. Inspect Token Studio at desktop and narrow widths. Automated ratios cannot judge hierarchy, optical balance, forced colors, or every composed widget state.
6. Run the catalog, integration and migration tests, then the full workspace check.

## CSS and token exports

`tokenVariables` emits `--nimbus-<group>-<kebab-key>` values. `tokenCss` wraps them in the fixed `.nimbus-theme` selector. Apply that class to the element whose descendants should inherit the variables; these files are theme foundations, not the full widget stylesheet.

`tokenJson` emits typed leaf tokens using DTCG 2025.10 conventions where applicable, with explicit Nimbus metadata for application-specific information. That format supports duration and cubic-bezier values. A declarative trigger, replay, iteration or multi-element animation remains part of Nimbus's separate motion schema. Download support is not a claim of arbitrary DTCG import support.

System font categories avoid font-network dependencies and redistributed font licensing. Rendering may differ across operating systems; fixed fonts/browser/viewports are required for visual baselines. No claim of cross-platform pixel identity follows from using system fonts.

## Compatibility and data

`presets.ts` is the bridge to the current explicit `WidgetStyle` renderer. Applying a preset replaces its base color/type/spacing/shape values, preserving content, layout, image backgrounds, logo sizing and per-role text overrides. Solid/gradient fills are replaced so they do not hide the chosen base style. User overrides can invalidate the palette contrast guarantees.

Old project documents retain their existing IDs and explicit style snapshots. They are not silently remapped. The inspector identifies unrecognized old IDs as saved custom/legacy styles. New palette choices write descriptive IDs only.

SQLite migration 2 replaces only the built-in preset catalog in a transaction and stores both theme token sets. Project documents and reusable user-preset/widget-style/logo tables must remain unchanged. Later catalog upgrades require a new migration; reopening the same schema must not rewrite user data.

The existing HTML/iframe-based prototype renderer does not yet consume every semantic token or reproduce every token shadow exactly. Native components and the canvas/export pixel-fidelity gate belong to M2 onward. Token-sheet validation is not whole-widget WCAG certification.
