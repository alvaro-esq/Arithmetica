<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { iforestScene } from '../../lib/anomaly/datasets';
  import { isolationPath } from '../../lib/anomaly/iforest';
  import { type Domain } from '../../lib/svm/geometry';
  import { ACCENT, NEG, POS, AXIS, PAPER, WARN, MUTED } from '../../lib/svm/colors';

  // Isolation Forest, made visible. Random axis-aligned splits keep carving the
  // plane; at each step we keep only the side that still contains the target
  // point, shrinking the box around it. The anomaly is bounded in a handful of
  // cuts; a cluster point needs many more. "Otra semilla" re-rolls the sequence.

  let { seed = 3 }: { seed?: number } = $props();

  let curSeed = $state(seed);
  let target = $state<'outlier' | 'inlier'>('outlier');
  let shown = $state(0); // how many splits are revealed

  const dom: Domain = { xMin: -3, xMax: 5.2, yMin: -3, yMax: 4.4 };
  const width = 600;
  const height = 400;
  const pad = 40;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  let pts = $derived(iforestScene(curSeed));
  let outlierIdx = $derived(pts.length - 1); // planted outlier is always the last point
  // The cluster "inlier" we compare against is the MOST interior point (closest to
  // the cluster centroid). An interior point is the hardest to isolate, so it
  // reliably needs more cuts than the outlier on every seed — the contrast never
  // inverts (an edge point like index 0 sometimes isolated as fast as the outlier).
  let inlierIdx = $derived.by(() => {
    const cluster = pts.slice(0, -1);
    const cx = cluster.reduce((s, p) => s + p.x, 0) / cluster.length;
    const cy = cluster.reduce((s, p) => s + p.y, 0) / cluster.length;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < cluster.length; i++) {
      const d = (cluster[i].x - cx) ** 2 + (cluster[i].y - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  });
  let targetIdx = $derived(target === 'outlier' ? outlierIdx : inlierIdx);
  // Path for the selected target (animated) and the other (for the comparison).
  let cuts = $derived(isolationPath(pts, targetIdx, curSeed));
  let otherLen = $derived(isolationPath(pts, target === 'outlier' ? inlierIdx : outlierIdx, curSeed).length);

  // The shrinking bounding box: fold the revealed cuts into a [min,max]² region
  // around the target.
  let box = $derived.by(() => {
    const t = pts[targetIdx];
    const b = { xMin: dom.xMin, xMax: dom.xMax, yMin: dom.yMin, yMax: dom.yMax };
    for (let i = 0; i < Math.min(shown, cuts.length); i++) {
      const c = cuts[i];
      if (c.feature === 0) {
        if (t.x < c.split) b.xMax = Math.min(b.xMax, c.split);
        else b.xMin = Math.max(b.xMin, c.split);
      } else {
        if (t.y < c.split) b.yMax = Math.min(b.yMax, c.split);
        else b.yMin = Math.max(b.yMin, c.split);
      }
    }
    return b;
  });

  let isolated = $derived(shown >= cuts.length);

  function reseed() {
    curSeed = (curSeed * 1664525 + 1013904223) % 4294967296;
    shown = 0;
  }
  function reset() {
    shown = 0;
  }
  $effect(() => {
    // when target or seed changes, restart the animation
    target;
    curSeed;
    shown = 0;
  });
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-[3/2]">
    <!-- surviving region (still contains the target) -->
    <rect
      x={xScale(box.xMin)}
      y={yScale(box.yMax)}
      width={xScale(box.xMax) - xScale(box.xMin)}
      height={yScale(box.yMin) - yScale(box.yMax)}
      fill={ACCENT}
      fill-opacity="0.07"
      stroke={ACCENT}
      stroke-width="1.5"
      stroke-dasharray="4 4"
    />

    <!-- revealed split lines -->
    {#each cuts.slice(0, shown) as c, i}
      {@const active = i === shown - 1}
      {#if c.feature === 0}
        <line x1={xScale(c.split)} y1={pad} x2={xScale(c.split)} y2={height - pad} stroke={active ? ACCENT : MUTED} stroke-width={active ? 2 : 1} opacity={active ? 0.9 : 0.35} />
      {:else}
        <line x1={pad} y1={yScale(c.split)} x2={width - pad} y2={yScale(c.split)} stroke={active ? ACCENT : MUTED} stroke-width={active ? 2 : 1} opacity={active ? 0.9 : 0.35} />
      {/if}
    {/each}

    <!-- points -->
    {#each pts as p, i}
      <circle cx={xScale(p.x)} cy={yScale(p.y)} r={i === targetIdx ? 8 : 5} fill={i === targetIdx ? POS : NEG} stroke={PAPER} stroke-width={i === targetIdx ? 2 : 1.2} />
    {/each}
  </svg>

  <div class="flex flex-wrap items-center gap-3">
    <button
      class="rounded-md px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-40"
      style="background-color: {ACCENT}"
      onclick={() => (shown = Math.min(shown + 1, cuts.length))}
      disabled={isolated}
    >
      Siguiente división ▸
    </button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={reset}>Reiniciar</button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={reseed}>Otra semilla</button>

    <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
      <button class="px-3 py-1.5" style={target === 'outlier' ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (target = 'outlier')}>Anomalía</button>
      <button class="px-3 py-1.5" style={target === 'inlier' ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (target = 'inlier')}>Punto del clúster</button>
    </span>
  </div>

  <div class="flex flex-wrap items-center gap-4 text-sm text-ink">
    <span>Divisiones mostradas: <strong>{shown}</strong></span>
    <span>
      Para aislar este punto: <strong style="color: {WARN}">{cuts.length}</strong>
      {#if isolated}<span class="text-xs text-muted">(¡aislado!)</span>{/if}
    </span>
    <span class="text-xs text-muted">El {target === 'outlier' ? 'punto del clúster' : 'outlier'} necesita {otherLen} divisiones.</span>
  </div>
  <p class="text-xs text-muted">Las anomalías se aíslan en <strong>menos</strong> divisiones (camino más corto) → mayor puntuación de anomalía.</p>
</div>
