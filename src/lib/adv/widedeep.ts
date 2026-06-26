// Wide & Deep: the deck's tabular architecture. The "wide" part memorizes specific
// feature crosses (rules like "x·y > 0" — a checkerboard a linear model can't draw);
// the "deep" part is a small fixed MLP that learns a smooth, generalizing boundary.
// The combined model adds their logits: ŷ = σ(w_wideᵀ x_wide + w_deepᵀ h_deep).
// Weights are hand-set (no training) so the contrast memorize-vs-generalize is the
// teaching point; everything is deterministic and the dataset is seeded.

import { mulberry32, makeGaussian } from '../svm/prng';
import { sigmoid } from '../dl/activations';
import type { V2 } from '../svm/geometry';

export type Mode = 'wide' | 'deep' | 'both';

/**
 * Wide logit. With `crosses` on, it includes the explicit cross term x·y, letting
 * it memorize the checkerboard (sign of x·y). With crosses off it is purely linear
 * in x and y and cannot separate that pattern — the deck's "no generalization of
 * simple rules without the cross" point, mirrored as "no memorization without it".
 */
export function wideLogit(p: V2, crosses: boolean): number {
  const linear = 0.4 * p.x + 0.2 * p.y;
  const cross = crosses ? 6 * p.x * p.y : 0; // the memorized rule
  return linear + cross;
}

/**
 * Deep logit: a fixed 2→3→1 tanh MLP producing a smooth nonlinear boundary (a
 * diagonal band) that generalizes but cannot capture the sharp checkerboard.
 */
export function deepLogit(p: V2): number {
  // Tuned so the boundary is a smooth diagonal (≈ sign of x+y): it generalizes the
  // trend but is ~neutral on the off-diagonal checkerboard corners, leaving those
  // to the wide part.
  const W1 = [
    [2.0, 2.0],
    [1.5, 1.5],
    [-1.0, -1.0],
  ];
  const b1 = [0.0, 0.5, -0.5];
  const W2 = [2.5, 1.5, -1.5];
  const b2 = 0.0;
  const h = W1.map((w, i) => Math.tanh(w[0] * p.x + w[1] * p.y + b1[i]));
  return W2.reduce((s, w, i) => s + w * h[i], b2);
}

/** Probability ŷ = σ(logit) for the chosen mode; `both` sums the two logits. */
export function predict(p: V2, mode: Mode, crosses: boolean): number {
  let z: number;
  if (mode === 'wide') z = wideLogit(p, crosses);
  else if (mode === 'deep') z = deepLogit(p);
  else z = wideLogit(p, crosses) + deepLogit(p);
  return sigmoid(z);
}

export interface LabeledPoint {
  x: number;
  y: number;
  label: 0 | 1;
}

/**
 * Labeled points whose true rule mixes a memorizable checkerboard (sign of x·y)
 * with a smooth diagonal tendency — so the wide part nails the corners and the
 * deep part captures the gradient, and only "both" gets most of them right.
 */
export function wdDataset(seed: number, n = 80): LabeledPoint[] {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const pts: LabeledPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = g(0, 0.7);
    const y = g(0, 0.7);
    // True label mixes a checkerboard (the wide part's job — memorizing x·y > 0)
    // with a smooth diagonal trend (the deep part's job — generalizing x+y). Neither
    // part captures both, so the combined model wins.
    const rule = x * y + 0.35 * (x + y);
    pts.push({ x, y, label: rule > 0 ? 1 : 0 });
  }
  return pts;
}

/** Accuracy of a mode on the dataset (decision threshold 0.5). */
export function accuracy(data: LabeledPoint[], mode: Mode, crosses: boolean): number {
  let ok = 0;
  for (const p of data) {
    const pred = predict({ x: p.x, y: p.y }, mode, crosses) > 0.5 ? 1 : 0;
    if (pred === p.label) ok++;
  }
  return ok / data.length;
}
