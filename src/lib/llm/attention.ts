// Matrices de atención AUTORADAS A MANO para dos oraciones en español. No se
// calcula nada: el objetivo pedagógico es ver el patrón (cada palabra decide a
// cuáles otras mirar), no la aritmética — esa vive en la lección de RNN.
// Las filas se normalizan al cargar el módulo para que sumen exactamente 1.

export interface AttnSentence {
  id: string;
  label: string;
  tokens: string[];
  /** alpha[q][k] = cuánto atiende el token q al token k; cada fila suma 1 */
  alpha: number[][];
  /** nota pedagógica por índice de token (se muestra al enfocarlo) */
  notes: Partial<Record<number, string>>;
}

function normalize(raw: number[][]): number[][] {
  return raw.map((row) => {
    const sum = row.reduce((a, b) => a + b, 0);
    return row.map((w) => w / sum);
  });
}

// --- Oración 1: la ambigüedad clásica ---------------------------------------
// tokens:            Marta  vio    a      Ana    con    el     telescopio
const TELESCOPE_RAW = [
  [3.0, 2.0, 0.2, 0.6, 0.2, 0.1, 0.3], // Marta
  [2.5, 2.0, 0.3, 1.6, 0.6, 0.1, 1.0], // vio
  [0.3, 2.0, 1.0, 3.0, 0.2, 0.1, 0.2], // a
  [0.5, 2.0, 0.5, 3.0, 0.6, 0.1, 0.8], // Ana
  [0.3, 1.6, 0.2, 1.6, 1.0, 0.3, 2.5], // con  ← el nudo de la ambigüedad
  [0.1, 0.2, 0.1, 0.3, 1.0, 1.0, 4.0], // el
  [0.4, 1.2, 0.1, 1.0, 2.2, 1.5, 3.0], // telescopio
];

// --- Oración 2: el contraste que importa en BI -------------------------------
// tokens:           Las    ventas bajaron pero   el     margen mejoró
const CONTRAST_RAW = [
  [2.0, 3.0, 0.5, 0.1, 0.1, 0.2, 0.1], // Las
  [1.0, 3.0, 2.0, 0.3, 0.1, 0.6, 0.2], // ventas
  [0.3, 3.0, 2.0, 1.0, 0.1, 0.4, 0.4], // bajaron
  [0.2, 0.6, 2.5, 1.0, 0.1, 0.6, 2.5], // pero  ← conecta las dos mitades
  [0.1, 0.2, 0.1, 0.4, 1.0, 4.0, 1.0], // el
  [0.2, 0.8, 0.8, 1.2, 1.0, 3.0, 2.0], // margen
  [0.1, 0.5, 1.2, 2.2, 0.3, 3.0, 2.0], // mejoró ← atiende a margen y a pero
];

export const SENTENCES: AttnSentence[] = [
  {
    id: 'telescopio',
    label: 'Ambigüedad',
    tokens: ['Marta', 'vio', 'a', 'Ana', 'con', 'el', 'telescopio'],
    alpha: normalize(TELESCOPE_RAW),
    notes: {
      1: '"vio" busca quién ve (Marta) y qué se ve (Ana).',
      4: '"con" es el nudo: ¿se conecta con "vio" (Marta usó el telescopio) o con "Ana" (ella lo llevaba)? Sin más contexto, la atención queda repartida.',
      6: '"telescopio" mira sobre todo a "con": de esa conexión depende el significado de la oración.',
    },
  },
  {
    id: 'contraste',
    label: 'Contraste en BI',
    tokens: ['Las', 'ventas', 'bajaron', 'pero', 'el', 'margen', 'mejoró'],
    alpha: normalize(CONTRAST_RAW),
    notes: {
      2: '"bajaron" atiende a su sujeto: "ventas". Detectar la palabra negativa no basta.',
      3: '"pero" conecta las dos mitades de la oración: la caída y la mejora.',
      6: '"mejoró" atiende a "margen" (su sujeto) y a "pero" (el contraste). Por eso el modelo puede entender que el mes NO fue necesariamente malo.',
    },
  },
];

/** Los k tokens más atendidos por el token q (excluyendo al propio q). */
export function topAttended(
  s: AttnSentence,
  q: number,
  k = 3,
): { index: number; w: number }[] {
  return s.alpha[q]
    .map((w, index) => ({ index, w }))
    .filter((e) => e.index !== q)
    .sort((a, b) => b.w - a.w)
    .slice(0, k);
}

// --- Variantes con contexto para AmbiguityContext ----------------------------

export interface AmbiguityVariant {
  id: string;
  /** frase de contexto previa, o null = sin contexto */
  context: string | null;
  /** fila de atención del token "con" (índice 4), normalizada */
  conRow: number[];
  /** probabilidad de cada interpretación; suman 1 */
  interp: { label: string; p: number }[];
}

const INTERP_A = 'Marta usó el telescopio para ver a Ana';
const INTERP_B = 'Ana llevaba el telescopio';

function variant(
  id: string,
  context: string | null,
  conRaw: number[],
  pA: number,
): AmbiguityVariant {
  const sum = conRaw.reduce((a, b) => a + b, 0);
  return {
    id,
    context,
    conRow: conRaw.map((w) => w / sum),
    interp: [
      { label: INTERP_A, p: pA },
      { label: INTERP_B, p: 1 - pA },
    ],
  };
}

export const TELESCOPE_VARIANTS: AmbiguityVariant[] = [
  variant('sin-contexto', null, [0.3, 1.6, 0.2, 1.6, 1.0, 0.3, 2.5], 0.5),
  variant(
    'observatorio',
    'Marta estaba de turno en el observatorio.',
    [0.6, 3.5, 0.2, 0.5, 1.0, 0.3, 2.5],
    0.88,
  ),
  variant(
    'tienda',
    'Ana volvía de la tienda de astronomía.',
    [0.2, 0.5, 0.2, 3.5, 1.0, 0.3, 2.5],
    0.12,
  ),
];

export const TELESCOPE_TOKENS = SENTENCES[0].tokens;
/** índice del token "con" dentro de TELESCOPE_TOKENS */
export const CON_INDEX = 4;
