// 2×2 matrices as plane transformations — the workhorse of lessons 2 and 4.
// Row-major: A = [[a, b], [c, d]] sends (x, y) to (ax + by, cx + dy).

import type { V2 } from '../svm/geometry';

export type Mat2 = [[number, number], [number, number]];

export function mulVec(A: Mat2, v: V2): V2 {
  return { x: A[0][0] * v.x + A[0][1] * v.y, y: A[1][0] * v.x + A[1][1] * v.y };
}

export function mulMat(A: Mat2, B: Mat2): Mat2 {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
}

export function det(A: Mat2): number {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

export function trace(A: Mat2): number {
  return A[0][0] + A[1][1];
}

export function inverse2(A: Mat2): Mat2 | null {
  const d = det(A);
  if (Math.abs(d) < 1e-12) return null;
  return [
    [A[1][1] / d, -A[0][1] / d],
    [-A[1][0] / d, A[0][0] / d],
  ];
}

export function transpose2(A: Mat2): Mat2 {
  return [
    [A[0][0], A[1][0]],
    [A[0][1], A[1][1]],
  ];
}

export function rotation(theta: number): Mat2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    [c, -s],
    [s, c],
  ];
}

export const IDENTITY: Mat2 = [
  [1, 0],
  [0, 1],
];

/** Entrywise interpolation, for animating a transform from A to B. */
export function lerpMat(A: Mat2, B: Mat2, t: number): Mat2 {
  const l = (x: number, y: number) => x + (y - x) * t;
  return [
    [l(A[0][0], B[0][0]), l(A[0][1], B[0][1])],
    [l(A[1][0], B[1][0]), l(A[1][1], B[1][1])],
  ];
}

/** Images of the unit square corners (0,0), (1,0), (1,1), (0,1) under A. */
export function unitSquare(A: Mat2): [V2, V2, V2, V2] {
  return [
    { x: 0, y: 0 },
    mulVec(A, { x: 1, y: 0 }),
    mulVec(A, { x: 1, y: 1 }),
    mulVec(A, { x: 0, y: 1 }),
  ];
}

/**
 * The transformed coordinate grid: images of the lines x = k and y = k for
 * k ∈ [−extent, extent]. A linear map sends lines to lines, so transforming the
 * two endpoints of each segment is exact.
 */
export function gridLines(A: Mat2, extent: number, step: number): [V2, V2][] {
  const out: [V2, V2][] = [];
  for (let k = -extent; k <= extent + 1e-9; k += step) {
    out.push([mulVec(A, { x: k, y: -extent }), mulVec(A, { x: k, y: extent })]);
    out.push([mulVec(A, { x: -extent, y: k }), mulVec(A, { x: extent, y: k })]);
  }
  return out;
}

export interface MatPreset {
  id: string;
  label: string;
  A: Mat2;
}

export const MAT_PRESETS: MatPreset[] = [
  { id: 'identidad', label: 'Identidad', A: IDENTITY },
  { id: 'rotacion', label: 'Rotación 45°', A: rotation(Math.PI / 4) },
  {
    id: 'escala',
    label: 'Escala',
    A: [
      [2, 0],
      [0, 0.5],
    ],
  },
  {
    id: 'cizalla',
    label: 'Cizalla',
    A: [
      [1, 1],
      [0, 1],
    ],
  },
  {
    id: 'reflexion',
    label: 'Reflexión',
    A: [
      [1, 0],
      [0, -1],
    ],
  },
  {
    id: 'proyeccion',
    label: 'Proyección al eje x',
    A: [
      [1, 0],
      [0, 0],
    ],
  },
  {
    id: 'singular',
    label: 'Singular',
    A: [
      [1, 2],
      [0.5, 1],
    ],
  },
];
