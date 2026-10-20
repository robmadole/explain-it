# Writing explainers with @explain-it/core

An explainer is a step-through animation of a technical design: a protocol, a contract, an architecture. It has sections, shown as a timeline across the top. Each section is a Motion Canvas scene that plays one **beat** at a time. A beat is one idea: a caption under the drawing and the animation that shows it. The viewer presses Next to move on.

You write the explainer; a human reviews it. Everything below exists so you can check your own work before they look.

## Files

A repo keeps its explainers in one folder, named in `explain-it.config.ts` at the repo root (usually `docs/explainers/`). Each explainer is a subfolder:

```
explainer.config.ts   title, sections in order, theme, legend, source document
sections/<id>.tsx     one scene per section
theme.ts, cast.tsx    optional: a theme or shared components, when the config or scenes outgrow one file
```

Nothing else is needed: no `package.json`, `tsconfig.json` or `node_modules`. Every command runs as `npx @explain-it/core <command>`. Scenes can import `@explain-it/core`, `@motion-canvas/core`, `@motion-canvas/2d` and the Font Awesome Free icon packages (`@fortawesome/free-solid-svg-icons`, `-regular-`, `-brands-`), which come with the CLI. Nothing else can be imported from outside the explainer. `.explainer/` and `dist/` are generated; never edit them.

To remove or rename a section, delete or rename `sections/<id>.tsx` and its entry in `explainer.config.ts` together.

## Workflow

Work in this order. Don't skip to animation.

1. **Read the source.** The config's `source` (and each section's `source` anchor) points at the document being explained. Read the part for the section you're on.
2. **Add the section.** From the explainer's folder: `npx @explain-it/core section <id> --label <Label> --source '#anchor'`. A new explainer starts with `npx @explain-it/core new <name>` from anywhere in the repo.
3. **Write the outline first.** Write every `beat()` with its id and caption and an empty body:
   ```tsx
   yield* beat('stream', '`/.ba/events` is a stream of server-sent events.');
   yield* beat('named', 'Each broadcast arrives with its event name and data, unchanged.');
   ```
   Run `npx @explain-it/core outline --section <id>` and read the story top to bottom. Show it to the human before animating if you are unsure about it. Changing the story now is cheap; after animating it is not.
4. **Animate.** Fill in the bodies.
5. **Look.** `npx @explain-it/core snap <id>` writes `.explainer/snap/<id>/<beat>.png` and `.json` for every beat. Open the PNGs and look at them. The JSON lists every named node and text with its bounds in pixels.

   A snap is the frame **at the end of the beat**, which is also what the viewer looks at while reading the caption. Tokens in flight are gone by then. If the beat is about a message, leave something on screen that shows it happened: a line added to a `CodePanel` log, a state `Token` that changes, a box that `pulse`s and stays marked.
6. **Check.** `npx @explain-it/core check` must pass. Fix every failure; don't work around the rule.
7. Repeat 4 to 6 until the drawing says what the caption says.

## Beats

- **One thing to look at per beat.** A viewer watching the drawing misses text that changes, and one reading the caption misses motion. So a beat has one caption, set once, and its animation shows that one thing. If the caption needs "and also", or the picture needs to make a second point after the first has landed, it's two beats. There is no way to change the caption partway through a beat, on purpose.
- **4 to 10 beats per section.** `check` fails over 12. Split a long section in two.
- **Ids** are short kebab-case names for the idea: `stream`, `rebuilt-reserved`. They appear in links (`#events/stream`) and snap file names, so don't rename them casually.
- **Ids and captions must be string literals.** Tools read them from the source without running it.
- Ids must be unique within a section.

## Captions

- A plain, declarative sentence about the system, in the present tense: "The platform adds a `rebuilt` event each time a build is published."
- Say what is true, not what is moving. Not "Now we see a message travel to the server".
- 140 characters at most, ideally under 100. One sentence; two short ones at most.
- Put code, paths, headers, event names and values in backticks: `` `Last-Event-ID` ``. They render as code chips that never break across lines.
- No "Here", "Now", "Let's", "As you can see".

## The canvas

