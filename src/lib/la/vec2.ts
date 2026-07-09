// 2D vector operations for the linear-algebra course. Reuses the V2 shape and
// norm from the shared geometry module so components can import everything
// vector-related from one place.

import { norm, clamp } from '../svm/geometry';
import type { V2 } from '../svm/geometry';

export type { V2 };
export { norm };

export function add(a: V2, b: V2): V2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: V2, b: V2): V2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: V2, k: number): V2 {
  return { x: k * a.x, y: k * a.y };
}

/** c1·v1 + c2·v2 + … */
export function lincomb(terms: { c: number; v: V2 }[]): V2 {
  return terms.reduce((acc, t) => add(acc, scale(t.v, t.c)), { x: 0, y: 0 });
}

export function dot(a: V2, b: V2): number {
  return a.x * b.x + a.y * b.y;
}

/** Angle between two vectors in radians, in [0, π]. 0 if either is ~zero. */
export function angleBetween(a: V2, b: V2): number {
  const na = norm(a);
  const nb = norm(b);
  if (na < 1e-12 || nb < 1e-12) return 0;
  return Math.acos(clamp(dot(a, b) / (na * nb), -1, 1));
}

/** Orthogonal projection of `a` onto the line spanned by `onto`. */
export function project(a: V2, onto: V2): { p: V2; coef: number } {
  const d = dot(onto, onto);
  if (d < 1e-12) return { p: { x: 0, y: 0 }, coef: 0 };
  const coef = dot(a, onto) / d;
  return { p: scale(onto, coef), coef };
}

/** cos of the angle between a and b; 0 when either is ~zero. */
export function cosineSim(a: V2, b: V2): number {
  const na = norm(a);
  const nb = norm(b);
  if (na < 1e-12 || nb < 1e-12) return 0;
  return dot(a, b) / (na * nb);
}
