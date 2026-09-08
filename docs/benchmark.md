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

One trial of Task A was actually executed and measured, to check the
protocol works end to end and to report a real, non-fabricated number
while [Recorded runs](#recorded-runs) waits for a human operator. Read
the caveat before quoting this anywhere.

**Setup**: commit `41f9111e0346fa0ef136cf3bc79693c8d64a35e0`, Chromium
via Playwright, `apps/reference-vite` production build served locally.
The operator was Claude (Sonnet 5) driving both arms through scripted
tool calls — not a person, and not a blinded UI study. Wall-clock
numbers below measure tool-call/automation latency, not human
typing or mouse speed, and **the two times are not compared to each
other** — doing so would smuggle back exactly the unfalsifiable
multiplier this file exists to prevent.

| Arm | What was measured | Result |
| --- | --- | --- |
| Canvas Studio | Wall-clock to add the heading, button, and 3 stat tiles, set their content, and position them to match Task A's acceptance criteria | 2.77 s |
| Canvas Studio | Wall-clock through opening the Export code dialog on "React component" / "Whole app" (default) | 4.19 s |
| Canvas Studio | Generated code size | 6,895 characters / **1,709 tokens** (`cl100k_base`, via `gpt-tokenizer`) |
| Hand-written baseline | Equivalent JSX + CSS written from scratch, no lookups | 1,890 characters / **572 tokens** (`cl100k_base`) |
| Hand-written baseline | Wall-clock to author both files | 16.9 s (agent tool-call latency — explicitly not a proxy for human typing speed) |

Raw artifacts from this run are committed at
`docs/benchmark-samples/task-a/` (`baseline.tsx` + `baseline.css` vs.
`studio-export.tsx`) so the character/token counts above can be
recomputed independently:

```sh
npm install gpt-tokenizer
node -e "const {encode}=require('gpt-tokenizer');const fs=require('fs');
console.log(encode(fs.readFileSync(process.argv[1],'utf8')).length)" \
  docs/benchmark-samples/task-a/studio-export.tsx
```

**Reading this honestly**: the Studio's default export was ~3x more
tokens than the hand-written equivalent for this task, because the
default scope ("Whole app") ships the full project document (widget
tree, per-widget style objects, project metadata), not a minimal
snippet. That is the expected shape of a whole-app export, not a
defect — but it means "tokens saved" is not a claim this trial
supports. A follow-up should re-run this with the "Selected widget
only" export scope, which should shrink the generated code
substantially, and should record a real human's timing for both arms
before any speed multiplier is quoted publicly.

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

Pull requests adding rows with real timings (and the commit + prompt
used) are welcome.
