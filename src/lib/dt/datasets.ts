// Datasets for the tree visualizations. Reuses the SVM toy datasets via a label
// adapter (−1 → 0, +1 → 1) and adds an XOR checkerboard — the canonical case where
// a single axis-aligned split can't help but a depth-2 tree (or a forest) can.

import { mulberry32, makeGaussian } from '../svm/prng';
import { blobs as svmBlobs, moons as svmMoons, type Point } from '../svm/datasets';
import type { LPoint } from './types';

/** Map an SVM ±1 point to a 0/1-labelled tree point. */
export function toLabel01(p: Point): LPoint {
  return { x: p.x, y: p.y, label: p.label === 1 ? 1 : 0 };
}

export function blobs(n = 60, seed = 1, sep = 2.4, sd = 0.7): LPoint[] {
  return svmBlobs(n, seed, sep, sd).map(toLabel01);
}

export function moons(n = 80, seed = 3, noise = 0.18): LPoint[] {
  return svmMoons(n, seed, noise).map(toLabel01);
}

/**
 * XOR / checkerboard: four Gaussian clusters at (±c, ±c); the two diagonal pairs
 * share a class. Class is `(x>0) XOR (y>0)`, so no single threshold separates it.
 */
export function xor(n = 80, seed = 5, c = 1.6, sd = 0.55): LPoint[] {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const out: LPoint[] = [];
  for (let i = 0; i < n; i++) {
    const qx = i % 2 === 0 ? 1 : -1;
    const qy = i % 4 < 2 ? 1 : -1;
    const label = qx * qy > 0 ? 1 : 0; // same-sign quadrants → class 1
    out.push({ x: g(qx * c, sd), y: g(qy * c, sd), label });
  }
  return out;
}

/**
 * Blobs plus an extra pure-noise context the components can use to show a feature
 * that earns near-zero importance. Returns the same 2D points; the "noise" idea is
 * illustrated in FeatureImportance by labelling a third synthetic column.
 */
export const datasets = { blobs, moons, xor };
