// Activation functions for the Deep Learning lesson. The perceptron's hard step
// is what the sigmoid smooths out — keeping both here lets the SigmoidNeuron
// island overlay them and make differentiability literal.

/** Logistic sigmoid σ(z) = 1/(1+e^{-z}), evaluated stably for large |z|. */
export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** σ'(z) = σ(z)(1 − σ(z)). Peaks at 0.25 (z=0), vanishes in the tails. */
export function sigmoidPrime(z: number): number {
  const s = sigmoid(z);
  return s * (1 - s);
}

/** Heaviside step (perceptron activation): 1 when z > 0, else 0. */
export function step(z: number): 0 | 1 {
  return z > 0 ? 1 : 0;
}

/** Sample f across [a, b] at n points — for drawing a curve as an SVG polyline. */
export function samplePath(a: number, b: number, n: number, f: (x: number) => number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = a + ((b - a) * i) / (n - 1);
    out.push({ x, y: f(x) });
  }
  return out;
}
