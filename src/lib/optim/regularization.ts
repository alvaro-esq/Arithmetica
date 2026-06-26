// Regularization geometry for the RegularizationPath island. The unregularized
// loss is an anisotropic quadratic bowl centered at the (draggable) unconstrained
// optimum; constraining the weights to an L1 diamond, L2 circle, or Elastic-Net
// region pulls the solution toward 0. The L1 corners snap a coordinate to exactly
// 0 — that is sparsity, the idea the static 3-D figure can't show. All
// deterministic (fixed-iteration projected gradient, no PRNG).

import type { V2 } from '../svm/geometry';

export type RegKind = 'l1' | 'l2' | 'elastic';

/** Curvature of the quadratic bowl along each axis: a·Δw1² + b·Δw2². */
export interface Aniso {
  a: number;
  b: number;
}

/** Unregularized quadratic loss centered at c with curvature A. */
export function lossQuad(c: V2, A: Aniso): (x: number, y: number) => number {
  return (x, y) => A.a * (x - c.x) ** 2 + A.b * (y - c.y) ** 2;
}

export function l1Penalty(w: V2): number {
  return Math.abs(w.x) + Math.abs(w.y);
}
export function l2Penalty(w: V2): number {
  return w.x * w.x + w.y * w.y;
}

/**
 * Boundary radius of the elastic-net region along the ray at angle `a` (α = 0.5):
 * the blend of the L1-diamond radius t/(|cosθ|+|sinθ|) and the L2-circle radius √t.
 * Single source of truth so the drawn outline and the projected optimum agree.
 */
function elasticRadius(a: number, t: number): number {
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const rL1 = t / (c + s);
  const rL2 = Math.sqrt(t);
  return 0.5 * rL1 + 0.5 * rL2;
}

/** Outline of the constraint region in DATA space (n points) for an SVG polygon. */
export function constraintPolygon(t: number, kind: RegKind, n: number): V2[] {
  const pts: V2[] = [];
  if (kind === 'l2') {
    const r = Math.sqrt(t);
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
  } else if (kind === 'l1') {
    // diamond |w1| + |w2| = t
    pts.push({ x: t, y: 0 }, { x: 0, y: t }, { x: -t, y: 0 }, { x: 0, y: -t });
  } else {
    // elastic net: blend of the diamond and the circle (α = 0.5)
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      const r = elasticRadius(a, t);
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
  }
  return pts;
}

/** Radial projection onto the (star-shaped) elastic-net region: clamp the point's
 *  magnitude to the boundary radius at its own angle, so the result lands exactly
 *  on the drawn outline. */
function projectElastic(v: V2, t: number): V2 {
  const norm = Math.hypot(v.x, v.y);
  if (norm === 0) return { x: 0, y: 0 };
  const a = Math.atan2(v.y, v.x);
  const r = elasticRadius(a, t);
  if (norm <= r) return { x: v.x, y: v.y };
  const k = r / norm;
  return { x: v.x * k, y: v.y * k };
}

/** Euclidean projection onto the L1 ball {w : |w1|+|w2| ≤ t} (Duchi et al.). */
function projectL1(v: V2, t: number): V2 {
  if (Math.abs(v.x) + Math.abs(v.y) <= t) return { x: v.x, y: v.y };
  const u = [Math.abs(v.x), Math.abs(v.y)].sort((a, b) => b - a);
  // find ρ: largest k with u[k] - (cumsum_k - t)/(k+1) > 0
  let cum = 0;
  let theta = 0;
  for (let k = 0; k < u.length; k++) {
    cum += u[k];
    const candidate = (cum - t) / (k + 1);
    if (u[k] - candidate > 0) theta = candidate;
  }
  const shrink = (z: number) => Math.sign(z) * Math.max(0, Math.abs(z) - theta);
  return { x: shrink(v.x), y: shrink(v.y) };
}

/** Projection onto the L2 ball {w : ‖w‖ ≤ √t}. */
function projectL2(v: V2, t: number): V2 {
  const r = Math.sqrt(t);
  const norm = Math.hypot(v.x, v.y);
  if (norm <= r || norm === 0) return { x: v.x, y: v.y };
  return { x: (v.x / norm) * r, y: (v.y / norm) * r };
}

/**
 * Constrained optimum: argmin lossQuad(c, A) subject to the constraint ≤ budget,
 * via fixed-iteration projected gradient descent. Reports which coordinate (if
 * any) is pinned to ~0 — the L1 corner that produces a sparse solution.
 */
export function constrainedOptimum(
  c: V2,
  budget: number,
  kind: RegKind,
  A: Aniso,
): { x: number; y: number; onAxis: boolean; zeroedCoord: 'w1' | 'w2' | null } {
  let x = 0;
  let y = 0;
  const step = 0.08;
  for (let i = 0; i < 400; i++) {
    // gradient of A.a (x-cx)^2 + A.b (y-cy)^2
    const gx = 2 * A.a * (x - c.x);
    const gy = 2 * A.b * (y - c.y);
    x -= step * gx;
    y -= step * gy;
    const proj =
      kind === 'l2'
        ? projectL2({ x, y }, budget)
        : kind === 'l1'
          ? projectL1({ x, y }, budget)
          : // elastic net: radial projection onto the same boundary the UI draws
            projectElastic({ x, y }, budget);
    x = proj.x;
    y = proj.y;
  }
  const eps = 2e-2;
  const zeroedCoord = Math.abs(x) < eps ? 'w1' : Math.abs(y) < eps ? 'w2' : null;
  return { x, y, onAxis: zeroedCoord !== null, zeroedCoord };
}
