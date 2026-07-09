// Text-to-SQL guionado: un esquema pequeño de BI, tres preguntas en español y
// el SQL "generado". El caso 2 luce perfecto pero está sutilmente mal — el
// punto de la lección: el SQL generado SIEMPRE se revisa antes de confiar.

export interface Table {
  name: string;
  columns: string[];
}

export const SCHEMA: Table[] = [
  { name: 'ventas', columns: ['id', 'fecha', 'region', 'canal', 'monto', 'estado', 'sku'] },
  { name: 'productos', columns: ['sku', 'nombre', 'categoria', 'costo'] },
  { name: 'clientes', columns: ['cliente_id', 'nombre', 'segmento', 'region'] },
  { name: 'metas', columns: ['mes', 'region', 'meta_monto'] },
];

export interface SchemaRef {
  table: string;
  column?: string;
}

export interface SqlCase {
  id: string;
  question: string;
  sql: string;
  /** tablas/columnas que el SQL usa (para iluminar el esquema) */
  usedRefs: SchemaRef[];
  /** null = el SQL es correcto; si no, la falla sutil */
  flaw: null | {
    desc: string;
    fixedSql: string;
    /** el número que cambia al corregir — la evidencia de que importaba */
    impact: string;
    /** refs adicionales que usa la versión corregida */
    extraRefs: SchemaRef[];
  };
  /** explicación pedagógica al revelar */
  explain: string;
}

export const SQL_CASES: SqlCase[] = [
  {
    id: 'ventas-region',
    question: '¿Cuánto vendimos por región en junio?',
    sql: "SELECT region, SUM(monto) AS total\nFROM ventas\nWHERE fecha BETWEEN '2026-06-01' AND '2026-06-30'\n  AND estado = 'completada'\nGROUP BY region\nORDER BY total DESC;",
    usedRefs: [
      { table: 'ventas' },
      { table: 'ventas', column: 'region' },
      { table: 'ventas', column: 'monto' },
      { table: 'ventas', column: 'fecha' },
      { table: 'ventas', column: 'estado' },
    ],
    flaw: null,
    explain:
      'Correcto: filtra el mes, excluye devoluciones con estado = "completada" y agrupa por región. Fíjate que el filtro de estado NO estaba en la pregunta — el modelo lo dedujo del esquema. Esa deducción hay que verificarla siempre.',
  },
  {
    id: 'cumplimiento-meta',
    question: '¿Qué regiones cumplieron su meta de junio?',
    sql: "SELECT v.region, SUM(v.monto) AS total, m.meta_monto\nFROM ventas v\nJOIN metas m ON m.region = v.region AND m.mes = '2026-06'\nWHERE v.fecha BETWEEN '2026-06-01' AND '2026-06-30'\nGROUP BY v.region, m.meta_monto\nHAVING SUM(v.monto) >= m.meta_monto;",
    usedRefs: [
      { table: 'ventas' },
      { table: 'ventas', column: 'region' },
      { table: 'ventas', column: 'monto' },
      { table: 'ventas', column: 'fecha' },
      { table: 'metas' },
      { table: 'metas', column: 'mes' },
      { table: 'metas', column: 'region' },
      { table: 'metas', column: 'meta_monto' },
    ],
    flaw: {
      desc: 'Suma TODAS las filas de ventas — incluidas las devoluciones (estado = "devuelta"). Infla los totales ~6% y hace que la región sur "cumpla" una meta que en realidad no alcanzó.',
      fixedSql:
        "SELECT v.region, SUM(v.monto) AS total, m.meta_monto\nFROM ventas v\nJOIN metas m ON m.region = v.region AND m.mes = '2026-06'\nWHERE v.fecha BETWEEN '2026-06-01' AND '2026-06-30'\n  AND v.estado = 'completada'\nGROUP BY v.region, m.meta_monto\nHAVING SUM(v.monto) >= m.meta_monto;",
      impact: 'Con devoluciones: 3 regiones "cumplen". Sin devoluciones: solo 2 — la región sur queda fuera.',
      extraRefs: [{ table: 'ventas', column: 'estado' }],
    },
    explain:
      'El SQL corre sin errores, tiene JOIN correcto y hasta HAVING bien usado — LUCE profesional. Pero omite el filtro de devoluciones que el caso 1 sí tenía. Una consulta que ejecuta y devuelve filas razonables puede seguir estando mal: la validación es de NEGOCIO, no de sintaxis.',
  },
  {
    id: 'margen-categoria',
    question: '¿Cuál es el margen por categoría de producto este año?',
    sql: "SELECT p.categoria,\n       SUM(v.monto - p.costo) AS margen\nFROM ventas v\nJOIN productos p ON p.sku = v.sku\nWHERE v.fecha >= '2026-01-01'\n  AND v.estado = 'completada'\nGROUP BY p.categoria;",
    usedRefs: [
      { table: 'ventas' },
      { table: 'ventas', column: 'monto' },
      { table: 'ventas', column: 'sku' },
      { table: 'ventas', column: 'fecha' },
      { table: 'ventas', column: 'estado' },
      { table: 'productos' },
      { table: 'productos', column: 'sku' },
      { table: 'productos', column: 'categoria' },
      { table: 'productos', column: 'costo' },
    ],
    flaw: null,
    explain:
      'Correcto — asumiendo que cada fila de ventas es UNA unidad. Si existiera una columna cantidad, el margen debería ser monto − costo × cantidad. La pregunta que un analista le hace al esquema antes de aprobar: ¿qué granularidad tiene la tabla?',
  },
];
