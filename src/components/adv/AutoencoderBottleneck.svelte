<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { pcaFit, reconstruct, aeDataset } from '../../lib/adv/autoencoder';
  import { type Domain } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, SUCCESS, WARN, AXIS, PAPER, MUTED, INK } from '../../lib/svm/colors';

  // An autoencoder compresses through a bottleneck and reconstructs. The optimal
  // linear case is PCA: encode = project onto the top-k principal directions,
  // decode = map back. Narrow the bottleneck and the reconstruction collapses onto
  // the principal subspace — error grows. Outliers off that subspace reconstruct
  // badly: that large per-point error is exactly how autoencoders flag anomalies.

  const data = aeDataset(40, 3);
  const fit = pcaFit(data.points);
  const D = 2; // 2-D demo

  let k = $state(2); // bottleneck dimension (1..D)
  let showOutliers = $state(true);

  // include/exclude the appended outliers
  let activePoints = $derived(showOutliers ? data.points : data.points.slice(0, data.outlierStart));
  let rec = $derived(reconstruct(activePoints, fit, k));

  const dom: Domain = { xMin: -2.4, xMax: 2.4, yMin: -2.4, yMax: 2.4 };
  const width = 420;
  const height = 420;
  const pad = 30;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  // the k=1 principal axis, drawn as a line through the mean (the learned subspace)
  let axisLine = $derived.by(() => {
    const c = fit.comps[0];
    const m = fit.mean;
    const t = 3;
    return [
      { x: m[0] - c[0] * t, y: m[1] - c[1] * t },
      { x: m[0] + c[0] * t, y: m[1] + c[1] * t },
    ];
  });

  function isOutlier(i: number): boolean {
    return i >= data.outlierStart;
  }
  // Per-point error threshold to flag an anomaly. It must sit in the GAP between
  // the badly-reconstructed outliers and the well-reconstructed inliers — a plain
  // "3× the inlier mean" fails, because an off-axis inlier can exceed 3× its own
  // mean and get wrongly flagged (and at k=D the reconstruction is exact, so that
  // multiple is ~0 and float noise flags points). Instead: a fraction of the
  // largest error (which scales with how far the outliers sit), floored by a small
  // absolute value so the perfect-reconstruction case (k=D) flags nothing. This
  // flags exactly the planted outliers on this dataset (verified in Node).
  const THRESH_FRAC = 0.25; // must exceed 25% of the worst reconstruction error
  const THRESH_FLOOR = 0.3; // …and clear this absolute floor (kills k=D float noise)
  let maxErr = $derived(rec.perPointErr.length ? Math.max(...rec.perPointErr) : 0);
  let threshold = $derived(Math.max(maxErr * THRESH_FRAC, THRESH_FLOOR));
  function isFlagged(i: number): boolean {
    return showOutliers && rec.perPointErr[i] > threshold;
  }
  let flaggedCount = $derived(
    showOutliers ? rec.perPointErr.filter((e) => e > threshold).length : 0,
  );
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-square">
    <!-- principal axis (the 1-D bottleneck's subspace) -->
    {#if k < D}
      <line x1={xScale(axisLine[0].x)} y1={yScale(axisLine[0].y)} x2={xScale(axisLine[1].x)} y2={yScale(axisLine[1].y)} stroke={ACCENT} stroke-width="1.5" stroke-dasharray="5 4" opacity="0.7" />
      <text x={xScale(axisLine[1].x)} y={yScale(axisLine[1].y) - 6} font-size="10" fill={ACCENT} text-anchor="middle">subespacio (k={k})</text>
    {/if}

    <!-- error segments original ↔ reconstruction -->
    {#each activePoints as p, i}
      <line x1={xScale(p[0])} y1={yScale(p[1])} x2={xScale(rec.recon[i][0])} y2={yScale(rec.recon[i][1])} stroke={isOutlier(i) ? WARN : MUTED} stroke-width={isOutlier(i) ? 1.6 : 1} opacity="0.55" />
    {/each}

    <!-- reconstructed points (on the subspace) -->
    {#each rec.recon as q, i}
      <circle cx={xScale(q[0])} cy={yScale(q[1])} r="3" fill={NEG} opacity="0.65" />
    {/each}

    <!-- original points; a ring marks those flagged as anomalies (error > threshold) -->
    {#each activePoints as p, i}
      {#if isFlagged(i)}
        <circle cx={xScale(p[0])} cy={yScale(p[1])} r="9.5" fill="none" stroke={WARN} stroke-width="1.5" opacity="0.7" />
      {/if}
      <circle
        cx={xScale(p[0])}
        cy={yScale(p[1])}
        r={isOutlier(i) ? 6 : 4.5}
        fill={isOutlier(i) ? WARN : POS}
        stroke={PAPER}
        stroke-width="1.3"
      />
    {/each}
  </svg>

  <!-- reconstruction error meter -->
  <div class="space-y-1">
    <div class="flex items-center justify-between text-sm">
      <span class="text-ink">Error de reconstrucción (MSE): <strong style="color: {rec.mse > 0.05 ? WARN : SUCCESS}">{rec.mse.toFixed(3)}</strong></span>
      <span class="text-muted">varianza retenida: <strong style="color: {INK}">{(rec.keptVar * 100).toFixed(0)}%</strong></span>
    </div>
    {#if showOutliers}
      <div class="text-xs text-muted">
        Umbral de anomalía (error de reconstrucción muy por encima del resto):
        <strong style="color: {WARN}">{flaggedCount}</strong> {flaggedCount === 1 ? 'punto marcado' : 'puntos marcados'} (anillo).
      </div>
    {/if}
    <div class="h-2 w-full overflow-hidden rounded-full" style="background-color: {AXIS}">
      <div class="h-full rounded-full" style="width: {Math.min(100, rec.keptVar * 100)}%; background-color: {SUCCESS}"></div>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      Cuello de botella k: {k} de {D}
      <input type="range" bind:value={k} min="1" max={D} step="1" class="mt-1 w-full accent-interactive" />
    </label>
    <div class="flex items-end">
      <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
        <button class="px-3 py-1.5" style={showOutliers ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (showOutliers = true)}>con outliers</button>
        <button class="px-3 py-1.5" style={!showOutliers ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (showOutliers = false)}>sin outliers</button>
      </span>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {showOutliers ? WARN : SUCCESS}; color: {PAPER}">
      {#if showOutliers}los outliers (ámbar) no se reconstruyen → anomalías{:else}k pequeño = más compresión, más error{/if}
    </span>
  </div>
  <p class="text-xs text-muted">El encoder proyecta cada punto al subespacio principal (cuello de botella) y el decoder lo reconstruye. Con <strong>k</strong> menor se comprime más pero crece el <strong>error</strong>. Los puntos que no caben en ese subespacio —los <strong>outliers</strong>— se reconstruyen mal: así un autoencoder detecta anomalías.</p>
</div>
