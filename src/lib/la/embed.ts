// Toy 2D "word embeddings" for the cosine-similarity island. Hand-placed (like
// rnn/tokens.ts) so the stories are exact: words cluster by angle, and the
// royalty parallelogram makes rey − hombre + mujer land exactly on reina.

import type { V2 } from '../svm/geometry';
import { add, sub, cosineSim } from './vec2';

export interface WordVec {
  word: string;
  v: V2;
}

export const WORDS: WordVec[] = [
  // animales (~25°)
  { word: 'gato', v: { x: 0.9, y: 0.5 } },
  { word: 'perro', v: { x: 1.0, y: 0.4 } },
  { word: 'pez', v: { x: 0.8, y: 0.25 } },
  // frutas (~75°)
  { word: 'manzana', v: { x: 0.25, y: 1.0 } },
  { word: 'naranja', v: { x: 0.35, y: 0.95 } },
  { word: 'uva', v: { x: 0.15, y: 0.85 } },
  // personas y realeza (semiplano izquierdo; el género es un desplazamiento
  // compartido: reina − rey = mujer − hombre = (0.4, −0.05) exactamente)
  { word: 'hombre', v: { x: -0.7, y: 0.2 } },
  { word: 'mujer', v: { x: -0.3, y: 0.15 } },
  { word: 'rey', v: { x: -0.8, y: 0.8 } },
  { word: 'reina', v: { x: -0.4, y: 0.75 } },
  { word: 'castillo', v: { x: -0.65, y: 0.95 } },
];

export function wordVec(word: string): V2 {
  const w = WORDS.find((e) => e.word === word);
  if (!w) throw new Error(`palabra desconocida: ${word}`);
  return w.v;
}

/** All words ranked by cosine similarity to an arbitrary query vector. */
export function rankByVector(q: V2, exclude?: string): { word: string; cos: number }[] {
  return WORDS.filter((e) => e.word !== exclude)
    .map((e) => ({ word: e.word, cos: cosineSim(q, e.v) }))
    .sort((a, b) => b.cos - a.cos);
}

/** Ranking of the words most similar to a given word (excluding itself). */
export function rankBySimilarity(word: string): { word: string; cos: number }[] {
  return rankByVector(wordVec(word), word);
}

/** Word analogy a − b + c (e.g. rey − hombre + mujer → reina). */
export function analogy(a: string, b: string, c: string): { target: V2; ranked: { word: string; cos: number }[] } {
  const target = add(sub(wordVec(a), wordVec(b)), wordVec(c));
  // Exclude the three input words, as word2vec demos do.
  const ranked = rankByVector(target).filter((r) => r.word !== a && r.word !== b && r.word !== c);
  return { target, ranked };
}
