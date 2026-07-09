// 12×12 grayscale pixel art for the "an image IS a matrix" island. Values in
// [0, 255], authored as character rows so the drawing is visible in the source.

const ROWS = [
  '............',
  '...XXXXXX...',
  '..XXXXXXXX..',
  '.XXoXXXXoXX.',
  '.XXoXXXXoXX.',
  '.XXXXXXXXXX.',
  '.XcXXXXXXcX.',
  '.XXmXXXXmXX.',
  '..XXmmmmXX..',
  '..XXXXXXXX..',
  '...XXXXXX...',
  '............',
];

const LEVELS: Record<string, number> = {
  '.': 235, // fondo
  X: 185, // cara
  o: 30, // ojos
  m: 60, // boca
  c: 140, // mejillas
};

export const SMILEY: number[][] = ROWS.map((row) => [...row].map((ch) => LEVELS[ch]));
