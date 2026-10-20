# review-tools Specification

## Purpose

Lets agents and humans review an explainer without clicking through it: read the whole narration, see each beat's settled frame, and get pass/fail checks on layout and structure.

## Requirements

### Requirement: Outline
`explainer outline` SHALL print markdown with one heading per section in config order and, under each, the beats in order as `id` and caption. It SHALL read source files only, not run scenes. `--section <id>` SHALL limit it to one section.

#### Scenario: Whole explainer
- **WHEN** `explainer outline` runs on an explainer with two sections of three beats each
- **THEN** it prints two section headings, each followed by three beat entries in source order

#### Scenario: Empty bodies
- **WHEN** every beat body is empty
- **THEN** the outline is the same as it would be with full bodies

### Requirement: Snap
`explainer snap [section] [beat]` SHALL render each selected beat's settled frame headlessly and write, per beat, a PNG at 1920×1080 and a JSON file of named nodes with their on-screen bounds and text. With no arguments it SHALL snap every beat of every section. Output SHALL go to `.explainer/snap/<section>/<beat>.{png,json}` and the command SHALL print the paths.

#### Scenario: One beat
- **WHEN** `explainer snap events dropped` runs
- **THEN** `.explainer/snap/events/dropped.png` and `.explainer/snap/events/dropped.json` exist and their paths are printed

#### Scenario: Browser not installed yet
- **WHEN** `snap` or `check` runs and Playwright's Chromium isn't installed
- **THEN** it installs Chromium once into Playwright's shared cache, with progress on stderr, and carries on; if the install fails it exits non-zero with the command to retry

### Requirement: Check
`explainer check` SHALL exit non-zero and list every failure with section, beat and file location when any of these hold:
- a type error
- a config section without a file
- a duplicate beat id
- a caption that isn't a string literal
- unbalanced backticks in a caption
- a caption over 140 characters
- a section with more than 12 beats
- at any beat's settled frame: a node partly outside the 1920×1080 frame, two text nodes overlapping, or any node overlapping the caption

#### Scenario: Clean explainer
- **WHEN** `explainer check` runs on `examples/basic`
- **THEN** it exits 0 and prints the number of sections and beats checked

#### Scenario: Off-frame node
- **WHEN** a box in beat `stream` of `events` extends past the right edge
- **THEN** check fails with `events/stream`, the node's name, and how far it overflows

#### Scenario: Static-only mode
- **WHEN** `explainer check --static` runs
- **THEN** only the checks that need no rendering run, and no browser is required

### Requirement: Machine-readable results
`outline`, `snap` and `check` SHALL accept `--json` and then print a single JSON document instead of text.

#### Scenario: Check as JSON
- **WHEN** `explainer check --json` finds two failures
- **THEN** it prints one JSON object whose `failures` array has two entries, each with `rule`, `section`, `beat`, `file`, `line` and `message`
