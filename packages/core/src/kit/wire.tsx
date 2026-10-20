import {Layout, Line, LineProps, Node} from '@motion-canvas/2d';

import {resolveColor} from '../theme/index.js';
import {theme} from '../scene/context.js';
import {facingEdges, type Box} from './edges.js';
import {named} from './names.js';

// A box (any layout node, like a Rect), or a ref to one, as createRef() gives.
export type Anchor = Node | (() => Node);

export interface WireProps extends Omit<LineProps, 'points'> {
  from: Anchor;
  to: Anchor;
  // A theme role or a raw colour.
  color?: string;
  // Moves the wire off-centre, across its direction.
  shift?: number;
  // Pins a side-by-side wire to this y (a stacked one to this x), for boxes
  // whose centres don't line up.
  level?: number;
  arrow?: boolean;
}

function boxOf(anchor: Anchor): Box {
  const node = typeof anchor === 'function' ? anchor() : anchor;
  if (!(node instanceof Layout)) throw new Error('A wire attaches to boxes: Rects and other layout nodes.');
  const {x, y} = node.position();
  const {width, height} = node.size();
  const offset = node.offset();
  // A node's position is its offset point; the edges are about its centre.
  return {x: x - (offset.x * width) / 2, y: y - (offset.y * height) / 2, width, height};
}

// A connection between two boxes, edge to edge. It follows the boxes when they
// move. It starts undrawn: draw() it in. `from` and `to` must sit in the same
// space as the wire, which they do when all three go through add(). add()
// puts wires behind everything else, so boxes cover the ends of wires that
// run through them.
export class Wire extends Line {
  public constructor({from, to, color = 'accent', shift = 0, level, arrow = true, ...props}: WireProps) {
    super({
      stroke: resolveColor(theme, color),
      lineWidth: 6,
      endArrow: arrow,
      arrowSize: 18,
      end: 0,
      ...props,
      points: () => facingEdges(boxOf(from), boxOf(to), shift, level ?? null),
    });
    named(this, 'wire');
  }
}
