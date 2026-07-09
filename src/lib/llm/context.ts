// Conversación BI guionada + lógica de ventana de contexto. El guion está
// diseñado para que un dato clave (la meta de junio, mensaje #2) quede fuera
// de la ventana cuando esta se llena — y la última pregunta lo referencia.

import { countTokens } from './tokenizer';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMsg {
  id: number;
  role: Role;
  /** texto mostrado en el bloque */
  text: string;
  /** tokens que ocupa (calculado con el tokenizador educativo) */
  tokens: number;
}

const msg = (id: number, role: Role, text: string, extraTokens = 0): ChatMsg => ({
  id,
  role,
  text,
  // extraTokens simula adjuntos (tablas, documentos) que no mostramos completos
  tokens: countTokens(text) + extraTokens,
});

export const CONVERSATION: ChatMsg[] = [
  msg(
    0,
    'system',
    'Eres un analista de BI. Usa solo los datos proporcionados; si falta información, dilo.',
  ),
  msg(1, 'user', 'Hola, vamos a revisar el desempeño comercial de junio.'),
  msg(
    2,
    'user',
    'Dato clave: la meta de ventas de junio es Q1,200,000. Guárdala para el análisis.',
  ),
  msg(3, 'assistant', 'Anotado: meta de junio Q1,200,000. ¿Qué datos revisamos primero?'),
  msg(
    4,
    'user',
    'Aquí va la tabla de ventas diarias de junio por región y canal. [tabla: 30 filas × 6 columnas]',
    380,
  ),
  msg(
    5,
    'assistant',
    'Recibida la tabla. Ventas acumuladas: Q1,145,000. La región central lidera con 38% del total; el canal online crece 14% frente a mayo.',
  ),
  msg(6, 'user', 'Ahora agrega los comentarios de clientes del mes. [documento: 4 páginas]', 520),
  msg(
    7,
    'assistant',
    'Analicé los comentarios: el tema dominante es demora en entregas de la región sur (31 menciones), seguido de precios (12).',
  ),
  msg(8, 'user', '¿Y cómo se compara junio contra mayo por canal?'),
  msg(
    9,
    'assistant',
    'Online +14%, tiendas físicas −6%, mayorista estable. La caída física se concentra en la región sur.',
  ),
  msg(10, 'user', 'Incluye también el inventario de fin de mes. [tabla: 120 filas]', 640),
  msg(
    11,
    'assistant',
    'Inventario cargado: quiebre de stock en 8 SKU de alta rotación en la región sur, consistente con las demoras reportadas.',
  ),
  msg(12, 'user', '¿Llegamos a la meta que te di al inicio?'),
];

/** Resultado de acomodar la conversación en una ventana de `limit` tokens. */
export interface WindowFit {
  /** mensajes que caben, en orden original */
  kept: ChatMsg[];
  /** mensajes expulsados (los más viejos primero) */
  evicted: ChatMsg[];
  /** tokens ocupados por `kept` */
  used: number;
}

/**
 * Estrategia estándar: conservar los mensajes MÁS RECIENTES que quepan.
 * Con `pinSystem`, el mensaje system siempre sobrevive (se descuenta primero).
 */
export function fitWindow(msgs: ChatMsg[], limit: number, pinSystem = true): WindowFit {
  const sys = pinSystem ? msgs.find((m) => m.role === 'system') : undefined;
  let budget = limit - (sys?.tokens ?? 0);
  const rest = msgs.filter((m) => m !== sys);
  const keptTail: ChatMsg[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    if (rest[i].tokens <= budget) {
      budget -= rest[i].tokens;
      keptTail.unshift(rest[i]);
    } else {
      break; // los anteriores (más viejos) tampoco entran: la ventana es contigua
    }
  }
  const kept = sys ? [sys, ...keptTail] : keptTail;
  const keptIds = new Set(kept.map((m) => m.id));
  const evicted = msgs.filter((m) => !keptIds.has(m.id));
  const used = kept.reduce((a, m) => a + m.tokens, 0);
  return { kept, evicted, used };
}

/**
 * Tamaños de ventana del visualizador. Escala REDUCIDA a propósito (la
 * conversación completa pesa ~1,850 tokens): los modelos reales van de 8K a
 * millones, pero el fenómeno — lo viejo se cae — es idéntico.
 */
export const WINDOW_SIZES = [
  { label: 'Pequeña · 800', tokens: 800 },
  { label: 'Mediana · 1,200', tokens: 1_200 },
  { label: 'Grande · 2,000', tokens: 2_000 },
] as const;

/** id del mensaje con el dato clave que la pregunta final referencia */
export const KEY_FACT_ID = 2;
/** id de la pregunta final */
export const FINAL_QUESTION_ID = 12;

/** Respuesta simulada a la pregunta final, según si el dato clave sobrevive. */
export function finalAnswer(keyFactVisible: boolean): string {
  return keyFactVisible
    ? 'Sí lo tengo: la meta era Q1,200,000 y las ventas cerraron en Q1,145,000 — quedamos 4.6% por debajo de la meta.'
    : '¿Qué meta? En mi contexto actual no encuentro ninguna meta de junio. ¿Puedes repetirme la cifra?';
}
