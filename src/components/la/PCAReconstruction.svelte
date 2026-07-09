<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { Domain } from '../../lib/svm/geometry';
  import { POS, ACCENT, AXIS, MUTED, SUCCESS, WARN, PAPER } from '../../lib/svm/colors';
  import type { V2 } from '../../lib/la/vec2';
  import { pcaFit2, pcaCloud, projectAlong, lineThrough } from '../../lib/la/pca';

  // Compress 2 numbers per point down to 1 by projecting onto a direction. Any
  // direction loses information; PC1 loses the LEAST — PCA is the optimal
  // linear autoencoder.

  const points: V2[] = pcaCloud(40, 21);
  const fit = pcaFit2(points);
  const pc1 = (() => {
    let a = Math.atan2(fit.comps[0].y, fit.comps[0].x);
    return a < 0 ? a + Math.PI : a;
  })();

  // Direction of projection (tween: slider writes instantly, button animates).
  const thetaT = new Tween(pc1, { duration: 700, easing: cubicOut });
  let theta = $derived(thetaT.current);
  // 0 = original cloud, 1 = fully compressed onto the line.
  const squashT = new Tween(0, { duration: 900, easing: cubicOut });
  let squash = $derived(squashT.current);
  let compressed = $state(false);
  function toggleSquash() {
    compressed = !compressed;
    squashT.set(compressed ? 1 : 0);
  }

  let w = $derived<V2>({ x: Math.cos(theta), y: Math.sin(theta) });
  let recon = $derived(projectAlong(points, fit.mean, w));
  let shown = $derived(points.map((p, i) => ({ x: p.x + (recon[i].x - p.x) * squash, y: p.y + (recon[i].y - p.y) * squash })));
  let errTheta = $derived(points.reduce((a, p, i) => a + (p.x - recon[i].x) ** 2 + (p.y - recon[i].y) ** 2, 0));
  let errBest = $derived(points.length * fit.eigs[1]); // el mínimo alcanzable = n·λ₂
  let atBest = $derived(errTheta <= errBest * 1.03 + 1e-9);

  const dom: Domain = { xMin: -4.2, xMax: 4.2, yMin: -3.2, yMax: 3.2 };
  const width = 600;
  const height = 440;
  const pad = 10;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);
  const px = (p: V2) => ({ x: xScale(p.x), y: yScale(p.y) });

  let lineEnds = $derived(lineThrough(fit.mean, w, 6));
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none animate-fade-up">
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1" />

    <!-- projection line -->
    <line x1={px(lineEnds[0]).x} y1={px(lineEnds[0]).y} x2={px(lineEnds[1]).x} y2={px(lineEnds[1]).y} stroke={atBest ? SUCCESS : ACCENT} stroke-width="3" />

    {#each points as p, i}
      <!-- error segment: what compression throws away -->
      <line x1={px(p).x} y1={px(p).y} x2={px(recon[i]).x} y2={px(recon[i]).y} stroke={WARN} stroke-width="1.5" opacity={0.25 + 0.55 * squash} />
      <!-- ghost of the original once compressed -->
      {#if squash > 0.05}
        <circle cx={px(p).x} cy={px(p).y} r="3.5" fill="none" stroke={MUTED} stroke-width="1" opacity={0.5 * squash} />
      {/if}
      <!-- the (possibly moving) point -->
      <circle cx={px(shown[i]).x} cy={px(shown[i]).y} r="5.5" fill={POS} stroke={PAPER} stroke-width="1" />
    {/each}
  </svg>

  <label class="block text-sm font-medium text-ink">
    Dirección de proyección θ = {((theta * 180) / Math.PI).toFixed(0)}°
    <input type="range" value={theta} oninput={(e) => thetaT.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="0" max={Math.PI} step="0.01" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex items-center gap-3 text-sm text-ink">
    <span class="whitespace-nowrap">error de reconstrucción: <strong style="color:{atBest ? SUCCESS : WARN}">{errTheta.toFixed(2)}</strong></span>
    <span class="h-2.5 flex-1 overflow-hidden rounded-full" style="background-color:{AXIS}40">
      <span class="block h-full rounded-full transition-all duration-150" style="width:{Math.min(100, (100 * errBest) / (errTheta + 1e-9))}%; background-color:{atBest ? SUCCESS : WARN}"></span>
    </span>
    <span class="whitespace-nowrap text-muted">mínimo (PC1): {errBest.toFixed(2)}</span>
  </div>

  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    {#if atBest}
      <span class="font-semibold" style="color:{SUCCESS}">proyectando sobre PC1: ninguna otra recta pierde menos</span>
    {:else}
      <span style="color:{MUTED}">esta dirección pierde {(errTheta - errBest).toFixed(2)} más que PC1</span>
    {/if}
    <span class="ml-auto flex gap-2">
      <button onclick={() => thetaT.set(pc1)} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">Usar PC1</button>
      <button onclick={toggleSquash} class="rounded-md px-4 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color:{ACCENT}">
        {compressed ? 'Restaurar 2D' : 'Comprimir a 1D'}
      </button>
    </span>
  </div>
  <p class="text-xs text-muted">Comprimido: cada punto pasa de 2 números a 1 (su posición sobre la recta). Los segmentos ámbar son la información perdida.</p>
</div>
