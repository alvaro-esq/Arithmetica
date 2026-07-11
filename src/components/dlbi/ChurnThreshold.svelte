<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { mulberry32 } from '../../lib/svm/prng';
  import { clientToData } from '../../lib/svm/geometry';
  import { churnDataset, confusion, metrics, businessCost, bestThreshold } from '../../lib/dlbi/churn';
  import { POS, NEG, ACCENT, AXIS, PAPER, SUCCESS, MUTED } from '../../lib/svm/colors';

  // Del puntaje a la decisión: el modelo ya asignó un score de churn a cada
  // cliente; elegir el umbral es una decisión de costos. El tween es la única
  // fuente de verdad del umbral, compartida por el arrastre, el deslizador y el
  // botón de umbral óptimo (mismo patrón que el ThresholdTuner de anomalías).

  let { seed = 4, costOffer = 20, costLoss = 200 }: { seed?: number; costOffer?: number; costLoss?: number } = $props();

  const data = churnDataset(seed);
  const nChurn = data.filter((d) => d.churned).length;

  const width = 600;
  const height = 240;
  const pad = 44;
  // Margen izquierdo mayor: las etiquetas "abandonó"/"se quedó" necesitan ~45 px.
  const padL = 60;
  const x = scaleLinear().domain([0, 1]).range([padL, width - pad]);

  const thr = new Tween(0.5, { duration: 260, easing: cubicOut });
  const best = bestThreshold(data, costOffer, costLoss);

  // Jitter vertical estable (seeded) para que los puntos no bailen entre renders.
  const jitterRng = mulberry32(seed + 99);
  const rows = data.map((d) => {
    const band = d.churned ? 0.3 : 0.7;
    return { ...d, yPos: band + (jitterRng() - 0.5) * 0.16 };
  });
  const yPix = (t: number) => pad + t * (height - 2 * pad);

  let cm = $derived(confusion(data, thr.current));
  let m = $derived(metrics(cm));
  let cost = $derived(businessCost(cm, costOffer, costLoss));

  function setThr(v: number, instant = false) {
    thr.set(Math.max(0, Math.min(1, v)), instant ? { duration: 0 } : undefined);
  }

  // Arrastre del umbral (solo eje x): inicia SOLO en la zona de agarre de la
  // línea — un clic en un punto o en el fondo no debe mover el umbral (mismo
  // gate que data-drag-index en lib/svm/drag.ts). move/up viven en el <svg>.
  let svgEl: SVGSVGElement;
  let dragging = $state(false);
  function onDown(e: PointerEvent) {
    e.preventDefault();
    dragging = true;
    svgEl.setPointerCapture(e.pointerId);
    setThr(clientToData(svgEl, e.clientX, e.clientY, width, height, x, x).x, true);
  }
  function onMove(e: PointerEvent) {
    if (dragging) setThr(clientToData(svgEl, e.clientX, e.clientY, width, height, x, x).x, true);
  }
  function onUp(e: PointerEvent) {
    dragging = false;
    if (svgEl.hasPointerCapture?.(e.pointerId)) svgEl.releasePointerCapture(e.pointerId);
  }
</script>

