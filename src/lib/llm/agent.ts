// Escenario guionado del agente de BI: "genera el reporte semanal de ventas".
// Dos ramas deterministas (aprobar / rechazar el envío del correo). El punto
// pedagógico: el loop se DETIENE ante una acción sensible y pide aprobación.

export type Phase =
  | 'objetivo'
  | 'plan'
  | 'herramienta'
  | 'observación'
  | 'aprobación'
  | 'respuesta';

export const PHASE_CYCLE: Phase[] = ['objetivo', 'plan', 'herramienta', 'observación'];

export interface ToolCall {
  name: string;
  args: string;
  result: string;
}

export interface AgentStep {
  phase: Phase;
  title: string;
  detail: string;
  tool?: ToolCall;
  /** qué sabe el agente después de este paso */
  memory: string[];
  /** true = el loop se detiene y espera Aprobar/Rechazar */
  needsApproval?: boolean;
}

export interface AgentRun {
  steps: AgentStep[];
}

export const TOOL_PERMISSIONS: { name: string; label: string; auto: boolean }[] = [
  { name: 'query_db', label: 'Consultar base de datos', auto: true },
  { name: 'get_comentarios', label: 'Leer comentarios de clientes', auto: true },
  { name: 'redactar', label: 'Redactar borrador', auto: true },
  { name: 'enviar_email', label: 'Enviar correo a gerencia', auto: false },
];

const COMMON: AgentStep[] = [
  {
    phase: 'objetivo',
    title: 'Objetivo recibido',
    detail: '"Prepara el resumen comercial semanal y envíalo a gerencia."',
    memory: ['Objetivo: reporte semanal'],
  },
  {
    phase: 'plan',
    title: 'El agente planifica',
    detail:
      'Plan: 1) consultar ventas de la semana, 2) comparar con la anterior, 3) revisar comentarios si hay anomalías, 4) redactar, 5) enviar.',
    memory: ['Objetivo: reporte semanal', 'Plan de 5 pasos'],
  },
  {
    phase: 'herramienta',
    title: 'Consulta las ventas',
    detail: 'El agente decide que necesita datos y llama a una herramienta.',
    tool: {
      name: 'query_db',
      args: '{ "metrica": "ventas", "periodo": "semana_actual_vs_anterior" }',
      result: '{ "actual": 312000, "anterior": 348000, "variacion": "-10.3%" }',
    },
    memory: ['Objetivo: reporte semanal', 'Plan de 5 pasos', 'Ventas: −10.3% vs semana anterior'],
  },
  {
    phase: 'observación',
    title: 'Observa una anomalía',
    detail:
      'La caída de 10.3% supera el umbral del 5%. El agente ajusta el plan: antes de redactar, buscará detalle por región.',
    memory: ['Objetivo: reporte semanal', 'Ventas: −10.3%', 'Anomalía detectada → investigar'],
  },
  {
    phase: 'herramienta',
    title: 'Investiga el detalle',
    detail: 'Segunda llamada, ahora con otros argumentos.',
    tool: {
      name: 'query_db',
      args: '{ "metrica": "ventas", "desglose": "region" }',
      result: '{ "sur": "-24%", "norte": "-2%", "central": "+1%" }',
    },
    memory: ['Ventas: −10.3%', 'La caída se concentra en la región sur (−24%)'],
  },
  {
    phase: 'herramienta',
    title: 'Cruza con comentarios',
    detail: 'El agente valida la hipótesis con otra fuente antes de escribirla.',
    tool: {
      name: 'get_comentarios',
      args: '{ "region": "sur", "semana": "actual" }',
      result: '{ "tema_dominante": "demoras de entrega", "menciones": 19 }',
    },
    memory: ['Caída concentrada en sur (−24%)', 'Comentarios: demoras de entrega (19 menciones)'],
  },
  {
    phase: 'observación',
    title: 'Redacta el borrador',
    detail:
      'Borrador: "Ventas −10.3%; la caída se concentra en la región sur (−24%), coincidiendo con 19 quejas por demoras de entrega. Hipótesis pendiente de confirmar con logística."',
    memory: ['Borrador listo', 'Hipótesis marcada como pendiente'],
  },
  {
    phase: 'aprobación',
    title: 'Acción sensible: enviar correo',
    detail:
      'enviar_email NO es automática: el agente se detiene y pide aprobación humana antes de contactar a gerencia.',
    memory: ['Borrador listo', 'Esperando aprobación humana'],
    needsApproval: true,
  },
];

const APPROVED: AgentStep[] = [
  {
    phase: 'herramienta',
    title: 'Envía el reporte',
    detail: 'Con la aprobación registrada, ejecuta la herramienta sensible.',
    tool: {
      name: 'enviar_email',
      args: '{ "para": "gerencia@empresa.com", "asunto": "Reporte semanal" }',
      result: '{ "estado": "enviado", "aprobado_por": "humano" }',
    },
    memory: ['Reporte enviado', 'Aprobación humana registrada'],
  },
  {
    phase: 'respuesta',
    title: 'Objetivo cumplido',
    detail:
      'El agente reporta: "Resumen enviado a gerencia. Quedó marcada la hipótesis de demoras de entrega para revisión con logística."',
    memory: ['Reporte enviado', 'Tarea cerrada con trazabilidad'],
  },
];

const REJECTED: AgentStep[] = [
  {
    phase: 'observación',
    title: 'Envío rechazado',
    detail:
      'El humano rechaza el envío. El agente NO insiste: registra la decisión y deja el borrador disponible.',
    memory: ['Borrador guardado', 'Envío rechazado por el humano'],
  },
  {
    phase: 'respuesta',
    title: 'Termina sin enviar',
    detail:
      'El agente reporta: "Dejé el borrador del reporte listo en la carpeta compartida. No se envió ningún correo."',
    memory: ['Borrador guardado', 'Ninguna acción externa ejecutada'],
  },
];

/** La corrida completa según la decisión humana en el paso de aprobación. */
export function weeklyReport(approve: boolean): AgentRun {
  return { steps: [...COMMON, ...(approve ? APPROVED : REJECTED)] };
}

/** Índice del paso que pide aprobación (para detener el auto-play). */
export const APPROVAL_INDEX = COMMON.length - 1;
