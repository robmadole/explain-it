# Tasks

## 1. Monorepo setup

- [x] 1.1 Turn the root `package.json` into a private workspace root (`workspaces: ["packages/*", "examples/*"]`, shared dev deps `typescript`, `vitest`, `@fission-ai/openspec`) and add `tsconfig.base.json`; verify `npm install` succeeds from the root
- [x] 1.2 Create `packages/core` as `@explain-it/core` with peer deps `@motion-canvas/core` and `@motion-canvas/2d` `~3.17.2` and `vite` `^5`, dependencies `esbuild` and `typescript`, optional peer `playwright`, the `bin: explainer` entry, and `exports` for `.`, `./config` and `./vite`; verify `npm ls -w packages/core` resolves with no missing peers
- [x] 1.3 Add the root scripts `build`, `test` and `typecheck` that run across workspaces, plus a GitHub Actions workflow that runs them on push; verify the workflow passes on an empty test suite

## 2. Site build

- [x] 2.1 Spike: find how to compile scenes without `.meta` files in the consumer's tree, and record the outcome in design.md (outcome: virtual project modules with in-memory `MetaFile`s, no `@motion-canvas/vite-plugin`)
- [x] 2.2 Implement `defineExplainer` and config loading in `src/config` with validation (unique section ids, a scene file present for each section) and unit tests for each error
- [x] 2.3 Implement the Vite plugin in `src/vite`. It generates the shell `index.html`, the section pages, projects and meta files (seed from config) into `.explainer/`, and the build inputs; verify a two-section fixture builds to `dist/` and that a missing scene file fails with its name
- [x] 2.4 Make the build base-path independent; verify `dist/` served under a subdirectory loads with no 404s
- [x] 2.5 Create `examples/basic` with two sections of two or three beats each, using only config and `sections/*.tsx`; verify `npm run build -w examples/basic` succeeds and leaves no `.meta` files outside `.explainer/`

## 3. Theme

- [x] 3.1 Implement `defineTheme` and the base dark tokens in `src/theme`, so added roles are typed; verify with a vitest type test that `theme.creator` exists when added and is a type error when not
- [x] 3.2 Emit the theme as a `:root` CSS custom-property stylesheet and inject it into the shell and section pages; verify with a unit test of the CSS output and by changing `accent` in `examples/basic` and seeing the shell dots change

## 4. Player runtime

- [x] 4.1 Port `shell.ts`, `shell.css`, `section.ts`, `section.css` and `present.ts` into `src/runtime`, building the nav from config and the render settings in code (1920×1080, 60 fps, sRGB, theme background); verify `examples/basic` in `explainer dev` behaves like the live contract explainer (timeline, beat dots, Next/Back labels, arrow keys from shell and section, click to advance, crossing section boundaries)
- [x] 4.2 Add `#section/beat` deep links: seek on load, update the hash with `replace` while stepping, and fall back for an unknown section or beat; verify each scenario in specs/player by hand in `examples/basic`
- [x] 4.3 Keep the current beat across scene HMR; verify that editing a caption in `examples/basic` reloads at the same beat with the new text

## 5. Scene authoring

- [x] 5.1 Port `Caption` and the backtick word splitter into `src/scene`; verify with unit tests for code spans, trailing punctuation, and multiple spans
- [x] 5.2 Implement `scene()` (background, legend from config, transient layer, caption, and an `add()` helper) and `beat()` (caption and body run concurrently, then `beginSlide`, with a duplicate-id error); verify that `examples/basic` uses them and that a duplicate id fails to load with the id named

## 6. Diagram kit

