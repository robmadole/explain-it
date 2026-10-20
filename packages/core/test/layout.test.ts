import {describe, expect, it} from 'vitest';

import type {SnapNode} from '../src/runtime/snap.js';
import {layoutChecks} from '../src/review/layout.js';

const at = {section: 'events', beat: 'stream'};
function node(name: string, x: number, y: number, width: number, height: number, extra: Partial<SnapNode> = {}): SnapNode {
  return {name, kind: 'named', inside: null, inCaption: false, allowOverlap: false, x, y, width, height, ...extra};
}
const text = (t: string, x: number, y: number, extra: Partial<SnapNode> = {}) =>
  node(`text:${t}`, x, y, 200, 40, {kind: 'text', text: t, ...extra});
const caption = node('caption', 160, 860, 1600, 60);

describe('layoutChecks', () => {
  it('passes a clean frame', () => {
    expect(layoutChecks([node('box:A', 100, 100, 400, 240), caption], at)).toEqual([]);
  });

  it('reports a node past the frame and by how much', () => {
    const [failure] = layoutChecks([node('box:Server', 1700, 100, 400, 240)], at);
    expect(failure).toMatchObject({rule: 'off-frame', section: 'events', beat: 'stream'});
    expect(failure.message).toBe('"box:Server" is 180px past the right edge.');
  });

  it('ignores text inside a named node for the frame rule; the node reports', () => {
    expect(layoutChecks([text('inside', 1800, 100, {inside: 'box:A'})], at)).toEqual([]);
  });

  it('reports text over text', () => {
    const failures = layoutChecks([text('one', 100, 100), text('two', 150, 110, {inside: 'box:B'})], at);
    expect(failures.map(f => f.message)).toEqual(['Text "one" overlaps text "two".']);
  });

  it('allows overlap where asked', () => {
    expect(layoutChecks([text('one', 100, 100), text('two', 150, 110, {allowOverlap: true})], at)).toEqual([]);
  });

  it('ignores touching edges', () => {
    expect(layoutChecks([text('one', 100, 100), text('two', 299, 100)], at)).toEqual([]);
  });

  it('reports a node over the caption, but not the caption’s own words', () => {
    const failures = layoutChecks([caption, node('code:Log', 300, 700, 800, 200), text('word', 200, 870, {inCaption: true, inside: 'caption'})], at);
    expect(failures.map(f => f.message)).toEqual(['"code:Log" overlaps the caption.']);
  });
});
