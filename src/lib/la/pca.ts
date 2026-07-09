// PCA on 2D point clouds. The covariance matrix is 2×2 and symmetric, so its
// eigendecomposition comes straight from eigen2 — lesson 5 literally reuses the
// machinery lesson 4 taught.

import type { V2 } from '../svm/geometry';
import { mulberry32, makeGaussian } from '../svm/prng';
import type { Mat2 } from './mat2';
import { eigen2 } from './eigen2';
import { add, sub, scale, dot } from './vec2';

export interface Pca2 {
  mean: V2;
  /** unit principal directions, by decreasing variance */
  comps: [V2, V2];
  /** variances along each component (eigenvalues of the covariance) */
  eigs: [number, number];
}

export function pcaFit2(points: V2[]): Pca2 {
  const n = points.length;
  const mean: V2 = {
    x: points.reduce((a, p) => a + p.x, 0) / n,
    y: points.reduce((a, p) => a + p.y, 0) / n,
  };
  let sxx = 0,
    sxy = 0,
    syy = 0;
  for (const p of points) {
    const dx = p.x - mean.x;
    const dy = p.y - mean.y;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const cov: Mat2 = [
    [sxx / n, sxy / n],
    [sxy / n, syy / n],
  ];
  const e = eigen2(cov);
  if (e.kind === 'real') {
    // eigen2 orders by |λ|; covariance eigenvalues are ≥ 0 so this is by variance.
    return { mean, comps: [e.vectors[0], e.vectors[1]], eigs: [e.values[0], e.values[1]] };
  }
  // Symmetric matrices always have real eigenpairs; 'repeated' means the cloud
  // is isotropic and any orthonormal pair works. 'complex' cannot happen.
  const v = e.kind === 'repeated' ? e.vectors[0] : { x: 1, y: 0 };
  const lam = e.kind === 'repeated' ? e.value : 0;
  return { mean, comps: [v, { x: -v.y, y: v.x }], eigs: [lam, lam] };
}

/** Project every point onto the first component and reconstruct in 2D. */
export function projectK1(points: V2[], fit: Pca2): { recon: V2[]; coords: number[]; keptVar: number } {
  const w = fit.comps[0];
  const coords = points.map((p) => dot(sub(p, fit.mean), w));
  const recon = coords.map((c) => add(fit.mean, scale(w, c)));
  const total = fit.eigs[0] + fit.eigs[1];
  return { recon, coords, keptVar: total < 1e-12 ? 1 : fit.eigs[0] / total };
}

/** Variance of the points projected onto the unit direction of angle θ. */
export function varianceAlong(points: V2[], mean: V2, theta: number): number {
  const w: V2 = { x: Math.cos(theta), y: Math.sin(theta) };
  let s = 0;
  for (const p of points) {
    const c = dot(sub(p, mean), w);
    s += c * c;
  }
  return s / points.length;
}

/** Reconstruction of each point after projecting onto the unit direction w through mean. */
export function projectAlong(points: V2[], mean: V2, w: V2): V2[] {
  return points.map((p) => add(mean, scale(w, dot(sub(p, mean), w))));
}

/** Endpoints of the segment of half-length L along w through mean — for drawing the direction. */
export function lineThrough(mean: V2, w: V2, L: number): [V2, V2] {
  return [add(mean, scale(w, L)), sub(mean, scale(w, L))];
}

/** Anisotropic Gaussian cloud tilted ~30°, deterministic per seed. */
export function pcaCloud(n: number, seed: number): V2[] {
  const rng = mulberry32(seed);
  const gauss = makeGaussian(rng);
  const theta = Math.PI / 6 + (rng() - 0.5) * 0.5; // vary the tilt a bit per seed
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const points: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = gauss(0, 1.5);
    const b = gauss(0, 0.45);
    points.push({ x: a * c - b * s, y: a * s + b * c });
  }
  return points;
}
