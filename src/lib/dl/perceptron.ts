// Logic-gate datasets and perceptron decisions for the PerceptronBoundary island.
// The four gates live on the unit square corners (x1,x2 ∈ {0,1}); AND/OR/NAND are
// linearly separable (one line reaches 100%), while XOR is not — no line beats
// 75%. That ceiling is the whole point: it motivates the hidden layer.

import { mulberry32, makeGaussian } from '../svm/prng';
import { step } from './activations';
import type { V2 } from '../svm/geometry';

export type Gate = 'AND' | 'OR' | 'NAND' | 'XOR';

export interface GatePoint {
  x: number;
  y: number;
  label: 0 | 1;
}

/** Domain framing the unit square with a little margin. */
export const gateDomain = { xMin: -0.5, xMax: 1.5, yMin: -0.5, yMax: 1.5 };

const CORNERS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

function gateOutput(gate: Gate, a: number, b: number): 0 | 1 {
  const x = a > 0.5 ? 1 : 0;
  const y = b > 0.5 ? 1 : 0;
  switch (gate) {
    case 'AND':
      return (x && y) as 0 | 1;
    case 'OR':
      return (x || y) as 0 | 1;
    case 'NAND':
      return (x && y ? 0 : 1) as 0 | 1;
    case 'XOR':
      return (x ^ y) as 0 | 1;
  }
}

/** The four exact corner points labeled by the gate's truth table. */
export function gateTruth(gate: Gate): GatePoint[] {
  return CORNERS.map(([x, y]) => ({ x, y, label: gateOutput(gate, x, y) }));
}

/**
 * A light seeded jitter cloud around each corner, so the boundary feels earned
 * rather than threading four lone dots. Each cloud point keeps its corner's label.
 */
export function gatePoints(gate: Gate, seed = 21, perCorner = 5): GatePoint[] {
  const g = makeGaussian(mulberry32(seed));
  const out: GatePoint[] = [];
  for (const [cx, cy] of CORNERS) {
    const label = gateOutput(gate, cx, cy);
    for (let i = 0; i < perCorner; i++) {
      out.push({ x: cx + g(0, 0.07), y: cy + g(0, 0.07), label });
    }
  }
  return out;
}

/**
 * Separating weights for each gate. AND/OR/NAND have an exact line (100%); XOR
 * returns a best-effort line that cannot exceed 75%.
 */
export function perceptronPreset(gate: Gate): { w1: number; w2: number; b: number } {
  switch (gate) {
    case 'AND':
      return { w1: 1, w2: 1, b: -1.5 };
    case 'OR':
      return { w1: 1, w2: 1, b: -0.5 };
    case 'NAND':
      return { w1: -1, w2: -1, b: 1.5 };
    case 'XOR':
      // No line separates XOR; this one gets 3/4 corners right at best.
      return { w1: 1, w2: 1, b: -0.5 };
  }
}

/** Perceptron prediction: step(w·x + b). */
export function perceptronPredict(p: { x: number; y: number }, w: V2, b: number): 0 | 1 {
  return step(w.x * p.x + w.y * p.y + b);
}

/** Fraction of points classified correctly by (w, b). */
export function perceptronAccuracy(pts: GatePoint[], w: V2, b: number): number {
  if (pts.length === 0) return 0;
  let correct = 0;
  for (const p of pts) if (perceptronPredict(p, w, b) === p.label) correct++;
  return correct / pts.length;
}
