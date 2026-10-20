# Design

## Context

The source material is `buildawesome-service/docs/live-contract-motion`:
- 15 Motion Canvas 3.17.2 scenes, 87 to 294 lines each
- `src/lib/`: caption, code panel, icon, labels, parties, motion, theme
- `src/section/`: the per-section player, built on `Presenter`
- `src/shell/`: the timeline and iframe host
- two Vite configs, one of them for the Motion Canvas editor, which we are dropping

See proposal.md for why, and `specs/` for the behaviour each part must have.

The Motion Canvas Vite plugin compiles `?scene` and `?project` imports. In dev it writes a `.meta` file next to each scene and project it compiles. `Presenter` reads render settings from `project.meta`.

## Goals / Non-Goals

**Goals:**
- A consumer explainer is `explainer.config.ts`, `theme.ts` (optional), `sections/*.tsx`, and project-specific components. Nothing else.
- The repo is laid out so more packages can join later without restructuring.
- Port the existing player UI with no visible change, plus deep links.

**Non-Goals:**
- Video or GIF export.
- Any Motion Canvas editor support, timeline events, or audio.
- Light theme or theme switching in v1. The token layer allows it later.
- Splitting `core` into several published packages.
- A plugin or extension API for third-party components. Consumers write their own components in their repo.

## Decisions

### Monorepo with npm workspaces

```
explain-it/
  package.json            private root: workspaces, shared dev deps (typescript, vitest, openspec)
  tsconfig.base.json      shared compiler settings
  openspec/
  packages/
    core/                 @explain-it/core (published)
      package.json        bin: explainer
      AGENTS.md
      src/
        config/           defineExplainer, config loading + validation
        theme/            defineTheme, base tokens, CSS emission
        scene/            scene(), beat(), Caption
        kit/              Box, Wire, Token, CodePanel, Icon, Legend + motion primitives
        runtime/          shell + section player (browser code, CSS)
        vite/             the Vite plugin
        cli/              new, dev, build, outline, snap, check
      test/
  examples/
    basic/                private two-section explainer, the fixture for CLI tests
```

- **npm over pnpm or yarn.** Both existing projects already use npm. Workspaces cover everything needed here.
- **No Turborepo or Nx.** There's one package. Add a task runner when a second package makes builds order-dependent.
- **No changesets.** Publish by hand with `npm publish -w packages/core` until there are several packages to version.
- **`examples/` are workspaces.** They depend on `@explain-it/core` through the workspace link, so they always run against the source.

### One published package, few entry points

`@explain-it/core` exposes:
- `.`: the authoring API used inside scenes: `scene`, `beat`, the kit components and motion primitives, `defineTheme`, and the base theme.
- `./config`: `defineExplainer`. It runs in Node only and is kept separate so the config doesn't pull in browser code.
- `./vite`: the plugin. The CLI uses it, and consumers with their own Vite setup can too.

The runtime is internal. The generated pages import it through the plugin. Fewer public entry points means fewer things to keep stable.

The earlier sketch had a subpath per area (`/2d`, `/motion`, `/scene`). It was dropped because scenes import from all of them anyway.

### Generated pages live in `.explainer/`; projects are virtual

The plugin writes the shell `index.html` and one HTML page per section into
`.explainer/site/`, which is Vite's root. Section projects are virtual modules
(`virtual:explain-it/project/<id>`): each imports `sections/<id>.tsx` directly,
attaches in-memory `MetaFile`s (`source: false`, so nothing is ever written),
and calls Motion Canvas's `bootstrap()`. The resolved config is served as
`virtual:explain-it/config`.

Task 2.1 settled this. Reading `@motion-canvas/vite-plugin` 3.17.2 showed:
- `?scene`/`?project` write `.meta` files next to whatever path is imported.
- `MetaFile` with `source: false` never writes.
- The plugin merges `~/.motion-canvas/settings.json` into every project, so
  renders would depend on the machine.

So `@motion-canvas/vite-plugin` is not a dependency. Our plugin sets the JSX
options it used to set, and dedupes the Motion Canvas packages. A config
change rewrites the pages and forces a full reload; a scene change reloads the
section page, which starts again at the beat in its hash.

- **Rejected: generated `project.ts` files plus the Motion Canvas plugin.**
  It needs `.meta` files on disk and inherits the home-directory settings.

### Render settings live in code

The plugin's virtual project module loads fixed render settings into the in-memory project meta, so nothing comes from a file:
- 1920×1080
- 60 fps
- sRGB
- background from the theme

This is the one place those numbers live.

### Theme is a plain module

The consumer writes `theme.ts` with `export const theme = defineTheme({creator: '#f2b84b'})`. Scenes import it directly, and `explainer.config.ts` imports it too.

