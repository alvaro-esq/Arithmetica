// Evaluation metrics for anomaly detection. The supervised half (confusion
// matrix → precision/recall/F1 → threshold tuning) drives the ThresholdTuner
// island.

import type { Scored } from './datasets';

export interface CM {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

/** Predict "anomaly" when score ≥ τ, then tally against the true labels. */
export function confusion(data: Scored[], tau: number): CM {
  const cm: CM = { tp: 0, fp: 0, tn: 0, fn: 0 };
  for (const d of data) {
    const pred = d.score >= tau ? 1 : 0;
    if (pred === 1 && d.y === 1) cm.tp++;
    else if (pred === 1 && d.y === 0) cm.fp++;
    else if (pred === 0 && d.y === 0) cm.tn++;
    else cm.fn++;
  }
  return cm;
}

/** TP / (TP + FP); 0 when nothing is predicted positive. */
export function precision(cm: CM): number {
  const denom = cm.tp + cm.fp;
  return denom === 0 ? 0 : cm.tp / denom;
}

/** TP / (TP + FN); 0 when there are no true positives to find. */
export function recall(cm: CM): number {
  const denom = cm.tp + cm.fn;
  return denom === 0 ? 0 : cm.tp / denom;
}

/** Harmonic mean 2PR/(P+R); 0 when both are 0. */
export function f1(p: number, r: number): number {
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

/**
 * τ* = argmax over candidate thresholds of metric(P, R). Candidates are the
 * sample scores themselves (plus a point just above the max, i.e. "predict
 * nothing"), which is where the metric can change value.
 */
export function argmaxThreshold(data: Scored[], metric: (p: number, r: number) => number): number {
  const candidates = data.map((d) => d.score);
  candidates.push(Math.max(...candidates) + 1e-6);
  let best = candidates[0];
  let bestVal = -Infinity;
  for (const tau of candidates) {
    const cm = confusion(data, tau);
    const v = metric(precision(cm), recall(cm));
    if (v > bestVal) {
      bestVal = v;
      best = tau;
    }
  }
  return best;
}

