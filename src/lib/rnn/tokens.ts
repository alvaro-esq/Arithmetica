// Toy, deterministic data for the RNN islands.
//
//  • DEMO_TOKENS + TOKEN_ANGLES: a short Spanish sentence whose tokens are placed
//    at hand-chosen angles in a 2-D "meaning" space, so scaled dot-product attention
//    produces an intuitive pattern (e.g. "saltó" aligns with its subject "gato" and
//    object "barda"). The angles are the only thing tuned; the attention math is real.
//  • spikeSeq: a seeded 1-D input sequence with a single early spike, used by the
//    hidden-state island to show memory persisting (or not) across timesteps.

import { mulberry32 } from '../svm/prng';
import { angleVec, type Vec } from './attention';

export const DEMO_TOKENS = ['El', 'gato', 'saltó', 'la', 'barda'] as const;

// One angle (degrees) per token, placed in a 2-D "meaning" space. The verb sits
// between its subject and object so it attends to both; the two articles cluster
// together. Tuned (with a small temperature) so self-attention reads naturally:
// "saltó" → gato + barda, "barda" → saltó. The angles are the only thing tuned;
// the QKᵀ→softmax→αV math is real.
export const TOKEN_ANGLES = [-40, 35, 60, -20, 95];

/** Default temperature (the √d_k scale) at which the demo pattern is most legible. */
export const DEMO_SCALE = 0.35;

/** Q = K vectors for self-attention over DEMO_TOKENS (built from the angles). */
export function tokenVectors(): Vec[] {
  return TOKEN_ANGLES.map((a) => angleVec(a));
}

/**
 * Value vectors: each token carries a distinct 2-D "payload" so the context
 * output αV visibly shifts toward whichever tokens a query attends to. Spread
 * around the circle at 1.4× length so the weighted sum is easy to read.
 */
export function tokenValues(): Vec[] {
  return TOKEN_ANGLES.map((a) => {
    const v = angleVec(a);
    return [v[0] * 1.4, v[1] * 1.4];
  });
}

/**
 * A length-n input sequence that is ~0 everywhere except a spike of height `peak`
 * at index `spikeAt`, with a little seeded noise so it doesn't look synthetic.
 * The spike is the "event" the hidden state should remember.
 */
export function spikeSeq(n: number, spikeAt: number, seed: number, peak = 1): number[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const noise = (rng() - 0.5) * 0.12;
    return (i === spikeAt ? peak : 0) + noise;
  });
}
