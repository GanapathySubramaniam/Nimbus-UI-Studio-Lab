# M1 token-system verification

Date: 2026-09-06. Branch: `feat/m1-token-presets`; issue #140. M0 was merged in PR #139 at `9ce898e`.

## Implemented boundary

- Exactly 75 descriptive archetypes in ten families, each with complete light/dark token sets. The 17 editable page templates remain a separate catalog; the 12 multi-page project starters remain M10.
- Strict data validation, canonical CSS variables and typed DTCG leaf exports. No external fonts, network lookups, arbitrary CSS imports or executable token payloads.
- Token Studio: search/family filter, light/dark swatches, type/spacing/shape/elevation/motion specimens, measured contrast, CSS copy/download, token JSON download and explicit application to an unlocked selected widget.
- SQLite migration 2 replaces built-in seeds transactionally without rewriting projects or shared user preset/style/logo libraries. Existing visual snapshots and uploaded assets remain intact.
- Canonical LF runtime source snapshots prevent Windows Git line-ending conversion from changing exported source bytes.

## Executable evidence

| Check | Result |
| --- | --- |
| Token engine and adapter Node suites | 18/18 pass: 14 token tests and 4 integration tests |
| SQLite/adapter/source targeted regression suite | Upgrade and rollback failed against v1; all 22 initial checks passed after migration implementation. A later adapter history/render test also passes. |
| Contrast matrix | 75 × 2 × 46 = 6,900 supported pairs pass; minimum ordinary text 4.5501:1, boundary/focus 3.0505:1. Both accessibility presets exceed 7:1 text in both themes. No pass threshold is rounded. |
| `token-browser-qa.js` | 300 swatch views pass: 75 × two themes × 1600/390px viewports, computed palette/type/shape, containment, keyboard navigation, focus wrap/restore, search, downloads, clipboard/fallback and motion reduction/replay. Zero browser errors/warnings. |
| `token-apply-qa.js` | Dark style reaches rendered widget, edited text survives, undo/redo is one step, reload preserves the result, all 17 gallery templates remain available. |
| `npm run test:install` | Fresh source snapshot installs, migrates automatically, serves Studio/API, writes a project, shuts down and reopens SQLite successfully. |

Representative desktop Editorial Warm, dark Void Terminal and phone swatches were visually inspected. Browser checks found and fixed horizontal overflow in the two monumental styles and focus restoration when the opener becomes hidden after resizing to mobile. The first search-test assertion incorrectly expected exact-name matching; it was corrected to reflect the implemented all-word search across names/descriptions/families. The template-gallery check waits for the lazy-loaded gallery before counting it.

Independent token review found a decimal-shadow canonicalization bug. A regression first reproduced an accepted tiny decimal becoming an exponent value that failed revalidation. The fixed numeric grammar preserves the safe bounds and makes validation followed by serialization idempotent.

## Adaptive editor follow-up

The user's screenshot showed the inspector and header actions outside the visible browser area. Chromium visual-zoom emulation reproduced the clipping: at 150% zoom, a 1920px layout viewport had a 1280px visual viewport while the inspector's right edge remained at 1920px. This reproduction does not establish the exact zoom configuration of the user's Chrome profile; that profile was not available to the automation connector.

The editor now follows `VisualViewport` width/height/offsets with a cleaned-up resize/scroll observer, falling back to window dimensions. A named size container drives the editor's responsive breakpoints, so pinch zoom and a smaller app surface select the same compact layout as a small window. The canvas document is not rewritten. Dialogs and full-window preview use the visible bounds; compact-height chrome leaves more room for editing. Export actions remain sticky when their dialog scrolls.

`viewport-qa.js` failed on the original 150% clipping and passes all 11 cases after the fix: 150/200/300% visual zoom, 1440×900, 1280×665, 1024×650, 960×540, 768×600, 390×844, 640×360 and 320×568. It checks header and panel bounds, reachable Components/Properties tabs, page controls, export dialog/footer and preview toolbar. This is Chromium automation, not a claim of testing physical mobile keyboards or every browser.

The integrated review also found missing disabled-Apply guidance for locked selections and narrow screens. `token-guidance-qa.js` now passes no-selection, locked and unlocked states at desktop and phone widths, including visible guidance and the button's accessible description. The post-responsive-change full `pnpm check` passes both reference builds, type checking and the 36 governance/workspace plus 123 studio/local tests.

## Limits

These are token/swatches and current-adapter checks, **not the M2 pixel-fidelity matrix or a whole-product accessibility certification**. The legacy widget renderer still receives only its supported base fields; token-native composition starts with M2 Button/Card/Stat. Component states, gradients, image backgrounds and user overrides need separate contrast checks. Only the entrance specimen is added here; the full 20-animation/seven-trigger runtime remains M6. Canvas autosave still uses IndexedDB until M3 wires the SQLite client.

Node 22.16 emits experimental SQLite/type-stripping notices in the terminal. Those are documented runtime notices, not browser console errors. Production completion, hosted checks and merge must be recorded separately; this report does not waive them.
