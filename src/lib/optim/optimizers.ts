// Gradient-based optimizers over a shared LossField, each returning the same
// trajectory shape as gradientDescent so OptimizerRace can render them
// identically. Plain SGD is the baseline; RMSprop and Adam adapt the per-
// coordinate step, so they cross a narrow ravine where SGD oscillates. All
// deterministic (the field gradient is closed-form) — no PRNG needed.

import { gradientDescent, type LossField, type Trajectory } from '../dl/surface';
import type { V2 } from '../svm/geometry';

export type { Trajectory };

/** Plain (full-gradient) SGD: w ← w − η ∇L. Identical to fixed-step gradient
 *  descent, so it simply delegates rather than duplicating the loop. */
export function sgd(field: LossField, start: V2, eta: number, steps: number): Trajectory {
  return gradientDescent(field, start, eta, steps);
}

/** RMSprop: v ← β v + (1−β) g²;  w ← w − η g / (√v + ε). */
export function rmsprop(
  field: LossField,
  start: V2,
  eta: number,
  steps: number,
  beta = 0.9,
  eps = 1e-8,
): Trajectory {
  const traj: Trajectory = [];
  let x = start.x;
  let y = start.y;
  let vx = 0;
  let vy = 0;
  traj.push({ x, y, loss: field.f(x, y) });
  for (let i = 0; i < steps; i++) {
    const g = field.grad(x, y);
    vx = beta * vx + (1 - beta) * g.x * g.x;
    vy = beta * vy + (1 - beta) * g.y * g.y;
    x -= (eta / (Math.sqrt(vx) + eps)) * g.x;
    y -= (eta / (Math.sqrt(vy) + eps)) * g.y;
    traj.push({ x, y, loss: field.f(x, y) });
    if (!isFinite(x) || !isFinite(y)) break;
  }
  return traj;
}

/** Adam: m,v exponential moments with bias correction; w ← w − η m̂/(√v̂ + ε). */
export function adam(
  field: LossField,
  start: V2,
  eta: number,
  steps: number,
  b1 = 0.9,
  b2 = 0.999,
  eps = 1e-8,
): Trajectory {
  const traj: Trajectory = [];
  let x = start.x;
  let y = start.y;
  let mx = 0;
  let my = 0;
  let vx = 0;
  let vy = 0;
  traj.push({ x, y, loss: field.f(x, y) });
  for (let i = 1; i <= steps; i++) {
    const g = field.grad(x, y);
    mx = b1 * mx + (1 - b1) * g.x;
    my = b1 * my + (1 - b1) * g.y;
    vx = b2 * vx + (1 - b2) * g.x * g.x;
    vy = b2 * vy + (1 - b2) * g.y * g.y;
    const mhx = mx / (1 - Math.pow(b1, i));
    const mhy = my / (1 - Math.pow(b1, i));
    const vhx = vx / (1 - Math.pow(b2, i));
    const vhy = vy / (1 - Math.pow(b2, i));
    x -= (eta * mhx) / (Math.sqrt(vhx) + eps);
    y -= (eta * mhy) / (Math.sqrt(vhy) + eps);
    traj.push({ x, y, loss: field.f(x, y) });
    if (!isFinite(x) || !isFinite(y)) break;
  }
  return traj;
}
