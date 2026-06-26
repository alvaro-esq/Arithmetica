// Node impurity measures. Pure scalar math, the basis of the Gini explorer and
// of every split decision in cart.ts.

import type { LPoint } from './types';

/** counts → class probabilities pᵢ. Returns zeros for an empty node. */
export function probs(counts: number[]): number[] {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0) return counts.map(() => 0);
  return counts.map((c) => c / total);
}

/** Gini impurity 1 − Σ pᵢ². Range [0, 1 − 1/k]; 0 means pure (and 0 for an empty
 *  node, where pᵢ are all zero). */
export function gini(counts: number[]): number {
  const p = probs(counts);
  const sumSq = p.reduce((s, pi) => s + pi * pi, 0);
  return sumSq === 0 ? 0 : 1 - sumSq; // empty node → 0, not 1
}

/** Shannon entropy −Σ pᵢ log₂ pᵢ (bits). Range [0, log₂ k]; 0 means pure. */
export function entropy(counts: number[]): number {
  const p = probs(counts);
  return -p.reduce((s, pi) => (pi > 0 ? s + pi * Math.log2(pi) : s), 0);
}

/** Sample-weighted impurity of a split: (nL/n)·imp(L) + (nR/n)·imp(R). */
export function weightedImpurity(
  left: number[],
  right: number[],
  impurity: (c: number[]) => number = gini,
): number {
  const nL = left.reduce((s, c) => s + c, 0);
  const nR = right.reduce((s, c) => s + c, 0);
  const n = nL + nR;
  if (n === 0) return 0;
  return (nL / n) * impurity(left) + (nR / n) * impurity(right);
}

/** Tally point labels into a counts[nClasses] array. */
export function tally(points: LPoint[], nClasses: number): number[] {
  const counts = new Array(nClasses).fill(0);
  for (const p of points) counts[p.label]++;
  return counts;
}
