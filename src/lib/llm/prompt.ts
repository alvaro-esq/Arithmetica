// Ingredientes de un prompt fuerte, composición, puntuación y respuestas
// simuladas (autoradas — aquí no se llama a ningún LLM real). El caso es el
// mismo de toda la lección: el resumen de ventas de junio.

export type IngredientId =
  | 'rol'
  | 'contexto'
  | 'datos'
  | 'audiencia'
  | 'formato'
  | 'restricciones';

export interface Ingredient {
  id: IngredientId;
  label: string;
  /** texto que aporta al prompt */
  snippet: string;
  /** por qué importa (tooltip / tarjeta) */
  why: string;
  /** peso en la puntuación */
  weight: number;
}

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'rol',
    label: 'Rol',
    snippet: 'Actúa como analista de Business Intelligence.',
    why: 'Define la perspectiva y el estándar profesional de la respuesta.',
    weight: 1,
  },
  {
    id: 'contexto',
    label: 'Contexto',
    snippet: 'Es el cierre mensual y el resumen se presentará en la reunión de dirección.',
    why: 'Sitúa la tarea: qué está pasando y para qué se usará el resultado.',
    weight: 1,
  },
  {
    id: 'datos',
    label: 'Datos',
    snippet: 'Usa únicamente la tabla de ventas de junio por región incluida abajo.',
    why: 'Sin datos concretos, el modelo rellena los huecos con inventos plausibles.',
    weight: 3,
  },
  {
    id: 'audiencia',
    label: 'Audiencia',
    snippet: 'La respuesta es para un gerente comercial sin perfil técnico.',
    why: 'La audiencia decide el vocabulario, el nivel de detalle y el enfoque.',
    weight: 1.5,
  },
  {
    id: 'formato',
    label: 'Formato',
    snippet:
      'Devuelve en viñetas: variación total, región con mayor crecimiento, región con mayor caída y una recomendación.',
    why: 'Un formato explícito produce salidas consistentes e integrables en reportes.',
    weight: 2,
  },
  {
    id: 'restricciones',
    label: 'Restricciones',
    snippet:
      'Si la tabla no permite explicar una causa, escribe "No hay evidencia suficiente". No inventes cifras.',
    why: 'La instrucción anti-invención es la principal defensa contra alucinaciones.',
    weight: 2,
  },
];

export const BASE_TASK = 'Resume las ventas de junio.';

const ORDER: IngredientId[] = ['rol', 'contexto', 'datos', 'audiencia', 'formato', 'restricciones'];

export interface PromptSpan {
  id: IngredientId | null; // null = tarea base
  text: string;
}

/** Compone el prompt en orden canónico, como spans etiquetados por ingrediente. */
export function composePrompt(active: IngredientId[]): PromptSpan[] {
  const on = new Set(active);
  const spans: PromptSpan[] = [];
  for (const id of ORDER) {
    if (on.has(id)) {
      const ing = INGREDIENTS.find((i) => i.id === id)!;
      spans.push({ id, text: ing.snippet });
    }
    if (id === 'contexto') spans.push({ id: null, text: BASE_TASK });
  }
  return spans;
}

export interface PromptScore {
  score: number; // 0..10.5
  max: number;
  verdict: 'débil' | 'aceptable' | 'fuerte';
}

export function scorePrompt(active: IngredientId[]): PromptScore {
  const on = new Set(active);
  const max = INGREDIENTS.reduce((a, i) => a + i.weight, 0);
  const score = INGREDIENTS.filter((i) => on.has(i.id)).reduce((a, i) => a + i.weight, 0);
  const verdict = score < 3 ? 'débil' : score < 7 ? 'aceptable' : 'fuerte';
  return { score, max, verdict };
}

export interface SimResponse {
  text: string;
  /** problemas concretos causados por los ingredientes ausentes */
  issues: string[];
}

