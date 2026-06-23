// Toy 2D datasets shared by the SVM visualizations. All are deterministic for a
// fixed seed (see prng.ts) and return points labelled +1 / -1.

import { mulberry32, makeGaussian } from './prng';

export interface Point {
  x: number;
  y: number;
  label: 1 | -1;
}

/** Two linearly separable Gaussian blobs, one per class, separated along x. */
export function blobs(n = 40, seed = 1, sep = 3, sd = 0.6): Point[] {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const label: 1 | -1 = i < n / 2 ? -1 : 1;
    const cx = label === 1 ? sep : -sep;
    out.push({ x: g(cx, sd), y: g(0, sd), label });
  }
  return out;
}

/** Concentric circles: inner ring (-1) wrapped by an outer ring (+1). Not linearly separable. */
export function circles(n = 80, seed = 2, rInner = 1, rOuter = 2.4, noise = 0.12): Point[] {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const inner = i < n / 2;
    const r = (inner ? rInner : rOuter) + g(0, noise);
    const t = rng() * 2 * Math.PI;
    out.push({ x: r * Math.cos(t), y: r * Math.sin(t), label: inner ? -1 : 1 });
  }
  return out;
}

/** Two interleaving half-moons. The classic non-linear benchmark. */
export function moons(n = 80, seed = 3, noise = 0.1): Point[] {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const out: Point[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    if (i < half) {
      const t = Math.PI * (i / half);
      out.push({ x: Math.cos(t) + g(0, noise), y: Math.sin(t) + g(0, noise), label: -1 });
    } else {
      const t = Math.PI * ((i - half) / (n - half));
      out.push({ x: 1 - Math.cos(t) + g(0, noise), y: -Math.sin(t) + 0.5 + g(0, noise), label: 1 });
    }
  }
  return out;
}

/**
 * 1D data that is not separable by a single threshold in 1D, but becomes
 * separable after the lift φ(x)=(x, x²): the inner segment (|x| < gap) is one
 * class, flanked by the other. The two classes are kept strictly on opposite
 * sides of |x| = gap so the lifted line y = gap² always separates them.
 * Returns x positions plus labels (y starts at 0).
 */
export function interval1d(n = 18, seed = 7, gap = 1.4): { x: number; label: 1 | -1 }[] {
  const rng = mulberry32(seed);
  const out: { x: number; label: 1 | -1 }[] = [];
  for (let i = 0; i < n; i++) {
    const inner = i % 2 === 0;
    if (inner) {
      // strictly inside the gap: |x| in [0.05, gap - 0.15]
      const mag = 0.05 + rng() * (gap - 0.2);
      out.push({ x: (rng() < 0.5 ? -1 : 1) * mag, label: -1 });
    } else {
      // strictly outside the gap: |x| in [gap + 0.15, gap + 1.3]
      const mag = gap + 0.15 + rng() * 1.15;
      out.push({ x: (rng() < 0.5 ? -1 : 1) * mag, label: 1 });
    }
  }
  return out;
}
