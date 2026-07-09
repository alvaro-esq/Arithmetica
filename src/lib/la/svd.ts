// Singular value decomposition via one-sided Jacobi (Hestenes): repeatedly
// rotate pairs of columns of a working copy of A until all columns are mutually
// orthogonal; their norms are the singular values, their directions the left
// singular vectors, and the accumulated rotations form V. Self-contained, exact
// enough for the 64×64 image the lesson compresses, and it never forms AᵀA (so
// small singular values keep their accuracy).

export interface Svd {
  /** m×n, orthonormal columns (zero columns where σ = 0) */
  U: number[][];
  /** singular values, descending, ≥ 0 */
  S: number[];
  /** n×n orthogonal */
  V: number[][];
}

export function svd(A: number[][], tol = 1e-12, maxSweeps = 30): Svd {
  const m = A.length;
  const n = A[0].length;
  if (m < n) {
    // Work on the transpose (the algorithm wants tall matrices), then swap roles.
    const t = svd(
      A[0].map((_, j) => A.map((row) => row[j])),
      tol,
      maxSweeps,
    );
    return { U: t.V, S: t.S, V: t.U };
  }

  // Column-major working copies: cols[j] is the j-th column of B (starts as A),
  // vcols[j] the j-th column of V (starts as I).
  const cols: number[][] = [];
  const vcols: number[][] = [];
  for (let j = 0; j < n; j++) {
    cols.push(A.map((row) => row[j]));
    const e = new Array<number>(n).fill(0);
    e[j] = 1;
    vcols.push(e);
  }

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let rotated = 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const bp = cols[p];
        const bq = cols[q];
        let alpha = 0,
          beta = 0,
          gamma = 0;
        for (let i = 0; i < m; i++) {
          alpha += bp[i] * bp[i];
          beta += bq[i] * bq[i];
          gamma += bp[i] * bq[i];
        }
        if (Math.abs(gamma) <= tol * Math.sqrt(alpha * beta) || alpha === 0 || beta === 0) continue;
        rotated++;
        const zeta = (beta - alpha) / (2 * gamma);
        const t = Math.sign(zeta) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let i = 0; i < m; i++) {
          const x = bp[i];
          const y = bq[i];
          bp[i] = c * x - s * y;
          bq[i] = s * x + c * y;
        }
        const vp = vcols[p];
        const vq = vcols[q];
        for (let i = 0; i < n; i++) {
          const x = vp[i];
          const y = vq[i];
          vp[i] = c * x - s * y;
          vq[i] = s * x + c * y;
        }
      }
    }
    if (rotated === 0) break;
  }

  const order = cols
    .map((col, j) => ({ j, sigma: Math.sqrt(col.reduce((a, x) => a + x * x, 0)) }))
    .sort((a, b) => b.sigma - a.sigma);

  const S = order.map((o) => o.sigma);
  const U: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  const V: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  order.forEach(({ j, sigma }, k) => {
    if (sigma > 1e-12) for (let i = 0; i < m; i++) U[i][k] = cols[j][i] / sigma;
    for (let i = 0; i < n; i++) V[i][k] = vcols[j][i];
  });
  return { U, S, V };
}

/** Rank-k reconstruction Σᵢ₍ₖ σᵢ uᵢ vᵢᵀ. */
export function rankK(s: Svd, k: number): number[][] {
  const m = s.U.length;
  const n = s.V.length;
  const kk = Math.min(k, s.S.length);
  const out: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let r = 0; r < kk; r++) {
    const sigma = s.S[r];
    if (sigma <= 0) break;
    for (let i = 0; i < m; i++) {
      const usi = s.U[i][r] * sigma;
      if (usi === 0) continue;
      for (let j = 0; j < n; j++) out[i][j] += usi * s.V[j][r];
    }
  }
  return out;
}

/**
 * Relative Frobenius error of the rank-k truncation, straight from the spectrum:
 * ‖A − Aₖ‖F / ‖A‖F = √(Σᵢ≥ₖ σᵢ² / Σ σᵢ²). O(n), safe to call on every slider tick.
 */
export function relErrFromS(S: number[], k: number): number {
  let tail = 0,
    total = 0;
  for (let i = 0; i < S.length; i++) {
    const s2 = S[i] * S[i];
    total += s2;
    if (i >= k) tail += s2;
  }
  return total < 1e-24 ? 0 : Math.sqrt(tail / total);
}
