import {makeScene2D, Node, View2D} from '@motion-canvas/2d';
import {all, beginSlide, ThreadGenerator} from '@motion-canvas/core';

import {Legend} from '../kit/legend.js';
import {Wire} from '../kit/wire.js';
import {named} from '../kit/names.js';
import type {Theme} from '../theme/index.js';
import {Caption} from './caption.js';
import {config, setRunning, theme, useRunning} from './context.js';

export {Caption, CAPTION_WIDTH, CAPTION_Y} from './caption.js';

export interface SceneContext {
  view: View2D;
  // Adds a node to the drawing and hands it back: const box = add(<Box … />).
  // Wires go behind everything else, whatever order they're added in.
  add<T extends Node = Node>(node: Node): T;
  // For nodes that come and go, like tokens in flight. Drawn above the
  // drawing and below the caption.
  layer: Node;
  theme: Theme;
}

// One section's animation. Sets up the background, the legend, the caption
// and the layer, then runs `body`, which is a series of beat()s.
export function scene(body: (context: SceneContext) => ThreadGenerator) {
  return makeScene2D(function* (view) {
    view.fill(theme.bg);
    const wires = new Node({});
    const drawing = new Node({});
    const layer = new Node({});
    const caption = named(new Caption({}), 'caption');
    view.add([wires, drawing]);
    if (config.legend.length > 0) view.add(<Legend y={-440} />);
    view.add([layer, caption]);

    setRunning({caption, layer, beats: new Set()});
    yield* body({
      view,
      add<T extends Node = Node>(node: Node) {
        (node instanceof Wire ? wires : drawing).add(node);
        return node as T;
      },
      layer,
      theme,
    });
  });
}

// One step of a section: shows `caption` while `body` plays, then pauses until
// the viewer moves on. `id` names the step in links (#section/id) and in
// snaps. Keep `id` and `caption` as string literals; tools read them from the
// source.
export function* beat(id: string, caption: string, body?: () => ThreadGenerator): ThreadGenerator {
  const running = useRunning('beat()');
  if (running.beats.has(id)) throw new Error(`Beat id "${id}" is used more than once in this section.`);
  running.beats.add(id);

  yield* all(running.caption.say(caption), body ? body() : nothing());
  yield* beginSlide(id);
}

function* nothing(): ThreadGenerator {}
