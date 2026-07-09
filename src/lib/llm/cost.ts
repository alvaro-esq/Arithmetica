// Precios EDUCATIVOS (redondeados, no reales — los reales cambian cada pocos
// meses) y aritmética de costos por token. La lección insiste: el costo depende
// del diseño de la solución, no solo del modelo.

export interface ModelPrice {
  id: string;
  label: string;
  /** USD por millón de tokens de entrada */
  inPerM: number;
  /** USD por millón de tokens de salida */
  outPerM: number;
  /** para qué tareas conviene */
  hint: string;
}

export const PRICES: ModelPrice[] = [
  {
    id: 'economico',
    label: 'Económico',
    inPerM: 0.15,
    outPerM: 0.6,
    hint: 'Clasificar, extraer, tareas simples en volumen',
  },
  {
    id: 'estandar',
    label: 'Estándar',
    inPerM: 1.0,
    outPerM: 4.0,
    hint: 'Resúmenes ejecutivos, análisis con contexto',
  },
  {
    id: 'premium',
    label: 'Premium',
    inPerM: 5.0,
    outPerM: 20.0,
    hint: 'Razonamiento complejo, documentos difíciles',
  },
];

export interface Usage {
  inTokens: number;
  outTokens: number;
  callsPerDay: number;
  days: number;
}

export interface CostBreakdown {
  /** costo de una sola llamada */
  perCall: number;
  /** componente de entrada del total */
  inCost: number;
  /** componente de salida del total */
  outCost: number;
  total: number;
}

export function costUSD(u: Usage, p: ModelPrice): CostBreakdown {
  const calls = u.callsPerDay * u.days;
  const inCost = (u.inTokens * calls * p.inPerM) / 1_000_000;
  const outCost = (u.outTokens * calls * p.outPerM) / 1_000_000;
  const perCall = (u.inTokens * p.inPerM + u.outTokens * p.outPerM) / 1_000_000;
  return { perCall, inCost, outCost, total: inCost + outCost };
}

/** "USD 12.40" — nunca usamos "$" en prosa MDX porque activa remark-math. */
export function fmtUSD(x: number): string {
  if (x > 0 && x < 0.01) {
    return 'USD ' + x.toFixed(4);
  }
  return (
    'USD ' +
    x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}
