# Canvas Studio build-speed benchmark

This is a protocol, not a press release. It exists so any speed claim made
about the Canvas Studio (drag/drop/resize component builder in
`packages/application-shell`) can be checked by someone who has never
talked to the author. If you see a multiplier quoted anywhere for this
project and this file has no matching entry in
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

None yet. Add a row per run:

| Date | Commit | Task | Baseline (min) | Canvas Studio (min) | Ratio | Operator |
| ---- | ------ | ---- | --------------- | -------------------- | ----- | -------- |

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

Pull requests adding rows with real timings (and the commit + prompt
used) are welcome.
