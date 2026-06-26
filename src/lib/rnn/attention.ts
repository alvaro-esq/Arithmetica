// Scaled dot-product attention, computed exactly as in the deck:
//   scores = QKᵀ/√d_k,  α = softmax(scores) per row,  out = αV.
// Pure and deterministic — the queries/keys are small fixed vectors the island
// builds from angles, so the alignment Q·K = ‖Q‖‖K‖cos θ is visible and intuitive.

export type Vec = number[];

export function dot(a: Vec, b: Vec): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Numerically stable softmax: subtract the max before exponentiating. */
export function softmax(v: number[]): number[] {
  const m = Math.max(...v);
  const e = v.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

export interface AttentionResult {
  /** raw similarities QKᵀ/√d_k, one row per query */
  scores: number[][];
  /** attention weights softmax(scores), each row non-negative and summing to 1 */
  alpha: number[][];
  /** context vectors αV, one per query */
  out: Vec[];
}

/**
 * Q: [nq][dk], K: [nk][dk], V: [nk][dv]. Returns scores, weights and the weighted
 * combination of values. `scale` divides the scores (defaults to √d_k); the island
 * exposes it as a "temperature" so a smaller scale sharpens the focus and a larger
 * one flattens it.
 */
export function attention(Q: Vec[], K: Vec[], V: Vec[], scale = Math.sqrt(Q[0]?.length ?? 1)): AttentionResult {
  const scores = Q.map((q) => K.map((k) => dot(q, k) / scale));
  const alpha = scores.map(softmax);
  const dv = V[0].length;
  const out = alpha.map((a) => {
    const o = new Array(dv).fill(0);
    for (let n = 0; n < a.length; n++) for (let j = 0; j < dv; j++) o[j] += a[n] * V[n][j];
    return o;
  });
  return { scores, alpha, out };
}

/** Unit 2-D vector at `deg` degrees — a readable way to place Q/K so alignment is visible. */
export function angleVec(deg: number): Vec {
  const r = (deg * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r)];
}
