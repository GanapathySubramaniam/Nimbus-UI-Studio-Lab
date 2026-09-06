# M1 Token Presets Implementation Plan

> **For agentic workers:** Use subagent-driven-development for isolated token work, controller integration, and independent review. Steps use checkbox syntax.

**Goal:** Deliver the 75 original descriptive archetypes in GOAL.md as complete light/dark token sets and make every one inspectable and applicable in Studio.

**Architecture:** Pure token catalog and serializer, independent of React; a small adapter supplies the existing WidgetStyle contract. Token Studio renders the same resolved tokens as CSS variables. Versioned SQLite seed migration updates built-ins without touching projects or shared user libraries.

**Tech Stack:** Existing React/TypeScript, Node test runner and SQLite. No new runtime dependencies, hosted fonts or network calls in the product.

**Spec:** GOAL.md sections 1–10; M0 merged in PR #139. M2–M11 remain required and are not replaced by this plan.

## Global constraints

- Exactly the 75 names and ten families in section 10; original palettes, descriptive labels, system font fallbacks. No brand-named selectable preset and no copied DESIGN.md files.
- Every preset has complete light/dark color, typography, spacing, radius/border, elevation, density and motion tokens. Token values live in the catalog/compiler, not swatch component CSS.
- Normal text contrast >=4.5:1; required control/focus boundaries >=3:1. Accessible Default and High Contrast Max target >=7:1 for text. No rounding a failing ratio into a pass.
- Keep all 17 page templates. Preserve existing saved project documents and their explicit widget styles; applying a new preset is an explicit edit with undo.
- Pure module boundary, deterministic serialization, validated values, no eval/arbitrary CSS imported from JSON.
- Keep the off-white Studio chrome separate from the designed page/preset theme. No decorative background added to Studio chrome.
- Motion tokens are defined now; the 20 actual animation implementations remain M6. No claim of full widget fidelity or WCAG conformance at M1.

## Task 1: Pure token catalog and compiler

Ownership: worker only creates `packages/application-shell/src/studio/tokens.ts`, `token-catalog.ts`, and `tools/studio/tokens.test.ts`. No other file edits or commits by worker.

Public contracts, exported by tokens.ts:

```ts
type ThemeMode = 'light' | 'dark';
type FontCategory = 'sans' | 'serif' | 'mono';
interface TokenSet {
  color: Record<'canvas'|'surface'|'raised'|'muted'|'text'|'textMuted'|'border'|'borderMuted'|'accent'|'accentHover'|'onAccent'|'focus'|'success'|'warning'|'danger'|'info', string>;
  font: { body: FontCategory; display: FontCategory; mono: 'mono' };
  type: { caption:number; body:number; label:number; heading:number; display:number; lineHeight:number; headingLineHeight:number; weight:number; headingWeight:number; tracking:number };
  space: { xs:number; sm:number; md:number; lg:number; xl:number; xxl:number };
  shape: { radiusSmall:number; radiusMedium:number; radiusLarge:number; borderWidth:number; controlHeight:number };
  elevation: { small:string; medium:string; large:string };
  motion: { instant:number; rapid:number; fast:number; standard:number; slow:number; expressive:number; easingStandard:[number,number,number,number]; easingAccelerate:[number,number,number,number]; easingDecelerate:[number,number,number,number]; easingEmphasized:[number,number,number,number] };
}
interface TokenPreset {
  id:string; name:string; family:string; description:string;
  density:'compact'|'comfortable'|'spacious'; preferredTheme:ThemeMode;
  themes:Record<ThemeMode,TokenSet>;
}
// token-catalog.ts exports tokenPresets: readonly TokenPreset[]
// tokens.ts exports:
// validateTokens(input:unknown):TokenSet (throw on malformed/unsafe/incomplete input)
// tokenVariables(tokens:TokenSet):Record<string,string>
// tokenCss(tokens:TokenSet):string (fixed .nimbus-theme selector)
// tokenJson(preset:TokenPreset,theme:ThemeMode):string (typed interoperable leaf tokens)
// contrastRatio(a:string,b:string):number
// auditTokens(tokens:TokenSet,minimumText?:number): Array<{foreground:string;background:string;ratio:number;minimum:number;pass:boolean}>
```

- [ ] Write failing tests for exact catalog coverage, distinct full themes, completeness/finite ranges, original-safe data, invalid CSS/JSON rejection, contrast ratios including black/white=21 and identical=1, all required color pair audits, deterministic CSS/typed token JSON.
- [ ] Implement original, deliberately authored archetype recipes and shared compiler. Each theme must pass text/textMuted/status/accent against canvas/surface/raised/muted; onAccent on accent/hover; border/focus against surfaces. Monochrome Local stays grayscale. Font stacks are system generic categories, no proprietary faces. Color contrast correction may adjust lightness but must not collapse every archetype into identical black/white defaults.
- [ ] CSS variable names are `--nimbus-<group>-<kebab-case-key>`. Numeric type size/space/shape use px except weights/lineHeights unitless and tracking em; durations ms; easing cubic-bezier; font values resolve to documented generic system stacks. Swatch UI consumes this contract.
- [ ] tokenJson maps colors to srgb color objects, dimensions to {value,unit:'px'}, duration to {value,unit:'ms'}, easing to cubicBezier arrays, fontFamily to stacks, numeric line height/weights to appropriate types. Use explicit Nimbus extensions for unsupported compound application metadata, not claims of arbitrary DTCG import support.
- [ ] Run `node --experimental-strip-types --test tools/studio/tokens.test.ts`; report red/green evidence and any concerns in `.nimbus/m1-token-report.md`.

