// The four SVM kernels and the kernel decision function.
// A kernel K(a, b) is an inner product in some (possibly infinite-dimensional)
// feature space; the "kernel trick" lets us work there using only K.

import type { Point } from './datasets';

export type Vec2 = { x: number; y: number };
export type KernelName = 'linear' | 'poly' | 'rbf' | 'sigmoid';

export interface KernelParams {
  /** Polynomial degree d. */
  degree: number;
  /** RBF / sigmoid scale γ. */
  gamma: number;
  /** Constant term c₀ (poly / sigmoid). */
  coef0: number;
}

export const defaultParams: KernelParams = { degree: 3, gamma: 1, coef0: 1 };

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function sqDist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Evaluate kernel K(a, b) for the given kernel and hyperparameters. */
export function kernel(name: KernelName, a: Vec2, b: Vec2, p: KernelParams): number {
  switch (name) {
    case 'linear':
      return dot(a, b);
    case 'poly':
      return Math.pow(p.gamma * dot(a, b) + p.coef0, p.degree);
    case 'rbf':
      return Math.exp(-p.gamma * sqDist(a, b));
    case 'sigmoid':
      return Math.tanh(p.gamma * dot(a, b) + p.coef0);
  }
}

/**
 * Decision function f(x) = Σ αᵢ yᵢ K(xᵢ, x) + b, predict sign(f).
 * `support` holds the relevant training points; `alphas[i]` are their weights
 * (for the Parzen-style approximation all αᵢ = 1).
 */
export function decisionFunction(
  x: Vec2,
  support: Point[],
  alphas: number[],
  b: number,
  name: KernelName,
  p: KernelParams,
): number {
  let sum = b;
  for (let i = 0; i < support.length; i++) {
    sum += alphas[i] * support[i].label * kernel(name, support[i], x, p);
  }
  return sum;
}
