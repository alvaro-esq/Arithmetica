// Casos de alucinación (misma pregunta con y sin datos) y el mazo de triage de
// verificación. Las respuestas se autoran como SEGMENTOS: los componentes los
// tipean y luego marcan los inventados (WARN) o los citados (SUCCESS).

export interface Seg {
  text: string;
  /** true = afirmación inventada (se tacha al verificar) */
  invented?: boolean;
  /** [fila, columna] de la tabla que respalda este segmento */
  cell?: [number, number];
}

export interface DataTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface HallucCase {
  id: string;
  question: string;
  /** respuesta SIN datos: fluida, específica y falsa */
  without: Seg[];
  /** respuesta CON la tabla inyectada al contexto */
  withData: {
    table: DataTable;
    answer: Seg[];
  };
}

export const CASES: HallucCase[] = [
  {
    id: 'margen-norte',
    question: '¿Cuál fue el margen de la región norte en marzo?',
    without: [
      { text: 'El margen de la región norte en marzo fue de ' },
      { text: '27.4%', invented: true },
      { text: ', un ' },
      { text: 'récord histórico para la zona', invented: true },
      { text: ', impulsado por ' },
      { text: 'la reducción de descuentos comerciales', invented: true },
      { text: '.' },
    ],
    withData: {
      table: {
        title: 'Margen por región — marzo',
        headers: ['Región', 'Margen', 'Var. vs feb'],
        rows: [
          ['Norte', '18.2%', '−0.8 pp'],
          ['Central', '22.5%', '+1.1 pp'],
          ['Sur', '19.7%', '+0.2 pp'],
        ],
      },
      answer: [
        { text: 'Según la tabla, el margen de la región norte en marzo fue de ' },
        { text: '18.2%', cell: [0, 1] },
        { text: ', con una caída de ' },
        { text: '0.8 puntos', cell: [0, 2] },
        { text: ' frente a febrero. La tabla no incluye información para explicar la causa.' },
      ],
    },
  },
  {
    id: 'region-top',
    question: '¿Cuál fue la región con más ventas en junio?',
    without: [
      { text: 'La región ' },
      { text: 'central', invented: true },
      { text: ' fue la de mayor venta en junio, con ' },
      { text: 'Q620,000', invented: true },
      { text: ' gracias a ' },
      { text: 'la campaña de medio año', invented: true },
      { text: '.' },
    ],
    withData: {
      table: {
        title: 'Ventas por región — junio',
        headers: ['Región', 'Ventas', 'Part.'],
        rows: [
          ['Norte', 'Q498,000', '43%'],
          ['Central', 'Q414,000', '36%'],
          ['Sur', 'Q233,000', '21%'],
        ],
      },
      answer: [
        { text: 'Con base en la tabla, la región con más ventas en junio fue ' },
        { text: 'Norte, con Q498,000', cell: [0, 1] },
        { text: ' (el ' },
        { text: '43% del total', cell: [0, 2] },
        { text: '). No tengo datos de campañas, así que no puedo afirmar la causa.' },
      ],
    },
  },
  {
    id: 'clientes-nuevos',
    question: '¿Cuántos clientes nuevos captamos este trimestre?',
    without: [
      { text: 'Este trimestre se captaron ' },
      { text: '1,240 clientes nuevos', invented: true },
      { text: ', un crecimiento de ' },
      { text: '18% interanual', invented: true },
      { text: ', concentrado en ' },
      { text: 'el segmento corporativo', invented: true },
      { text: '.' },
    ],
    withData: {
      table: {
        title: 'Clientes nuevos — trimestre',
        headers: ['Mes', 'Clientes nuevos'],
        rows: [
          ['Abril', '212'],
          ['Mayo', '198'],
          ['Junio', '241'],
        ],
      },
      answer: [
        { text: 'La tabla registra ' },
        { text: '212 en abril', cell: [0, 1] },
        { text: ', ' },
        { text: '198 en mayo', cell: [1, 1] },
        { text: ' y ' },
        { text: '241 en junio', cell: [2, 1] },
        { text: ': 651 clientes nuevos en el trimestre. No incluye el dato interanual ni el desglose por segmento, así que esa comparación no puede afirmarse.' },
      ],
    },
  },
];

// --- Mazo de triage de verificación ------------------------------------------

export type TriageBin = 'datos' | 'fuente' | 'seguro';

export interface Claim {
  id: string;
  /** afirmación tal como saldría de un LLM */
  text: string;
  bin: TriageBin;
  why: string;
}

export const BINS: { id: TriageBin; label: string; desc: string }[] = [
  {
    id: 'datos',
    label: 'Verificar contra los datos',
    desc: 'Cifras y hechos internos: se comprueban en la base o el dashboard.',
  },
  {
    id: 'fuente',
    label: 'Pedir la fuente',
    desc: 'Afirmaciones externas o causales: exigen evidencia antes de usarse.',
  },
  {
    id: 'seguro',
    label: 'Seguro por definición',
    desc: 'Definiciones y aritmética verificable a simple vista.',
  },
];

export const CLAIMS: Claim[] = [
  {
    id: 'c1',
    text: 'Las ventas de junio fueron Q1,145,000.',
    bin: 'datos',
    why: 'Es una cifra interna: se verifica en la base de datos, no se confía de memoria.',
  },
  {
    id: 'c2',
    text: 'El margen bruto es ingresos menos costo de ventas, dividido entre ingresos.',
    bin: 'seguro',
    why: 'Es una definición estándar: no depende de tus datos.',
  },
  {
    id: 'c3',
    text: 'La caída del canal físico se debe a la ola de calor de junio.',
    bin: 'fuente',
    why: 'Es una hipótesis causal: sin evidencia (tráfico, clima, ventas por día) no se afirma.',
  },
  {
    id: 'c4',
    text: 'La región central concentró el 38% de las ventas del mes.',
    bin: 'datos',
    why: 'Porcentaje interno: una consulta lo confirma o lo desmiente.',
  },
  {
    id: 'c5',
    text: 'El mercado de retail del país creció 12% este año.',
    bin: 'fuente',
    why: 'Dato externo: ¿de qué informe sale? Sin fuente citable no entra al reporte.',
  },
  {
    id: 'c6',
    text: 'Si las ventas fueron Q500,000 y los costos Q400,000, la utilidad bruta fue Q100,000.',
    bin: 'seguro',
    why: 'Aritmética a la vista: 500,000 − 400,000 = 100,000.',
  },
  {
    id: 'c7',
    text: 'Los clientes prefieren comprar en línea porque es más cómodo.',
    bin: 'fuente',
    why: 'Generalización sobre motivos: necesita encuestas o estudios, no intuición del modelo.',
  },
  {
    id: 'c8',
    text: 'El inventario de fin de mes registró quiebre de stock en 8 SKU.',
    bin: 'datos',
    why: 'Hecho interno verificable en el sistema de inventario.',
  },
];
