// El harness: todo lo que envuelve al modelo. Tres piezas de datos autorados:
// (1) las capas y la respuesta simulada por combinación, (2) la sesión de
// agente turno a turno para VER que cada turno re-envía todo, (3) el grafo
// de integraciones sin/con MCP.

import { countTokens } from './tokenizer';
import { PRICES, type CostBreakdown } from './cost';

// --- 1. Capas del harness ------------------------------------------------------

export type LayerId = 'system' | 'herramientas' | 'memoria' | 'permisos' | 'loop';

export interface Layer {
  id: LayerId;
  label: string;
  /** qué aporta esta capa */
  what: string;
  /** radio del anillo en el SVG (el modelo es r=52) */
  radius: number;
}

export const LAYERS: Layer[] = [
  {
    id: 'system',
    label: 'System prompt',
    what: 'Personalidad, reglas y estándar de la respuesta — invisible para el usuario.',
    radius: 78,
  },
  {
    id: 'memoria',
    label: 'Memoria / contexto',
    what: 'Re-envía el historial y los archivos relevantes en cada turno.',
    radius: 104,
  },
  {
    id: 'herramientas',
    label: 'Herramientas',
    what: 'Consultar la base, leer archivos, ejecutar código: manos para actuar.',
    radius: 130,
  },
  {
    id: 'permisos',
    label: 'Permisos',
    what: 'Qué herramienta corre sola y cuál exige aprobación humana.',
    radius: 156,
  },
  {
    id: 'loop',
    label: 'Loop de reintentos',
    what: 'Si una acción falla, el harness devuelve el error al modelo y reintenta.',
    radius: 182,
  },
];

export const HARNESS_TASK = 'Genera el reporte de ventas de junio y guárdalo en la carpeta compartida.';

export interface HarnessResponse {
  text: string;
  /** qué se logró / qué falta, para la lista de diagnóstico */
  issues: string[];
  /** 0..5 — cuántas garantías reales tiene esta respuesta */
  level: number;
}

/** Respuesta simulada según las capas activas. Jerarquía: sin herramientas no
 *  hay datos reales; sin permisos las acciones corren sin control; sin loop el
 *  primer error mata la tarea. */
export function harnessResponse(active: Set<LayerId>): HarnessResponse {
  const has = (id: LayerId) => active.has(id);
  const issues: string[] = [];
  // garantías REALES de esta respuesta: sin herramientas nada se ejecuta ni se
  // verifica, así que el resto de capas apenas aporta (máx 1, por la honestidad
  // que da el system prompt)
  let level = has('herramientas') ? active.size : has('system') ? 1 : 0;

  if (!has('herramientas')) {
    const text = has('system')
      ? 'Como analista de BI, te propongo una estructura de reporte: ventas totales, variación mensual y top de regiones. No puedo consultar tus datos ni guardar archivos: solo genero texto.'
      : 'Las ventas de junio crecieron alrededor de un 9%, impulsadas por la región con mayor población. El reporte quedó guardado en la carpeta compartida.';
    if (!has('system')) {
      issues.push('El 9% es inventado y NO se guardó ningún archivo: un modelo solo emite texto.');
    } else {
      issues.push('Sin herramientas: el modelo confiesa que no puede tocar datos ni archivos.');
    }
    if (!has('memoria')) issues.push('Sin memoria: en el próximo turno no recordará esta conversación.');
    return { text, issues, level };
  }

  // con herramientas: el dato es real
  const lines: string[] = [];
  lines.push(
    'query_db(ventas, junio) → Q1,145,000 (−4.6% vs meta). Redacté el reporte con las cifras reales.',
  );
  if (has('loop')) {
    lines.push('El primer guardado falló (carpeta sin permiso de escritura); el harness me devolvió el error y reintenté en la ruta correcta: reporte guardado ✓.');
  } else {
    lines.push('Intenté guardar el archivo pero la operación falló — la tarea quedó a medias.');
    issues.push('Sin loop de reintentos: el primer error detiene todo.');
  }
  if (has('permisos')) {
    lines.push('El guardado en la carpeta compartida requirió tu aprobación antes de ejecutarse.');
  } else {
    issues.push('Sin permisos: cualquier herramienta (incluso borrar o enviar) correría sin preguntarte.');
  }
  if (!has('system')) issues.push('Sin system prompt: el tono y las reglas del reporte quedan al azar.');
  if (!has('memoria')) issues.push('Sin memoria: si pides un ajuste, tendrá que empezar de cero.');
  return { text: lines.join(' '), issues, level };
}

// --- 2. La sesión turno a turno (lo que el modelo VE en cada request) -----------

