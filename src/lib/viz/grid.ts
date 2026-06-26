// Shared decision-region grid geometry. Several visualizations shade a square
// domain by sampling a classifier at each cell center and drawing a tinted rect;
// the per-cell sizing math (with the tiny seam overlap that hides anti-alias
// gaps between rects) was copy-pasted across five components and had already
// drifted. This centralizes it: callers supply how to sample/fill a cell.

import type { ScaleLinear } from 'd3-scale';

export type Scale = ScaleLinear<number, number>;
export interface GridDomain {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface GridCell {
  /** data-space center, where the classifier should be sampled */
  cx: number;
  cy: number;
  /** pixel-space rect (with seam overlap baked in) */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Yield one GridCell per cell of a GRID×GRID partition of `dom`, in pixel space.
 *  `seam` (default 0.6px) overlaps adjacent rects to avoid hairline gaps. */
export function gridCells(
  dom: GridDomain,
  grid: number,
  xScale: Scale,
  yScale: Scale,
  seam = 0.6,
): GridCell[] {
  // Independent x/y cell sizes so a non-square domain still tiles exactly. Using
  // one stride for both axes (the old code) only covered `dom` when xRange==yRange.
  const cwX = (dom.xMax - dom.xMin) / grid;
  const cwY = (dom.yMax - dom.yMin) / grid;
  const cells: GridCell[] = [];
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x0 = dom.xMin + gx * cwX;
      const y0 = dom.yMin + gy * cwY;
      cells.push({
        cx: x0 + 0.5 * cwX,
        cy: y0 + 0.5 * cwY,
        x: xScale(x0),
        y: yScale(y0 + cwY),
        w: xScale(x0 + cwX) - xScale(x0) + seam,
        h: yScale(y0) - yScale(y0 + cwY) + seam,
      });
    }
  }
  return cells;
}
