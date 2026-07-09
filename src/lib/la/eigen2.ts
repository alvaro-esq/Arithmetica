// Closed-form eigendecomposition of a 2×2 matrix via the characteristic
// polynomial λ² − tr·λ + det = 0. The three discriminant cases map directly to
// the three stories the lesson tells: two real directions, a repeated one
// (shear: only one direction survives), and none (rotations spiral everything).

import type { V2 } from '../svm/geometry';
import { norm } from '../svm/geometry';
import type { Mat2 } from './mat2';
import { det, trace, mulVec } from './mat2';

export type Eigen2 =
  | { kind: 'real'; values: [number, number]; vectors: [V2, V2] }
  | { kind: 'repeated'; value: number; vectors: [V2] | [V2, V2] }
  | { kind: 'complex'; re: number; im: number; spiralScale: number; spiralAngle: number };

function unit(v: V2): V2 {
  const n = norm(v);
  return n < 1e-12 ? { x: 1, y: 0 } : { x: v.x / n, y: v.y / n };
}

/** Unit eigenvector for a known real eigenvalue λ of A (rows of A − λI). */
function eigenvectorFor(A: Mat2, lambda: number): V2 {
  const r1: V2 = { x: A[0][0] - lambda, y: A[0][1] };
  const r2: V2 = { x: A[1][0], y: A[1][1] - lambda };
  // The eigenvector is orthogonal to every row of A − λI; build it from the
  // row with the larger norm for numerical robustness.
  if (norm(r1) >= norm(r2) && norm(r1) > 1e-12) return unit({ x: -r1.y, y: r1.x });
  if (norm(r2) > 1e-12) return unit({ x: -r2.y, y: r2.x });
  return { x: 1, y: 0 }; // A ≈ λI: every direction works
}

export function eigen2(A: Mat2): Eigen2 {
  const tr = trace(A);
  const dt = det(A);
  const disc = tr * tr - 4 * dt;
  const scale = Math.max(1, Math.abs(A[0][0]), Math.abs(A[0][1]), Math.abs(A[1][0]), Math.abs(A[1][1]));
  const tol = 1e-10 * scale * scale; // disc has units of entries²

  if (disc > tol) {
    const root = Math.sqrt(disc);
    let l1 = (tr + root) / 2;
    let l2 = (tr - root) / 2;
    if (Math.abs(l2) > Math.abs(l1)) [l1, l2] = [l2, l1]; // dominant first
    return { kind: 'real', values: [l1, l2], vectors: [eigenvectorFor(A, l1), eigenvectorFor(A, l2)] };
  }

  if (disc < -tol) {
    const im = Math.sqrt(-disc) / 2;
    const re = tr / 2;
    // Complex pair a ± bi: each application scales by |λ| = √det and turns by arg λ.
    return { kind: 'complex', re, im, spiralScale: Math.sqrt(dt), spiralAngle: Math.atan2(im, re) };
  }

  const lambda = tr / 2;
  const offDiag = Math.max(Math.abs(A[0][1]), Math.abs(A[1][0]));
  const diagGap = Math.abs(A[0][0] - A[1][1]);
  if (offDiag < 1e-10 * scale && diagGap < 1e-10 * scale) {
    // A = λI: every vector is an eigenvector; report the two axes.
    return { kind: 'repeated', value: lambda, vectors: [{ x: 1, y: 0 }, { x: 0, y: 1 }] };
  }
  // Defective (e.g. a shear): a single eigen-direction.
  return { kind: 'repeated', value: lambda, vectors: [eigenvectorFor(A, lambda)] };
}

export interface PowerStep {
  /** normalized iterate after this step */
  v: V2;
  /** Rayleigh quotient v_{k−1}·A v_{k−1} (v normalized) — converges to λ₁ */
  lambda: number;
  /** ‖A v_{k−1}‖ before re-normalizing — the per-step growth factor */
  growth: number;
}

/**
 * Trajectory of power iteration from v0 (normalized each step). Feed the array
 * to stepLoop for the animated reveal.
 */
export function powerIterTrace(A: Mat2, v0: V2, steps: number): PowerStep[] {
  const out: PowerStep[] = [];
  let v = unit(v0);
  for (let k = 0; k < steps; k++) {
    const w = mulVec(A, v);
    const lambda = v.x * w.x + v.y * w.y;
    const growth = norm(w);
    if (growth < 1e-12) {
      out.push({ v, lambda: 0, growth: 0 });
      break; // v landed in the null space; iteration dies
    }
    v = { x: w.x / growth, y: w.y / growth };
    out.push({ v, lambda, growth });
  }
  return out;
}
