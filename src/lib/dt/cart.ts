// CART learner: best-split search, recursive growth, single-step growth (for the
// step-by-step grower), and routing/prediction. All pure and deterministic — ties
// are broken by (feature, threshold) order so the same data always yields the same
// tree. Sizes here are tiny (≤ ~80 points), so recomputing on every slider tick
// inside a $derived is microsecond-cheap.

import type { BuildOpts, Feature, LPoint, Leaf, Split, TreeNode } from './types';
import { gini, tally, weightedImpurity } from './impurity';

export interface SplitCandidate {
  feature: Feature;
  threshold: number;
  gain: number;
  weightedImpurity: number;
}

type Impurity = (c: number[]) => number;

/** Predicted class of a counts array: the argmax, ties to the lower index. */
function majority(counts: number[]): number {
  let best = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
  return best;
}

function makeLeaf(points: LPoint[], opts: BuildOpts, depth: number, impurity: Impurity): Leaf {
  const counts = tally(points, opts.nClasses);
  return {
    kind: 'leaf',
    prediction: majority(counts),
    counts,
    n: points.length,
    depth,
    impurity: impurity(counts),
  };
}

/**
 * Scan every midpoint between consecutive sorted values on each candidate feature
 * and return the split with the largest Gini gain, or null if nothing improves by
 * more than `minGain`. Gain = impurity(parent) − weighted impurity(children).
 */
export function bestSplit(
  points: LPoint[],
  opts: BuildOpts,
  impurity: Impurity = gini,
): SplitCandidate | null {
  const parentCounts = tally(points, opts.nClasses);
  const parentImp = impurity(parentCounts);
  const features = opts.features ?? [0, 1];
  let best: SplitCandidate | null = null;

  for (const feature of features) {
    // sort the candidate thresholds (distinct coordinate values) ascending
    const values = points.map((p) => (feature === 0 ? p.x : p.y)).sort((a, b) => a - b);
    for (let i = 0; i + 1 < values.length; i++) {
      if (values[i] === values[i + 1]) continue;
      const threshold = (values[i] + values[i + 1]) / 2;
      const left = new Array(opts.nClasses).fill(0);
      const right = new Array(opts.nClasses).fill(0);
      for (const p of points) {
        const v = feature === 0 ? p.x : p.y;
        if (v <= threshold) left[p.label]++;
        else right[p.label]++;
      }
      const wImp = weightedImpurity(left, right, impurity);
      const gain = parentImp - wImp;
      if (gain > (best?.gain ?? -Infinity) + 1e-12) {
        best = { feature, threshold, gain, weightedImpurity: wImp };
      }
    }
  }

  if (!best || best.gain < opts.minGain) return null;
  return best;
}

/** Split a node's points into the two children of a candidate. */
function partition(points: LPoint[], c: SplitCandidate): [LPoint[], LPoint[]] {
  const left: LPoint[] = [];
  const right: LPoint[] = [];
  for (const p of points) {
    const v = c.feature === 0 ? p.x : p.y;
    if (v <= c.threshold) left.push(p);
    else right.push(p);
  }
  return [left, right];
}

/** Recursively grow a CART tree honoring maxDepth / minSamples / minGain. */
export function buildTree(
  points: LPoint[],
  opts: BuildOpts,
  depth = 0,
  impurity: Impurity = gini,
): TreeNode {
  const counts = tally(points, opts.nClasses);
  const leaf = makeLeaf(points, opts, depth, impurity);
  // `< 1e-12` not `=== 0`: entropy / multi-class impurity can leave fp residue on a
  // pure node, so an exact equality would never fire and growth overshoots purity.
  if (depth >= opts.maxDepth || points.length < opts.minSamples || leaf.impurity < 1e-12) {
    return leaf;
  }
  const c = bestSplit(points, opts, impurity);
  if (!c) return leaf;
  const [lp, rp] = partition(points, c);
  if (lp.length === 0 || rp.length === 0) return leaf;
  return {
    kind: 'split',
    feature: c.feature,
    threshold: c.threshold,
    depth,
    impurity: leaf.impurity,
    gain: c.gain,
    n: points.length,
    counts,
    left: buildTree(lp, opts, depth + 1, impurity),
    right: buildTree(rp, opts, depth + 1, impurity),
  };
}

// --- Single-step growth (powers the interactive grower) ---------------------
// Re-routes the dataset from the root to recover each leaf's samples, finds the
// single eligible leaf with the highest available gain, and returns a NEW tree
// with that one leaf replaced by a split. Immutability is required so Svelte
// reactivity fires on the returned object.

