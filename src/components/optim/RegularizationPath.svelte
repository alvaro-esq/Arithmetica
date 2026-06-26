<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { draggablePoints } from '../../lib/svm/drag';
  import { type Domain } from '../../lib/svm/geometry';
  import { gridCells } from '../../lib/viz/grid';
  import { lossQuad, constrainedOptimum, constraintPolygon, type RegKind, type Aniso } from '../../lib/optim/regularization';
  import { ACCENT, POS, SUCCESS, AXIS, PAPER, MUTED } from '../../lib/svm/colors';

  // Why L1 produces sparsity, seen from above. The loss is an elliptical bowl; the
  // budget is an L1 diamond or L2 circle around the origin. Drag the bowl's center
  // (the unconstrained optimum) and shrink the budget: the L1 corners pull the
  // solution onto an axis (a weight becomes exactly 0), while the round L2 region
  // only shrinks it. That corner-snapping is sparsity.

  let kind = $state<RegKind>('l1');
  let budget = $state(0.9);
  let center = $state([{ x: 1.5, y: 0.6 }]);
  let dragIndex = $state(-1);

  const A: Aniso = { a: 1, b: 0.45 };
  const dom: Domain = { xMin: -2.2, xMax: 2.2, yMin: -2.2, yMax: 2.2 };
  const width = 440;
  const height = 440;
  const pad = 34;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  let loss = $derived(lossQuad(center[0], A));
  let opt = $derived(constrainedOptimum(center[0], budget, kind, A));
  let poly = $derived(constraintPolygon(budget, kind, 96));
  let sparse = $derived(opt.zeroedCoord !== null);

  const cells = gridCells(dom, 44, xScale, yScale);
  let lossCells = $derived.by(() => {
    const vals = cells.map((c) => loss(c.cx, c.cy));
    const hi = Math.max(...vals) || 1;
    return cells.map((c, i) => ({ ...c, t: vals[i] / hi }));
  });

  let polyStr = $derived(poly.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(' '));

  let dragCfg = $derived({
    points: center,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => (dragIndex = i),
  });

  const kinds: { key: RegKind; label: string }[] = [
    { key: 'l1', label: 'L1 (Lasso)' },
    { key: 'l2', label: 'L2 (Ridge)' },
    { key: 'elastic', label: 'Elastic Net' },
  ];
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-2">
    {#each kinds as k}
      <button
        class="rounded-md border px-3 py-1.5 text-sm font-medium"
        style={kind === k.key ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${AXIS}`}
        onclick={() => (kind = k.key)}
      >
        {k.label}
      </button>
    {/each}
  </div>

  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none aspect-square"
  >
    <!-- loss contours -->
    {#each lossCells as c}
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={ACCENT} fill-opacity={0.05 + (1 - c.t) * 0.22} />
    {/each}

    <!-- axes (landing ON an axis = a zeroed weight) -->
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- constraint region -->
    <polygon points={polyStr} fill={POS} fill-opacity="0.08" stroke={POS} stroke-width="2" />

    <!-- unconstrained optimum (bowl center, draggable) -->
    <circle
      cx={xScale(center[0].x)}
      cy={yScale(center[0].y)}
      r={dragIndex === 0 ? 9 : 7}
      fill="none"
      stroke={MUTED}
      stroke-width="2"
      style="cursor: {dragIndex === 0 ? 'grabbing' : 'grab'}; touch-action: none;"
      data-drag-index={0}
    />
    <!-- constrained optimum -->
    <circle cx={xScale(opt.x)} cy={yScale(opt.y)} r="7" fill={sparse ? SUCCESS : ACCENT} stroke={PAPER} stroke-width="2" />
  </svg>

  <p class="text-xs text-muted">Arrastra el centro (la solución sin regularizar). El punto lleno es la solución <strong>restringida</strong> al presupuesto.</p>

  <label class="block text-sm font-medium text-ink">
    Presupuesto (∝ 1/λ): {budget.toFixed(2)}
    <input type="range" bind:value={budget} min="0.3" max="2" step="0.05" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    <span>w = (<strong>{opt.x.toFixed(2)}</strong>, <strong>{opt.y.toFixed(2)}</strong>)</span>
    {#if sparse}
      <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {SUCCESS}">
        {opt.zeroedCoord} = 0 → solución dispersa (sparsity)
      </span>
    {:else}
      <span class="rounded-full px-3 py-1 text-xs font-medium" style="color:{MUTED};border:1px solid {AXIS}">encogimiento, sin ceros</span>
    {/if}
  </div>
</div>