- [x] 6.1 Port `Icon` with a structural `IconDefinition` type and embed path data for the kit's check, xmark and ban marks, with no `@fortawesome/*` dependency; verify with `npm ls` that no Font Awesome package is installed for core
- [x] 6.2 Implement `Box` (generalized from `Party`), `Token` (from `Pill`), and `Legend` (driven by config entries); verify by rendering them in `examples/basic`
- [x] 6.3 Port `CodePanel` with insert, remove, replace, mark and focus; verify in an `examples/basic` beat that exercises each
- [x] 6.4 Implement `Wire` with anchors computed from the facing edges of `from`/`to` that follow box movement; verify with unit tests for the edge selection in each relative position, and in an example beat where a box moves
- [x] 6.5 Implement `rise`, `pulse`, `draw`, `cut`, `travel` (along a wire or between points) and `refuse` (optional label), each removing its transient nodes; verify in example beats and with a check that the layer is empty after each beat
- [x] 6.6 Name kit components from their title or text for snap output (a name registry, since Motion Canvas `key`s must be unique); verify the names appear in a snap JSON in group 7

## 7. Review tools

- [x] 7.1 Implement the CLI entry with `dev` and `build` subcommands wrapping the Vite plugin; verify `npx explainer dev` and `npx explainer build` work in `examples/basic`
- [x] 7.2 Implement `outline` on the TypeScript AST, with `--section` and `--json`; verify with unit tests on fixture scene files, including empty bodies
- [x] 7.3 Implement the static checks for `check --static` (missing files, duplicate ids, non-literal captions, unbalanced backticks, captions over 140 characters, more than 12 beats, and a type check), with text and `--json` output; verify each rule against a failing fixture
- [x] 7.4 Add snap mode to the runtime (`?snap`): transitions off, `window.__explainer` with `beats()`, `seek()` and `nodes()`, and wait for fonts; verify by calling it from Playwright on `examples/basic`
- [x] 7.5 Implement `snap [section] [beat]` writing PNG and JSON files to `.explainer/snap/`, printing the paths, and giving an install hint when Playwright is missing; verify that two runs produce identical PNGs
- [x] 7.6 Implement the layout rules on snap JSON (off-frame, text over text, node over caption, with a `data-allow-overlap` opt-out) and wire them into `check`; verify each rule with JSON fixtures and that `explainer check` exits 0 on `examples/basic`
- [x] 7.7 Run `build`, `outline`, `snap` and `check` on `examples/basic` in CI with Playwright Chromium installed; verify the workflow passes

## 8. Scaffolding and agent guide

- [x] 8.1 Implement `explainer new` for an empty directory (config, theme, package.json scripts, .gitignore, tsconfig, starter section, and a `CLAUDE.md` pointer); verify that in a temp dir `npm install && npx explainer check` passes and that running it twice leaves one pointer
- [x] 8.2 Implement `explainer new <id> --label --source`, which appends to the config and refuses existing ids; verify both scenarios in specs/scaffolding
- [x] 8.3 Write `packages/core/AGENTS.md` (outline-first workflow, one idea per beat, caption style, coordinates, wires and anchors, snap/check loop, full API reference); verify that an agent following it from `explainer new` produces a section that passes `check`
- [x] 8.4 Write `packages/core/README.md` and update the root README to describe the monorepo layout; verify the README quick start runs as written

## 9. First consumer: live-contract-motion

- [x] 9.1 Capture the baseline: run `outline` against the current live-contract scenes (via a temporary config in a worktree of buildawesome-service) and save it; verify it lists 15 sections and their beats
- [x] 9.2 In that worktree, depend on an `npm pack` tarball of core, add `explainer.config.ts`, `theme.ts` and `cast.tsx` (parties on `Box`), and delete the boilerplate listed in proposal.md; verify `explainer build` succeeds
- [x] 9.3 Rewrite all 15 scenes on `scene`, `beat` and the kit; verify `explainer check` passes and `outline` matches the baseline from 9.1 except for deliberate edits
- [ ] 9.4 Compare old and new with `snap` beat by beat and fix regressions; verify by reviewing the side-by-side PNGs with the user

## Workflow follow-up

- Choose a license, add `LICENSE`, and set `license` in `packages/core/package.json` before the first publish.
- Publish `@explain-it/core@0.1.0` with `npm publish -w packages/core`, then switch the buildawesome-service worktree from the packed tarball to the published version.
- Archive the change once the port is merged.