- 1920 × 1080. The origin (0, 0) is the **centre**. x grows right, y grows **down**.
- The legend sits at y = −440. The caption sits at y = 360 and is about 60 to 120 px tall.
- **Draw between y = −390 and y = 280**, and x between −900 and 900. `check` fails a node past the frame or overlapping the caption.
- A `Box` is 400 × 240 by default. Three boxes in a row fit at x = −680, 0, 680.

## Writing a scene

```tsx
import {beat, Box, draw, rise, scene, Token, travel, Wire} from '@explain-it/core';
import {faServer} from '@fortawesome/free-solid-svg-icons';

export default scene(function* ({add}) {
  // Build everything up front, hidden (opacity 0), and reveal it in beats.
  const client = add(<Box title="Client" note="in the browser" color="client" x={-680} y={-200} opacity={0} />);
  const server = add(<Box icon={faServer} title="Server" x={680} y={-200} opacity={0} />);
  const wire = add(<Wire from={client} to={server} />);

  yield* beat('parties', 'A client and a server, connected by a WebSocket.', function* () {
    yield* rise(client);
    yield* rise(server);
    yield* draw(wire);
  });

  yield* beat('message', 'Either side can send a message at any time.', function* () {
    yield* travel(<Token text="{ … }" color="client" />, {along: wire});
    yield* travel(<Token text="{ … }" color="accent" />, {along: wire, reverse: true});
  });
});
```

Rules:

- `add(node)` puts a node in the drawing and returns it as a `Node`. Every kit function accepts that. Use `add<CodePanel>(…)` when you call a component's own methods, like `insertLine`.
- Create nodes hidden with `opacity={0}` and reveal them with `rise()` inside a beat. Anything visible at the start shows in every beat. To hide a node again, `yield* node.opacity(0, 0.3)`; to change a token's text, fade it out, set it, fade it in.
- Connect boxes with `Wire`. Never compute edge positions by hand; wires attach to the facing edges and follow boxes that move. When two boxes' centres don't line up but the wire should run straight across, give it a `level` (the y it runs at). Wires always draw behind boxes and everything else, whatever order you `add()` them in.
- Tokens in flight go through `travel()` or `refuse()`, which add them to the layer and remove them when done. When the beat should end on the result, pass `keep: true`: `travel` leaves the token where it lands, and `refuse` leaves its mark and label up and returns them (`const {mark, tag} = yield* refuse(…)`) so a later beat can fade them. Anything else you add for one beat must be removed by that beat or a later one.
- `layer.add(node)` returns the layer, not the node. Keep your own reference: `const tag = (<Token … />) as Rect; layer.add(tag);`.
- Everything is plain Motion Canvas TSX. When the kit doesn't cover something, use `@motion-canvas/2d` nodes and `@motion-canvas/core` flow (`all`, `sequence`, `waitFor`, signals) directly in the scene.
- Don't use `Math.random()`. Use Motion Canvas's `useRandom()`, which is seeded, so snaps repeat.
- Colours: pass a theme role name (`color="client"`) rather than a hex value. Give each kind of party a role in the theme (`defineTheme({client: …})` in the config) and a legend entry whose `color` is that role's name, and keep its meaning the same in every section. Pick role colours clearly apart from the base roles below, especially `accent`, which wires use by default.

Base theme roles:

| Role | Value | Meaning |
|---|---|---|
| `bg` | `#0f1115` | Background. |
| `surface` | `#161a21` | Inside boxes and panels. |
| `rule` | `#2a303b` | Faint lines and outlines. |
| `text` | `#eef1f5` | Text. |
| `muted` | `#7d8696` | Notes, secondary text. |
| `accent` | `#5b9cff` | The default for boxes and wires. |
| `ok` | `#5fd38d` | Allowed, or works. |
| `danger` | `#ff6b6b` | Refused, or broken. |
| `font`, `mono` | Inter, JetBrains Mono | Fonts. |

## API

From `@explain-it/core`:

