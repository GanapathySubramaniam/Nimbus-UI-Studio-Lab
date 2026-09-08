# Canvas Studio build-speed benchmark

This is a protocol, not a press release. It exists so any speed claim made
about the Canvas Studio (drag/drop/resize component builder in
`packages/application-shell/src/studio`) can be checked by someone who
has never talked to the author. If you see a multiplier quoted anywhere
for this project and this file has no matching entry in
[Recorded runs](#recorded-runs), treat the number as unverified.

## What is being compared

**Baseline** — hand-write the task's JSX and CSS from an empty file,
using only the reference apps in this repo (`apps/reference-vite` or
`apps/reference-next`) and no code generator.

**Canvas Studio** — build the same layout by dragging components from
the library onto the canvas, positioning/resizing them, editing content
in the inspector, and copying the generated code from the code panel.

Both runs solve the same task from the same starting checkout, by the
same operator, immediately after reading the same prompt.

## Environment to record with every run

- Commit SHA (`git rev-parse HEAD`)
- OS + browser + version
- Node version (`node -v`)
- Operator's prior familiarity with this codebase (new / returning)

## Timing rule

Start the stopwatch when the operator finishes reading the prompt. Stop
it when the on-screen result visually matches the prompt's acceptance
criteria. Record wall-clock minutes to one decimal place. One run per
condition per task — no discarding a slow attempt and re-rolling.

## Tasks

### Task A — Metrics header

> Build a header row with a section heading ("Portfolio overview") on
> the left and a solid accent-toned "New agent run" button on the
> right, followed by three stat tiles in a row: Active agents (24, ↗
> 12%), Tasks completed (1,284, ↗ 8.4%), Success rate (98.6%).

Acceptance: 1 heading, 1 button, 3 stat tiles, correct label/value text,
no overlapping elements.

### Task B — Agent status panel

> Build a panel containing one agent card ("Research agent", "Ready ·
> 12 tools connected", violet tone) and, below it, a prompt field
> pre-filled with "Summarize this run".

Acceptance: 1 agent card, 1 prompt field, stacked vertically, no
overlap, both readable at default zoom.

### Task C — Activity table row

> Build one data row showing "Customer feedback synthesis" / "Complete"
> / "$2.17", with a status badge ("Operational", accent tone) placed
> above it.

Acceptance: badge above the row, row shows all three text fields.

## Recorded runs

No human-timed run yet. Add a row per run:

| Date | Commit | Task | Baseline (min) | Canvas Studio (min) | Ratio | Operator |
| ---- | ------ | ---- | --------------- | -------------------- | ----- | -------- |

## Sample run (agent-driven, not a human timing)

All three tasks were actually executed and measured, to check the
protocol works end to end and to report real, non-fabricated numbers
while [Recorded runs](#recorded-runs) waits for a human operator. Read
the caveats before quoting any of this.

**Setup**: commit `41f9111e0346fa0ef136cf3bc79693c8d64a35e0` (app code
unchanged as of this file's own commit), Chromium via Playwright,
`apps/reference-vite` production build served locally. The operator
was Claude (Sonnet 5) driving both arms through scripted tool calls —
not a person, and not a blinded UI study. Wall-clock numbers measure
tool-call/automation latency, not human typing or mouse speed, and
**the Studio and baseline times are not compared to each other** —
doing so would smuggle back exactly the unfalsifiable multiplier this
file exists to prevent.

| Task | Studio build (s) | Studio + export dialog (s) | Generated code | Hand-written baseline | Baseline authoring (s) |
| --- | --- | --- | --- | --- | --- |
| A — Metrics header | 2.63 | 4.04 | 6,895 chars / **1,709 tokens** | 1,890 chars / **572 tokens** | 16.9 |
| B — Agent status panel | 1.03 | 1.79 | 3,264 chars / **807 tokens** | 1,887 chars / **596 tokens** | 16.7 |
| C — Activity table row | 1.05 | 1.81 | 3,256 chars / **808 tokens** | 953 chars / **301 tokens** | 14.0 |

(tokens: `cl100k_base` via `gpt-tokenizer`)

Raw artifacts for all three are committed at
`docs/benchmark-samples/task-{a,b,c}/` (`baseline.tsx` + `baseline.css`
vs. `studio-export.tsx`) so the counts above can be recomputed
independently:

```sh
npm install gpt-tokenizer
node -e "const {encode}=require('gpt-tokenizer');const fs=require('fs');
console.log(encode(fs.readFileSync(process.argv[1],'utf8')).length)" \
  docs/benchmark-samples/task-a/studio-export.tsx
```

**Reading this honestly**: the generated export carries a largely
fixed per-page cost (project metadata, widget tree, per-widget style
objects) on top of the actual widget content — roughly 600-700 tokens
of scaffolding regardless of task size. That overhead dominates on a
small task (B: 807 tokens generated for a 2-widget panel whose
hand-written equivalent is 596) and is proportionally smaller on a
bigger one (A: 5 widgets). None of these three trials support a
"fewer tokens" claim for the default "Whole app" export scope — a
follow-up measuring the "Selected widget only" scope should come
before any such claim is made, alongside a real human-timed run.

**Disclosed deviations**: the component palette has no widget
literally named "agent card" or "prompt field" — Task B used the
closest matches ("Agent status" and "Message composer" widgets), and
its card's tone was left at the theme default rather than set to
violet (that control's field structure wasn't scripted in this
trial). Task C's "data row" was built with the "Data table" widget
set to one header row plus one data row, since no standalone
single-row widget exists in the palette.

## Known limitations

- Single-operator timings are anecdotal, not a controlled study — n=1
  per row. Treat any ratio as directional until the same task has
  several independent rows.
- The baseline assumes no prior copy-pasting from the Canvas Studio's
  own output; if the operator has memorized the generated markup, the
  baseline time will be understated.
- Canvas Studio's output is a positioned-`div` mockup, not the same
  code shape as hand-written semantic JSX — this measures prototyping
  speed to a visual match, not production-code equivalence.
- Token counts use `cl100k_base` (via the `gpt-tokenizer` package) as a
  fixed, reproducible reference tokenizer. Other tokenizers will report
  different absolute counts; the point is that anyone can re-run the
  same tokenizer against the same files and get the same number.
- The Studio embeds a random UUID per widget in its exported project
  JSON, so re-exporting the identical on-screen design generates a
  file that differs by a couple of tokens each time. The counts above
  match the specific files committed under `docs/benchmark-samples/`;
  a fresh export of the same design will be close but not bit-identical.

Pull requests adding rows with real timings (and the commit + prompt
used) are welcome.
