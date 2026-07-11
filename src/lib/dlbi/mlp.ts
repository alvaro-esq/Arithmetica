// Un MLP 2→3→1 fijo, con pesos elegidos a mano, para el explorador de forward
// propagation del curso de Deep Learning para BI. No se entrena: los pesos son
// educativos y están escogidos para que el puntaje de churn sea creíble —
// monótono creciente en "quejas", monótono decreciente en "antigüedad" — y la
// salida recorra aproximadamente 0.05–0.97 sobre el cuadrado de entrada.

import { sigmoid } from '../dl/activations';
import { relu } from '../optim/activations';
export { relu };

export interface MlpParams {
  /** Pesos de la capa oculta: W1[j] = [w_antigüedad, w_quejas] de la neurona j. */
  W1: number[][];
  b1: number[];
  /** Pesos de la capa de salida (todos positivos: preservan la monotonía). */
  W2: number[];
  b2: number;
}

export interface ForwardTrace {
  /** Preactivaciones ocultas z1 = W1·x + b1. */
  z1: number[];
  /** Activaciones ocultas a1 = ReLU(z1). */
  a1: number[];
  /** Preactivación de salida z2 = W2·a1 + b2. */
  z2: number;
  /** Probabilidad de churn: sigmoide(z2) ∈ (0, 1). */
  out: number;
}

/** Forward pass completo, devolviendo cada capa para poder visualizar el flujo. */
export function forward(p: MlpParams, x: [number, number]): ForwardTrace {
  const z1 = p.W1.map((row, j) => row[0] * x[0] + row[1] * x[1] + p.b1[j]);
  const a1 = z1.map(relu);
  const z2 = a1.reduce((s, a, j) => s + p.W2[j] * a, p.b2);
  return { z1, a1, z2, out: sigmoid(z2) };
}

// Cada neurona oculta pesa la antigüedad en negativo y las quejas en positivo,
// y W2 es positivo: la composición ReLU + suma positiva garantiza que el score
// nunca baja al aumentar quejas ni sube al aumentar antigüedad.
export const churnMlp: MlpParams = {
  W1: [
    [-2.0, 3.5], // riesgo general: quejas pesan más que la lealtad
    [-3.0, 1.0], // lealtad: se apaga con clientes antiguos
    [-0.5, 4.0], // quejas graves: solo se activa con muchas quejas
  ],
  b1: [0.5, 1.6, -1.0],
  W2: [0.7, 0.5, 0.6],
  b2: -2.6,
};

export const inputLabels = ['Antigüedad', 'Quejas'];
export const hiddenHints = ['riesgo general', 'cliente nuevo', 'quejas graves'];
export const outputLabel = 'P(abandono)';
