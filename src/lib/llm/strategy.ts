// Árbol de decisión "quiero que el modelo sepa X": ¿prompting, RAG o
// fine-tuning? Nodos con ids estables; cada hoja trae la recomendación,
// el porqué y un ejemplo BI.

export interface TreeQuestion {
  id: string;
  kind: 'q';
  q: string;
  /** aclaración corta bajo la pregunta */
  hint: string;
  yes: string;
  no: string;
}

export interface TreeLeaf {
  id: string;
  kind: 'leaf';
  rec: 'Prompting' | 'RAG' | 'Fine-tuning' | 'Prompting + RAG';
  why: string;
  ejemploBI: string;
  /** color semántico de la tarjeta */
  tone: 'accent' | 'pos' | 'neg' | 'success';
}

export type TreeNode = TreeQuestion | TreeLeaf;

export const TREE: Record<string, TreeNode> = {
  root: {
    id: 'root',
    kind: 'q',
    q: '¿La información que necesita el modelo cabe en el prompt?',
    hint: 'Unas cuantas tablas, reglas o definiciones — no una base de datos entera.',
    yes: 'leaf-prompting',
    no: 'q-cambia',
  },
  'q-cambia': {
    id: 'q-cambia',
    kind: 'q',
    q: '¿Esa información cambia con frecuencia?',
    hint: 'Ventas de ayer, inventario actual, políticas que se actualizan.',
    yes: 'leaf-rag',
    no: 'q-estilo',
  },
  'q-estilo': {
    id: 'q-estilo',
    kind: 'q',
    q: '¿Lo que falta es un ESTILO o FORMATO muy específico, más que conocimiento?',
    hint: 'Estilo = jerga interna, tono, estructura exacta de salida. Conocimiento = hechos y datos.',
    yes: 'leaf-finetune', // comportamiento → re-entrenar
    no: 'q-volumen', // conocimiento estable y grande
  },
  'q-volumen': {
    id: 'q-volumen',
    kind: 'q',
    q: '¿Necesitas que cada respuesta cite su fuente?',
    hint: 'En BI casi siempre: sin fuente no hay verificación.',
    yes: 'leaf-rag2',
    no: 'leaf-mixto',
  },
  'leaf-prompting': {
    id: 'leaf-prompting',
    kind: 'leaf',
    rec: 'Prompting',
    why: 'Si el contexto cabe en la ventana, pegarlo bien estructurado es lo más barato, rápido y fácil de mantener. Empieza SIEMPRE aquí.',
    ejemploBI: 'Resumir la tabla de ventas del mes: la pegas en el prompt con instrucciones y restricciones.',
    tone: 'accent',
  },
  'leaf-rag': {
    id: 'leaf-rag',
    kind: 'leaf',
    rec: 'RAG',
    why: 'Datos que cambian viven en una base consultable, no dentro del modelo: el buscador trae lo vigente en cada pregunta y no hay que re-entrenar nada.',
    ejemploBI: 'Un chat que responde sobre inventario y políticas actuales consultando los documentos del día.',
    tone: 'pos',
  },
  'leaf-rag2': {
    id: 'leaf-rag2',
    kind: 'leaf',
    rec: 'RAG',
    why: 'RAG deja rastro: cada afirmación apunta al fragmento del que salió. Con conocimiento horneado por fine-tuning no hay cita posible.',
    ejemploBI: 'Asistente de auditoría: cada cifra que menciona enlaza al reporte oficial de donde salió.',
    tone: 'pos',
  },
  'leaf-finetune': {
    id: 'leaf-finetune',
    kind: 'leaf',
    rec: 'Fine-tuning',
    why: 'Re-entrenar ajusta el COMPORTAMIENTO: tono, jerga, formato exacto. Es caro y se repite con cada modelo nuevo — resérvalo para cuando prompting con ejemplos ya no alcanza.',
    ejemploBI: 'Clasificar tickets con las 40 categorías internas y siglas de la empresa, en volumen, con salida idéntica siempre.',
    tone: 'neg',
  },
  'leaf-mixto': {
    id: 'leaf-mixto',
    kind: 'leaf',
    rec: 'Prompting + RAG',
    why: 'Conocimiento estable y grande sin necesidad de cita: un buen prompt con RAG simple resuelve; el fine-tuning solo se justifica si además exiges un comportamiento muy específico.',
    ejemploBI: 'Asistente del manual de procesos internos: busca el capítulo relevante y responde con las reglas del prompt.',
    tone: 'success',
  },
};

export const TREE_ROOT = 'root';

/** Todas las hojas (para la tabla resumen y las verificaciones). */
export const LEAVES: TreeLeaf[] = Object.values(TREE).filter(
  (n): n is TreeLeaf => n.kind === 'leaf',
);
