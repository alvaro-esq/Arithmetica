// Activation functions for the regularization/optimization lesson. sigmoid lives
// in lib/dl (single source of truth) and is re-exported here; tanh/ReLU/LeakyReLU
// and their derivatives are added, plus an ACTIVATIONS registry the
// ActivationExplorer island iterates over (label, f, f', plotting band).

import { sigmoid, sigmoidPrime } from '../dl/activations';
export { sigmoid, sigmoidPrime };

export type ActKind = 'sigmoid' | 'tanh' | 'relu' | 'leakyRelu';
export const LEAKY_ALPHA = 0.1;

export function tanh(z: number): number {
  return Math.tanh(z);
}
export function tanhPrime(z: number): number {
  const t = Math.tanh(z);
  return 1 - t * t;
}
export function relu(z: number): number {
  return z > 0 ? z : 0;
}
export function reluPrime(z: number): number {
  return z > 0 ? 1 : 0;
}
export function leakyRelu(z: number, a = LEAKY_ALPHA): number {
  return z >= 0 ? z : a * z;
}
export function leakyReluPrime(z: number, a = LEAKY_ALPHA): number {
  return z >= 0 ? 1 : a;
}

export interface ActSpec {
  label: string;
  f: (z: number) => number;
  df: (z: number) => number;
  yMin: number;
  yMax: number;
  note: string; // one-line behavior note for the UI
}

export const ACTIVATIONS: Record<ActKind, ActSpec> = {
  sigmoid: {
    label: 'Sigmoid',
    f: sigmoid,
    df: sigmoidPrime,
    yMin: -0.1,
    yMax: 1.1,
    note: 'Satura en ambos extremos → gradiente desvaneciente.',
  },
  tanh: {
    label: 'Tanh',
    f: tanh,
    df: tanhPrime,
    yMin: -1.1,
    yMax: 1.1,
    note: 'Centrada en 0, pero también satura en los extremos.',
  },
  relu: {
    label: 'ReLU',
    f: relu,
    df: reluPrime,
    yMin: -0.5,
    yMax: 6,
    note: 'No satura para z > 0; riesgo de "neuronas muertas" en z < 0.',
  },
  leakyRelu: {
    label: 'Leaky ReLU',
    f: (z) => leakyRelu(z),
    df: (z) => leakyReluPrime(z),
    yMin: -1,
    yMax: 6,
    note: 'Pendiente pequeña en z < 0 evita las neuronas muertas.',
  },
};
