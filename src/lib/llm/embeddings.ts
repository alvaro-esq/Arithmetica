// Mini-embedder educativo en 2D: cada palabra de negocio tiene una posición
// autorada en un "mapa de significado" y una frase es el promedio de sus
// palabras conocidas. NO es un embedding real (esos tienen cientos de
// dimensiones), pero la intuición es exactamente esta: cerca = parecido.

export type Vec2 = [number, number];

// Ejes del mapa (0..10): x = finanzas ↔ personas; y = operación ↔ desempeño.
// Cuatro vecindarios: ventas/ingresos, costos/presupuesto, clientes, personal.
export const LEXICON: Record<string, Vec2> = {
  // ventas e ingresos (finanzas · desempeño)
  ventas: [2.0, 2.2],
  ingresos: [1.6, 2.6],
  facturación: [1.8, 3.0],
  facturacion: [1.8, 3.0],
  margen: [2.6, 2.8],
  meta: [2.4, 1.8],
  crecimiento: [2.8, 2.0],
  // costos y presupuesto (finanzas · operación)
  costos: [1.8, 7.6],
  gastos: [1.5, 7.9],
  presupuesto: [2.2, 7.2],
  inversión: [2.6, 6.8],
  inversion: [2.6, 6.8],
  // clientes (personas · desempeño)
  clientes: [7.8, 2.4],
  cliente: [7.8, 2.4],
  satisfacción: [8.4, 2.0],
  satisfaccion: [8.4, 2.0],
  quejas: [8.2, 3.2],
  retención: [6.9, 3.3],
  retencion: [6.9, 3.3],
  // personal (personas · operación)
  personal: [7.3, 7.1],
  empleados: [8.2, 7.4],
  rotación: [7.6, 8.0],
  rotacion: [7.6, 8.0],
  contrataciones: [8.4, 7.0],
  ausentismo: [8.9, 8.8],
  // operación / inventario (centro-operación)
  inventario: [4.8, 7.4],
  stock: [5.2, 7.8],
  entregas: [5.6, 6.8],
  logística: [5.0, 6.6],
  logistica: [5.0, 6.6],
};

/** Promedio de las palabras conocidas; null si ninguna palabra está en el léxico. */
export function embed(text: string): Vec2 | null {
  const words = text
    .toLowerCase()
    .replace(/[.,;:!?¿¡()"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const w of words) {
    const v = LEXICON[w];
    if (v) {
      sx += v[0];
      sy += v[1];
      n++;
    }
  }
  return n === 0 ? null : [sx / n, sy / n];
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Similitud 0..1 derivada de la distancia en el mapa (1 = mismo punto). */
export function similarity(a: Vec2, b: Vec2): number {
  return 1 / (1 + dist(a, b));
}

export interface Phrase {
  id: string;
  text: string;
  v: Vec2;
}

const phrase = (id: string, text: string): Phrase => ({ id, text, v: embed(text)! });

/** Frases de negocio ya "embebidas" en el mapa. */
export const PHRASES: Phrase[] = [
  phrase('p1', 'ventas de junio por región'),
  phrase('p2', 'ingresos del mes pasado'),
  phrase('p3', 'facturación acumulada del trimestre'),
  phrase('p4', 'margen y crecimiento por canal'),
  phrase('p5', 'gastos operativos del semestre'),
  phrase('p6', 'presupuesto de inversión 2026'),
  phrase('p7', 'quejas de clientes por servicio'),
  phrase('p8', 'satisfacción del cliente en tiendas'),
  phrase('p9', 'retención de clientes nuevos'),
  phrase('p10', 'rotación de personal en bodega'),
  phrase('p11', 'ausentismo de empleados por turno'),
  phrase('p12', 'contrataciones del área comercial'),
  phrase('p13', 'inventario y stock disponible'),
  phrase('p14', 'entregas y logística de la región sur'),
];

export interface Neighbor {
  phrase: Phrase;
  d: number;
  sim: number;
}

/** Las k frases más cercanas a un punto de consulta, ordenadas. */
export function nearest(q: Vec2, k: number, pool: Phrase[] = PHRASES): Neighbor[] {
  return pool
    .map((p) => ({ phrase: p, d: dist(q, p.v), sim: similarity(q, p.v) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
}

/** Consultas preset para los chips (todas resuelven dentro del léxico). */
export const PRESET_QUERIES = [
  '¿cómo van las ventas?',
  'ingresos y margen',
  'costos del área',
  'quejas de clientes',
  'rotación de empleados',
  'stock en bodega',
];
