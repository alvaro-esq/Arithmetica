// A 2-D loss surface for the gradient-descent island. It is a gentle convex bowl
// plus a Gaussian well offset from the origin, giving a single clear minimum but
// curvature that varies with direction — so the learning rate genuinely matters:
// too small crawls and stalls, too large overshoots and diverges. The gradient
// is closed-form (no autodiff, no randomness), so the trajectory is deterministic
// and SSR-safe.

export interface LossField {
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => { x: number; y: number };
}

/** A descent path: the point and loss at each step, including the start. */
export type Trajectory = { x: number; y: number; loss: number }[];

// Well parameters: centered at (wx, wy), depth `amp`, width `s²`.
const wx = 1.0;
const wy = 0.6;
const amp = 0.9;
const s2 = 0.6;

export const lossField: LossField = {
  f(x, y) {
    const bowl = 0.5 * (0.6 * x * x + y * y);
    const well = -amp * Math.exp(-((x - wx) ** 2 + (y - wy) ** 2) / s2);
    return bowl + well;
  },
  grad(x, y) {
    const e = Math.exp(-((x - wx) ** 2 + (y - wy) ** 2) / s2);
    // d/dx of the well: -amp * e * (-(2(x-wx)/s2)) = amp * e * 2(x-wx)/s2
    const gx = 0.6 * x + amp * e * (2 * (x - wx)) / s2;
    const gy = y + amp * e * (2 * (y - wy)) / s2;
    return { x: gx, y: gy };
  },
};

/**
 * A "ravine": a strongly anisotropic bowl, gentle along x and steep along y, with
 * its minimum at the origin. A single learning rate must be small enough for the
 * steep y-direction, so plain SGD crawls along x while bouncing across y —
 * exactly where per-coordinate adaptive methods (RMSprop, Adam) win. Used by the
 * OptimizerRace island; lossField above is left unchanged for GradientDescent.
 */
export const ravineField: LossField = {
  f(x, y) {
    return 0.06 * x * x + 1.3 * y * y;
  },
  grad(x, y) {
    return { x: 0.12 * x, y: 2.6 * y };
  },
};

/**
 * Fixed-step gradient descent from `start`: p ← p − η·∇f(p), `steps` iterations.
 * Returns the full trajectory including the start point and the loss at each step.
 * Divergence (η too large) is left to blow up so the caller can detect and warn.
 */
export function gradientDescent(
  field: LossField,
  start: { x: number; y: number },
  eta: number,
  steps: number,
): Trajectory {
  const traj: Trajectory = [];
  let x = start.x;
  let y = start.y;
  traj.push({ x, y, loss: field.f(x, y) });
  for (let i = 0; i < steps; i++) {
    const g = field.grad(x, y);
    x -= eta * g.x;
    y -= eta * g.y;
    traj.push({ x, y, loss: field.f(x, y) });
    if (!isFinite(x) || !isFinite(y)) break;
  }
  return traj;
}