`defineTheme` merges the overrides over the base tokens and returns a typed object. Added roles are typed with no codegen. The plugin turns the config's theme into a `:root { --name: value }` stylesheet injected into the shell and section pages, which replaces `tokens.css`.

**Rejected: a virtual `explain-it:theme` module.** Typing it would need a generated `.d.ts`.

### `scene()` and `beat()`

`scene(fn)` wraps `makeScene2D`. It fills the background, adds the legend, the transient layer, and the caption, then calls `fn` with `{view, add, layer, theme}`. `add(node)` adds a node to the view and returns it, so scenes don't need refs for nodes they build.

`beat(id, caption, body)` is a generator. It:
1. records the id in a per-scene set and throws on a duplicate
2. runs the caption change and `body()` concurrently
3. calls `beginSlide(id)`

Running the caption concurrently is a small timing change from today's scenes, where some ran `say` first. It keeps beats short. A body that wants the caption first can `yield* waitFor(0.6)`.

### Wires read box anchors

`Wire` takes `from` and `to` node references. Its points are signals computed from each box's `left()`/`right()`/`top()`/`bottom()`, picking the pair of facing edges by relative position. Scenes stop computing `EDGE` constants, and wires follow boxes that move.

`travel(token, {along: wire})` interpolates along the wire's points. `travel(token, {from, to})` takes raw points for the cases with no wire.

### Icons without a Font Awesome dependency

`Icon` accepts any `IconDefinition`-shaped object, typed structurally. The kit's own marks (check, xmark, ban) embed their path data. Consumers bring whatever Font Awesome packages they want. The core has no `@fortawesome/*` dependency.

### Outline and the static checks read the TypeScript AST

`outline` and `check --static` parse `sections/*.tsx` with the TypeScript compiler API and find calls to `beat` imported from `@explain-it/core`. Arguments that aren't string literals are errors. No scene runs, so these are fast and need no browser. TypeScript becomes a runtime dependency of the CLI.

### Snap drives the built player in Playwright

`snap` and the layout part of `check` serve the explainer with Vite in preview mode. Then, per section, Playwright loads `section page?snap`. In snap mode the runtime:
- disables transitions
- exposes `window.__explainer` with `beats()`, `seek(beatId)` (jump to the end of that beat and wait until the presenter is idle), and `nodes()`

`nodes()` walks the scene graph and returns world-space bounding boxes for every node with a `key` or a kit name, and every `Txt`. Kit components register names like `box:Platform` in a registry, not as `key`s, because Motion Canvas logs an error for duplicate keys and two tokens may share text. The canvas is screenshotted for the PNG.

Playwright is an optional peer dependency, loaded lazily.

Layout rules work on the JSON alone, so they can be unit-tested with fixtures.

### Testing

- Vitest unit tests for:
  - the caption word splitter
  - config validation
  - the outline extractor
  - each check rule (against JSON fixtures)
  - theme merging and CSS emission
- Integration test: `examples/basic` runs through `build`, `outline`, `snap` and `check` in CI. GitHub Actions installs Playwright Chromium.

## Risks / Trade-offs

- **Motion Canvas 3.17 internals change.** `Presenter`, slide APIs, and the Vite plugin's meta behaviour aren't stable public contracts. → Pin the peer to `~3.17.2`, and keep all use of them in `runtime/` and `vite/`.
- **The caption timing change shifts existing scenes slightly.** → Accept it. The port of `live-contract-motion` is reviewed with `snap`, beat by beat.
- **Overlap checks give false positives on intentional overlaps,** such as a token passing over a wire or a pill on a box's edge. → Text-on-text and node-on-caption rules only. Shapes may overlap shapes. A node can opt out with `data-allow-overlap`.
- **The headless canvas renders fonts differently from a desktop browser.** → `snap` loads the theme's web fonts before capture and fails if they don't load.
- **One package carries both browser and Node code.** → Separate entry points keep each bundle clean. Splitting out a `cli` package is the first candidate if install size becomes a complaint.

## Migration Plan

1. Build `packages/core` and `examples/basic` until `check` passes on the example.
2. In a worktree of `buildawesome-service`, depend on `@explain-it/core`:
   - use `npm pack` output until the first publish
   - then the published `0.1.0`
3. Port `live-contract-motion`:
   - move the parties into `cast.tsx` on top of `Box`
   - rewrite each scene on `scene`/`beat`/kit
   - delete the boilerplate listed in proposal.md
4. Compare old and new beat by beat with `snap`. Captions must match `outline` of the old scenes.
5. Publish `0.1.0` and switch the dependency from the packed tarball to the version.

Rollback: the service repo's port is one commit in a worktree. Dropping it leaves the old explainer in place.

## Open Questions

- License for the public repo and npm package. It's needed before the first publish and doesn't affect the code.