| Name | What it does |
|---|---|
| `scene(fn)` | A section's scene. `fn` gets `{view, add, layer, theme}`. |
| `beat(id, caption, body?)` | One step: shows the caption while `body` plays, then waits for Next. |
| `<Box icon? title? note? color? width? height?>` | A party: outlined panel, title at the top edge, note at the bottom, middle clear. |
| `<Wire from to color? shift? level? arrow?>` | A line between two boxes' facing edges, starts undrawn, drawn behind everything. `shift` moves it off-centre so two wires can run side by side. `level` pins a side-by-side wire to a y (a stacked one to an x). `arrow` (default `true`) puts a head at the `to` end; use `arrow={false}` for a two-way connection, or add `startArrow` for heads at both ends. |
| `<Token text color textColor?>` | A pill: a message, a role, a status. |
| `<CodePanel title lines fontSize? width?>` | Monospaced lines; spaces are kept. `lines` may start empty. Give `offset={[0, -1]}` to pin the top so it grows down. Methods: `insertLine(i, line)`, `removeLine(i)`, `replaceLine(i, line)`, `markLine(i, allowed)`, `focusLines(indices \| null, duration?)`, `setTitle(text)`. A line is a string or `{text, color}`. |
| `<Icon icon size color>` | A Font Awesome icon from any `@fortawesome/*` package. |
| `<Legend>` | Added by `scene()` from the config; you rarely need it. |
| `rise(node)` | Fades a hidden node in, lifting it into place. |
| `pulse(box)` | Thickens a box's outline briefly: "this one acts". |
| `draw(wire)` / `cut(wire)` | Draws a wire in / retracts it. |
| `travel(token, path, {duration?, keep?})` | Moves a token along `{along: wire, reverse?}` or `{from: [x, y], to: [x, y]}`, then removes it, or with `keep` leaves it where it lands. A bare number is the duration. |
| `refuse(token, path, {at?, label?, keep?})` | Sends a token, stops it at fraction `at` (default 0.75) with a refusal mark and an optional `label`, like `'403'` or `'lost'`, then removes it all. With `keep`, the mark and label stay; it returns `{mark, tag}`. |
| `allowOverlap(node)` | Exempts a node (and what's inside it) from `check`'s overlap rules, for deliberate overlaps like a tag pinned to a box's edge, or a panel shown over a dimmed drawing. |
| `check`, `xmark`, `ban` | The kit's own icons. |

From `@explain-it/core/config`: `defineExplainer`, `defineTheme`.

Config fields: `title`, `sections: [{id, label, source?}]`, `source?`, `theme?`, `legend?: [{color, label}]`, `legendTitle?`, `seed?`.

## Commands

All as `npx @explain-it/core <command>`. Run the explainer commands from the explainer's folder, or pass `--root <folder>`.

| Command | Use |
|---|---|
| `setup [dir] [--explainers <folder>]` | Set a repo up: `explain-it.config.ts`, `.gitignore`, a `CLAUDE.md` pointer. |
| `new <name>` | Create an explainer in the repo's explainers folder. |
| `section <id> [--label] [--source]` | Add a section to the explainer. |
| `outline [--section id] [--json]` | The narration, read from source. |
| `snap [section] [beat] [--json]` | PNG and node JSON per beat, in `.explainer/snap/`. |
| `check [--static] [--json]` | Structure, captions, types and, unless `--static`, layout at every beat. |
| `view [name\|dir]` | Open it in the browser for a human, reloading on change. |
| `build` | The static site, in `dist/`. |
| `guide` | This guide, for the version that's running. |

The first `snap` or `check` downloads the Chromium they render in (once, into Playwright's shared cache).

## What check failures mean

| Rule | Fix |
|---|---|
| `literal` | Write the id or caption as a string literal. |
| `duplicate-beat` | Rename one of the beats. |
| `backticks` | Close the code span. |
| `caption-length` | Shorten the caption, or split the beat. |
| `beat-count` | Split the section. |
| `types` | Fix the TypeScript error. |
| `config` | Fix `explainer.config.ts` as the message says. |
| `error` | The scene threw while playing; the message says why. |
| `off-frame` | Move or shrink the node; it's past the edge by the amount given. |
| `text-overlap` | Two pieces of text collide; move one. |
| `caption-overlap` | The drawing reaches into the caption; keep it above y = 280. |
