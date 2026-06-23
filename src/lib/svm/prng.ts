// Deterministic pseudo-random generators.
// Math.random() / Date.now() may be restricted in the build environment, so all
// randomness in the SVM visualizations flows through a seeded PRNG. Same seed in,
// same dataset out — visualizations are reproducible across reloads.

export type Rng = () => number;

/** mulberry32: fast, seeded, good-enough 32-bit PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller transform: turns a uniform Rng into a Gaussian sampler. */
export function makeGaussian(rng: Rng): (mean?: number, sd?: number) => number {
  return (mean = 0, sd = 1) => {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}