<div class="space-y-4">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none aspect-[5/2]"
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
  >
    <!-- eje de puntaje -->
    <line x1={padL} y1={height - pad + 14} x2={width - pad} y2={height - pad + 14} stroke={AXIS} stroke-width="1.5" />
    {#each [0, 0.25, 0.5, 0.75, 1] as t}
      <text x={x(t)} y={height - pad + 30} text-anchor="middle" font-size="11" fill={MUTED}>{t}</text>
    {/each}
    <text x={width / 2} y={height - 6} text-anchor="middle" font-size="11" fill={MUTED}>puntaje de churn asignado por el modelo</text>

    <text x={padL - 8} y={yPix(0.3) + 4} text-anchor="end" font-size="10" fill={MUTED}>abandonó</text>
    <text x={padL - 8} y={yPix(0.7) + 4} text-anchor="end" font-size="10" fill={MUTED}>se quedó</text>

    <!-- región "recibe oferta de retención" (score ≥ umbral) -->
    <rect x={x(thr.current)} y={pad - 10} width={width - pad - x(thr.current)} height={height - 2 * pad + 20} fill={ACCENT} opacity="0.06" />

    <!-- marca del umbral de menor costo -->
    <line x1={x(best)} y1={height - pad + 6} x2={x(best)} y2={height - pad + 14} stroke={SUCCESS} stroke-width="3" />
    <text x={x(best)} y={height - pad + 30} text-anchor="middle" font-size="10" font-weight="600" fill={SUCCESS}>óptimo</text>

    <!-- clientes -->
    {#each rows as d}
      <circle cx={x(d.score)} cy={yPix(d.yPos)} r={d.churned ? 6 : 5} fill={d.churned ? POS : NEG} opacity="0.85" stroke={PAPER} stroke-width="1.2" />
    {/each}

    <!-- umbral: zona de agarre ancha (única que inicia el arrastre) + línea visible -->
    <line x1={x(thr.current)} y1={pad - 10} x2={x(thr.current)} y2={height - pad + 6} stroke="transparent" stroke-width="22" style="cursor: ew-resize;" onpointerdown={onDown} />
    <line x1={x(thr.current)} y1={pad - 10} x2={x(thr.current)} y2={height - pad + 6} stroke={ACCENT} stroke-width="3" pointer-events="none" />
    <text x={x(thr.current)} y={pad - 16} text-anchor="middle" font-size="12" font-weight="600" fill={ACCENT}>umbral = {thr.current.toFixed(2)}</text>
  </svg>

  <p class="text-xs text-muted">
    {data.length - nChurn} clientes se quedaron · {nChurn} abandonaron. Arrastra el umbral o usa el deslizador: a la derecha del umbral,
    el cliente se clasifica como riesgo de abandono y recibe la oferta de retención (USD {costOffer}); cada abandono no detectado cuesta USD {costLoss}.
  </p>

  <label class="block text-sm font-medium text-ink">
    Umbral de decisión: {thr.current.toFixed(2)}
    <input type="range" min="0" max="1" step="0.01" value={thr.current} oninput={(e) => setThr(e.currentTarget.valueAsNumber, true)} class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={() => setThr(best)}>
      Buscar el umbral de menor costo
    </button>
    <span class="text-sm text-ink">Costo total: <strong style="color: {ACCENT}">USD {cost.toLocaleString('es-GT')}</strong></span>
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    <div class="grid grid-cols-2 gap-px overflow-hidden rounded-md border text-center text-sm" style="border-color: {AXIS}">
      <div class="p-2"><div class="text-xs text-muted">detectados (TP)</div><strong style="color: {SUCCESS}">{cm.tp}</strong></div>
      <div class="p-2"><div class="text-xs text-muted">ofertas de más (FP)</div><strong>{cm.fp}</strong></div>
      <div class="p-2"><div class="text-xs text-muted">perdidos (FN)</div><strong style="color: {POS}">{cm.fn}</strong></div>
      <div class="p-2"><div class="text-xs text-muted">bien dejados (TN)</div><strong>{cm.tn}</strong></div>
    </div>
    <div class="flex flex-col justify-center gap-1 text-sm text-ink">
      <span>Precisión: <strong>{cm.tp + cm.fp === 0 ? '— (nadie recibe oferta)' : m.precision.toFixed(2)}</strong> — de los que reciben oferta, cuántos iban a irse.</span>
      <span>Recall: <strong>{m.recall.toFixed(2)}</strong> — de los que iban a irse, cuántos detectamos.</span>
      <span>Exactitud: <strong>{m.accuracy.toFixed(2)}</strong> — engañosa con clases desbalanceadas.</span>
    </div>
  </div>
</div>
