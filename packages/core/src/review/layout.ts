import type {SnapNode} from '../runtime/snap.js';
import {failure, type Failure} from './failures.js';

export const FRAME = {width: 1920, height: 1080};
// Overlaps thinner than this are anti-aliasing and outlines, not layout.
const SLACK = 2;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlap(a: Rect, b: Rect) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > SLACK && height > SLACK;
}

// Nodes that stand on their own: kit components and keyed nodes, and text
// that isn't part of one.
function standalone(node: SnapNode) {
  return !node.inCaption && node.name !== 'caption' && (node.kind === 'named' || node.inside === null);
}

function label(node: SnapNode) {
  return node.kind === 'text' ? `Text "${node.text}"` : `"${node.name}"`;
}

// Layout problems in one beat's settled frame.
export function layoutChecks(nodes: SnapNode[], at: {section: string; beat: string; file?: string}): Failure[] {
  const failures: Failure[] = [];
  const where = {section: at.section, beat: at.beat, file: at.file ?? null};

  for (const node of nodes.filter(standalone)) {
    const over = {
      left: -node.x,
      top: -node.y,
      right: node.x + node.width - FRAME.width,
      bottom: node.y + node.height - FRAME.height,
    };
    const sides = Object.entries(over).filter(([, by]) => by > SLACK);
    if (sides.length > 0) {
      const how = sides.map(([side, by]) => `${Math.round(by)}px past the ${side} edge`).join(', ');
      failures.push(failure('off-frame', `${label(node)} is ${how}.`, where));
    }
  }

  const texts = nodes.filter(node => node.kind === 'text' && !node.inCaption && !node.allowOverlap);
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (overlap(texts[i], texts[j])) {
        failures.push(failure('text-overlap', `${label(texts[i])} overlaps ${label(texts[j]).toLowerCase()}.`, where));
      }
    }
  }

  const caption = nodes.find(node => node.name === 'caption');
  if (caption) {
    for (const node of nodes.filter(node => standalone(node) && !node.allowOverlap)) {
      if (overlap(node, caption)) failures.push(failure('caption-overlap', `${label(node)} overlaps the caption.`, where));
    }
  }

  return failures;
}
