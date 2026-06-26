// 1-D convolution — the defining operation of a CNN, shown on a structured/time
// series signal rather than an image (the deck's emphasis). A small kernel slides
// over the signal and, at each position, outputs a weighted sum of the local window.
// Different kernels surface different patterns: edges, smoothing, sharpening.
// Pure and deterministic (the demo signal is seeded), so it stays SSR-safe.

import { mulberry32 } from '../svm/prng';

export interface Kernel {
  label: string;
  w: number[];
  note: string;
}

// Odd-length kernels so they center cleanly on each position.
export const KERNELS: Record<string, Kernel> = {
  edge: { label: 'Borde', w: [-1, 0, 1], note: 'Resalta los cambios bruscos (derivada): picos donde la señal salta.' },
  smooth: { label: 'Suavizado', w: [1 / 3, 1 / 3, 1 / 3], note: 'Promedia el vecindario: convierte saltos en rampas y reduce ruido.' },
  sharpen: { label: 'Realce', w: [-1, 3, -1], note: 'Acentúa el contraste local respecto de los vecinos.' },
  identity: { label: 'Identidad', w: [0, 1, 0], note: 'Devuelve la señal sin cambios — el filtro neutro.' },
};

/**
 * Slide `kernel` over `signal`, centered, with zero-padding at the borders, so the
 * output has the same length. out[i] = Σ_j signal[i + j − r]·kernel[j], r = ⌊K/2⌋.
 */
export function conv1d(signal: number[], kernel: number[]): number[] {
  const r = Math.floor(kernel.length / 2);
  const out: number[] = [];
  for (let i = 0; i < signal.length; i++) {
    let acc = 0;
    for (let j = 0; j < kernel.length; j++) {
      const idx = i + j - r;
      const v = idx < 0 || idx >= signal.length ? 0 : signal[idx];
      acc += v * kernel[j];
    }
    out.push(acc);
  }
  return out;
}

/** The dot product the island shows at the scrubbed position: the local window · kernel. */
export function windowAt(signal: number[], kernel: number[], i: number): { idx: number; s: number; k: number }[] {
  const r = Math.floor(kernel.length / 2);
  return kernel.map((k, j) => {
    const idx = i + j - r;
    const s = idx < 0 || idx >= signal.length ? 0 : signal[idx];
    return { idx, s, k };
  });
}

/**
 * A toy signal with two clear features: a flat-low → flat-high step and a single
 * spike, so the edge kernel produces visible responses and smoothing visibly
 * rounds them. Seeded noise keeps it from looking synthetic.
 */
export function demoSignal(n: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const stepAt = Math.floor(n * 0.35);
  const spikeAt = Math.floor(n * 0.72);
  return Array.from({ length: n }, (_, i) => {
    let v = i >= stepAt ? 1 : 0;
    if (i === spikeAt) v += 1.2;
    return v + (rng() - 0.5) * 0.08;
  });
}
