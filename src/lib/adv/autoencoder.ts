// An autoencoder learns to compress data through a narrow bottleneck and then
// reconstruct it. The *optimal linear* autoencoder is exactly PCA: the encoder
// projects onto the top-k principal components and the decoder maps back. That
// lets us show the real relationship — narrower bottleneck ⇒ more compression ⇒
// larger reconstruction error — without training anything, and it makes the
// anomaly-detection angle exact: points off the principal subspace reconstruct
// badly. All deterministic; the dataset is seeded.

import { mulberry32, makeGaussian } from '../svm/prng';

export interface PcaFit {
  mean: number[];
  comps: number[][]; // principal directions, unit vectors, sorted by eigenvalue desc
  eigs: number[]; // variance along each component
}

function matvec(M: number[][], v: number[]): number[] {
  return M.map((row) => row.reduce((s, x, i) => s + x * v[i], 0));
}
function norm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/** Fit PCA: center the data, build the covariance, extract all eigenpairs by
 *  power iteration + deflation. Dimensions here are small (2–3), so this is exact
 *  and cheap. */
export function pcaFit(X: number[][]): PcaFit {
  const n = X.length;
  const d = X[0].length;
  const mean = Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const C = X.map((r) => r.map((v, j) => v - mean[j]));
  const cov = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of C) for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) cov[a][b] += (r[a] * r[b]) / n;

  let M = cov.map((r) => r.slice());
  const comps: number[][] = [];
  const eigs: number[] = [];
  for (let e = 0; e < d; e++) {
    // deterministic, non-degenerate start vector (no RNG, no all-zeros)
    let v = Array.from({ length: d }, (_, i) => Math.sin(i + 1 + e));
    const nv = norm(v) || 1;
    v = v.map((x) => x / nv);
    let lambda = 0;
    for (let it = 0; it < 400; it++) {
      const w = matvec(M, v);
      const nw = norm(w) || 1e-12;
      v = w.map((x) => x / nw);
      lambda = nw;
    }
    comps.push(v);
    eigs.push(lambda);
    // deflate: M ← M − λ vvᵀ
    M = M.map((row, a) => row.map((x, b) => x - lambda * v[a] * v[b]));
  }
  return { mean, comps, eigs };
}

export interface Reconstruction {
  recon: number[][]; // reconstructed points (same shape as X)
  perPointErr: number[]; // squared distance original ↔ reconstruction
  mse: number; // mean squared reconstruction error
  keptVar: number; // fraction of total variance retained by the top-k components
}

/** Encode each point to its top-k principal coordinates, then decode back. The
 *  reconstruction error is the squared distance to the k-dim principal subspace. */
export function reconstruct(X: number[][], fit: PcaFit, k: number): Reconstruction {
  const { mean, comps, eigs } = fit;
  const recon = X.map((x) => {
    const c = x.map((v, j) => v - mean[j]);
    const out = mean.slice();
    for (let i = 0; i < k; i++) {
      const coord = c.reduce((s, cv, j) => s + cv * comps[i][j], 0); // project onto comp i
      for (let j = 0; j < out.length; j++) out[j] += coord * comps[i][j];
    }
    return out;
  });
  const perPointErr = X.map((x, p) => x.reduce((s, v, j) => s + (v - recon[p][j]) ** 2, 0));
  const mse = perPointErr.reduce((a, b) => a + b, 0) / X.length;
  const total = eigs.reduce((a, b) => a + b, 0) || 1;
  const keptVar = eigs.slice(0, k).reduce((a, b) => a + b, 0) / total;
  return { recon, perPointErr, mse, keptVar };
}

/**
 * A 2-D point cloud stretched along one dominant direction (so a 1-D bottleneck
 * already captures most variance), plus a few off-axis **outliers** that the
 * principal subspace cannot reconstruct — the anomaly-detection hook.
 */
export function aeDataset(n: number, seed: number): { points: number[][]; outlierStart: number } {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const pts: number[][] = [];
  // dominant axis ~45°, wide spread along it, narrow across it
  for (let i = 0; i < n; i++) {
    const t = g(0, 1.4); // along the main direction
    const s = g(0, 0.28); // small spread across
    pts.push([t * 0.8 - s * 0.6, t * 0.6 + s * 0.8]);
  }
  const outlierStart = pts.length;
  // outliers sit far off the principal axis
  const outliers = [
    [1.4, -1.5],
    [-1.6, 1.7],
    [1.9, -0.4],
  ];
  for (const o of outliers) pts.push(o);
  return { points: pts, outlierStart };
}
