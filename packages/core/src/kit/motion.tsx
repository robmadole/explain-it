import {Line, Node, Rect, Shape} from '@motion-canvas/2d';
import {all, easeInOutCubic, easeOutBack, tween, waitFor, type ThreadGenerator} from '@motion-canvas/core';

import {useRunning} from '../scene/context.js';
import {Icon} from './icon.js';
import {ban} from './marks.js';
import type {Point} from './edges.js';
import {Token} from './token.js';

// Fades a hidden node in while lifting it into the place it was given.
export function* rise(node: Node, duration = 0.5): ThreadGenerator {
  const y = node.y();
  node.y(y + 40);
  yield* all(node.opacity(1, duration), node.y(y, duration, easeOutBack));
}

// Briefly thickens an outline, to show a box doing something.
export function* pulse(shape: Node): ThreadGenerator {
  if (!(shape instanceof Shape)) throw new Error('pulse() needs a shape with an outline, like a Box.');
  const width = shape.lineWidth();
  yield* shape.lineWidth(width * 2.5, 0.15).to(width, 0.3);
}

function asLine(node: Node, what: string): Line {
  if (!(node instanceof Line)) throw new Error(`${what} needs a Wire or another Line.`);
  return node;
}

// Draws a wire in, from its start.
export function* draw(wire: Node, duration = 0.6): ThreadGenerator {
  yield* asLine(wire, 'draw()').end(1, duration, easeInOutCubic);
}

// Retracts a wire back to its start.
export function* cut(wire: Node, duration = 0.4): ThreadGenerator {
  yield* asLine(wire, 'cut()').end(0, duration, easeInOutCubic);
}

// Where a token goes: along a wire (backwards with `reverse`), or between two points.
export type Path = {along: Node; reverse?: boolean} | {from: Readonly<Point>; to: Readonly<Point>};

// The point `progress` of the way along `path`, 0 to 1.
function pointOn(path: Path, progress: number): Point {
  if ('along' in path) {
    const {position} = asLine(path.along, 'A path `along`').getPointAtPercentage(path.reverse ? 1 - progress : progress);
    return [position.x, position.y];
  }
  const [x1, y1] = path.from;
  const [x2, y2] = path.to;
  return [x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress];
}

// Puts a token in the scene's layer, hidden, at the start of `path`.
function launch(token: Node, path: Path) {
  if (!token.parent()) useRunning('travel()').layer.add(token);
  token.opacity(0);
  token.position(pointOn(path, 0));
}

function* move(token: Node, path: Path, to: number, duration: number): ThreadGenerator {
  yield* tween(duration, value => token.position(pointOn(path, easeInOutCubic(value) * to)));
}

export interface TravelOptions {
  duration?: number;
  // Leave the token where it lands instead of removing it. Remove it, or fade
  // it, in a later beat.
  keep?: boolean;
}

// Carries a token along `path`: fades it in, moves it, fades it out, and
// removes it. With `keep`, it stays where it lands.
export function* travel(token: Node, path: Path, options: number | TravelOptions = {}): ThreadGenerator {
  const {duration = 1.2, keep = false} = typeof options === 'number' ? {duration: options} : options;
  launch(token, path);
  yield* token.opacity(1, 0.15);
  yield* move(token, path, 1, duration);
  if (keep) return;
  yield* token.opacity(0, 0.15);
  token.remove();
}

export interface RefuseOptions {
  // How far along `path` the token gets before it is stopped, 0 to 1.
  at?: number;
  // A tag shown beside the mark, like '403'.
  label?: string;
  duration?: number;
  // Leave the mark and the label up when the token goes, so the beat ends
  // on the refusal. Remove them in a later beat; refuse() returns them.
  keep?: boolean;
}

// A ThreadGenerator that hands back a value at the end.
type Returning<R> = ThreadGenerator extends Generator<infer Y, unknown, infer N> ? Generator<Y, R, N> : never;

export interface Refusal {
  mark: Node;
  tag: Node | null;
}

// Sends a token along `path` and stops it short with a refusal mark, then
// removes it all, or with `keep` leaves the mark and label up.
export function* refuse(
  token: Node,
  path: Path,
  {at = 0.75, label, duration = 0.8, keep = false}: RefuseOptions = {},
): Returning<Refusal> {
  launch(token, path);
  const [x, y] = pointOn(path, at);
  const layer = useRunning('refuse()').layer;
  const mark = (<Icon icon={ban} size={48} color="danger" x={x} y={y - 70} scale={0} />) as Rect;
  const tag = label ? ((<Token text={label} color="danger" x={x + 90} y={y - 70} scale={0} />) as Rect) : null;
  layer.add(tag ? [mark, tag] : mark);

  yield* token.opacity(1, 0.15);
  yield* move(token, path, at, duration);
  yield* all(mark.scale(1, 0.3, easeOutBack), tag ? tag.scale(1, 0.3, easeOutBack) : waitFor(0));
  yield* waitFor(0.3);
  if (keep) {
    yield* token.opacity(0, 0.3);
    token.remove();
    return {mark, tag};
  }
  yield* all(token.opacity(0, 0.3), mark.opacity(0, 0.3), tag ? tag.opacity(0, 0.3) : waitFor(0));
  token.remove();
  mark.remove();
  tag?.remove();
  return {mark, tag};
}
