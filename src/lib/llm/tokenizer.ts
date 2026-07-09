// Tokenizador educativo estilo BPE, determinista y sin dependencias.
// NO es el tokenizador de ningún modelo real: aproxima el comportamiento
// (palabras frecuentes = 1 token, palabras largas se parten en subwords,
// números en grupos de ≤3 dígitos) calibrado para español (~3-4 chars/token).
// Concatenar `text` de todos los tokens reproduce la entrada exacta.

export type TokenKind = 'word' | 'subword' | 'number' | 'punct';

export interface Token {
  /** texto exacto, incluye el espacio previo si lo había (como los BPE reales) */
  text: string;
  /** hash estable del contenido (sin espacio, minúsculas) — para colorear chips */
  id: number;
  kind: TokenKind;
  /** offset del primer carácter en el texto original */
  start: number;
}

// ~300 palabras frecuentes del español + vocabulario BI: cuestan 1 token.
const VOCAB = new Set(
  (
    'el la los las un una unos unas de del al a ante bajo con contra desde en entre hacia hasta para por según sin sobre tras ' +
    'y o u e ni que como cuando donde mientras porque aunque si no sí ya más menos muy mucho poco todo toda todos todas ' +
    'es son era eran fue fueron ser estar está están estaba estaban hay había habrá tiene tienen tenía tuvo puede pueden podría debe deben ' +
    'yo tú él ella ellos ellas nosotros usted ustedes se le les lo me te nos mi tu su sus este esta estos estas ese esa esos esas eso esto ' +
    'pero también además entonces luego ahora antes después ayer hoy mañana siempre nunca cada otro otra otros otras mismo misma ' +
    'año años mes meses semana semanas día días hora horas trimestre semestre periodo período fecha ' +
    'uno dos tres cuatro cinco seis siete ocho nueve diez cien mil millón millones por ciento porciento ' +
    'ventas venta ingresos ingreso costos costo gastos gasto margen utilidad precio precios cliente clientes producto productos ' +
    'región regiones zona zonas canal canales tienda tiendas mercado datos dato tabla tablas reporte reportes resumen análisis ' +
    'meta metas objetivo objetivos crecimiento caída variación promedio total totales cifra cifras resultado resultados ' +
    'norte sur este oeste central occidente oriente ' +
    'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre ' +
    'empresa negocio gerente equipo área dashboard modelo lenguaje contexto pregunta respuesta texto palabra palabras ' +
    'bueno buena mejor peor mayor menor alto alta baja bajo nuevo nueva gran grande primer primero segunda segundo último última ' +
    'hacer hace hizo dar da dio ver ve vio ir va fue decir dice dijo saber sabe pedir pide creer cree deber debía querer quiere ' +
    'subió bajó creció cayó aumentó disminuyó mejoró empeoró mostró muestra muestran indica indican compara comparado respecto frente ' +
    'guatemala quetzal quetzales dólar dólares'
  )
    .split(/\s+/)
    .filter(Boolean),
);

// Sufijos frecuentes del español (de más largo a más corto) — imitan merges BPE.
const SUFFIXES = [
  'izaciones', 'ización', 'amientos', 'amiento', 'imientos', 'imiento',
  'aciones', 'ación', 'iciones', 'ición', 'siones', 'sión', 'ciones', 'ción',
  'idades', 'idad', 'mente', 'adores', 'adora', 'ador', 'ística', 'ístico',
  'ieron', 'aron', 'ando', 'iendo', 'encia', 'ancia', 'ables', 'able', 'ibles', 'ible',
  'aban', 'aba', 'ados', 'adas', 'ado', 'ada', 'idos', 'idas', 'ido', 'ida',
  'emos', 'amos', 'imos', 'arán', 'erán', 'irán', 'ará', 'erá', 'irá',
  'oso', 'osa', 'eza', 'ista', 'ismo',
];

const CHUNK = 4; // tamaño de pedazo para lo que no matchea nada

/** FNV-1a de 32 bits sobre el contenido normalizado — color estable por token. */
export function tokenId(text: string): number {
  const s = text.trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const isLetter = (c: string) => /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(c);
const isDigit = (c: string) => c >= '0' && c <= '9';
const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

/** Parte una palabra (sin espacio) en piezas subword. */
function splitWord(word: string): string[] {
  if (VOCAB.has(word.toLowerCase()) || word.length <= CHUNK) return [word];
  // intenta despegar UN sufijo conocido, dejando una raíz de ≥3 chars
  let stem = word;
  let suffix = '';
  const lower = word.toLowerCase();
  for (const suf of SUFFIXES) {
    if (lower.endsWith(suf) && word.length - suf.length >= 3) {
      stem = word.slice(0, word.length - suf.length);
      suffix = word.slice(word.length - suf.length);
      break;
    }
  }
  const pieces: string[] = [];
  // la raíz: si es vocabulario, entera; si no, en pedazos de CHUNK
  if (VOCAB.has(stem.toLowerCase()) || stem.length <= CHUNK + 1) {
    pieces.push(stem);
  } else {
    for (let i = 0; i < stem.length; i += CHUNK) pieces.push(stem.slice(i, i + CHUNK));
    // evita un pedazo final de 1 carácter: fusiónalo con el anterior
    const last = pieces[pieces.length - 1];
    if (last.length === 1 && pieces.length > 1) {
      pieces.pop();
      pieces[pieces.length - 1] += last;
    }
  }
  if (suffix) pieces.push(suffix);
  return pieces;
}

/** Parte una racha de dígitos en grupos de ≤3 (como los tokenizadores reales). */
function splitDigits(run: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < run.length; i += 3) out.push(run.slice(i, i + 3));
  return out;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let pendingSpace = ''; // espacios se pegan al siguiente token, como en BPE
  let pendingStart = 0;

  const push = (raw: string, kind: TokenKind, start: number) => {
    const full = pendingSpace + raw;
    tokens.push({ text: full, id: tokenId(raw), kind, start: pendingSpace ? pendingStart : start });
    pendingSpace = '';
  };

  while (i < text.length) {
    const c = text[i];
    if (isSpace(c)) {
      let j = i;
      while (j < text.length && isSpace(text[j])) j++;
      if (pendingSpace === '') pendingStart = i;
      pendingSpace += text.slice(i, j);
      i = j;
      continue;
    }
    if (isLetter(c)) {
      let j = i;
      while (j < text.length && isLetter(text[j])) j++;
      const word = text.slice(i, j);
      const pieces = splitWord(word);
      let off = i;
      for (let k = 0; k < pieces.length; k++) {
        push(pieces[k], pieces.length === 1 ? 'word' : 'subword', off);
        off += pieces[k].length;
      }
      i = j;
      continue;
    }
    if (isDigit(c)) {
      let j = i;
      while (j < text.length && isDigit(text[j])) j++;
      const run = text.slice(i, j);
      let off = i;
      for (const g of splitDigits(run)) {
        push(g, 'number', off);
        off += g.length;
      }
      i = j;
      continue;
    }
    // puntuación / símbolo / emoji: un token por unidad de código visible
    const cp = text.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    push(ch, 'punct', i);
    i += ch.length;
  }
  // espacios colgantes al final
  if (pendingSpace) {
    tokens.push({ text: pendingSpace, id: tokenId(' '), kind: 'punct', start: pendingStart });
  }
  return tokens;
}

export function countTokens(text: string): number {
  return tokenize(text).length;
}

export function charsPerToken(text: string): number {
  const n = countTokens(text);
  return n === 0 ? 0 : text.length / n;
}
