// Guiones de los diagramas de flujo: la llamada HTTP a la API (con segmentos
// de latencia) y la secuencia de function calling. Tiempos en ms EDUCATIVOS.

export type Actor = 'usuario' | 'app' | 'modelo' | 'herramienta' | 'db';

export const ACTOR_LABELS: Record<Actor, string> = {
  usuario: 'Usuario',
  app: 'Tu aplicación',
  modelo: 'Modelo (API)',
  herramienta: 'get_ventas()',
  db: 'Base de datos',
};

// --- Segmentos de latencia de una llamada ------------------------------------

export interface LatencySegment {
  id: string;
  label: string;
  /** ms base del segmento */
  ms: number;
  /** true si crece con los tokens de salida */
  scalesWithOutput?: boolean;
}

export const LATENCY_SEGMENTS: LatencySegment[] = [
  { id: 'red', label: 'Red (ida)', ms: 80 },
  { id: 'cola', label: 'Cola del servicio', ms: 120 },
  { id: 'primero', label: 'Primer token', ms: 350 },
  { id: 'streaming', label: 'Resto de tokens', ms: 25, scalesWithOutput: true },
  { id: 'vuelta', label: 'Red (vuelta)', ms: 80 },
];

/** Latencia total estimada para `outTokens` tokens de salida. */
export function totalLatency(outTokens: number): number {
  return LATENCY_SEGMENTS.reduce(
    (a, s) => a + (s.scalesWithOutput ? s.ms * outTokens : s.ms),
    0,
  );
}

/** El request tal como lo enviaría tu aplicación. */
export function apiRequestJSON(opts: {
  maskKey: boolean;
  temperature: number;
  maxTokens: number;
}): string {
  const key = opts.maskKey ? 'sk-••••••••••••••••' : 'sk-abc123DEMO456xyz';
  return [
    'POST https://api.proveedor.com/v1/messages',
    `Authorization: Bearer ${key}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(
      {
        model: 'modelo-estandar',
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        messages: [
          { role: 'system', content: 'Eres un analista de BI. No inventes datos.' },
          { role: 'user', content: 'Resume las ventas de junio con base en estos KPIs: …' },
        ],
      },
      null,
      2,
    ),
  ].join('\n');
}

export const API_RESPONSE_TEXT =
  'En junio las ventas sumaron Q1,145,000 (+8.2% vs mayo). La región central lideró el crecimiento; el canal físico cayó 6% en el sur.';

// --- Secuencia de function calling --------------------------------------------

export interface FlowStep {
  id: string;
  from: Actor;
  to: Actor;
  label: string;
  /** contenido del mensaje activo (se muestra en el panel) */
  payload: string;
  /** nota pedagógica del paso */
  note?: string;
}

export const FN_CALL_FLOW: FlowStep[] = [
  {
    id: 'pregunta',
    from: 'usuario',
    to: 'modelo',
    label: 'Pregunta',
    payload: '"¿Cuál fue la venta total de junio?"',
    note: 'El modelo NO tiene este dato: no está en su entrenamiento ni en el contexto.',
  },
  {
    id: 'tool-call',
    from: 'modelo',
    to: 'app',
    label: 'tool_call',
    payload: '{\n  "name": "get_ventas",\n  "arguments": { "region": "todas", "mes": "junio" }\n}',
    note: 'El modelo ESCRIBE la llamada — no ejecuta nada. Decide QUÉ pedir; tu código decide SI ejecutarlo.',
  },
  {
    id: 'ejecuta',
    from: 'app',
    to: 'db',
    label: 'SQL',
    payload: "SELECT SUM(monto) FROM ventas WHERE mes = 'junio';",
    note: 'Tu aplicación ejecuta la función de forma controlada: aquí mandan tus permisos, no el modelo.',
  },
  {
    id: 'resultado',
    from: 'db',
    to: 'app',
    label: 'Resultado',
    payload: '{ "ventas_junio": 540000 }',
  },
  {
    id: 'tool-msg',
    from: 'app',
    to: 'modelo',
    label: 'Mensaje tool',
    payload: '{ "role": "tool", "content": "{ \\"ventas_junio\\": 540000 }" }',
    note: 'El resultado vuelve al modelo como un mensaje con rol tool.',
  },
  {
    id: 'respuesta',
    from: 'modelo',
    to: 'usuario',
    label: 'Respuesta final',
    payload: '"La venta total de junio fue de Q540,000."',
    note: 'Ahora el dato es real: viene de tu base, no de la imaginación del modelo.',
  },
];
