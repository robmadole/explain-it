# @explain-it/core

Animated, step-through explainers of technical designs: protocols, contracts, architectures. Built on [Motion Canvas](https://motioncanvas.io), written by agents, reviewed and edited by humans.

An explainer is a static site. A timeline of sections runs across the top; each section is an animation that advances one beat at a time, with a caption under the drawing.

## Quick start

```sh
mkdir my-explainer && cd my-explainer
npx @explain-it/core new
npm install
npx playwright install chromium
npx explainer dev
```

That gives you:

```
explainer.config.ts   title, sections in order, legend
theme.ts              colours
sections/intro.tsx    one scene per section
CLAUDE.md             points agents at the authoring guide
```

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

| Command | |
|---|---|
| `explainer new [id]` | Start an explainer here, or add section `id` to it. |
| `explainer dev` | Serve it, reloading on change. |
| `explainer build` | Build the static site into `dist/`. |
| `explainer outline` | Print every section's beats and captions, read from source. |
| `explainer snap [section] [beat]` | Render beats to `.explainer/snap/` as PNG plus node-bounds JSON. |
| `explainer check` | Check structure, captions, types and the layout of every beat. |

`outline`, `snap` and `check` take `--json`.

## For agents

[`AGENTS.md`](./AGENTS.md) is the authoring guide: the outline-first workflow, caption style, the canvas, the full API, and what each `check` failure means. `explainer new` links it from the project's `CLAUDE.md`.

## Links

Deep links name a section and a beat: `index.html#events/rebuilt`.
