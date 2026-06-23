// Shared types for the decision-tree / random-forest / boosting visualizations.
// Labels are plain numbers (0, 1, …) because trees are naturally multi-class and
// counts-based, unlike the SVM Point which uses ±1. A small adapter in datasets.ts
// bridges the two so the existing svm/datasets can be reused.

export type { Domain, V2 } from '../svm/geometry';

/** A labelled 2D sample. label ∈ {0, 1, …}; the demos use binary 0/1. */
export interface LPoint {
  x: number;
  y: number;
  label: number;
}

/** Axis index of an axis-aligned split: 0 = x (feature 1), 1 = y (feature 2). */
export type Feature = 0 | 1;

/** A terminal node: predicts the majority class of the samples that reach it. */
export interface Leaf {
  kind: 'leaf';
  prediction: number;
  counts: number[];
  n: number;
  depth: number;
  impurity: number;
}

/** An internal node testing `feature <= threshold`; left = true, right = false. */
export interface Split {
  kind: 'split';
  feature: Feature;
  threshold: number;
  depth: number;
  impurity: number;
  gain: number;
  n: number;
  counts: number[];
  left: TreeNode;
  right: TreeNode;
}

export type TreeNode = Leaf | Split;

/** Stopping criteria + class count, threaded through buildTree / growStep. */
export interface BuildOpts {
  maxDepth: number;
  minSamples: number; // min samples in a node to even attempt a split
  minGain: number; // min Gini decrease to accept a split
  nClasses: number;
  features?: Feature[]; // restrict candidate features (forest column subsample); default both
}
