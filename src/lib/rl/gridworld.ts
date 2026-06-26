// A small Gridworld MDP and its value iteration — the shared engine for all three
// RL islands. Everything is closed-form and deterministic given (grid, γ, slip):
// no PRNG, no Math.random, so the value function and policy are reproducible and
// SSR-safe. This is the classic Russell & Norvig setup: a goal (+1), a hazard (−1),
// an impassable wall, a small step cost, and optional "slip" that turns the
// transitions stochastic.

export type CellType = 'empty' | 'wall' | 'goal' | 'hazard';
export interface Cell {
  type: CellType;
  reward: number;
}
export type Grid = Cell[][];
export type Action = 'up' | 'down' | 'left' | 'right';
export interface Pos {
  r: number;
  c: number;
}

export const ACTIONS: Action[] = ['up', 'down', 'left', 'right'];
const MOVES: Record<Action, [number, number]> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const PERP: Record<Action, [Action, Action]> = {
  up: ['left', 'right'],
  down: ['left', 'right'],
  left: ['up', 'down'],
  right: ['up', 'down'],
};

const STEP_COST = -0.04;

/** The default 4×4 world: goal +1 at (0,3), hazard −1 at (1,3), wall at (1,1). */
export function defaultGrid(): Grid {
  const g: Grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ type: 'empty' as CellType, reward: STEP_COST })));
  g[0][3] = { type: 'goal', reward: 1 };
  g[1][3] = { type: 'hazard', reward: -1 };
  g[1][1] = { type: 'wall', reward: 0 };
  return g;
}

export function isTerminal(cell: Cell): boolean {
  return cell.type === 'goal' || cell.type === 'hazard';
}

/** Where action `a` lands from (r,c): bounce (stay) on walls/edges. */
function move(grid: Grid, r: number, c: number, a: Action): Pos {
  const [dr, dc] = MOVES[a];
  const nr = r + dr;
  const nc = c + dc;
  if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length || grid[nr][nc].type === 'wall') {
    return { r, c }; // bounce
  }
  return { r: nr, c: nc };
}

/**
 * Stochastic transitions: with probability (1 − slip) the agent goes where it
 * intended; with slip/2 it slips to each perpendicular direction. slip = 0 is the
 * deterministic world.
 */
export function transitions(grid: Grid, r: number, c: number, a: Action, slip: number): { to: Pos; p: number }[] {
  const out: { to: Pos; p: number }[] = [{ to: move(grid, r, c, a), p: 1 - slip }];
  for (const pa of PERP[a]) out.push({ to: move(grid, r, c, pa), p: slip / 2 });
  return out;
}

export interface BackupTerm {
  to: Pos;
  p: number;
  reward: number; // immediate reward R(s,a) for this transition
  contrib: number; // p · (R + γ·V(s'))
}
export interface Backup {
  q: number;
  terms: BackupTerm[];
}

/** Q(s,a) and its term-by-term decomposition Σ p·(R + γ·V(s')). */
export function bellmanBackup(grid: Grid, V: number[][], r: number, c: number, a: Action, gamma: number, slip: number): Backup {
  const reward = grid[r][c].reward;
  const terms = transitions(grid, r, c, a, slip).map(({ to, p }) => {
    const contrib = p * (reward + gamma * V[to.r][to.c]);
    return { to, p, reward, contrib };
  });
  return { q: terms.reduce((s, t) => s + t.contrib, 0), terms };
}

function bestAction(grid: Grid, V: number[][], r: number, c: number, gamma: number, slip: number): { q: number; a: Action } {
  let best = -Infinity;
  let ba: Action = 'up';
  for (const a of ACTIONS) {
    const q = bellmanBackup(grid, V, r, c, a, gamma, slip).q;
    if (q > best) {
      best = q;
      ba = a;
    }
  }
  return { q: best, a: ba };
}

export interface ValueResult {
  V: number[][];
  history: number[][][]; // V after each sweep (history[0] is the initial all-zeros)
  sweeps: number; // sweeps until convergence
}

/** Value iteration: V(s) ← max_a Q(s,a), swept until ‖ΔV‖∞ < eps (or `iters`). */
export function valueIteration(grid: Grid, gamma: number, slip: number, iters = 200, eps = 1e-6): ValueResult {
  const R = grid.length;
  const C = grid[0].length;
  let V: number[][] = grid.map((row) => row.map((cell) => (isTerminal(cell) ? cell.reward : 0)));
  const history: number[][][] = [V.map((row) => row.slice())];
  let sweeps = 0;
  for (let it = 0; it < iters; it++) {
    const nV = V.map((row) => row.slice());
    let delta = 0;
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const cell = grid[r][c];
        if (cell.type === 'wall' || isTerminal(cell)) continue;
        nV[r][c] = bestAction(grid, V, r, c, gamma, slip).q;
        delta = Math.max(delta, Math.abs(nV[r][c] - V[r][c]));
      }
    }
    V = nV;
    history.push(V.map((row) => row.slice()));
    sweeps = it + 1;
    if (delta < eps) break;
  }
  return { V, history, sweeps };
}

/** The greedy (argmax) action per cell; null for walls and terminal states. */
export function greedyPolicy(grid: Grid, V: number[][], gamma: number, slip: number): (Action | null)[][] {
  return grid.map((row, r) =>
    row.map((cell, c) => {
      if (cell.type === 'wall' || isTerminal(cell)) return null;
      return bestAction(grid, V, r, c, gamma, slip).a;
    }),
  );
}

/** Min/max of V over non-wall cells — for the diverging color scale. */
export function valueRange(grid: Grid, V: number[][]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c].type === 'wall') continue;
      min = Math.min(min, V[r][c]);
      max = Math.max(max, V[r][c]);
    }
  }
  return { min, max };
}
