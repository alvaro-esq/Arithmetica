// Toy datasets for the anomaly-detection lesson. Deterministic per seed (see
// ../svm/prng) so every visualization is reproducible across reloads and the
// build/SSR environment, where Math.random()/Date.now() may be unavailable.

import { mulberry32, makeGaussian } from '../svm/prng';

export interface Pt {
  x: number;
  y: number;
}

/** A 1-D anomaly score with its true label (1 = anomaly, 0 = normal). */
export interface Scored {
  score: number;
  y: 0 | 1;
}

/**
 * Score samples for the threshold tuner: two overlapping 1-D Gaussians on [0,1].
 * The "normal" class clusters at low scores, the rare "anomaly" class at high
 * scores, with deliberate overlap so the precision/recall trade-off is real.
 * Extreme imbalance (nNormal ≫ nAnom) mirrors real anomaly detection.
 */
export function scoreSamples(seed = 11, nNormal = 55, nAnom = 7): Scored[] {
  const g = makeGaussian(mulberry32(seed));
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const out: Scored[] = [];
  for (let i = 0; i < nNormal; i++) out.push({ score: clamp01(g(0.38, 0.13)), y: 0 });
  for (let i = 0; i < nAnom; i++) out.push({ score: clamp01(g(0.72, 0.12)), y: 1 });
  return out;
}

/**
 * LOF scene: P (index 0, the draggable point) starts just outside a dense
 * cluster, followed by that dense cluster and a looser scattering. Dragging P
 * into the cluster drives its LOF toward 1; dragging it into empty space pushes
 * LOF above 1.
 */
export function lofScene(seed = 7): Pt[] {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const pts: Pt[] = [{ x: 3.4, y: 2.6 }]; // P — starts in a sparse region
  // one dense, well-separated cluster near the origin (indices 1..18). Tight sd
  // keeps every interior point's LOF near 1 so P clearly stands out as the anomaly.
  for (let i = 0; i < 18; i++) pts.push({ x: g(0, 0.55), y: g(0, 0.55) });
  return pts;
}

/**
 * Isolation-Forest scene: one dense cluster plus a single planted outlier far
 * from the bulk. The outlier needs far fewer random axis-aligned splits to be
 * isolated than any cluster point.
 */
export function iforestScene(seed = 3): Pt[] {
  const rng = mulberry32(seed);
  const g = makeGaussian(rng);
  const pts: Pt[] = [];
  for (let i = 0; i < 24; i++) pts.push({ x: g(0, 0.8), y: g(0, 0.8) });
  pts.push({ x: 4.3, y: 3.6 }); // planted outlier — last index
  return pts;
}
