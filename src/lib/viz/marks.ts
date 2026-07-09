// Small shared SVG marks used by several lesson visualizations.

/** `points` attribute of a 10-vertex star polygon centered at (cx, cy), radius r. */
export function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
  }
  return pts.join(' ');
}

/**
 * Right-angle marker path at foot `f` between the unit directions `u1` and `u2`
 * (pixel space), with side `s`. `back` (±1) flips which side of u1 it opens toward.
 */
export function rightAnglePath(
  f: { x: number; y: number },
  u1: { x: number; y: number },
  u2: { x: number; y: number },
  s: number,
  back: number,
): string {
  return `M ${f.x + back * s * u1.x} ${f.y + back * s * u1.y} L ${f.x + back * s * u1.x + s * u2.x} ${f.y + back * s * u1.y + s * u2.y} L ${f.x + s * u2.x} ${f.y + s * u2.y}`;
}
