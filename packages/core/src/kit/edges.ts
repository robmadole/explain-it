export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Point = [number, number];

// The two facing edges of boxes `a` and `b`, by their centres: side by side,
// a wire runs from one's left or right edge to the other's; stacked, from one's
// top or bottom edge to the other's. `shift` moves the wire off-centre, across
// its direction, so several can run between the same two boxes. `level`
// pins a side-by-side wire to one y (a stacked one to one x), so it runs
// straight between boxes whose centres don't line up.
export function facingEdges(a: Box, b: Box, shift = 0, level: number | null = null): [Point, Point] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const s = Math.sign(dx) || 1;
    return [
      [a.x + (s * a.width) / 2, (level ?? a.y) + shift],
      [b.x - (s * b.width) / 2, (level ?? b.y) + shift],
    ];
  }
  const s = Math.sign(dy);
  return [
    [(level ?? a.x) + shift, a.y + (s * a.height) / 2],
    [(level ?? b.x) + shift, b.y - (s * b.height) / 2],
  ];
}
