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
- **WHEN** a directory holds only `explainer.config.ts` and `sections/*.tsx`, with no `package.json` or `node_modules` beside or above it
- **THEN** `npx @explain-it/core view` serves a working explainer and `npx @explain-it/core build` produces a static site

#### Scenario: No metadata written to the consumer
- **WHEN** `view` or `build` runs
- **THEN** no `.meta` files and no generated project files are written outside the gitignored `.explainer/` directory

### Requirement: Imports need no install
Scenes and configs SHALL be able to import `@explain-it/core`, `@explain-it/core/config`, `@motion-canvas/core`, `@motion-canvas/2d` and the Font Awesome Free icon packages without installing them: they resolve from the CLI's own install, for serving, building and type checking alike.

#### Scenario: Icons with nothing installed
- **WHEN** a scene imports `faServer` from `@fortawesome/free-solid-svg-icons` in an explainer with no `node_modules`
- **THEN** `view` and `build` render it and `check` reports no type errors

### Requirement: Viewing by name
`npx @explain-it/core view [name|dir]` SHALL serve the named explainer from the repo's explainers folder, or the folder given, and open it in the browser. With no argument it SHALL serve the explainer in the current folder, else the repo's only explainer, else ask which one (or, without a terminal, list their names and exit non-zero).

#### Scenario: From elsewhere in the repo
- **WHEN** `view live-contract` runs in any folder under the repo root
- **THEN** it serves `docs/explainers/live-contract`

### Requirement: Static build output
`npx @explain-it/core build` SHALL write a self-contained static site to `dist/` that works when served from any base path.

#### Scenario: Served from a subdirectory
- **WHEN** `dist/` is served at `/docs/live/`
- **THEN** the shell, every section and every asset load without 404s

### Requirement: Dev server reloads scenes
`npx @explain-it/core view` SHALL serve the explainer and, when a scene file changes, reload that section at the beat that was showing.

#### Scenario: Editing a caption
- **WHEN** the viewer is on beat `rebuilt` of `events` and the caption string of that beat is edited
- **THEN** the section reloads showing beat `rebuilt` with the new caption

### Requirement: Deterministic randomness
Scenes SHALL draw from a random generator seeded from the config, so the same source renders the same frames.

#### Scenario: Two snaps match
- **WHEN** `explainer snap` runs twice on unchanged source
- **THEN** the PNGs are identical
