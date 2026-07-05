<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { blobs } from '../../lib/svm/datasets';
  import { lineSegment, signedDistance, norm, clamp, type Domain } from '../../lib/svm/geometry';
  import { draggablePoints } from '../../lib/svm/drag';
  import { pegasos } from '../../lib/svm/solvers';
  import { POS, NEG, ACCENT, AXIS, PAPER } from '../../lib/svm/colors';
  import Celebrate from '../ui/Celebrate.svelte';

  // Drag the points or rotate / shift the decision line and watch the margin.
  // Support vectors (the closest point on each side) light up; the margin band
  // is the strip between them. "Margen máximo" animates to the SVM optimum.

  let points = $state(blobs(28, 5, 2.6, 0.65));
  const dom: Domain = { xMin: -5, xMax: 5, yMin: -3.2, yMax: 3.2 };

  const width = 600;
  const height = 400;
  const pad = 40;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  // Single source of truth: the tweens. Sliders write them instantly; snapToMax
  // animates them. The label, slider thumb, line and readouts all read the same
  // tween value, so they never disagree — even mid-animation.
  const thetaT = new Tween(1.45, { duration: 450, easing: cubicOut });
  const offsetT = new Tween(0, { duration: 450, easing: cubicOut });
  let theta = $derived(thetaT.current);
  let offset = $derived(offsetT.current);

  // Line as unit normal (cos θ, sin θ) so signed distance = w·x + b directly.
  let w = $derived({ x: Math.cos(theta), y: Math.sin(theta) });
  let b = $derived(offset);
  let dists = $derived(points.map((p) => p.label * signedDistance(w, b, p)));

  // Per-class nearest distance defines the margin band edges & support vectors.
  let mPosC = $derived(
    Math.min(...points.filter((p) => p.label === 1).map((p) => signedDistance(w, b, p))),
  );
  let mNeg = $derived(
    Math.min(...points.filter((p) => p.label === -1).map((p) => -signedDistance(w, b, p))),
  );

  let allCorrect = $derived(dists.every((d) => d > 0));
  let margin = $derived(mPosC + mNeg);

  let decisionSeg = $derived(lineSegment(w, b, 0, dom));
  let posEdge = $derived(lineSegment(w, b, mPosC, dom));
  let negEdge = $derived(lineSegment(w, b, -mNeg, dom));
  let bandPath = $derived(
    [posEdge[0], posEdge[1], negEdge[1], negEdge[0]]
      .map((p) => `${xScale(p.x)},${yScale(p.y)}`)
      .join(' '),
  );

  // Only mark support vectors when the line actually separates the classes;
  // otherwise the per-class nearest distance is meaningless (it points at the
  // worst-misclassified point, not a true support vector).
  function isSupport(i: number): boolean {
    if (!allCorrect) return false;
    const side = points[i].label === 1 ? mPosC : mNeg;
    return Math.abs(dists[i] - side) < 0.04;
  }

  let celebrate = $state(false);
  function snapToMax() {
    const m = pegasos(points, 1e6); // large C ≈ hard margin
    const nrm = norm(m.w) || 1;
    // The line is identical under (w,b) → (−w,−b); fold the angle into the slider's
    // [0, π] range (negating the offset with it) so the thumb/label stay in sync.
    let th = Math.atan2(m.w.y, m.w.x);
    let off = m.b / nrm;
    if (th < 0) {
      th += Math.PI;
      off = -off;
    }
    thetaT.set(th);
    offsetT.set(clamp(off, -3, 3));
    // Milestone: the optimum actually separates the data. Celebrate the peak.
    const solved = points.every((p) => p.label * signedDistance(m.w, m.b, p) > 0);
    if (solved) {
      celebrate = false;
      queueMicrotask(() => (celebrate = true)); // re-arm the rising edge
    }
  }

  // Dragging is handled by the shared `draggablePoints` action.
  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => (dragIndex = i),
  });
</script>

<div class="space-y-4">
  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none aspect-[3/2] animate-fade-up"
  >
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- margin band -->
    <polygon points={bandPath} fill={ACCENT} fill-opacity="0.08" />
    <line x1={xScale(posEdge[0].x)} y1={yScale(posEdge[0].y)} x2={xScale(posEdge[1].x)} y2={yScale(posEdge[1].y)} stroke={ACCENT} stroke-width="1.5" stroke-dasharray="5 5" opacity="0.6" />
    <line x1={xScale(negEdge[0].x)} y1={yScale(negEdge[0].y)} x2={xScale(negEdge[1].x)} y2={yScale(negEdge[1].y)} stroke={ACCENT} stroke-width="1.5" stroke-dasharray="5 5" opacity="0.6" />

    <!-- decision line -->
    <line x1={xScale(decisionSeg[0].x)} y1={yScale(decisionSeg[0].y)} x2={xScale(decisionSeg[1].x)} y2={yScale(decisionSeg[1].y)} stroke={ACCENT} stroke-width="3" />

    <!-- support-vector halos -->
    {#each points as p, i}
      {#if isSupport(i)}
        <circle cx={xScale(p.x)} cy={yScale(p.y)} r="14" fill="none" stroke={ACCENT} stroke-width="2" opacity="0.28" />
      {/if}
    {/each}

    <!-- points -->
    {#each points as p, i}
      <circle
        cx={xScale(p.x)}
        cy={yScale(p.y)}
        r={dragIndex === i ? (isSupport(i) ? 11 : 8) : isSupport(i) ? 9 : 6}
        fill={p.label === 1 ? POS : NEG}
        stroke={isSupport(i) ? ACCENT : PAPER}
        stroke-width={isSupport(i) ? 3 : 1.5}
        style="cursor: {dragIndex === i ? 'grabbing' : 'grab'}; touch-action: none;"
        data-drag-index={i}
      />
    {/each}
  </svg>

  <p class="text-xs text-muted">Arrastra los puntos para ver cómo cambian los vectores de soporte y el margen.</p>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      Ángulo θ: {theta.toFixed(2)} rad
      <input type="range" value={theta} oninput={(e) => thetaT.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="0" max="3.14159" step="0.01" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Sesgo b: {offset.toFixed(2)}
      <input type="range" value={offset} oninput={(e) => offsetT.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="-3" max="3" step="0.05" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-ink">
    <span>
      Ancho del margen:
      <strong style="color: {ACCENT}">{allCorrect ? margin.toFixed(3) : '—'}</strong>
      {#if !allCorrect}<span class="text-copper"> (hay puntos mal clasificados)</span>{/if}
    </span>
    <div class="flex items-center gap-3">
      <Celebrate active={celebrate} label="¡Margen máximo!" />
      <button
        onclick={snapToMax}
        class="rounded-md px-4 py-2 text-sm font-medium text-paper shadow-card hover:shadow-card-hover hover:bg-interactive-soft"
        style="background-color: {ACCENT}"
      >
        Margen máximo
      </button>
    </div>
  </div>
</div>