/** Respuesta simulada: se arma por piezas según los ingredientes activos. */
export function simulatedResponse(active: IngredientId[]): SimResponse {
  const on = new Set(active);
  const issues: string[] = [];
  const lines: string[] = [];

  const hasDatos = on.has('datos');
  const hasFormato = on.has('formato');
  const hasRestr = on.has('restricciones');
  const hasAud = on.has('audiencia');

  if (!hasDatos) {
    // sin datos: fluido, genérico y con cifra sospechosamente inventada
    lines.push(
      hasFormato
        ? '• Las ventas de junio crecieron aproximadamente 9% según tendencias típicas del sector.\n• La región líder habría sido la de mayor población.\n• Se recomienda mantener la estrategia actual.'
        : 'Las ventas de junio mostraron un comportamiento positivo, con un crecimiento estimado cercano al 9%. En general, el desempeño fue consistente con las tendencias del sector y se recomienda mantener la estrategia actual.',
    );
    issues.push('Sin datos: el 9% es inventado — no hay ninguna tabla que lo respalde.');
    if (!hasRestr) issues.push('Sin restricciones: nada le impide presentar el invento con total seguridad.');
    else lines.push('\nNota del modelo: no recibí datos de junio; lo anterior es una suposición. No hay evidencia suficiente.');
  } else {
    const body = hasFormato
      ? '• Variación total: +8.2% frente a mayo (Q1,145,000 vs Q1,058,000).\n• Mayor crecimiento: región central, +15%.\n• Mayor caída: región sur, −6%.\n• Recomendación: revisar disponibilidad de inventario en la región sur antes de actuar sobre precios.'
      : 'Según la tabla, las ventas de junio sumaron Q1,145,000, un crecimiento de 8.2% frente a mayo. La región central lideró con +15%, mientras la región sur cayó −6%. Se recomienda revisar el inventario de la región sur.';
    lines.push(body);
    if (hasRestr) {
      lines.push(
        '\nSobre las causas de la caída en la región sur: no hay evidencia suficiente en la tabla (faltarían datos de inventario, precios y campañas).',
      );
    } else {
      lines.push(
        '\nLa caída de la región sur probablemente se debe a la competencia agresiva en la zona.',
      );
      issues.push('Sin restricciones: la "causa" de la región sur es una hipótesis presentada como hecho.');
    }
    if (!hasFormato) issues.push('Sin formato: la salida es un párrafo difícil de pegar en un reporte.');
  }

  if (!hasAud) issues.push('Sin audiencia: el tono queda genérico — ni ejecutivo ni operativo.');
  else if (hasDatos) lines.push('\n(Tono ajustado para gerencia comercial: sin jerga técnica, con acción sugerida.)');
  if (!on.has('rol')) issues.push('Sin rol: la respuesta no asume el estándar de un analista de BI.');
  if (!on.has('contexto')) issues.push('Sin contexto: el modelo no sabe que esto va a la reunión de dirección.');

  return { text: lines.join('\n'), issues };
}

// --- Detector heurístico para la actividad práctica --------------------------

const PATTERNS: Record<IngredientId, RegExp> = {
  rol: /(act[uú]a como|eres (un|una)|asume el rol|como analista|en tu rol)/i,
  contexto: /(reuni[oó]n|cierre (mensual|de mes)|contexto|situaci[oó]n|para (el|la) (junta|direcci[oó]n)|campa[nñ]a)/i,
  datos: /(tabla|con base en|bas[aá]ndote en|seg[uú]n (la|los|el)|datos (adjuntos|incluidos|proporcionados)|adjunto|csv)/i,
  audiencia: /(para (el|la|un|una) (gerente|director|directora|equipo|junta|cliente)|dirigid[oa] a|audiencia|no t[eé]cnico)/i,
  formato: /(vi[nñ]etas|formato|columnas|en forma de tabla|lista(do)? de|m[aá]ximo \d+|en \d+ (l[ií]neas|puntos|p[aá]rrafos)|estructura)/i,
  restricciones: /(no inventes|si (falta|no hay)|[uú]nicamente|indícalo|ind[ií]calo|no afirmes|sin inventar|solo usa|evidencia suficiente)/i,
};

/** Qué ingredientes se detectan en un prompt escrito por el estudiante. */
export function detectIngredients(text: string): IngredientId[] {
  return (Object.keys(PATTERNS) as IngredientId[]).filter((id) => PATTERNS[id].test(text));
}

/** Prompt débil de partida y una solución modelo para la actividad. */
export const WEAK_PROMPT = 'Explícame por qué bajaron las ventas.';
export const MODEL_SOLUTION =
  'Actúa como analista de BI. Es el cierre mensual: con base en la tabla adjunta de ventas de junio por región, ' +
  'resume para el gerente comercial la variación total, la región con mayor caída y la de mayor crecimiento, en viñetas. ' +
  'Si la tabla no permite explicar las causas, indícalo con "No hay evidencia suficiente" y no inventes cifras.';
