# @explain-it/core

Animated, step-through explainers of technical designs: protocols, contracts, architectures. Built on [Motion Canvas](https://motioncanvas.io), written by agents, reviewed and edited by humans.

An explainer is a static site. A timeline of sections runs across the top; each section is an animation that advances one beat at a time, with a caption under the drawing.

## Quick start

In any repo, with nothing to install:

```sh
npx @explain-it/core setup              # once per repo
npx @explain-it/core new my-explainer   # creates docs/explainers/my-explainer/
npx @explain-it/core view my-explainer  # opens it in the browser
```

An explainer is only content and config:

```
docs/explainers/my-explainer/
  explainer.config.ts   title, sections in order, theme, legend
  sections/intro.tsx    one scene per section
```

`setup` writes `explain-it.config.ts` at the repo root, which says where explainers live, and points agents at the authoring guide from `CLAUDE.md`.

A section is a scene made of beats:

```tsx
import {beat, Box, draw, rise, scene, Token, travel, Wire} from '@explain-it/core';

export default scene(function* ({add}) {
  const client = add(<Box title="Client" x={-680} y={-200} opacity={0} />);
  const server = add(<Box title="Server" x={680} y={-200} opacity={0} />);
  const wire = add(<Wire from={client} to={server} />);

  yield* beat('parties', 'A client and a server, connected by a WebSocket.', function* () {
    yield* rise(client);
    yield* rise(server);
    yield* draw(wire);
  });

  yield* beat('message', 'Either side can send a message at any time.', function* () {
    yield* travel(<Token text="{ … }" color="accent" />, {along: wire});
  });
});
```

## Commands

All as `npx @explain-it/core <command>`.

| Command | |
|---|---|
| `setup [dir]` | Set a repo up for explainers. |
| `new <name>` | Create an explainer in the repo's explainers folder. |
| `view [name\|dir]` | Open an explainer in the browser, reloading on change. |
| `section <id>` | Add a section to the explainer in this folder. |
| `outline` | Print every section's beats and captions, read from source. |
| `snap [section] [beat]` | Render beats to `.explainer/snap/` as PNG plus node-bounds JSON. |
| `check` | Check structure, captions, types and the layout of every beat. |
| `build` | Build the static site into `dist/`. |
| `guide` | Print the authoring guide. |

Scenes can import `@explain-it/core`, Motion Canvas and the Font Awesome Free icons with no install. The first `snap` or `check` downloads the Chromium they render in.

`outline`, `snap` and `check` take `--json`.

## For agents

[`AGENTS.md`](./AGENTS.md) (also `npx @explain-it/core guide`) is the authoring guide: the outline-first workflow, caption style, the canvas, the full API, and what each `check` failure means. `setup` points the repo's `CLAUDE.md` at it.

## Links

Deep links name a section and a beat: `index.html#events/rebuilt`.

## License

MIT. See [LICENSE](./LICENSE), which also credits the Font Awesome icons the kit embeds.
