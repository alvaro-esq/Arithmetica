// Geometry helpers for drawing decision lines and margins as SVG segments.
// A line in 2D is written w·x + b = c, with w = (w1, w2).

export type V2 = { x: number; y: number };
export interface Domain {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Endpoints (in data coordinates) of the line w·x + b = c, clipped to the data
 * rectangle. Picks the dominant axis so it stays robust for near-vertical and
 * near-horizontal lines (unlike a slope/intercept formulation).
 */
export function lineSegment(w: V2, b: number, c: number, dom: Domain): [V2, V2] {
  if (Math.abs(w.y) > Math.abs(w.x)) {
    const yAt = (x: number) => (c - b - w.x * x) / w.y;
    return [
      { x: dom.xMin, y: yAt(dom.xMin) },
      { x: dom.xMax, y: yAt(dom.xMax) },
    ];
  }
  const xAt = (y: number) => (c - b - w.y * y) / w.x;
  return [
    { x: xAt(dom.yMin), y: dom.yMin },
    { x: xAt(dom.yMax), y: dom.yMax },
  ];
}

/** Signed value w·x + b (the functional margin when ‖w‖ = 1). */
export function signedDistance(w: V2, b: number, p: V2): number {
  return w.x * p.x + w.y * p.y + b;
}

/** Euclidean norm of a 2D vector. */
export function norm(w: V2): number {
  return Math.hypot(w.x, w.y);
}

/**
 * Foot of the perpendicular from point p onto the line w·x + b = c.
 * Used to draw slack segments from a violating point to its margin edge.
 */
export function perpendicularFoot(w: V2, b: number, c: number, p: V2): V2 {
  const n2 = w.x * w.x + w.y * w.y;
  const t = (c - (w.x * p.x + w.y * p.y + b)) / n2;
  return { x: p.x + t * w.x, y: p.y + t * w.y };
}

/** Smoothstep easing on [0, 1] for pleasant animation. */
export function smoothstep(s: number): number {
  const t = Math.max(0, Math.min(1, s));
  return t * t * (3 - 2 * t);
}

/** Clamp a value to [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** A d3 linear scale exposes invert(); this is all we need from it for dragging. */
interface InvertibleScale {
  invert(pixel: number): number;
}

/**
 * Convert a pointer's client coordinates into data coordinates, so a dragged
 * point lands exactly under the cursor. Accounts for the responsive viewBox and
 * any letterboxing introduced by preserveAspectRatio="xMidYMid meet".
 */
export function clientToData(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  viewW: number,
  viewH: number,
  xScale: InvertibleScale,
  yScale: InvertibleScale,
): V2 {
  const r = svg.getBoundingClientRect();
  const scale = Math.min(r.width / viewW, r.height / viewH);
  const offX = (r.width - viewW * scale) / 2;
  const offY = (r.height - viewH * scale) / 2;
  const vbX = (clientX - r.left - offX) / scale;
  const vbY = (clientY - r.top - offY) / scale;
  return { x: xScale.invert(vbX), y: yScale.invert(vbY) };
}
