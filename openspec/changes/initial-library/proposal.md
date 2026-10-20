# Proposal

## Why

The live contract explainer in `buildawesome-service/docs/live-contract-motion` works and reads well. About half its code is boilerplate, though:

- 15 identical section HTML pages
- 15 identical `project.ts`/`project.meta` pairs
- a hand-kept nav list
- a player copied into the project
- a theme duplicated between TS and CSS
- the same `carry`/`drop`/`pulse` helpers rewritten in up to six scenes

A new explainer means copying all of that. Agents writing scenes also have no way to see or check what they drew. Pulling it into `@explain-it/core` makes a new explainer a config file plus one TSX file per section. It also gives agents a feedback loop from the first commit.

## What Changes

- The repo becomes an npm-workspaces monorepo:
  - The root `package.json` is private. It holds the workspaces, shared dev tooling, and OpenSpec.
  - Published packages live in `packages/<name>` as `@explain-it/<name>`.
  - Private example explainers live in `examples/<name>`.
  - Shared TypeScript settings live in `tsconfig.base.json`.
- New package `@explain-it/core` in `packages/core`, with subpath exports for:
  - the Vite plugin
  - the runtime player
  - scene authoring
  - the theme
  - 2D components
  - motion primitives
- `explainer.config.ts` in the consumer declares the title, theme, legend, source document, and ordered sections. Section HTML pages, the shell page, and Motion Canvas projects are generated from it.
- The player is the existing shell + section iframe UI, ported unchanged in look and feel. It adds `#section/beat` deep links.
- `scene()` and `beat(id, caption, body)`:
  - narration lives inline
  - each beat ends at a slide
  - the canvas background, the caption, and a layer for transient nodes are set up for the scene
- `defineTheme()` holds one set of tokens. It feeds both the canvases and the shell CSS.
- A diagram kit:
  - components: `Box`, `Wire`, `Token`, `CodePanel`, `Icon`, `Legend`, `Caption`
  - motion: `rise`, `pulse`, `travel`, `refuse`, `draw`, `cut`
  - wires attach to box edges, so scenes need no edge math
- An `explainer` CLI:
  - `new`, `dev`, `build`
  - `outline`: narration as markdown
  - `snap`: a PNG and node-bounds JSON for each beat
  - `check`: layout and structure checks
- An `AGENTS.md` authoring guide ships in the package. `explainer new` links it from the consumer's `CLAUDE.md`.
- No Motion Canvas editor and no `.meta` files in consumer repos.
- No video export.
- `examples/basic` is a small two-section explainer inside the repo. It is the fixture that tests `dev`, `build`, `outline`, `snap`, and `check` against.
- `live-contract-motion` is ported as the first real consumer.

## Capabilities

### New Capabilities

- `site-build`: `explainer.config.ts`, and how the Vite plugin turns it and `sections/*.tsx` into a dev server and a static site.
- `player`: navigation in the built site: the section timeline, beat stepping, keys, clicks, and deep links.
- `scene-authoring`: `scene()` and `beat()`, the inline narration contract, and captions with inline code.
- `theming`: theme tokens, extending them, and their delivery to canvases and CSS.
- `diagram-kit`: the reusable 2D components and motion primitives.
- `scaffolding`: `explainer new` and the shipped agent authoring guide.
- `review-tools`: `explainer outline`, `snap` and `check`, the loop agents use to see and verify their work.

### Modified Capabilities

None. This is the first change in the repo.

## Impact

- New repo `robmadole/explain-it`, structured as a monorepo. `packages/core` is published to npm as `@explain-it/core`.
- The root `package.json` (currently named `@explain-it/core`) becomes the private workspace root.
- Peer dependencies:
  - `@motion-canvas/core` and `@motion-canvas/2d` 3.17.x
  - `vite` 5
- Runtime dependencies: `esbuild` (loads the config) and `typescript` (reads scenes for `outline` and `check`).
- Optional peer dependency: `playwright`, needed only for `snap` and `check`.
- `buildawesome-service/docs/live-contract-motion` changes:
  - its `src/section`, `src/shell`, `src/lib` (except project-specific parties), `sections/*.html`, `index.html`, the Vite configs, and every `.meta` and `project.ts` file are deleted
  - its scenes are rewritten on the library
  - that work happens in a worktree of that repo