export type BlockKind = 'system' | 'user' | 'assistant' | 'tool';

export interface TurnBlock {
  kind: BlockKind;
  label: string;
  /** tokens que pesa el bloque (texto corto + extra que simula adjuntos) */
  tokens: number;
}

const block = (kind: BlockKind, label: string, text: string, extra = 0): TurnBlock => ({
  kind,
  label,
  tokens: countTokens(text) + extra,
});

/** Los eventos de una sesión de agente: en el turno t, el request re-envía el
 *  system + TODOS los bloques de los turnos 1..t. */
export const SESSION_SYSTEM = block(
  'system',
  'system prompt + herramientas',
  'Eres un agente de BI. Herramientas: query_db, leer_archivo, guardar_reporte. Usa solo datos reales; pide aprobación para acciones externas.',
  90,
);

export interface SessionTurn {
  /** qué pasó en este turno (narración para la UI) */
  title: string;
  /** bloques NUEVOS que este turno añade a la conversación */
  blocks: TurnBlock[];
  /** tokens de salida que generó el modelo en este turno */
  outTokens: number;
}

export const SESSION_TURNS: SessionTurn[] = [
  {
    title: 'El usuario pide el reporte',
    blocks: [block('user', 'petición', 'Prepara el reporte de ventas de junio con comparación contra la meta.')],
    outTokens: 40,
  },
  {
    title: 'El modelo pide los datos',
    blocks: [block('assistant', 'tool_call: query_db', '{ "metrica": "ventas", "periodo": "junio" }')],
    outTokens: 30,
  },
  {
    title: 'La base responde (tabla grande)',
    blocks: [block('tool', 'resultado: tabla 30×6', 'Ventas diarias de junio por región y canal.', 380)],
    outTokens: 55,
  },
  {
    title: 'El modelo cruza contra la meta',
    blocks: [
      block('assistant', 'tool_call: leer_archivo', '{ "ruta": "metas/2026-junio.xlsx" }'),
      block('tool', 'resultado: metas', 'Meta de junio: Q1,200,000 por dirección comercial.', 120),
    ],
    outTokens: 45,
  },
  {
    title: 'Redacta y guarda el reporte',
    blocks: [
      block('assistant', 'borrador del reporte', 'Ventas Q1,145,000, −4.6% vs meta; la caída se concentra en la región sur.', 160),
      block('tool', 'guardar_reporte ✓', '{ "estado": "guardado", "ruta": "/compartida/reporte-junio.pdf" }'),
    ],
    outTokens: 210,
  },
];

export interface TurnPayload {
  /** bloques que viajan en el request del turno t (0-based) */
  blocks: TurnBlock[];
  /** tokens de entrada de ESTE request */
  inTokens: number;
  /** tokens de salida de ESTE turno */
  outTokens: number;
  /** entrada acumulada de la sesión hasta este turno inclusive */
  cumIn: number;
  cumOut: number;
}

/** Lo que el harness arma y envía en el turno t: system + todo lo anterior. */
export function turnPayload(t: number): TurnPayload {
  const blocks: TurnBlock[] = [SESSION_SYSTEM];
  for (let i = 0; i < t; i++) blocks.push(...SESSION_TURNS[i].blocks);
  blocks.push(...SESSION_TURNS[t].blocks);
  const inTokens = blocks.reduce((a, b) => a + b.tokens, 0);
  let cumIn = 0;
  let cumOut = 0;
  for (let i = 0; i <= t; i++) {
    cumIn += turnInTokens(i);
    cumOut += SESSION_TURNS[i].outTokens;
  }
  return { blocks, inTokens, outTokens: SESSION_TURNS[t].outTokens, cumIn, cumOut };
}

function turnInTokens(t: number): number {
  let sum = SESSION_SYSTEM.tokens;
  for (let i = 0; i <= t; i++) for (const b of SESSION_TURNS[i].blocks) sum += b.tokens;
  return sum;
}

/** Costo acumulado de la sesión hasta el turno t (tier estándar). */
export function sessionCost(t: number): CostBreakdown {
  const p = PRICES[1];
  const { cumIn, cumOut } = turnPayload(t);
  const inCost = (cumIn * p.inPerM) / 1_000_000;
  const outCost = (cumOut * p.outPerM) / 1_000_000;
  return { perCall: 0, inCost, outCost, total: inCost + outCost };
}

// --- 3. MCP: integraciones sin/con estándar -------------------------------------

export const MCP_APPS = ['Claude Code', 'Chat interno', 'Dashboard BI', 'Notebook'];
export const MCP_TOOLS = ['Base de ventas', 'CRM', 'Hoja de metas', 'Correo'];
