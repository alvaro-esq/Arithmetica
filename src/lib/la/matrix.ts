// Small dense-matrix kernel over number[][] (row-major). Used by the SVD,
// Markov/PageRank and verification code of the linear-algebra course. The 2×2
// fast path lives in mat2.ts; this file is for the general small-n case.

export function matVec(M: number[][], v: number[]): number[] {
  return M.map((row) => row.reduce((acc, mij, j) => acc + mij * v[j], 0));
}

export function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const p = B[0].length;
  const m = B.length;
  const C: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(p).fill(0);
    for (let k = 0; k < m; k++) {
      const aik = A[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < p; j++) row[j] += aik * B[k][j];
    }
    C.push(row);
  }
  return C;
}

export function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

export function matSub(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((aij, j) => aij - B[i][j]));
}

export function vnorm(v: number[]): number {
  return Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
}

export function frobenius(A: number[][]): number {
  let s = 0;
  for (const row of A) for (const x of row) s += x * x;
  return Math.sqrt(s);
}
