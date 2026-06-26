// Generic N-feature mean-decrease-in-impurity (MDI), kept separate from the 2D
// geometric tree lib (cart.ts / ensemble.ts work on {x, y} points for the spatial
// visualizations). Here a sample is an arbitrary-length feature vector, so a
// dataset can include a genuine noise column whose computed importance really does
// fall to ~0 — no fabricated bar.

import { mulberry32, type Rng } from '../svm/prng';
import { gini } from './impurity';

export interface VSample {
  features: number[]; // one value per feature
  label: number; // 0 / 1 (binary)
}

interface Opts {
  maxDepth: number;
  minSamples: number;
  nClasses: number;
}

function counts(samples: VSample[], nClasses: number): number[] {
  const c = new Array(nClasses).fill(0);
  for (const s of samples) c[s.label]++;
  return c;
}

/**
 * Grow one tree, accumulating each split's impurity-decrease into `gainPerFeature`
 * weighted by the node's sample fraction (relative to the tree's root size). Pure
 * and recursive; mirrors the MDI definition used by scikit-learn.
 */
function growAndScore(
  samples: VSample[],
  opts: Opts,
  rootN: number,
  gainPerFeature: number[],
  depth: number,
): void {
  if (depth >= opts.maxDepth || samples.length < opts.minSamples) return;
  const parentImp = gini(counts(samples, opts.nClasses));
  if (parentImp === 0) return;

  const nFeatures = samples[0].features.length;
  let best: { feature: number; threshold: number; gain: number; left: VSample[]; right: VSample[] } | null = null;

  for (let f = 0; f < nFeatures; f++) {
    const values = samples.map((s) => s.features[f]).sort((a, b) => a - b);
    for (let i = 0; i + 1 < values.length; i++) {
      if (values[i] === values[i + 1]) continue;
      const threshold = (values[i] + values[i + 1]) / 2;
      const left: VSample[] = [];
      const right: VSample[] = [];
      for (const s of samples) (s.features[f] <= threshold ? left : right).push(s);
      const n = samples.length;
      const wImp =
        (left.length / n) * gini(counts(left, opts.nClasses)) +
        (right.length / n) * gini(counts(right, opts.nClasses));
      const gain = parentImp - wImp;
      if (gain > (best?.gain ?? -Infinity) + 1e-12) best = { feature: f, threshold, gain, left, right };
    }
  }

  if (!best || best.gain <= 0) return;
  gainPerFeature[best.feature] += (samples.length / rootN) * best.gain;
  growAndScore(best.left, opts, rootN, gainPerFeature, depth + 1);
  growAndScore(best.right, opts, rootN, gainPerFeature, depth + 1);
}

/**
 * Random-forest feature importances over feature-vector samples: `nTrees` trees,
 * each on a bootstrap sample, accumulating MDI per feature, normalized to sum 1.
 * Seed-threaded (one child rng per tree) so results are reproducible. Returns the
 * all-zero vector if no split ever helps (e.g. a single-class dataset).
 */
export function vectorImportance(
  samples: VSample[],
  nTrees: number,
  opts: Opts,
  seed: number,
): number[] {
  const nFeatures = samples.length ? samples[0].features.length : 0;
  const totals = new Array(nFeatures).fill(0);
  const root: Rng = mulberry32(seed);

  for (let t = 0; t < nTrees; t++) {
    const treeRng = mulberry32(Math.floor(root() * 0x100000000));
    const n = samples.length;
    const bag: VSample[] = [];
    for (let i = 0; i < n; i++) bag.push(samples[Math.floor(treeRng() * n)]);
    growAndScore(bag, opts, bag.length, totals, 0);
  }

  const sum = totals.reduce((a, b) => a + b, 0);
  if (sum === 0) return totals; // no information → all zeros (honest)
  return totals.map((v) => v / sum);
}

/**
 * Incremental importance accumulator for a slider that grows the tree count. The
 * unnormalized per-feature totals are purely additive in the number of trees and
 * the per-tree seeds are deterministic, so growing N→N+k only grows the k new
 * trees instead of rebuilding the whole forest each tick. Call `to(n)` to get the
 * normalized importance for exactly `n` trees; shrinking `n` resets and replays
 * (rare on a drag-to-increase slider).
 */
export function makeImportanceAccumulator(samples: VSample[], opts: Opts, seed: number) {
  const nFeatures = samples.length ? samples[0].features.length : 0;
  let totals = new Array(nFeatures).fill(0);
  let grown = 0;
  let root: Rng = mulberry32(seed);

  function growOne() {
    const treeRng = mulberry32(Math.floor(root() * 0x100000000));
    const n = samples.length;
    const bag: VSample[] = [];
    for (let i = 0; i < n; i++) bag.push(samples[Math.floor(treeRng() * n)]);
    growAndScore(bag, opts, bag.length, totals, 0);
    grown++;
  }

  return function to(nTrees: number): number[] {
    if (nTrees < grown) {
      totals = new Array(nFeatures).fill(0);
      grown = 0;
      root = mulberry32(seed);
    }
    while (grown < nTrees) growOne();
    const sum = totals.reduce((a, b) => a + b, 0);
    return sum === 0 ? totals.slice() : totals.map((v) => v / sum);
  };
}