interface Candidate {
  gain: number;
  split: SplitCandidate;
  points: LPoint[];
}

/** Route points to the two sides of an internal node (reads feature/threshold). */
function partitionAt(points: LPoint[], feature: Feature, threshold: number): [LPoint[], LPoint[]] {
  const left: LPoint[] = [];
  const right: LPoint[] = [];
  for (const p of points) {
    const v = feature === 0 ? p.x : p.y;
    if (v <= threshold) left.push(p);
    else right.push(p);
  }
  return [left, right];
}

/** Best eligible split for the samples at a given leaf, or null. */
function leafCandidate(
  leaf: Leaf,
  points: LPoint[],
  opts: BuildOpts,
  impurity: Impurity,
): Candidate | null {
  if (leaf.depth >= opts.maxDepth || points.length < opts.minSamples || leaf.impurity < 1e-12) {
    return null;
  }
  const split = bestSplit(points, opts, impurity);
  if (!split) return null;
  const [lp, rp] = partition(points, split);
  if (lp.length === 0 || rp.length === 0) return null;
  return { gain: split.gain, split, points };
}

/**
 * Grow the tree by exactly one split: the eligible leaf with the largest gain.
 * Returns the new tree plus a reference to the node that was just split (for
 * highlighting), or `splitAt: null` if no eligible leaf remains. The `impurity`
 * criterion is threaded through so the grower agrees with buildTree.
 */
export function growStep(
  tree: TreeNode,
  points: LPoint[],
  opts: BuildOpts,
  impurity: Impurity = gini,
): { tree: TreeNode; splitAt: TreeNode | null } {
  // Find the best leaf to split, carrying the samples that reach it.
  let bestLeaf: Leaf | null = null;
  let bestCand: Candidate | null = null;

  function visit(node: TreeNode, pts: LPoint[]) {
    if (node.kind === 'leaf') {
      const cand = leafCandidate(node, pts, opts, impurity);
      if (cand && cand.gain > (bestCand?.gain ?? -Infinity)) {
        bestCand = cand;
        bestLeaf = node;
      }
      return;
    }
    const [lp, rp] = partitionAt(pts, node.feature, node.threshold);
    visit(node.left, lp);
    visit(node.right, rp);
  }
  visit(tree, points);

  if (!bestLeaf || !bestCand) return { tree, splitAt: null };

  const targetLeaf: Leaf = bestLeaf;
  const cand: Candidate = bestCand;
  let created: TreeNode | null = null;

  // Rebuild the tree, replacing the target leaf with its split.
  function rebuild(node: TreeNode): TreeNode {
    if (node === targetLeaf) {
      const [lp, rp] = partition(cand.points, cand.split);
      const split: Split = {
        kind: 'split',
        feature: cand.split.feature,
        threshold: cand.split.threshold,
        depth: node.depth,
        impurity: node.impurity,
        gain: cand.split.gain,
        n: node.n,
        counts: node.counts,
        left: makeLeaf(lp, opts, node.depth + 1, impurity),
        right: makeLeaf(rp, opts, node.depth + 1, impurity),
      };
      created = split;
      return split;
    }
    if (node.kind === 'split') {
      return { ...node, left: rebuild(node.left), right: rebuild(node.right) };
    }
    return node;
  }

  return { tree: rebuild(tree), splitAt: created };
}

// --- Prediction -------------------------------------------------------------

function leafFor(tree: TreeNode, p: { x: number; y: number }): Leaf {
  let node: TreeNode = tree;
  while (node.kind === 'split') {
    const v = node.feature === 0 ? p.x : p.y;
    node = v <= node.threshold ? node.left : node.right;
  }
  return node;
}

/** Predicted class for a point. */
export function classify(tree: TreeNode, p: { x: number; y: number }): number {
  return leafFor(tree, p).prediction;
}

/** Leaf class-probabilities for a point (for soft shading / forest voting). */
export function classifyProba(tree: TreeNode, p: { x: number; y: number }): number[] {
  const leaf = leafFor(tree, p);
  const total = leaf.n || 1;
  return leaf.counts.map((c) => c / total);
}

/** Depth, leaf count and node count for readouts. */
export function treeStats(tree: TreeNode): { depth: number; leaves: number; nodes: number } {
  let depth = 0;
  let leaves = 0;
  let nodes = 0;
  function visit(node: TreeNode) {
    nodes++;
    depth = Math.max(depth, node.depth);
    if (node.kind === 'leaf') leaves++;
    else {
      visit(node.left);
      visit(node.right);
    }
  }
  visit(tree);
  return { depth, leaves, nodes };
}
