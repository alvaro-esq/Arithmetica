// Solving Ax = b (2×2) and least squares — the math behind lesson 3.

import type { V2 } from '../svm/geometry';
import { norm } from '../svm/geometry';
import type { Mat2 } from './mat2';
import { det, mulVec, transpose2, mulMat, inverse2 } from './mat2';
import { dot, sub, scale } from './vec2';

export type Solve2 =
  | { kind: 'unique'; x: V2 }
  | { kind: 'none' }
  | { kind: 'infinite'; point: V2; dir: V2 };

/** Solve Ax = b, classifying the singular cases (parallel / coincident rows). */
export function solveLin2(A: Mat2, b: V2): Solve2 {
  const d = det(A);
  const scaleA = Math.max(1, Math.abs(A[0][0]), Math.abs(A[0][1]), Math.abs(A[1][0]), Math.abs(A[1][1]));
  if (Math.abs(d) > 1e-10 * scaleA * scaleA) {
    return {
      kind: 'unique',
      x: { x: (b.x * A[1][1] - A[0][1] * b.y) / d, y: (A[0][0] * b.y - b.x * A[1][0]) / d },
    };
  }
  // Singular: columns are collinear. Consistent iff b lies in their span.
  const c1: V2 = { x: A[0][0], y: A[1][0] };
  const c2: V2 = { x: A[0][1], y: A[1][1] };
  const span = norm(c1) >= norm(c2) ? c1 : c2;
  if (norm(span) < 1e-12) {
    // A = 0: solutions exist only for b = 0 (then every x works).
    return norm(b) < 1e-12
      ? { kind: 'infinite', point: { x: 0, y: 0 }, dir: { x: 1, y: 0 } }
      : { kind: 'none' };
  }
  const cross = span.x * b.y - span.y * b.x;
  if (Math.abs(cross) > 1e-9 * Math.max(1, norm(span)) * Math.max(1, norm(b))) return { kind: 'none' };
  // Consistent: solutions form a line. Null direction of A (row-based) plus one
  // particular solution taken from the row with the larger norm.
  const r1: V2 = { x: A[0][0], y: A[0][1] };
  const r2: V2 = { x: A[1][0], y: A[1][1] };
  const row = norm(r1) >= norm(r2) ? r1 : r2;
  const rhs = norm(r1) >= norm(r2) ? b.x : b.y;
  const dir: V2 = { x: -row.y, y: row.x };
  const point = scale(row, rhs / dot(row, row));
  const nd = norm(dir);
  return { kind: 'infinite', point, dir: { x: dir.x / nd, y: dir.y / nd } };
}

export interface LineFit {
  m: number;
  b: number;
  residuals: number[];
  sse: number;
}

/**
 * Least-squares line y ≈ m·t + b through the points, solved via the normal
 * equations (XᵀX)θ = Xᵀy with X = [tᵢ, 1] — exactly the derivation the lesson
 * walks through.
 */
export function lstsqLine(points: V2[]): LineFit {
  const n = points.length;
  let st = 0,
    st2 = 0,
    sy = 0,
    sty = 0;
  for (const p of points) {
    st += p.x;
    st2 += p.x * p.x;
    sy += p.y;
    sty += p.x * p.y;
  }
  const XtX: Mat2 = [
    [st2, st],
    [st, n],
  ];
  const Xty: V2 = { x: sty, y: sy };
  const sol = solveLin2(XtX, Xty);
  const theta = sol.kind === 'unique' ? sol.x : sol.kind === 'infinite' ? sol.point : { x: 0, y: 0 };
  const residuals = points.map((p) => p.y - (theta.x * p.x + theta.y));
  return { m: theta.x, b: theta.y, residuals, sse: residuals.reduce((a, r) => a + r * r, 0) };
}

/**
 * Least squares for Ax ≈ b with A 2×2: x̂ = (AᵀA)⁻¹Aᵀb, projection p = Ax̂ and
 * residual r = b − p (⊥ to the column space). Falls back to projecting onto the
 * longer column when the columns are collinear.
 */
export function lstsq2(A: Mat2, b: V2): { xhat: V2; p: V2; r: V2 } {
  const At = transpose2(A);
  const AtA = mulMat(At, A);
  const Atb = mulVec(At, b);
  const inv = inverse2(AtA);
  if (inv) {
    const xhat = mulVec(inv, Atb);
    const p = mulVec(A, xhat);
    return { xhat, p, r: sub(b, p) };
  }
  const c1: V2 = { x: A[0][0], y: A[1][0] };
  const c2: V2 = { x: A[0][1], y: A[1][1] };
  const col = norm(c1) >= norm(c2) ? c1 : c2;
  const d = dot(col, col);
  const coef = d < 1e-12 ? 0 : dot(b, col) / d;
  const p = scale(col, coef);
  const xhat: V2 = norm(c1) >= norm(c2) ? { x: coef, y: 0 } : { x: 0, y: coef };
  return { xhat, p, r: sub(b, p) };
}
