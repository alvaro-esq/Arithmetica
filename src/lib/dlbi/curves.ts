// Curvas de entrenamiento/validación sintéticas para la lección de BI. Son
// curvas "características" de forma cerrada — no proviene ninguna de entrenar
// una red real. La razón: la lección enseña a LEER curvas (brecha, divergencia,
// early stopping), y la forma cerrada garantiza por construcción cada afirmación
// pedagógica ("con alta capacidad y sin regularización, la validación se
// despega"), además de ser exactamente reproducible y de costo cero en runtime.

import { mulberry32 } from '../svm/prng';

export type Capacity = 'baja' | 'media' | 'alta';

export interface CurveOpts {
  capacity: Capacity;
  /** Intensidad de regularización, 0 (nada) a 1 (fuerte). */
  reg: number;
  epochs: number;
  seed?: number;
}

export interface CurvePoint {
  epoch: number;
  train: number;
  val: number;
}

/** Amplitud del ruido acotado que se suma SOLO a la curva de validación. */
export const NOISE_AMP = 0.01;

// Perfil por capacidad: piso de entrenamiento (qué tan bajo puede llegar),
// velocidad de descenso τ y fuerza de la divergencia por sobreajuste γ.
const PROFILES: Record<Capacity, { floor: number; tau: number; gamma: number }> = {
  baja: { floor: 0.55, tau: 18, gamma: 0 },
  media: { floor: 0.3, tau: 14, gamma: 0.04 },
  alta: { floor: 0.08, tau: 10, gamma: 0.1 },
};

const L0 = 1.0; // pérdida inicial (época 0)

/**
 * train(e) decae exponencialmente hacia un piso (más alto si hay regularización);
 * val(e) decae hacia un piso levemente mayor y, pasada la época e0, diverge con
 * γ·(e−e0)^1.3/epochs escalado por (1−reg), más un ruido acotado y seeded.
 */
export function trainingCurves(o: CurveOpts): CurvePoint[] {
  const prof = PROFILES[o.capacity];
  const rng = mulberry32(o.seed ?? 7);
  const floorTrain = prof.floor + 0.06 * o.reg;
  const floorVal = floorTrain + 0.04;
  const gamma = prof.gamma * (1 - o.reg);
  const e0 = o.epochs * 0.35;
  const out: CurvePoint[] = [];
  for (let e = 0; e < o.epochs; e++) {
    const train = floorTrain + (L0 - floorTrain) * Math.exp(-e / prof.tau);
    const base = floorVal + (L0 - floorVal) * Math.exp(-e / (prof.tau * 1.25));
    const diverge = (gamma * Math.pow(Math.max(0, e - e0), 1.3)) / o.epochs;
    const noise = (rng() * 2 - 1) * NOISE_AMP;
    out.push({ epoch: e, train, val: base + diverge + noise });
  }
  return out;
}

/** Época de early stopping: el primer mínimo de la pérdida de validación. */
export function earlyStopEpoch(c: CurvePoint[]): number {
  let best = 0;
  for (let i = 1; i < c.length; i++) if (c[i].val < c[best].val) best = i;
  return best;
}

/** Cuánto se despegó la validación de su mejor punto: val(final) − min(val). */
export function overfitGap(c: CurvePoint[]): number {
  return c[c.length - 1].val - c[earlyStopEpoch(c)].val;
}
