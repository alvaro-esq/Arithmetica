// A small asymmetric "F" outline (unit-ish scale, counterclockwise). Being
// asymmetric it makes rotations, reflections and shears unmistakable — you can
// always tell what the matrix did to it.

import type { V2 } from '../svm/geometry';

export const GLYPH_F: V2[] = [
  { x: 0, y: 0 },
  { x: 0.35, y: 0 },
  { x: 0.35, y: 0.5 },
  { x: 0.85, y: 0.5 },
  { x: 0.85, y: 0.8 },
  { x: 0.35, y: 0.8 },
  { x: 0.35, y: 1.1 },
  { x: 1.05, y: 1.1 },
  { x: 1.05, y: 1.4 },
  { x: 0, y: 1.4 },
];
