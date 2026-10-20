import {describe, expect, it} from 'vitest';

import {facingEdges} from '../src/kit/edges.js';

const box = (x: number, y: number) => ({x, y, width: 400, height: 240});

describe('facingEdges', () => {
  it('runs right to left between side-by-side boxes', () => {
    expect(facingEdges(box(680, 0), box(0, 0))).toEqual([
      [480, 0],
      [200, 0],
    ]);
  });

  it('runs left to right', () => {
    expect(facingEdges(box(-680, 0), box(0, 0))).toEqual([
      [-480, 0],
      [-200, 0],
    ]);
  });

  it('runs top to bottom between stacked boxes', () => {
    expect(facingEdges(box(0, -300), box(0, 300))).toEqual([
      [0, -180],
      [0, 180],
    ]);
  });

  it('runs bottom to top', () => {
    expect(facingEdges(box(0, 300), box(0, -300))).toEqual([
      [0, 180],
      [0, -180],
    ]);
  });

  it('pins to a level between boxes whose centres differ', () => {
    expect(facingEdges(box(-680, -200), {x: 0, y: -50, width: 400, height: 540}, 0, -200)).toEqual([
      [-480, -200],
      [-200, -200],
    ]);
    expect(facingEdges(box(0, -300), box(100, 300), 0, 40)).toEqual([
      [40, -180],
      [40, 180],
    ]);
  });

  it('shifts across the direction of travel', () => {
    expect(facingEdges(box(-680, 0), box(0, 0), 30)).toEqual([
      [-480, 30],
      [-200, 30],
    ]);
    expect(facingEdges(box(0, -300), box(0, 300), 30)).toEqual([
      [30, -180],
      [30, 180],
    ]);
  });
});
