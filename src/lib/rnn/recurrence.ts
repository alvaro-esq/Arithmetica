// The dynamical core of a (scalar) recurrent unit. Everything here is closed-form
// and deterministic — no PRNG, no autodiff — so the islands stay SSR-safe and the
// trajectory is reproducible. tanh is the standard RNN activation; sigmoid drives
// the output head. We reuse the single-source-of-truth versions from earlier lessons.

import { tanh, tanhPrime } from '../optim/activations';
import { sigmoid } from '../dl/activations';
export { tanh, tanhPrime, sigmoid };

export interface RnnParams {
  /** recurrent weight: how much of h_{t-1} carries forward (the "memory") */
  Whh: number;
  /** input weight: how strongly x_t enters the state */
  Wxh: number;
  /** hidden bias */
  bh: number;
}

/**
 * Roll a scalar RNN over an input sequence: h_t = tanh(Whh·h_{t-1} + Wxh·x_t + bh),
 * starting from h_0 = 0. Returns the hidden states h_0..h_T (length n+1) and the
 * pre-activations pre_1..pre_T (length n) — the latter feed the gradient flow.
 */
export function runRNN(seq: number[], p: RnnParams): { h: number[]; pre: number[] } {
  const h: number[] = [0];
  const pre: number[] = [];
  let prev = 0;
  for (const x of seq) {
    const z = p.Whh * prev + p.Wxh * x + p.bh;
    pre.push(z);
    prev = tanh(z);
    h.push(prev);
  }
  return { h, pre };
}

/**
 * The chain-rule product that BPTT must traverse:
 *   ∂h_T/∂h_k = ∏_{t=k+1}^{T} Whh·tanh'(pre_t).
 * Returns the magnitude |∂h_T/∂h_k| for every k from 0 (oldest) to T-1, so the
 * leftmost bar is the gradient that reaches the very first timestep.
 *
 * `saturating=true` uses the true factor Whh·tanh'(·) (tanh' ≤ 1 ⇒ vanishing for
 * |Whh| not too large). `saturating=false` linearizes (factor = Whh), exposing the
 * pure |Whh|>1 explosion the saturating regime would otherwise damp.
 */
export function gradFlow(pre: number[], Whh: number, saturating: boolean): number[] {
  const factors = pre.map((z) => (saturating ? Whh * tanhPrime(z) : Whh));
  const mags: number[] = [];
  let prod = 1;
  // walk backward from the last factor, accumulating the product
  for (let k = factors.length - 1; k >= 0; k--) {
    prod *= factors[k];
    mags.unshift(Math.abs(prod));
  }
  return mags;
}

/** Output head y_t = σ(Why·h_t + by), applied to every hidden state h_1..h_T. */
export function outputRNN(h: number[], Why: number, by: number): number[] {
  // h[0] is the initial zero state; outputs correspond to the actual timesteps.
  return h.slice(1).map((ht) => sigmoid(Why * ht + by));
}
