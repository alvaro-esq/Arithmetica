<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { blobs, type Point } from '../../lib/svm/datasets';
  import { lineSegment, perpendicularFoot, signedDistance, norm, type Domain } from '../../lib/svm/geometry';
  import { draggablePoints } from '../../lib/svm/drag';
  import { pegasos } from '../../lib/svm/solvers';
  import { POS, NEG, ACCENT, AXIS, PAPER } from '../../lib/svm/colors';

  // Soft-margin SVM: with overlapping classes a perfect split is impossible.
  // Slack ξᵢ = max(0, 1 − yᵢ(w·xᵢ+b)) measures each violation. The C slider sets
  // the price of those violations, and dragging a point re-solves the line live.

  // Overlapping blobs so soft margin actually matters.
  let points = $state<Point[]>(blobs(34, 11, 1.5, 0.85));
  const dom: Domain = { xMin: -4.5, xMax: 4.5, yMin: -3.2, yMax: 3.2 };

  const width = 600;
  const height = 400;
  const pad = 40;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  let logC = $state(0); // C = 10^logC
  let C = $derived(Math.pow(10, logC));

  // Pegasos at 4000 iterations costs ~0.1 ms for this point count, so we solve
  // at full fidelity on every change — the line follows the drag smoothly and
  // there is no visible "snap" when the pointer is released.
  let model = $derived(pegasos(points, C, 4000));
  let w = $derived(model.w);
  let b = $derived(model.b);
  let wNorm = $derived(norm(w) || 1e-9);

  // Slack per point and the two halves of the objective J = ½‖w‖² + C·Σξ.
  let slacks = $derived(points.map((p) => Math.max(0, 1 - p.label * signedDistance(w, b, p))));
  let sumSlack = $derived(slacks.reduce((a, v) => a + v, 0));
  let marginTerm = $derived(0.5 * wNorm * wNorm);
  let penaltyTerm = $derived(C * sumSlack);
  let geomMargin = $derived(1 / wNorm);

  let decisionSeg = $derived(lineSegment(w, b, 0, dom));
  let posEdge = $derived(lineSegment(w, b, 1, dom));
  let negEdge = $derived(lineSegment(w, b, -1, dom));

  // Slack segment: from a violating point to its own class margin edge w·x+b = yᵢ.
  function slackSeg(p: Point) {
    return perpendicularFoot(w, b, p.label, p);
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
    class="w-full touch-none select-none aspect-[3/2]"
  >
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- margin edges -->
    <line x1={xScale(posEdge[0].x)} y1={yScale(posEdge[0].y)} x2={xScale(posEdge[1].x)} y2={yScale(posEdge[1].y)} stroke={ACCENT} stroke-width="1.5" stroke-dasharray="5 5" opacity="0.55" />
    <line x1={xScale(negEdge[0].x)} y1={yScale(negEdge[0].y)} x2={xScale(negEdge[1].x)} y2={yScale(negEdge[1].y)} stroke={ACCENT} stroke-width="1.5" stroke-dasharray="5 5" opacity="0.55" />
    <!-- decision line -->
    <line x1={xScale(decisionSeg[0].x)} y1={yScale(decisionSeg[0].y)} x2={xScale(decisionSeg[1].x)} y2={yScale(decisionSeg[1].y)} stroke={ACCENT} stroke-width="3" />

    <!-- slack segments for violating points -->
    {#each points as p, i}
      {#if slacks[i] > 1e-3}
        {@const foot = slackSeg(p)}
        <line x1={xScale(p.x)} y1={yScale(p.y)} x2={xScale(foot.x)} y2={yScale(foot.y)} stroke={ACCENT} stroke-width="1.5" opacity="0.5" />
      {/if}
    {/each}

    <!-- halos on violating (slack > 0) points -->
    {#each points as p, i}
      {#if slacks[i] > 1e-3}
        <circle cx={xScale(p.x)} cy={yScale(p.y)} r="13" fill="none" stroke={ACCENT} stroke-width="2" opacity="0.25" />
      {/if}
    {/each}

    <!-- points -->
    {#each points as p, i}
      <circle
        cx={xScale(p.x)}
        cy={yScale(p.y)}
        r={dragIndex === i ? 8 : 6}
        fill={p.label === 1 ? POS : NEG}
        stroke={slacks[i] > 1e-3 ? ACCENT : PAPER}
        stroke-width={slacks[i] > 1e-3 ? 2 : 1.5}
        style="cursor: {dragIndex === i ? 'grabbing' : 'grab'}; touch-action: none;"
        data-drag-index={i}
      />
    {/each}
  </svg>

  <p class="text-xs text-[#666]">Arrastra los puntos y la recta óptima se recalcula al instante.</p>

  <label class="block text-sm font-medium text-ink">
    Parámetro de regularización C: {C >= 10 ? C.toFixed(0) : C.toFixed(2)}
    <input type="range" bind:value={logC} min="-2" max="2" step="0.05" class="mt-1 w-full accent-interactive" />
    <span class="mt-1 block text-xs font-normal text-[#666]">C bajo → margen ancho, más tolerancia · C alto → ajusta cada punto</span>
  </label>

  <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink sm:grid-cols-4">
    <span>Margen 1/‖w‖: <strong>{geomMargin.toFixed(3)}</strong></span>
    <span>Σξᵢ: <strong>{sumSlack.toFixed(2)}</strong></span>
    <span>½‖w‖²: <strong>{marginTerm.toFixed(2)}</strong></span>
    <span>C·Σξ: <strong style="color: {ACCENT}">{penaltyTerm.toFixed(2)}</strong></span>
  </div>
</div>
