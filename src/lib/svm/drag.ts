// Svelte action that makes the data points of an SVG draggable. Owns the pointer
// capture lifecycle and the pixel→data conversion once, so both the hyperplane
// and soft-margin components share a single, tested implementation.

import { clientToData, clamp, type Domain } from './geometry';

interface InvertibleScale {
  invert(pixel: number): number;
}

export interface DragConfig {
  /** Reactive list of points to mutate in place. */
  points: { x: number; y: number }[];
  dom: Domain;
  width: number;
  height: number;
  xScale: InvertibleScale;
  yScale: InvertibleScale;
  /** Currently dragged index, or -1. Reported back via onIndexChange. */
  onIndexChange: (i: number) => void;
}

/**
 * Use on the <svg> element: `use:draggablePoints={config}`. Point circles must
 * carry `data-drag-index="{i}"` so a pointerdown on them starts a drag.
 */
export function draggablePoints(svg: SVGSVGElement, config: DragConfig) {
  let cfg = config;
  let dragIndex = -1;

  function down(e: PointerEvent) {
    const target = e.target as Element | null;
    const attr = target?.getAttribute('data-drag-index');
    if (attr === null || attr === undefined) return;
    dragIndex = Number(attr);
    cfg.onIndexChange(dragIndex);
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function move(e: PointerEvent) {
    if (dragIndex < 0) return;
    const d = clientToData(svg, e.clientX, e.clientY, cfg.width, cfg.height, cfg.xScale, cfg.yScale);
    cfg.points[dragIndex].x = clamp(d.x, cfg.dom.xMin, cfg.dom.xMax);
    cfg.points[dragIndex].y = clamp(d.y, cfg.dom.yMin, cfg.dom.yMax);
  }
  function up(e: PointerEvent) {
    if (dragIndex >= 0 && svg.hasPointerCapture?.(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }
    dragIndex = -1;
    cfg.onIndexChange(-1);
  }

  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);

  return {
    update(next: DragConfig) {
      cfg = next;
    },
    destroy() {
      svg.removeEventListener('pointerdown', down);
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', up);
      svg.removeEventListener('pointercancel', up);
    },
  };
}
