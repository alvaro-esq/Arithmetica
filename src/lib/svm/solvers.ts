// Lightweight, dependency-free SVM solvers used by the "solve / train" buttons.
// Both are seeded for determinism (see prng.ts).

import { mulberry32 } from './prng';
import type { Point } from './datasets';
import { kernel, type KernelName, type KernelParams } from './kernels';

export interface LinearModel {
  w: { x: number; y: number };
  b: number;
}

/**
 * Pegasos: primal sub-gradient solver for the linear soft-margin SVM.
 * Minimizes (λ/2)‖w‖² + (1/n) Σ hinge, with λ = 1/(n·C). The bias is folded in
 * via an augmented constant feature. Fast enough to run on every C change.
 */
export function pegasos(data: Point[], C: number, iterations = 4000, seed = 42): LinearModel {
  const n = data.length;
  const lambda = 1 / (n * C);
  const rng = mulberry32(seed);
  // Augmented weights: [w1, w2, bias].
  let w = [0, 0, 0];
  for (let t = 1; t <= iterations; t++) {
    const i = Math.floor(rng() * n);
    const p = data[i];
    const eta = 1 / (lambda * t);
    const score = w[0] * p.x + w[1] * p.y + w[2];
    const scale = 1 - eta * lambda;
    if (p.label * score < 1) {
      w = [
        scale * w[0] + eta * p.label * p.x,
        scale * w[1] + eta * p.label * p.y,
        scale * w[2] + eta * p.label,
      ];
    } else {
      w = [scale * w[0], scale * w[1], scale * w[2]];
    }
  }
  return { w: { x: w[0], y: w[1] }, b: w[2] };
}

export interface KernelModel {
  support: Point[];
  alphas: number[];
  b: number;
}

/**
 * Simplified SMO (Platt / CS229) for a kernel SVM. Trains on ~50-100 points in
 * well under a second. Returns only the support vectors (αᵢ > 0).
 */
export function smo(
  data: Point[],
  name: KernelName,
  p: KernelParams,
  C = 1,
  tol = 1e-3,
  maxPasses = 8,
  seed = 99,
): KernelModel {
  const n = data.length;
  const rng = mulberry32(seed);
  const alpha = new Array(n).fill(0);
  let b = 0;

  // Precompute the kernel (Gram) matrix.
  const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const v = kernel(name, data[i], data[j], p);
      K[i][j] = v;
      K[j][i] = v;
    }
  }

  const f = (i: number) => {
    let s = b;
    for (let k = 0; k < n; k++) s += alpha[k] * data[k].label * K[k][i];
    return s;
  };

  let passes = 0;
  while (passes < maxPasses) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      const Ei = f(i) - data[i].label;
      if (
        (data[i].label * Ei < -tol && alpha[i] < C) ||
        (data[i].label * Ei > tol && alpha[i] > 0)
      ) {
        let j = Math.floor(rng() * (n - 1));
        if (j >= i) j++;
        const Ej = f(j) - data[j].label;
        const ai = alpha[i];
        const aj = alpha[j];

        let L: number, H: number;
        if (data[i].label !== data[j].label) {
          L = Math.max(0, aj - ai);
          H = Math.min(C, C + aj - ai);
        } else {
          L = Math.max(0, ai + aj - C);
          H = Math.min(C, ai + aj);
        }
        if (L === H) continue;

        const eta = 2 * K[i][j] - K[i][i] - K[j][j];
        if (eta >= 0) continue;

        let ajNew = aj - (data[j].label * (Ei - Ej)) / eta;
        ajNew = Math.min(H, Math.max(L, ajNew));
        if (Math.abs(ajNew - aj) < 1e-5) continue;

        const aiNew = ai + data[i].label * data[j].label * (aj - ajNew);
        alpha[i] = aiNew;
        alpha[j] = ajNew;

        const b1 =
          b - Ei - data[i].label * (aiNew - ai) * K[i][i] - data[j].label * (ajNew - aj) * K[i][j];
        const b2 =
          b - Ej - data[i].label * (aiNew - ai) * K[i][j] - data[j].label * (ajNew - aj) * K[j][j];
        if (aiNew > 0 && aiNew < C) b = b1;
        else if (ajNew > 0 && ajNew < C) b = b2;
        else b = (b1 + b2) / 2;

        changed++;
      }
    }
    passes = changed === 0 ? passes + 1 : 0;
  }

  const support: Point[] = [];
  const alphas: number[] = [];
  for (let i = 0; i < n; i++) {
    if (alpha[i] > 1e-6) {
      support.push(data[i]);
      alphas.push(alpha[i]);
    }
  }
  return { support, alphas, b };
}
