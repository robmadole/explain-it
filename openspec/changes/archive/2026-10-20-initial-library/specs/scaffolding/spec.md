# Spec Delta

## Purpose

Starting an explainer or a section from the command line, and giving any agent working in the consumer's repo the authoring rules it needs.

## ADDED Requirements

### Requirement: New explainer
`explainer new` in a directory without an `explainer.config.ts` SHALL create the config, a `theme.ts`, a `package.json` with the four scripts (`dev`, `build`, `snap`, `check`), a `.gitignore` covering `dist/` and `.explainer/`, a `tsconfig.json`, and one starter section with one beat.

#### Scenario: Empty directory
- **WHEN** `explainer new` runs in an empty directory and dependencies are installed
- **THEN** `explainer dev` serves a one-section explainer and `explainer check` passes

### Requirement: New section
`explainer new <id>` in an existing explainer SHALL create `sections/<id>.tsx` with one placeholder beat and append the section to the config. `--label` SHALL set the nav label and `--source` SHALL set the source anchor.

#### Scenario: Adding a section
- **WHEN** `explainer new events --label Events --source '#events'` runs
- **THEN** `sections/events.tsx` exists and the config's last section is `{id: 'events', label: 'Events', source: '#events'}`

#### Scenario: Existing id
- **WHEN** `explainer new events` runs and `events` is already in the config
- **THEN** the command fails without writing anything and says the section exists

### Requirement: Agent authoring guide
The package SHALL ship an `AGENTS.md` that covers:
- the outline-first workflow
- one idea per beat
- caption style
- the canvas coordinate system
- using wires and anchors instead of edge math
- running `snap` and `check` after each change

`explainer new` SHALL add a pointer to it in the consumer's `CLAUDE.md`, creating the file if needed and never duplicating the pointer.

#### Scenario: Existing CLAUDE.md
- **WHEN** the consumer's `CLAUDE.md` already has content and no pointer
- **THEN** one line pointing at `node_modules/@explain-it/core/AGENTS.md` is appended and the rest is unchanged

#### Scenario: Run twice
- **WHEN** `explainer new` runs a second time
- **THEN** `CLAUDE.md` still contains the pointer exactly once
