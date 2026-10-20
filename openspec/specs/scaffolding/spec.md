# scaffolding Specification

## Purpose

Setting a repo up for explainers, creating explainers and sections from the command line, and giving any agent working in the repo the authoring rules it needs.

## Requirements

### Requirement: Repo setup
`npx @explain-it/core setup [dir]` SHALL write `explain-it.config.ts` naming the explainers folder (`docs/explainers` unless `--explainers` says otherwise), add the explainers' generated folders to `.gitignore`, and point `CLAUDE.md` at the guide. It SHALL leave existing files' content in place and be safe to run again.

#### Scenario: Fresh repo
- **WHEN** `setup` runs at the root of a repo with none of these files
- **THEN** `explain-it.config.ts`, `.gitignore` and `CLAUDE.md` exist, and `new` can create explainers under `docs/explainers/`

#### Scenario: Run twice
- **WHEN** `setup` runs a second time
- **THEN** it writes nothing, and `CLAUDE.md` and `.gitignore` hold each line once

### Requirement: New explainer
`npx @explain-it/core new <name>`, run anywhere under a folder with `explain-it.config.ts`, SHALL create `<explainers folder>/<name>/` holding only `explainer.config.ts` and `sections/intro.tsx` with one beat. It SHALL refuse an invalid name or an existing folder, and without a repo config SHALL say to run `setup`.

#### Scenario: Only content and config
- **WHEN** `new live-contract` runs in a set-up repo
- **THEN** `docs/explainers/live-contract/` holds `explainer.config.ts` and `sections/intro.tsx`, and `check` passes on it with nothing installed

#### Scenario: Not set up
- **WHEN** `new one` runs where there is no `explain-it.config.ts` here or above
- **THEN** it fails without writing anything and says to run `npx @explain-it/core setup` first

### Requirement: New section
`npx @explain-it/core section <id>` in an explainer SHALL create `sections/<id>.tsx` with one placeholder beat and append the section to the config. `--label` SHALL set the nav label and `--source` SHALL set the source anchor.

#### Scenario: Adding a section
- **WHEN** `section events --label Events --source '#events'` runs
- **THEN** `sections/events.tsx` exists and the config's last section is `{id: 'events', label: 'Events', source: '#events'}`

#### Scenario: Existing id
- **WHEN** `section events` runs and `events` is already in the config
- **THEN** the command fails without writing anything and says the section exists

### Requirement: Agent authoring guide
The package SHALL ship an `AGENTS.md` that covers the outline-first workflow, one thing to look at per beat, caption style, the canvas coordinate system, wires and anchors instead of edge math, and running `snap` and `check` after each change. `npx @explain-it/core guide` SHALL print it, so an agent reads the guide for the version that runs.

#### Scenario: Reading the guide
- **WHEN** an agent runs `npx @explain-it/core guide`
- **THEN** it prints `AGENTS.md` from the installed package
