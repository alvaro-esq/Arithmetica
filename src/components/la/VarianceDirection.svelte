<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS, PAPER } from '../../lib/svm/colors';
  import type { V2 } from '../../lib/la/vec2';
  import { pcaFit2, pcaCloud, varianceAlong, projectAlong, lineThrough } from '../../lib/la/pca';

  // Rotate the line until it captures as much variance as possible: the winning
  // direction is the first eigenvector of the covariance matrix. That's PCA.

  let cloudSeed = $state(7);
  let points = $state<V2[]>(pcaCloud(40, 7));
  function reshuffle() {
    cloudSeed += 1;
    points = pcaCloud(40, cloudSeed);
    revealed = false;
  }

  let fit = $derived(pcaFit2(points));
  let pc1Angle = $derived(Math.atan2(fit.comps[0].y, fit.comps[0].x));

  // The tween is the single source of truth for the direction angle.
  const thetaT = new Tween(0.2, { duration: 800, easing: cubicOut });
  let theta = $derived(thetaT.current);
  let w = $derived<V2>({ x: Math.cos(theta), y: Math.sin(theta) });
  let varW = $derived(varianceAlong(points, fit.mean, theta));
  let atMax = $derived(varW >= fit.eigs[0] - 0.015 * Math.max(1, fit.eigs[0]));
  let revealed = $state(false);

  function maximize() {
    // Fold the eigen-angle into the slider's [0, π) range.
    let a = pc1Angle;
    if (a < 0) a += Math.PI;
    thetaT.set(a);
    revealed = true;
  }

  const dom: Domain = { xMin: -4.2, xMax: 4.2, yMin: -3.2, yMax: 3.2 };
  const width = 600;
  const height = 460;
  const pad = 10;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);
  const px = (p: V2) => ({ x: xScale(p.x), y: yScale(p.y) });

  let proj = $derived(projectAlong(points, fit.mean, w));
  let lineEnds = $derived(lineThrough(fit.mean, w, 6));
  let pc2Ends = $derived(lineThrough(fit.mean, fit.comps[1], 2.2));
  let explained = $derived((100 * fit.eigs[0]) / (fit.eigs[0] + fit.eigs[1] + 1e-12));

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
    class="w-full touch-none select-none animate-fade-up"
  >
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1" />

    <!-- projection stalks and rug ticks -->
    {#each points as p, i}
      <line x1={px(p).x} y1={px(p).y} x2={px(proj[i]).x} y2={px(proj[i]).y} stroke={MUTED} stroke-width="1" stroke-dasharray="3 3" opacity="0.5" />
      <circle cx={px(proj[i]).x} cy={px(proj[i]).y} r="2.5" fill={atMax ? SUCCESS : ACCENT} opacity="0.8" />
    {/each}

    <!-- the candidate direction -->
    <line x1={px(lineEnds[0]).x} y1={px(lineEnds[0]).y} x2={px(lineEnds[1]).x} y2={px(lineEnds[1]).y} stroke={atMax ? SUCCESS : ACCENT} stroke-width="3" />

    <!-- PC2, once revealed -->
    {#if revealed}
      <line x1={px(pc2Ends[0]).x} y1={px(pc2Ends[0]).y} x2={px(pc2Ends[1]).x} y2={px(pc2Ends[1]).y} stroke={NEG} stroke-width="2" stroke-dasharray="7 5" opacity="0.7" />
    {/if}

    <!-- data -->
    {#each points as p, i}
      <circle
        cx={px(p).x}
        cy={px(p).y}
        r={dragIndex === i ? 8 : 5.5}
        fill={POS}
        stroke={PAPER}
        stroke-width="1"
        style="cursor: {dragIndex === i ? 'grabbing' : 'grab'}; touch-action: none;"
        data-drag-index={i}
      />
    {/each}
  </svg>

  <p class="text-xs text-muted">Gira la recta con el deslizador (o arrastra los puntos). Los puntitos sobre la recta son las proyecciones de los datos.</p>

  <label class="block text-sm font-medium text-ink">
    Dirección θ = {((theta * 180) / Math.PI).toFixed(0)}°
    <input type="range" value={theta} oninput={(e) => { thetaT.set(e.currentTarget.valueAsNumber, { duration: 0 }); }} min="0" max={Math.PI} step="0.01" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex items-center gap-3 text-sm text-ink">
    <span class="whitespace-nowrap">varianza capturada: <strong style="color:{atMax ? SUCCESS : ACCENT}">{varW.toFixed(3)}</strong></span>
    <span class="h-2.5 flex-1 overflow-hidden rounded-full" style="background-color:{AXIS}40">
      <span class="block h-full rounded-full transition-all duration-150" style="width:{Math.min(100, (100 * varW) / (fit.eigs[0] + 1e-12))}%; background-color:{atMax ? SUCCESS : ACCENT}"></span>
    </span>
    <span class="whitespace-nowrap text-muted">máximo: {fit.eigs[0].toFixed(3)}</span>
  </div>

  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    {#if revealed}
      <span class="tabular-nums" style="color:{MUTED}">λ₁ = {fit.eigs[0].toFixed(2)} · λ₂ = {fit.eigs[1].toFixed(2)} · varianza explicada por PC1: <strong style="color:{SUCCESS}">{explained.toFixed(0)}%</strong></span>
    {/if}
    {#if atMax}
      <span class="font-semibold" style="color:{SUCCESS}">esta recta es el primer eigenvector de la covarianza</span>
    {/if}
    <span class="ml-auto flex gap-2">
      <button onclick={reshuffle} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">Nueva nube</button>
      <button onclick={maximize} class="rounded-md px-4 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color:{ACCENT}">Maximizar varianza</button>
    </span>
  </div>
</div>
