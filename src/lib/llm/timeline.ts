// Hitos de la evolución de los modelos y tarjetas del ecosistema de
// proveedores. Cifras redondeadas con fin educativo — el panorama cambia cada
// pocos meses; lo permanente es el CRITERIO de comparación, no el ranking.

export type ProviderId =
  | 'academia'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'meta'
  | 'mistral'
  | 'deepseek';

export interface ModelEvent {
  /** año (fracción = posición dentro del año, para separar hitos cercanos) */
  year: number;
  name: string;
  provider: ProviderId;
  /** ventana de contexto aproximada, en tokens (para el eje log) */
  ctx: number;
  note: string;
  /** hito que cambió la conversación */
  milestone?: boolean;
}

export const TIMELINE: ModelEvent[] = [
  {
    year: 2017,
    name: 'Transformer',
    provider: 'academia',
    ctx: 512,
    note: '"Attention Is All You Need": nace la arquitectura de todo lo que sigue.',
    milestone: true,
  },
  {
    year: 2018,
    name: 'GPT-1',
    provider: 'openai',
    ctx: 512,
    note: 'Primer GPT: pre-entrenar y luego ajustar funciona.',
  },
  {
    year: 2019,
    name: 'GPT-2',
    provider: 'openai',
    ctx: 1024,
    note: 'Genera párrafos coherentes; el salto de escala empieza a notarse.',
  },
  {
    year: 2020,
    name: 'GPT-3',
    provider: 'openai',
    ctx: 2048,
    note: '175 mil millones de parámetros: aprende tareas con solo ver ejemplos en el prompt.',
    milestone: true,
  },
  {
    year: 2022,
    name: 'ChatGPT',
    provider: 'openai',
    ctx: 4096,
    note: 'El LLM se vuelve producto conversacional: 100M de usuarios en 2 meses.',
    milestone: true,
  },
  {
    year: 2023.2,
    name: 'GPT-4',
    provider: 'openai',
    ctx: 32_000,
    note: 'Razonamiento y seguimiento de instrucciones de otro nivel; multimodal.',
  },
  {
    year: 2023.5,
    name: 'Claude 2',
    provider: 'anthropic',
    ctx: 100_000,
    note: 'La ventana de contexto se dispara: documentos completos de una vez.',
  },
  {
    year: 2023.6,
    name: 'Llama 2',
    provider: 'meta',
    ctx: 4096,
    note: 'Pesos abiertos con licencia comercial: cualquiera puede alojarlo.',
    milestone: true,
  },
  {
    year: 2024.1,
    name: 'Gemini 1.5',
    provider: 'google',
    ctx: 1_000_000,
    note: 'Un millón de tokens de contexto: horas de video o repositorios enteros.',
  },
  {
    year: 2024.4,
    name: 'GPT-4o',
    provider: 'openai',
    ctx: 128_000,
    note: 'Multimodal nativo en tiempo real: texto, voz e imagen en el mismo modelo.',
  },
  {
    year: 2024.5,
    name: 'Claude 3.5',
    provider: 'anthropic',
    ctx: 200_000,
    note: 'La gama alta compite palmo a palmo; agentes que usan la computadora.',
  },
  {
    year: 2024.7,
    name: 'o1',
    provider: 'openai',
    ctx: 128_000,
    note: 'Modelos que "razonan" paso a paso antes de responder.',
    milestone: true,
  },
  {
    year: 2025,
    name: 'DeepSeek R1',
    provider: 'deepseek',
    ctx: 128_000,
    note: 'Razonamiento con pesos abiertos y costo de entrenamiento sorprendentemente bajo.',
  },
];

export const TIMELINE_YEARS: [number, number] = [2017, 2025];

// --- Ecosistema ---------------------------------------------------------------

export type ProviderTag = 'abierto' | 'economico' | 'multimodal' | 'contexto-largo';

export interface Provider {
  id: ProviderId;
  name: string;
  flagship: string;
  open: boolean;
  strengths: string[];
  whenBI: string;
  tags: ProviderTag[];
}

export const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    flagship: 'GPT-4o / o1',
    open: false,
    strengths: ['Ecosistema más grande', 'Multimodal maduro', 'Herramientas integradas'],
    whenBI: 'Punto de partida común: mucha documentación y ejemplos para integraciones.',
    tags: ['multimodal'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    flagship: 'Claude',
    open: false,
    strengths: ['Contexto largo', 'Seguimiento fino de instrucciones', 'Enfoque en seguridad'],
    whenBI: 'Analizar documentos y reportes extensos; respuestas cuidadosas con las fuentes.',
    tags: ['contexto-largo'],
  },
  {
    id: 'google',
    name: 'Google DeepMind',
    flagship: 'Gemini',
    open: false,
    strengths: ['Contexto de hasta millones de tokens', 'Integración con Google Cloud'],
    whenBI: 'Si tu stack ya vive en Google Cloud / BigQuery, la integración es natural.',
    tags: ['multimodal', 'contexto-largo'],
  },
  {
    id: 'meta',
    name: 'Meta',
    flagship: 'Llama',
    open: true,
    strengths: ['Pesos abiertos', 'Se puede alojar en tu propia infraestructura'],
    whenBI: 'Requisitos estrictos de privacidad: los datos nunca salen de tus servidores.',
    tags: ['abierto'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    flagship: 'Mistral Large / open-weight',
    open: true,
    strengths: ['Modelos pequeños eficientes', 'Buena relación costo/desempeño'],
    whenBI: 'Clasificar y extraer en volumen con costo bajo; opción europea.',
    tags: ['abierto', 'economico'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    flagship: 'R1 / V3',
    open: true,
    strengths: ['Razonamiento con pesos abiertos', 'Costo muy bajo'],
    whenBI: 'Experimentar con razonamiento barato; evaluar gobernanza antes de producción.',
    tags: ['abierto', 'economico'],
  },
];

export const PROVIDER_COLORS: Record<ProviderId, 'accent' | 'pos' | 'neg' | 'success' | 'warn' | 'muted'> = {
  academia: 'muted',
  openai: 'success',
  anthropic: 'pos',
  google: 'accent',
  meta: 'neg',
  mistral: 'warn',
  deepseek: 'muted',
};

/** Criterios de comparación — lo que sí permanece cuando cambian los modelos. */
export const CRITERIA = [
  'Calidad de respuesta en TU caso de uso',
  'Costo por millón de tokens (entrada y salida)',
  'Velocidad y latencia',
  'Ventana de contexto',
  'Capacidad multimodal',
  'Privacidad y gobernanza de datos',
  'Facilidad de integración y documentación',
];
