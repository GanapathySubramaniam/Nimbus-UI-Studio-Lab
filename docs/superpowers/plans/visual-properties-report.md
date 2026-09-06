# Task 2 visual properties

Status: Task 2 complete within assigned ownership. Initial eight tests observed RED, then GREEN; later regressions for data URLs, non-header text roles, badge/chart values and numeric drafts also observed RED before fixes. No commits, pushes or subagents.

All new model fields are optional. Existing v1 documents stay unchanged on round trip. Legacy solid `background` remains the base fill. Inspector resets backdrop with `undefined`; JSON omits it.

Controller integration:

- `backgroundStyle(backdrop?: Background): string` returns validated CSS declarations; absent/invalid input returns an empty string.
- `backgroundProperties(backdrop?: Background): Record<string,string>` returns camelCase React style properties from the same validation. Spread after the legacy background. Do not split CSS on semicolons: raster data URLs contain semicolons.
- `Widget.actions?: Record<string,string>` accepts `click` or `item:N`, where N is the zero-based index after trimming/removing blank item lines. Values must be page IDs (`[A-Za-z0-9_-]{1,100}`); project.ts validates that destinations exist.
- Renderer emits `data-nimbus-page="ID"` on the whole-widget `.nw-surface` and linked sidebar buttons. Closest target wins. Whole-widget surface has `tabindex="0" role="link"`; disabled/loading widgets emit no targets. Fixed navigation must ignore editing controls/summary clicks and typing when their closest target is an ancestor surface.
- Inspector preserves every existing prop and adds optional `pages?: {id:string;name:string}[]` and `pageId?: string`. Pass stable `pageId={activePageId}` so pending background uploads can merge into the latest widget style after unrelated edits. No onBackdrop callback needed. Without pageId, BackgroundEditor conservatively cancels pending completion on document changes; this fallback was browser-tested. Inspector image/logo uploads invalidate only for pageId, selected widget ID, lock state, image replacement, superseding upload or unmount, and use the latest onImage callback for a partial merge.
- `Inspector.onChange: (patch: Partial<Widget>) => boolean | void`, `Inspector.onPage: (patch: Partial<StudioDocument>) => boolean | void`, and `BackgroundEditor.onChange: (value: Background | undefined) => boolean | void`. Explicit false suppresses upload-success announcements; existing void callbacks remain compatible.
- Root stylesheet owns the visual-properties.css import. visual-properties.tsx has no side-effect CSS import or CSS suppression comment.

Exact additions: Background = solid {color}, linear {angle,stops}, radial {shape,centerX,centerY,stops}, image {src,size,positionX,positionY,repeat}; discriminant `type`. Stops are {color,position} with 2–8 ordered hex stops. `style.text?: {title?,subtitle?,value?}` each supports color, fontSize, fontFamily, fontWeight, lineHeight, letterSpacing, align, transform, decoration, italic. `style.logo?: {width,height,fit}`. `motion.loading?` = shimmer/pulse/spinner/static; `easing?` = linear/ease/ease-in/ease-out/ease-in-out; `repeat?` = integer 1–20 or infinite (entrance count; loading continues while active).

Validation ranges: angle 0–360; stop position, centers and image position 0–100%; radial shape circle/ellipse; image size cover/contain/auto, repeat no-repeat/repeat/repeat-x/repeat-y. Text size 8–160px, weight 100–900, line height 0.5–3, tracking -10–30px; font sans/serif/mono; align left/center/right/justify; case none/uppercase/lowercase/capitalize; decoration none/underline/line-through; italic boolean. Logo dimensions 8–640px and fit contain/cover/fill/scale-down/none. Image policy remains HTTPS or raster data URLs, uploaded PNG/JPEG/WebP/GIF ≤2 MB and ≤40 million decoded pixels.

Numeric controls (both existing Inspector NumberField and granular Numeric) keep local drafts and commit on blur/Tab/Enter. Bounds apply at commit. Empty/invalid input restores the current value; Escape cancels. `commitNumericValue(draft,current,min,max)` is the tested shared commit helper.

Verification:

- `node --experimental-strip-types --test --test-reporter=spec tools/studio/visual-properties.test.ts tools/studio/model.test.ts tools/studio/render.test.ts tools/studio/export-compile.test.ts`: 40/40 passed after reciprocal review fixes, including 13 visual-properties tests.
- `node node_modules/typescript/bin/tsc --noEmit -p packages/application-shell/tsconfig.json`: passed after final source changes.
- Controller confirmed full `pnpm check` PASS before reciprocal review fixes: 57 studio tests, 36 governance tests, typechecks, Vite and Next builds, plus core browser flows and dialogs at 390px. The review's progress-rendering fix and new regression require the controller's next runtime-source refresh/full gate; this worker did not edit runtime-source.ts.
- Isolated Playwright browser on port 5181: page linear and widget radial gradients; widget raster background decode and contain size; logo upload decoded at 120×48 with contain; sidebar label and item target; title rendered at 31px; spinner animation nw-spin switches to none under reduced motion; static loading has no animation; old/new numeric fields accept sequential typing 12, Tab, Enter clamp, empty revert, Escape cancellation. Delayed background upload skipped safely while preserving newer font=16. Browser console: zero errors/warnings.

Files changed: packages/application-shell/src/studio/{types.ts,model.ts,render.ts,inspector.tsx,visual-properties.tsx,visual-properties.css}; tools/studio/visual-properties.test.ts; this report. No changes to studio/canvas/export/templates/root styles by this worker.

Handoff: implementation frozen; isolated browser session and worker Vite server closed. Reciprocal read-only review remains controller-owned. No further expansion pending.

Reciprocal review follow-up completed (two P2 findings plus the explicitly requested callback-result fix):

- Image/logo race reproduced RED in browser: completing a delayed upload after title/alt edits produced no image. GREEN: decoded image committed with newer title/alt preserved. Isolated real Inspector fixture verified the latest callback captured `Latest callback`, with one commit for ordinary edits and zero commits for page, selection, lock or replacement changes.
- Progress visible percentage now uses the value-text helper; native progress remains numeric and bounded. New unit regression observed RED then GREEN for 72%, clamp to 100%, and clamp to 0%, with value font/color/weight overrides.
- Isolated real BackgroundEditor fixture with onChange returning false reproduced RED as `[rejection, success]`; GREEN emits only the rejection. A legacy void-return callback still emits success. Boolean results propagate through Inspector page/widget background callbacks.
- Follow-up changed only inspector.tsx, render.ts, visual-properties.tsx, tools/studio/visual-properties.test.ts and this report. No other expansion.
