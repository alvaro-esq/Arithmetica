// Discrete AdaBoost on decision stumps (depth-1 trees). Chosen over gradient
// boosting for the live demo because the story — "misclassified points gain weight,
// the next stump focuses on them" — is the most visual, and stump fitting is
// exhaustive (no rng, no learning rate). adaBoost() returns per-round snapshots so
// a stepper can scrub history without recomputing.
//
// Labels here are mapped to ±1 internally (the demo passes 0/1 points).

import type { Feature, LPoint } from './types';

export interface Stump {
  feature: Feature;
  threshold: number;
  polarity: 1 | -1; // +1: predict +1 when value > threshold; -1: the reverse
  alpha: number; // stump weight in the strong classifier
}

export interface BoostState {
  stumps: Stump[];
  weights: number[][]; // sample-weight snapshot BEFORE each round
  trainErr: number[]; // weighted training error of each round's stump
}

/** ±1 sign of a sample's label (label 1 → +1, anything else → −1). */
function sign(label: number): 1 | -1 {
  return label === 1 ? 1 : -1;
}

/** A stump's ±1 prediction for a point. */
function stumpPredict(s: Stump, p: { x: number; y: number }): 1 | -1 {
  const v = s.feature === 0 ? p.x : p.y;
  const base = v > s.threshold ? 1 : -1;
  return (base * s.polarity) as 1 | -1;
}

/**
 * The single best weighted decision stump under sample weights `w`: scans both
 * features, every midpoint, and both polarities, minimizing weighted error.
 * `alpha` is left at 0 here; adaBoost fills it in once the error is known.
 */
export function bestStump(points: LPoint[], w: number[]): Stump {
  // Fallback when no feature has two distinct values (so no midpoint exists): a
  // constant predictor that outputs the weighted-majority class. Its threshold sits
  // below every value and the polarity is chosen so `value > threshold` (always
  // true) predicts the majority — better than an arbitrary "split at 0".
  let wPos = 0;
  let minVal = Infinity;
  for (let k = 0; k < points.length; k++) {
    if (sign(points[k].label) === 1) wPos += w[k];
    minVal = Math.min(minVal, points[k].x, points[k].y);
  }
  const majorityPolarity: 1 | -1 = wPos >= 0.5 ? 1 : -1;
  let best: Stump = { feature: 0, threshold: minVal - 1, polarity: majorityPolarity, alpha: 0 };
  let bestErr = Infinity;
  const features: Feature[] = [0, 1];

  for (const feature of features) {
    const values = points.map((p) => (feature === 0 ? p.x : p.y)).sort((a, b) => a - b);
    for (let i = 0; i + 1 < values.length; i++) {
      if (values[i] === values[i + 1]) continue;
      const threshold = (values[i] + values[i + 1]) / 2;
      for (const polarity of [1, -1] as const) {
        let err = 0;
        for (let k = 0; k < points.length; k++) {
          const pred = stumpPredict({ feature, threshold, polarity, alpha: 0 }, points[k]);
          if (pred !== sign(points[k].label)) err += w[k];
        }
        if (err < bestErr) {
          bestErr = err;
          best = { feature, threshold, polarity, alpha: 0 };
        }
      }
    }
  }
  return best;
}

/** Run `rounds` of discrete AdaBoost, snapshotting weights before each round. */
export function adaBoost(points: LPoint[], rounds: number): BoostState {
  const n = points.length;
  let w = new Array(n).fill(1 / n);
  const stumps: Stump[] = [];
  const weights: number[][] = [];
  const trainErr: number[] = [];

  for (let r = 0; r < rounds; r++) {
    weights.push([...w]);
    const stump = bestStump(points, w);

    let err = 0;
    const correct: boolean[] = points.map((p, k) => {
      const ok = stumpPredict(stump, p) === sign(p.label);
      if (!ok) err += w[k];
      return ok;
    });
    err = Math.min(Math.max(err, 1e-10), 1 - 1e-10); // guard log/÷0

    const alpha = 0.5 * Math.log((1 - err) / err);
    stump.alpha = alpha;
    stumps.push(stump);
    trainErr.push(err);

    // Reweight: up-weight misclassified, down-weight correct, renormalize.
    let z = 0;
    for (let k = 0; k < n; k++) {
      w[k] *= Math.exp(correct[k] ? -alpha : alpha);
      z += w[k];
    }
    w = w.map((wk) => wk / z);
  }

  return { stumps, weights, trainErr };
}

/** Cumulative strong-classifier margin Σ αₜ hₜ(x) using rounds 0…k (inclusive). */
export function boostScore(state: BoostState, k: number, p: { x: number; y: number }): number {
  let s = 0;
  const upto = Math.min(k, state.stumps.length - 1);
  for (let t = 0; t <= upto; t++) s += state.stumps[t].alpha * stumpPredict(state.stumps[t], p);
  return s;
}

/** Overall (unweighted) training accuracy of the strong classifier at round k. */
export function boostAccuracy(state: BoostState, k: number, points: LPoint[]): number {
  let ok = 0;
  for (const p of points) {
    const pred = boostScore(state, k, p) >= 0 ? 1 : -1;
    if (pred === sign(p.label)) ok++;
  }
  return ok / (points.length || 1);
}