## Task 2: Editor integration and all-preset swatch studio

Ownership: controller edits `presets.ts`, new `token-studio.tsx`/`token-studio.css`, `studio.tsx`, `library.tsx`, `inspector.tsx`, and integration tests.

```ts
// presets.ts
// designPresets: DesignPreset[] derived from each preferred theme
// themedPreset(id:string, theme:ThemeMode):DesignPreset
// presetWidgetStyle(tokens:TokenSet):WidgetStyle
// TokenStudio props: {selected?:Widget; onApply:(preset:DesignPreset)=>void; onClose:()=>void}
```

- [ ] Test adapter output through createWidget/parseProject/renderPage and undo. Old arbitrary preset IDs and saved styles must roundtrip unchanged. Keep uploaded image/logo and per-role text overrides when applying a base preset; document that behavior.
- [ ] Replace selectable legacy brand presets with the 75 descriptive token presets. Keep old widget IDs untouched on load; inspector explains legacy/custom snapshots rather than inventing a new identity. Default new widget base will use Muted Enterprise via a caller-provided preset, avoiding a renderer dependency on the full catalog.
- [ ] Add Token Studio dialog with keyboard focus containment/restore/Escape, name/family search, light/dark toggle, all token-driven swatches, typography/spacing/shape/elevation/motion specimens, exact measured contrast details, copy CSS, download JSON, and apply-to-selected-widget (disabled with clear explanation if absent/locked).
- [ ] Swatch specimen styles use token variables exclusively for theme-affecting values; fixed outer dialog layout belongs to neutral Studio chrome. No bulk 75-preview DOM rendering; render selected preset and searchable metadata only.
- [ ] Add accessible entry point from Styles library. Verify all 150 theme views, CSS variable computed values, download/copy/apply, keyboard, viewport containment and zero browser errors/warnings.

## Task 3: Installed seed migration and deterministic snapshots

Ownership: controller edits `tools/local/migrations.ts`, its tests, and source snapshot helper/tests.

- [ ] Add schema migration 2 for built-in token seeds. Existing built-in `preset` rows are replaced transactionally, while project, user_preset, user_widget_style and logo rows remain byte-identical. Reopening v2 is idempotent; future versions and gaps rejected. Fresh install records versions 1 and 2 with 75 complete token-bearing seed rows.
- [ ] Test populated v1 upgrade, rollback if a seed insert fails, fresh install, repeated migration, user libraries preserved and project reopen. Never silently overwrite user-library tables.
- [ ] Normalize source snapshot line endings to LF so Git's Windows checkout conversion cannot change runtime-export bytes. Regression uses equivalent CRLF/LF inputs through the normalization helper, not source-text assertions.

## Task 4: Review, verification and release

- [ ] Independent spec/code review of token worker and integrated branch; fix real findings and rerun covering tests.
- [ ] Full `pnpm check`, `npm run test:install`, all-preset browser swatch checks, representative visual inspection and contrast report. M2 pixel-fidelity matrix is not substituted by these checks.
- [ ] Update source inspiration, preset-authoring docs, README, M0 closure evidence and delivery ledger. Keep current feature boundaries honest.
- [ ] One M1 closing PR; hosted Windows/Ubuntu/CodeQL/governance green; merge normally, then publish wiki update. Only then open M2.

## Rulings and preflight

- Work in the user-specified saved checkout on a dedicated milestone branch; existing M0 baseline is clean and verified.
- The user's approved GOAL.md is the architectural specification. Continue implementation without a redundant approval cycle.
- Preserve explicit old project styling; do not reinterpret stored brand IDs as new visuals. Cost: legacy/custom labels persist inside old project data until deliberately restyled.
- DTCG 2025.10 includes duration and cubicBezier leaf types; only higher-level animation behavior needs a Nimbus schema. The attachment's statement that DTCG has no motion support is too broad.
- Task 1 -> 2: stable TokenSet fields and CSS names above; adapter is the only bridge to legacy WidgetStyle. Task 1 -> 3: seeds consume derived designPresets with token metadata. Task 2/3 do not share worker-owned files.
- Task 2 -> 4: swatch render uses the selected catalog values; browser checks complement numeric audits, not vice versa. Task 3 -> 4: v1 upgrade and fresh v2 must both pass.
