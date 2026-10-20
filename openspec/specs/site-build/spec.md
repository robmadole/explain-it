# site-build Specification

## Purpose

Turns an explainer's config file and its section scene files into a running dev server and a static site, with no per-section boilerplate in the consumer's repo.

## Requirements

### Requirement: Config declares the explainer
An explainer SHALL be declared by one `explainer.config.ts` at its root. The config gives the title, ordered sections (each an id and a nav label, optionally a source anchor), an optional source document, theme overrides, legend entries, and a random seed.

#### Scenario: Sections come from config
- **WHEN** the config lists sections `contract` then `events`
- **THEN** the built site shows them in the nav in that order, labelled as configured

#### Scenario: Section without a scene file
- **WHEN** the config lists a section id with no matching `sections/<id>.tsx`
- **THEN** the dev server and build fail with an error naming the missing file

### Requirement: One scene file per section
Each section SHALL be a single file at `sections/<id>.tsx` whose default export is a scene. The consumer SHALL NOT need to write HTML pages, project files, or Motion Canvas metadata files.

#### Scenario: Minimal consumer
- **WHEN** a directory holds only `explainer.config.ts`, `sections/*.tsx` and a `package.json` depending on `@explain-it/core`
- **THEN** `explainer dev` serves a working explainer and `explainer build` produces a static site

#### Scenario: No metadata written to the consumer
- **WHEN** `explainer dev` or `explainer build` runs
- **THEN** no `.meta` files and no generated project files are written outside the gitignored `.explainer/` directory

### Requirement: Static build output
`explainer build` SHALL write a self-contained static site to `dist/` that works when served from any base path.

#### Scenario: Served from a subdirectory
- **WHEN** `dist/` is served at `/docs/live/`
- **THEN** the shell, every section and every asset load without 404s

### Requirement: Dev server reloads scenes
`explainer dev` SHALL serve the explainer and, when a scene file changes, reload that section at the beat that was showing.

#### Scenario: Editing a caption
- **WHEN** the viewer is on beat `rebuilt` of `events` and the caption string of that beat is edited
- **THEN** the section reloads showing beat `rebuilt` with the new caption

### Requirement: Deterministic randomness
Scenes SHALL draw from a random generator seeded from the config, so the same source renders the same frames.

#### Scenario: Two snaps match
- **WHEN** `explainer snap` runs twice on unchanged source
- **THEN** the PNGs are identical
