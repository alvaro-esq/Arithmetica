// Pipeline RAG guionado: una pequeña "base de conocimiento" de la empresa,
// scores de relevancia autorados por pregunta y respuestas que citan el
// fragmento del que sale cada afirmación. Determinista y verificable en Node.

import { countTokens } from './tokenizer';

export interface Fragment {
  id: string;
  /** de qué documento sale */
  source: string;
  title: string;
  text: string;
  tokens: number;
}

const frag = (id: string, source: string, title: string, text: string): Fragment => ({
  id,
  source,
  title,
  text,
  tokens: countTokens(text),
});

export const FRAGMENTS: Fragment[] = [
  frag(
    'f1',
    'reporte-junio.pdf',
    'Ventas de junio',
    'Las ventas de junio cerraron en Q1,145,000, un 4.6% por debajo de la meta de Q1,200,000. La región central lideró con el 38% del total.',
  ),
  frag(
    'f2',
    'reporte-junio.pdf',
    'Detalle por región',
    'La región sur cayó 24% frente a mayo; norte y central se mantuvieron estables. La caída coincide con quiebres de stock en 8 SKU de alta rotación.',
  ),
  frag(
    'f3',
    'politica-devoluciones.docx',
    'Política de devoluciones',
    'Las devoluciones se aceptan hasta 30 días después de la compra y se registran con estado "devuelta"; no cuentan como venta en los reportes oficiales.',
  ),
  frag(
    'f4',
    'minuta-direccion-2026-06.docx',
    'Acuerdos de dirección',
    'Dirección aprobó reforzar el inventario de la región sur y revisar el contrato del operador logístico antes de fin de julio.',
  ),
  frag(
    'f5',
    'manual-logistica.pdf',
    'Tiempos de entrega',
    'El tiempo de entrega estándar es de 48 horas en zona metropolitana y de 5 días hábiles en el interior del país.',
  ),
  frag(
    'f6',
    'encuesta-clientes-q2.xlsx',
    'Satisfacción Q2',
    'La satisfacción general del segundo trimestre fue 4.1 de 5. El tema dominante en comentarios negativos: demoras de entrega en la región sur (31 menciones).',
  ),
  frag(
    'f7',
    'plan-comercial-2026.pptx',
    'Plan comercial',
    'La meta anual 2026 es Q14,500,000 con un crecimiento esperado del 12% concentrado en el canal online.',
  ),
  frag(
    'f8',
    'catalogo-productos.xlsx',
    'Catálogo',
    'El catálogo activo tiene 214 SKU en 6 categorías; los 20 SKU de alta rotación concentran el 61% de las ventas.',
  ),
];

export interface AnswerSpan {
  text: string;
  /** id del fragmento que respalda este span (si lo hay) */
  fragId?: string;
}

export interface RagCase {
  id: string;
  question: string;
  /** relevancia autorada 0..1 por fragmento (lo que un buscador vectorial devolvería) */
  scores: Record<string, number>;
  /** cuántos fragmentos entran al contexto */
  k: number;
  answer: AnswerSpan[];
  /** true = la respuesta correcta es "no está en los documentos" */
  missing?: boolean;
}

export const RAG_CASES: RagCase[] = [
  {
    id: 'caida-sur',
    question: '¿Por qué cayeron las ventas en la región sur y qué se decidió al respecto?',
    scores: { f1: 0.62, f2: 0.93, f3: 0.08, f4: 0.81, f5: 0.34, f6: 0.72, f7: 0.18, f8: 0.27 },
    k: 3,
    answer: [
      { text: 'La región sur cayó 24% frente a mayo, coincidiendo con quiebres de stock en 8 SKU de alta rotación', fragId: 'f2' },
      { text: '; los clientes lo reflejan en la encuesta: 31 menciones de demoras de entrega en esa región', fragId: 'f6' },
      { text: '. Dirección ya aprobó reforzar el inventario del sur y revisar el contrato logístico antes de fin de julio', fragId: 'f4' },
      { text: '.' },
    ],
  },
  {
    id: 'meta-junio',
    question: '¿Llegamos a la meta de ventas de junio?',
    scores: { f1: 0.95, f2: 0.55, f3: 0.1, f4: 0.22, f5: 0.05, f6: 0.15, f7: 0.58, f8: 0.12 },
    k: 2,
    answer: [
      { text: 'No: junio cerró en Q1,145,000 frente a una meta de Q1,200,000 — un 4.6% por debajo', fragId: 'f1' },
      { text: '. La meta anual de Q14,500,000 sigue vigente en el plan comercial', fragId: 'f7' },
      { text: '.' },
    ],
  },
  {
    id: 'competencia',
    question: '¿Cuánto vendió nuestra competencia en junio?',
    scores: { f1: 0.48, f2: 0.35, f3: 0.06, f4: 0.14, f5: 0.04, f6: 0.11, f7: 0.31, f8: 0.09 },
    k: 3,
    missing: true,
    answer: [
      {
        text: 'Los documentos recuperados hablan de NUESTRAS ventas de junio, pero ninguno contiene cifras de la competencia. No puedo responder esa pregunta con esta base de conocimiento.',
      },
    ],
  },
];

export interface RankedFragment {
  frag: Fragment;
  score: number;
}

/** Ranking de fragmentos para un caso, de mayor a menor relevancia. */
export function rankFragments(c: RagCase): RankedFragment[] {
  return FRAGMENTS.map((f) => ({ frag: f, score: c.scores[f.id] ?? 0 })).sort(
    (a, b) => b.score - a.score,
  );
}

/** Los k fragmentos que entran al contexto y cuántos tokens suman. */
export function retrieved(c: RagCase): { top: RankedFragment[]; tokens: number } {
  const top = rankFragments(c).slice(0, c.k);
  return { top, tokens: top.reduce((a, r) => a + r.frag.tokens, 0) };
}
