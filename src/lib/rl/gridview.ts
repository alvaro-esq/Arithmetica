// Shared rendering scaffold for the Gridworld islands (value iteration, Bellman
// backup, stochastic transitions). The cell/pad layout, the value→opacity scale,
// the sign→color rule, and the policy-arrow geometry were duplicated identically
// across all three components; this is their single source of truth so retuning
// the color ramp or arrow shape touches one place, not three.

import { scaleLinear } from 'd3-scale';
import { SUCCESS, WARN } from '../svm/colors';
import type { Action } from './gridworld';

export interface GridLayout {
  width: number;
  height: number;
  gx: (c: number) => number;
  gy: (r: number) => number;
}

/** Pixel layout for an R×C grid of square `cell` px with `pad` px margin. */
export function gridLayout(R: number, C: number, cell: number, pad: number): GridLayout {
  return {
    width: C * cell + pad * 2,
    height: R * cell + pad * 2,
    gx: (c: number) => pad + c * cell,
    gy: (r: number) => pad + r * cell,
  };
}

/** |value| → fill-opacity, scaled to the current value range (diverging heatmap). */
export function valueOpacity(range: { min: number; max: number }) {
  const span = Math.max(Math.abs(range.min), Math.abs(range.max), 0.01);
  return scaleLinear().domain([0, span]).range([0.05, 0.78]);
}

/** Diverging color by sign: green toward the +goal, amber toward the −hazard. */
export function cellColor(v: number): string {
  return v >= 0 ? SUCCESS : WARN;
}

const DIRS: Record<Action, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export interface PolicyArrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  head: string;
}

/** A policy arrow centered in cell (r,c) pointing along action `a`: a shaft line
 *  plus a triangular head (`<polygon points>`), since the repo has no SVG markers. */
export function policyArrow(
  layout: GridLayout,
  cell: number,
  r: number,
  c: number,
  a: Action,
): PolicyArrow {
  const cxp = layout.gx(c) + cell / 2;
  const cyp = layout.gy(r) + cell / 2;
  const [dx, dy] = DIRS[a];
  const len = cell * 0.26;
  const x2 = cxp + dx * len;
  const y2 = cyp + dy * len;
  const hs = 6;
  const px = -dy * hs;
  const py = dx * hs;
  const head = `${x2 + dx * 7},${y2 + dy * 7} ${x2 - dx * 3 + px},${y2 - dy * 3 + py} ${x2 - dx * 3 - px},${y2 - dy * 3 - py}`;
  return { x1: cxp - dx * len, y1: cyp - dy * len, x2, y2, head };
}
