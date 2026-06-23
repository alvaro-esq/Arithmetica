// Bagging + Random Forest + feature importance. Determinism is total: a single
// mulberry32(seed) "root" rng spawns one child seed per tree, so the same seed
// always produces the same forest across reloads / SSR.

import { mulberry32, type Rng } from '../svm/prng';
import type { BuildOpts, Feature, LPoint, Split, TreeNode } from './types';
import { buildTree } from './cart';

/** n indices sampled with replacement from [0, n). Multiplicity is meaningful. */
export function bootstrapIndices(n: number, rng: Rng): number[] {
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(Math.floor(rng() * n));
  return idx;
}

/** Materialize a bootstrap dataset from an index list. */
export function resample(points: LPoint[], idx: number[]): LPoint[] {
  return idx.map((i) => points[i]);
}

export interface Forest {
  trees: TreeNode[];
  oobMask: boolean[][]; // per tree: true where the original sample was out-of-bag
}

/** Derive a fresh 32-bit child seed from a root rng. */
function childSeed(rng: Rng): number {
  return Math.floor(rng() * 0x100000000);
}

/**
 * Build `nTrees` CART trees, each on its own bootstrap sample. At every tree we
 * pick a random subset of `maxFeatures` columns (the per-tree column subsample,
 * a simplification of sklearn's per-node subsample but enough to decorrelate the
 * trees on 2 features). Seed-threaded for reproducibility.
 */
export function buildForest(
  points: LPoint[],
  nTrees: number,
  opts: BuildOpts,
  seed: number,
  maxFeatures = 2,
): Forest {
  const root = mulberry32(seed);
  const n = points.length;
  const trees: TreeNode[] = [];
  const oobMask: boolean[][] = [];

  for (let t = 0; t < nTrees; t++) {
    const treeRng = mulberry32(childSeed(root));
    const idx = bootstrapIndices(n, treeRng);
    const inBag = new Set(idx);
    oobMask.push(points.map((_, i) => !inBag.has(i)));

    // Column subsample: choose `maxFeatures` of the two features for this tree.
    const allFeatures: Feature[] = [0, 1];
    let features: Feature[];
    if (maxFeatures >= 2) {
      features = allFeatures;
    } else {
      features = [treeRng() < 0.5 ? 0 : 1];
    }

    trees.push(buildTree(resample(points, idx), { ...opts, features }));
  }

  return { trees, oobMask };
}

/** Majority-vote class over the forest (ties to the lower class index). */
export function forestVote(forest: Forest, p: { x: number; y: number }): number {
  const votes: Record<number, number> = {};
  for (const tree of forest.trees) {
    const c = classifyClass(tree, p);
    votes[c] = (votes[c] ?? 0) + 1;
  }
  let best = 0;
  let bestN = -1;
  for (const k of Object.keys(votes).map(Number).sort((a, b) => a - b)) {
    if (votes[k] > bestN) {
      bestN = votes[k];
      best = k;
    }
  }
  return best;
}

function classifyClass(tree: TreeNode, p: { x: number; y: number }): number {
  let node = tree;
  while (node.kind === 'split') {
    const v = node.feature === 0 ? p.x : p.y;
    node = v <= node.threshold ? node.left : node.right;
  }
  return node.prediction;
}

/**
 * Mean class-probability over the forest — a smooth vote strength in [0, 1] per
 * class. Averaging many trees' soft predictions is what yields the characteristic
 * smooth Random-Forest boundary.
 */
export function forestProba(forest: Forest, p: { x: number; y: number }, nClasses = 2): number[] {
  const acc = new Array(nClasses).fill(0);
  for (const tree of forest.trees) {
    let node = tree;
    while (node.kind === 'split') {
      const v = node.feature === 0 ? p.x : p.y;
      node = v <= node.threshold ? node.left : node.right;
    }
    const total = node.n || 1;
    for (let c = 0; c < nClasses; c++) acc[c] += node.counts[c] / total;
  }
  const k = forest.trees.length || 1;
  return acc.map((a) => a / k);
}

export interface Importance {
  feature: Feature;
  total: number;
}

/**
 * Mean decrease in impurity: for every split node, add (n_node / n_root) × gain to
 * its feature's tally, summed over all trees, then normalize to sum 1. Mirrors the
 * `feature_importances_` of a scikit-learn forest.
 */
export function featureImportance(forest: Forest, nFeatures = 2): Importance[] {
  const totals = new Array(nFeatures).fill(0);

  for (const tree of forest.trees) {
    const rootN = tree.n || 1;
    function visit(node: TreeNode) {
      if (node.kind !== 'split') return;
      const s = node as Split;
      totals[s.feature] += (s.n / rootN) * s.gain;
      visit(s.left);
      visit(s.right);
    }
    visit(tree);
  }

  const sum = totals.reduce((a, b) => a + b, 0) || 1;
  return totals.map((t, i) => ({ feature: i as Feature, total: t / sum }));
}
