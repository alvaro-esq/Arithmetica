// "Modelo de lenguaje" de juguete: árboles de continuación autorados a mano con
// logits, más softmax con temperature y sampling seedeado. Cero red neuronal —
// la pedagogía está en VER la distribución de siguientes tokens y cómo cada
// elección abre un camino distinto. Los subárboles se comparten (es un DAG).

export interface Choice {
  token: string;
  logit: number;
}

export interface GenNode extends Choice {
  children?: GenNode[];
}

export interface Scenario {
  id: string;
  label: string;
  prompt: string;
  root: GenNode[];
}

function n(token: string, logit: number, children?: GenNode[]): GenNode {
  return { token, logit, children };
}

// --- Escenario 1: ventas por región ----------------------------------------
const ending = [n('anterior.', 2.0), n('pasado.', 0.7)];
const period = [
  n('al mes', 1.6, ending),
  n('al trimestre', 0.9, ending),
  n('a la meta', 0.5, [n('mensual.', 1.5), n('del año.', 0.6)]),
];
const compare = [
  n('frente', 1.5, period),
  n('respecto', 1.0, period),
  n('comparado', 0.4, [
    n('con', 2.0, [
      n('el mes', 1.5, ending),
      n('la meta', 0.6, [n('mensual.', 1.5), n('anual.', 0.5)]),
    ]),
  ]),
];
const pct = [
  n('12%', 1.4, compare),
  n('8%', 1.0, compare),
  n('5%', 0.6, compare),
  n('20%', 0.1, compare),
];
const amount = [n('un', 1.6, pct), n('casi un', 0.6, pct), n('apenas un', 0.25, pct)];
const flat = [
  n('estables', 1.5, [
    n('durante', 1.4, [n('el trimestre.', 1.5), n('todo el año.', 0.5)]),
    n('sin cambios.', 0.6),
  ]),
  n('sin variación.', 0.5),
];
const verb = [
  n('crecieron', 1.6, amount),
  n('cayeron', 1.1, amount),
  n('se mantuvieron', 0.45, flat),
];
const regionRoot = [
  n('norte', 1.9, verb),
  n('central', 1.3, verb),
  n('sur', 0.7, verb),
  n('occidente', 0.15, verb),
];

// --- Escenario 2: el dashboard ----------------------------------------------
const whereRegion = [n('sur.', 1.5), n('norte.', 0.8), n('central.', 0.5)];
const whereChannel = [n('online.', 1.4), n('físico.', 0.9), n('mayorista.', 0.3)];
const inWhat = [
  n('de la región', 1.4, whereRegion),
  n('del canal', 0.9, whereChannel),
  n('del producto', 0.4, [n('estrella.', 1.3), n('nuevo.', 0.7)]),
];
const metric = [
  n('las ventas', 1.6, inWhat),
  n('el margen', 1.0, inWhat),
  n('los pedidos', 0.4, inWhat),
];
const dashRoot = [
  n('una caída', 1.4, [n('en', 2.0, metric)]),
  n('un crecimiento', 1.2, [n('en', 2.0, metric)]),
  n('un cambio', 0.5, [
    n('de tendencia', 1.5, [n('en', 2.0, metric)]),
    n('de mezcla', 0.6, [n('de productos.', 1.5), n('de canales.', 0.7)]),
  ]),
  n('resultados', 0.3, [
    n('mixtos', 1.5, [n('entre regiones.', 1.4), n('por canal.', 0.7)]),
    n('estables', 0.4, [n('en', 1.5, [n('todas las regiones.', 1.5), n('los tres canales.', 0.6)])]),
  ]),
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'region',
    label: 'Ventas por región',
    prompt: 'Las ventas de la región',
    root: regionRoot,
  },
  {
    id: 'dashboard',
    label: 'El dashboard',
    prompt: 'El dashboard de este mes muestra',
    root: dashRoot,
  },
];

/** Candidatos que ve el modelo tras elegir los tokens en `path` (índices). */
export function optionsAt(s: Scenario, path: number[]): Choice[] {
  let level: GenNode[] | undefined = s.root;
  for (const idx of path) {
    if (!level || !level[idx]) return [];
    level = level[idx].children;
  }
  return (level ?? []).map(({ token, logit }) => ({ token, logit }));
}

/** Distribución de 5 candidatos para el laboratorio de temperature. */
export const TEMP_DEMO: Choice[] = [
  { token: 'claro', logit: 2.2 },
  { token: 'breve', logit: 1.6 },
  { token: 'visual', logit: 1.0 },
  { token: 'detallado', logit: 0.6 },
  { token: 'creativo', logit: 0.1 },
];
export const TEMP_DEMO_PROMPT = 'El resumen ejecutivo debe ser…';

/** softmax con temperature; T se acota a ≥0.05 para evitar overflow. */
export function softmaxT(logits: number[], T: number): number[] {
  const t = Math.max(T, 0.05);
  const mx = Math.max(...logits);
  const exps = logits.map((l) => Math.exp((l - mx) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function greedyIndex(probs: number[]): number {
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  return best;
}

/** Muestrea un índice según `probs` usando un rng seedeado (mulberry32). */
export function sampleIndex(probs: number[], rng: () => number): number {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r < acc) return i;
  }
  return probs.length - 1;
}
