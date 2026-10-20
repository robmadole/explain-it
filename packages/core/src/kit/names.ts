import type {Node} from '@motion-canvas/2d';

// Names for nodes in snap output: "box:Platform", "token:{ … }". Kept apart from
// Motion Canvas keys, which must be unique; two tokens may share a name. A
// node's own `key`, when set, wins.
const names = new WeakMap<Node, string>();

export function named<T extends Node>(node: T, name: string): T {
  names.set(node, name);
  return node;
}

export function nameOf(node: Node): string | null {
  return names.get(node) ?? null;
}

// Nodes that may overlap others on purpose, like a tag pinned to a box's
// edge. `explainer check` skips them in its overlap rules.
const overlapping = new WeakSet<Node>();

export function allowOverlap<T extends Node>(node: T): T {
  overlapping.add(node);
  return node;
}

export function overlapAllowed(node: Node) {
  return overlapping.has(node);
}
