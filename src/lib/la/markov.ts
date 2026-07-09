// Markov chains on a tiny web graph — the math behind mini-PageRank. Row
// convention: P[i][j] is the probability of jumping from page i to page j, and
// the distribution updates as πₜ₊₁ = πₜ P (row vector times matrix).

export interface WebGraph {
  nodes: string[];
  /** out[i] = indices of the pages that page i links to */
  out: number[][];
}

/**
 * The damped ("Google") transition matrix: follow a link with probability d,
 * teleport uniformly with probability 1 − d. Dangling pages (no out-links)
 * teleport always — without this fix they would swallow probability.
 */
export function googleMatrix(g: WebGraph, damping: number): number[][] {
  const n = g.nodes.length;
  return g.out.map((links) => {
    const row = new Array<number>(n).fill((1 - damping) / n);
    if (links.length === 0) {
      for (let j = 0; j < n; j++) row[j] += damping / n;
    } else {
      for (const j of links) row[j] += damping / links.length;
    }
    return row;
  });
}

function stepPi(pi: number[], P: number[][]): number[] {
  const n = pi.length;
  const next = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const pii = pi[i];
    if (pii === 0) continue;
    for (let j = 0; j < n; j++) next[j] += pii * P[i][j];
  }
  return next;
}

/** Full trajectory π₀ (uniform), π₁, … π_steps — feed to stepLoop to animate. */
export function stationaryTrace(P: number[][], steps: number): number[][] {
  const n = P.length;
  let pi = new Array<number>(n).fill(1 / n);
  const out = [pi];
  for (let k = 0; k < steps; k++) {
    pi = stepPi(pi, P);
    out.push(pi);
  }
  return out;
}

/** Iterate to the stationary distribution (the λ = 1 eigenvector of Pᵀ). */
export function stationary(P: number[][], tol = 1e-12, maxIter = 500): { pi: number[]; iters: number } {
  const n = P.length;
  let pi = new Array<number>(n).fill(1 / n);
  for (let k = 1; k <= maxIter; k++) {
    const next = stepPi(pi, P);
    let diff = 0;
    for (let j = 0; j < n; j++) diff = Math.max(diff, Math.abs(next[j] - pi[j]));
    pi = next;
    if (diff < tol) return { pi, iters: k };
  }
  return { pi, iters: maxIter };
}

/**
 * Default demo web. Tienda collects the most links, Inicio recycles Tienda's
 * mass, Ayuda/Perfil have no in-links (teleport floor), and Perfil is dangling.
 * Expected ranking with d = 0.85: Tienda > Inicio > Blog > Ayuda ≈ Perfil.
 */
export const PAGERANK_DEMO: WebGraph = {
  nodes: ['Inicio', 'Blog', 'Tienda', 'Ayuda', 'Perfil'],
  out: [[1, 2], [2], [0], [0, 2], []],
};

export interface GraphPreset {
  id: string;
  label: string;
  graph: WebGraph;
}

export const PAGERANK_PRESETS: GraphPreset[] = [
  { id: 'demo', label: 'Sitio web', graph: PAGERANK_DEMO },
  {
    id: 'cadena',
    label: 'Cadena',
    graph: { nodes: ['A', 'B', 'C', 'D', 'E'], out: [[1], [2], [3], [4], []] },
  },
  {
    id: 'estrella',
    label: 'Estrella',
    graph: { nodes: ['Hub', 'B', 'C', 'D', 'E'], out: [[1, 2, 3, 4], [0], [0], [0], [0]] },
  },
  {
    // Spam1/Spam2 link only to each other: with strong damping they trap the
    // walker and hoard rank — the reason the teleport term exists.
    id: 'granja',
    label: 'Granja de enlaces',
    graph: {
      nodes: ['Inicio', 'Blog', 'Tienda', 'Spam1', 'Spam2'],
      out: [[1, 2], [2], [0, 3], [4], [3]],
    },
  },
];
