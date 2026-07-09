// Agentes de código: una sesión de terminal guionada (el agente arregla una
// consulta SQL de BI, con aprobación humana antes del commit) y las tarjetas
// comparativas. Datos cualitativos: el panorama cambia cada pocos meses; el
// criterio de comparación es lo permanente.

export type TermKind = 'user' | 'agent' | 'cmd' | 'out' | 'error' | 'diff' | 'approval';

export interface TermStep {
  kind: TermKind;
  text: string;
  /** nota pedagógica que se muestra bajo la terminal cuando el paso está activo */
  note?: string;
}

const COMMON_SESSION: TermStep[] = [
  {
    kind: 'user',
    text: '> El reporte de ventas de junio por región muestra totales distintos a los del dashboard. Arregla la consulta.',
    note: 'El objetivo llega en lenguaje natural, como a cualquier agente. La diferencia: las herramientas son la terminal y los archivos.',
  },
  {
    kind: 'agent',
    text: 'Voy a leer la consulta, reproducir el error y comparar contra el dashboard.',
    note: 'Primero un plan corto. Igual que el loop de la lección 5: objetivo → plan → herramienta → observación.',
  },
  {
    kind: 'cmd',
    text: 'cat reportes/ventas_region.sql',
  },
  {
    kind: 'out',
    text: 'SELECT region, SUM(monto) AS total\nFROM ventas\nGROUP BY region;',
    note: 'Herramienta 1: leer el archivo. El agente ya "ve" el SQL en su contexto.',
  },
  {
    kind: 'cmd',
    text: 'duckdb ventas.db < reportes/ventas_region.sql',
  },
  {
    kind: 'out',
    text: 'sur      | 359,300\nnorte    | 392,200\ncentral  | 460,900',
    note: 'Herramienta 2: ejecutar. Suma Q1,212,400 — pero el dashboard dice Q1,145,000. Los totales incluyen algo que el dashboard excluye…',
  },
  {
    kind: 'agent',
    text: 'Los totales exceden al dashboard en ~6%. Hipótesis: la tabla ventas incluye devoluciones (monto negativo se registra en otra columna, estado = "devuelta"). Verifico.',
  },
  {
    kind: 'cmd',
    text: 'duckdb ventas.db -c "SELECT estado, COUNT(*) FROM ventas GROUP BY estado"',
  },
  {
    kind: 'out',
    text: 'completada | 9,412\ndevuelta   |   587',
    note: 'Observación clave: hay 587 filas de devoluciones que la consulta suma como ventas.',
  },
  {
    kind: 'diff',
    text: "  SELECT region, SUM(monto) AS total\n  FROM ventas\n+ WHERE estado = 'completada'\n  GROUP BY region;",
    note: 'El agente edita el archivo. Un diff pequeño y legible: exactamente lo que un revisor humano quiere ver.',
  },
  {
    kind: 'cmd',
    text: 'duckdb ventas.db < reportes/ventas_region.sql',
  },
  {
    kind: 'out',
    text: 'sur      | 338,000\nnorte    | 371,900\ncentral  | 435,100\ntotal    | 1,145,000  ✓ coincide con el dashboard',
    note: 'Verificación: vuelve a ejecutar y compara. Q1,145,000 — el mismo total de junio que ya conoces de estas lecciones. No declara éxito sin evidencia.',
  },
  {
    kind: 'approval',
    text: '⚠ El agente quiere ejecutar: git commit -m "Excluye devoluciones del reporte por región" — ¿Aprobar?',
    note: 'El commit cambia el repositorio compartido: es la acción sensible. El harness se detiene y te pregunta — mismo patrón que enviar_email en la lección 5.',
  },
];

const COMMIT_YES: TermStep[] = [
  {
    kind: 'cmd',
    text: 'git commit -m "Excluye devoluciones del reporte por región"',
  },
  {
    kind: 'out',
    text: '[main 4f2c81a] Excluye devoluciones del reporte por región\n 1 file changed, 1 insertion(+)',
  },
  {
    kind: 'agent',
    text: 'Listo: la consulta ahora excluye devoluciones y coincide con el dashboard. El commit 4f2c81a queda para tu revisión.',
    note: 'Cierre con trazabilidad: qué cambió, por qué y dónde revisarlo.',
  },
];

const COMMIT_NO: TermStep[] = [
  {
    kind: 'agent',
    text: 'Entendido, no hago commit. El archivo queda corregido en tu copia local; puedes revisar el diff y confirmarlo tú.',
    note: 'Rechazar no rompe nada: el trabajo queda hecho y la decisión final es humana.',
  },
];

export function codingSession(approve: boolean): TermStep[] {
  return [...COMMON_SESSION, ...(approve ? COMMIT_YES : COMMIT_NO)];
}

/** Índice del paso que pide aprobación (para detener el auto-play). */
export const CODING_APPROVAL_INDEX = COMMON_SESSION.length - 1;

// --- Tarjetas comparativas -------------------------------------------------------

export interface CodingAgent {
  id: string;
  name: string;
  maker: string;
  open: boolean;
  /** con qué modelos trabaja */
  models: string;
  /** dónde corre */
  runsOn: string;
  strengths: string[];
  whenBI: string;
}

export const CODING_AGENTS: CodingAgent[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    maker: 'Anthropic',
    open: false,
    models: 'Modelos Claude',
    runsOn: 'Terminal, IDE (VS Code/JetBrains), web y escritorio',
    strengths: ['Agente de terminal maduro', 'Permisos y aprobaciones finas', 'Subagentes y skills'],
    whenBI: 'Automatizar pipelines de datos y reportes con revisión humana en cada acción sensible.',
  },
  {
    id: 'codex',
    name: 'Codex',
    maker: 'OpenAI',
    open: false,
    models: 'Modelos GPT / o-series',
    runsOn: 'Nube (tareas en paralelo), CLI e integración con ChatGPT',
    strengths: ['Tareas delegadas en la nube', 'Integrado al ecosistema ChatGPT', 'PRs automáticos'],
    whenBI: 'Delegar tareas repetitivas de código (tests, refactors) y recibirlas como cambios propuestos.',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    maker: 'Comunidad (código abierto)',
    open: true,
    models: 'El que elijas: Claude, GPT, Gemini, modelos locales…',
    runsOn: 'Terminal (TUI), en tu máquina',
    strengths: ['Código abierto', 'Independiente del proveedor', 'Configurable a fondo'],
    whenBI: 'Requisitos de privacidad o presupuesto: eliges (o alojas) el modelo y auditas el harness.',
  },
];

/** Lo que permanece cuando las versiones cambian. */
export const CODING_CRITERIA = [
  'El harness es distinto del modelo: mismo motor, producto diferente',
  'Qué permisos pide antes de tocar archivos, red o git',
  'Dónde corre (tu máquina vs la nube) y a dónde viajan tus datos',
  'Abierto vs cerrado: ¿puedes auditar qué hace y con qué modelo?',
  'Costo por sesión: los agentes re-envían todo el contexto en cada turno',
  'Calidad del loop: ¿verifica sus cambios o declara éxito sin evidencia?',
];
