// Roles de mensajes en APIs de chat: biblioteca de bloques de ejemplo (sabor
// BI), serialización al JSON del request y un validador suave de orden.

import type { Role } from './context';
export type { Role };

export interface RoleBlock {
  role: Role;
  content: string;
}

export interface RoleInfo {
  label: string;
  desc: string;
  /** contenidos elegibles al añadir un bloque de este rol */
  examples: string[];
}

export const ROLE_LIBRARY: Record<Role, RoleInfo> = {
  system: {
    label: 'System',
    desc: 'Reglas permanentes de quien construye la aplicación. El usuario final nunca las ve.',
    examples: [
      'Eres un analista de BI. No inventes datos; si falta información, dilo explícitamente.',
      'Responde siempre en español, con tono ejecutivo y máximo 5 viñetas.',
      'Nunca afirmes una causa de variación sin datos que la respalden.',
    ],
  },
  user: {
    label: 'User',
    desc: 'La solicitud del usuario final en cada turno.',
    examples: [
      'Resume el desempeño de ventas de junio con base en esta tabla.',
      '¿Por qué cayó la venta en tiendas físicas?',
      '¿Qué región tuvo mayor crecimiento este mes?',
    ],
  },
  assistant: {
    label: 'Assistant',
    desc: 'Lo que el modelo respondió antes. Se reenvía para que tenga memoria del hilo.',
    examples: [
      'En junio las ventas crecieron 8% frente a mayo; la región central lideró el crecimiento.',
      'La tabla muestra una caída de 6% en tiendas físicas, pero no incluye datos para explicar la causa.',
    ],
  },
  tool: {
    label: 'Tool',
    desc: 'Resultado devuelto por una herramienta externa (función, base de datos, API).',
    examples: [
      '{ "ventas_junio": 540000, "ventas_mayo": 500000, "variacion": "+8%" }',
      '{ "region_top": "central", "crecimiento": "+15%" }',
    ],
  },
};

export const ROLE_ORDER: Role[] = ['system', 'user', 'assistant', 'tool'];

/** El JSON del request tal como lo vería un desarrollador. */
export function toRequestJSON(
  blocks: RoleBlock[],
  opts: { model: string; temperature: number },
): string {
  return JSON.stringify(
    {
      model: opts.model,
      temperature: opts.temperature,
      messages: blocks.map((b) => ({ role: b.role, content: b.content })),
    },
    null,
    2,
  );
}

export interface OrderCheck {
  ok: boolean;
  hint?: string;
}

/** Validación suave: educativa, no bloquea — solo sugiere el patrón correcto. */
export function validateOrder(blocks: RoleBlock[]): OrderCheck {
  const sysIdx = blocks.findIndex((b) => b.role === 'system');
  if (sysIdx > 0) {
    return { ok: false, hint: 'El mensaje system va primero: define las reglas antes de la conversación.' };
  }
  if (blocks.filter((b) => b.role === 'system').length > 1) {
    return { ok: false, hint: 'Normalmente hay UN solo mensaje system con todas las reglas.' };
  }
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].role === 'tool' && !blocks.slice(0, i).some((b) => b.role === 'assistant')) {
      return {
        ok: false,
        hint: 'Un mensaje tool responde a una llamada del assistant: primero el modelo pide la herramienta, luego llega el resultado.',
      };
    }
  }
  const firstNonSys = blocks.find((b) => b.role !== 'system');
  if (firstNonSys && firstNonSys.role === 'assistant') {
    return { ok: false, hint: 'La conversación suele empezar con un mensaje del usuario.' };
  }
  return { ok: true };
}
