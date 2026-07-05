<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { lofScene, type Pt } from '../../lib/anomaly/datasets';
  import { type Domain } from '../../lib/svm/geometry';
  import { draggablePoints } from '../../lib/svm/drag';
  import { kNearest, kDistance, lofAll } from '../../lib/anomaly/lof';
  import { ACCENT, NEG, AXIS, PAPER, SUCCESS, WARN } from '../../lib/svm/colors';

  // Local Outlier Factor explorer. P (index 0) is draggable; everything else is a
  // fixed cluster. The k-distance circle and the spokes to P's k nearest neighbors
  // make "local density" concrete: drag P into the cluster and LOF → 1; drag it
  // into empty space and LOF climbs above 1, flipping the verdict to "anomalía".

  let { seed = 7 }: { seed?: number } = $props();

  let points = $state<Pt[]>(lofScene(seed));
  let k = $state(4);
  let dragIndex = $state(-1);

  const dom: Domain = { xMin: -3, xMax: 5, yMin: -3, yMax: 4 };
  const width = 600;
  const height = 400;
  const pad = 40;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  // Recomputed live as P moves (points is mutated in place by the drag action).
  // lofAll computes every point's LOF in one pass; P is index 0, so read it from
  // there instead of running the full single-point lof() a second time per frame.
  let kdist = $derived(kDistance(points, 0, k));
  let neighbors = $derived(kNearest(points, 0, k));
  let allLof = $derived(lofAll(points, k));
  let pLof = $derived(allLof[0] ?? 1);

  // Pixel radius of the k-distance circle (scale is uniform, so use x).
  let rPix = $derived(xScale(dom.xMin + kdist) - xScale(dom.xMin));

  let verdict = $derived(
    pLof > 1.5 ? { text: 'LOF ≫ 1 → anomalía', color: WARN } : pLof > 1.15 ? { text: 'LOF > 1 → sospechoso', color: WARN } : { text: 'LOF ≈ 1 → normal', color: SUCCESS },
  );

  let dragCfg = $derived({
    points,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => (dragIndex = i),
  });

  // Tint cluster points on a continuous ramp from slate (LOF ≈ 1, normal) toward
  // warn/copper (high LOF, locally sparse) so outliers visibly glow as P moves.
  function lerpHex(a: string, b: string, t: number): string {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }
  function tint(i: number): string {
    if (i === 0) return ACCENT;
    const t = Math.min(1, Math.max(0, (allLof[i] - 1) / 1.2));
    return lerpHex(NEG, WARN, t);
  }
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

    <!-- k-distance circle around P -->
    <circle cx={xScale(points[0].x)} cy={yScale(points[0].y)} r={rPix} fill={ACCENT} fill-opacity="0.06" stroke={ACCENT} stroke-width="1.5" stroke-dasharray="5 4" opacity="0.6" />

    <!-- spokes to the k nearest neighbors -->
    {#each neighbors as j}
      <line x1={xScale(points[0].x)} y1={yScale(points[0].y)} x2={xScale(points[j].x)} y2={yScale(points[j].y)} stroke={ACCENT} stroke-width="1.5" opacity="0.45" />
    {/each}

    <!-- cluster points -->
    {#each points as p, i}
      {#if i !== 0}
        <circle cx={xScale(p.x)} cy={yScale(p.y)} r="6" fill={tint(i)} stroke={PAPER} stroke-width="1.4" />
      {/if}
    {/each}

    <!-- P on top -->
    <circle
      cx={xScale(points[0].x)}
      cy={yScale(points[0].y)}
      r={dragIndex === 0 ? 9 : 7}
      fill={ACCENT}
      stroke={PAPER}
      stroke-width="2"
      style="cursor: {dragIndex === 0 ? 'grabbing' : 'grab'}; touch-action: none;"
      data-drag-index={0}
    />
    <text x={xScale(points[0].x) + 12} y={yScale(points[0].y) - 10} font-size="13" font-weight="600" fill={ACCENT}>P</text>
  </svg>

  <p class="text-xs text-muted">Arrastra <strong style="color: {ACCENT}">P</strong>. El círculo es su k-distancia; los radios van a sus k vecinos más cercanos.</p>

  <label class="block text-sm font-medium text-ink">
    Vecinos k: {k}
    <input type="range" bind:value={k} min="2" max="8" step="1" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-4 text-sm text-ink">
    <span>LOF(P): <strong style="color: {verdict.color}">{pLof.toFixed(2)}</strong></span>
    <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {verdict.color}">{verdict.text}</span>
  </div>
</div>
