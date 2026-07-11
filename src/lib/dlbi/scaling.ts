// Por qué normalizar las variables antes de entrenar: una pérdida cuadrática
// L(w) = ½(a·w1² + b·w2²) con coeficientes dispares (datos "crudos": ingresos en
// quetzales vs edad en años) produce un valle alargado donde el descenso de
// gradiente zigzaguea, y diverge si la tasa supera 2/b. Con datos normalizados
// (a = b) el valle es redondo y el mismo descenso va directo al mínimo.

export interface QuadLoss {
  a: number;
  b: number;
}

/** Escalas dispares: la segunda variable (la de gran escala, p. ej. ingresos)
 * "pesa" 25 veces más en la curvatura — la curvatura crece con Σx². */
export const RAW: QuadLoss = { a: 1, b: 25 };
/** Tras normalizar, ambas variables comparten curvatura. */
export const NORM: QuadLoss = { a: 1, b: 1 };

export function lossAt(loss: QuadLoss, w: { x: number; y: number }): number {
  return 0.5 * (loss.a * w.x * w.x + loss.b * w.y * w.y);
}

/**
 * Descenso de gradiente con paso fijo. El gradiente es (a·w1, b·w2), así que
 * cada coordenada evoluciona como w ← w·(1 − lr·coef): converge si |1−lr·coef|<1.
 */
export function gdPath(loss: QuadLoss, start: { x: number; y: number }, lr: number, steps: number): { x: number; y: number }[] {
  const out = [{ ...start }];
  let { x, y } = start;
  for (let i = 0; i < steps; i++) {
    x *= 1 - lr * loss.a;
    y *= 1 - lr * loss.b;
    out.push({ x, y });
  }
  return out;
}

/** Primer paso en el que la pérdida cae bajo tol; Infinity si nunca ocurre. */
export function stepsToConverge(loss: QuadLoss, start: { x: number; y: number }, lr: number, tol: number, maxSteps = 500): number {
  const path = gdPath(loss, start, lr, maxSteps);
  for (let i = 0; i < path.length; i++) {
    if (lossAt(loss, path[i]) < tol) return i;
  }
  return Infinity;
}

/** Semiejes de la curva de nivel L(w) = level: ½·a·rx² = level (ídem ry con b). */
export function contourRadii(loss: QuadLoss, level: number): { rx: number; ry: number } {
  return { rx: Math.sqrt((2 * level) / loss.a), ry: Math.sqrt((2 * level) / loss.b) };
}
