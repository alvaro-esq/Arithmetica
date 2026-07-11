// Dataset educativo de churn ya "scoreado" por un modelo, más las métricas de
// negocio para decidir el umbral. Los clientes que abandonan tienden a puntajes
// altos y los que se quedan a puntajes bajos, con traslape deliberado: ningún
// umbral es perfecto, y elegirlo es una decisión de costos, no de matemáticas.

import { mulberry32, makeGaussian } from '../svm/prng';
import { confusion as tally, precision, recall, type CM } from '../anomaly/metrics';

export interface ScoredCustomer {
  /** Puntaje de churn que asignó el modelo, en [0.01, 0.99]. */
  score: number;
  /** Lo que realmente ocurrió: true si el cliente abandonó. */
  churned: boolean;
}

const clamp01 = (v: number) => Math.min(0.99, Math.max(0.01, v));

/** ~25% de churners con score ~N(0.68, 0.13); retenidos ~N(0.34, 0.14). */
export function churnDataset(seed: number, n = 120): ScoredCustomer[] {
  const gauss = makeGaussian(mulberry32(seed));
  const churners = Math.round(n * 0.25);
  const out: ScoredCustomer[] = [];
  for (let i = 0; i < n; i++) {
    const churned = i < churners;
    const score = clamp01(churned ? gauss(0.68, 0.13) : gauss(0.34, 0.14));
    out.push({ score, churned });
  }
  return out;
}

// tp: predicho churn y abandonó · fp: oferta desperdiciada ·
// tn: predicho retenido y se quedó · fn: cliente perdido.
export type Confusion = CM;

/** Predicción positiva (churn) cuando score ≥ threshold. Reutiliza el tally de
 * lib/anomaly/metrics vía un adaptador churned → etiqueta 0/1. */
export function confusion(data: ScoredCustomer[], threshold: number): Confusion {
  return tally(
    data.map((c) => ({ score: c.score, y: c.churned ? 1 : 0 })),
    threshold,
  );
}

/** Precision/recall (convención de lib/anomaly: denominador 0 → 0) + accuracy.
 * La UI muestra "—" cuando no hay predicciones positivas que evaluar. */
export function metrics(cm: Confusion): { precision: number; recall: number; accuracy: number } {
  const n = cm.tp + cm.fp + cm.tn + cm.fn;
  return {
    precision: precision(cm),
    recall: recall(cm),
    accuracy: n === 0 ? 1 : (cm.tp + cm.tn) / n,
  };
}

/**
 * Costo total de operar el modelo con un umbral dado: a cada cliente predicho
 * como churn se le da la oferta de retención (tp+fp)·costOffer, y cada churner
 * no detectado se pierde: fn·costLoss.
 */
export function businessCost(cm: Confusion, costOffer: number, costLoss: number): number {
  return (cm.tp + cm.fp) * costOffer + cm.fn * costLoss;
}

/** Umbral de menor costo, explorando una grilla uniforme de `grid` puntos. */
export function bestThreshold(data: ScoredCustomer[], costOffer: number, costLoss: number, grid = 101): number {
  let best = 0;
  let bestCost = Infinity;
  for (let i = 0; i < grid; i++) {
    const t = i / (grid - 1);
    const cost = businessCost(confusion(data, t), costOffer, costLoss);
    if (cost < bestCost) {
      bestCost = cost;
      best = t;
    }
  }
  return best;
}
