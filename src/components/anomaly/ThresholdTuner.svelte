<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { scoreSamples, type Scored } from '../../lib/anomaly/datasets';
  import { confusion, precision, recall, f1, argmaxThreshold } from '../../lib/anomaly/metrics';
  import { clientToData } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, PAPER, SUCCESS, WARN, MUTED } from '../../lib/svm/colors';

  // Threshold tuner for imbalanced classification. Each point has an anomaly
  // score; predicting "anomaly" when score ≥ τ turns one knob (τ) into the whole
  // precision/recall/F1 trade-off. The tween is the single source of truth for τ,
  // so the slider and the "máx F1" button stay in sync with the line.

  let { seed = 11 }: { seed?: number } = $props();

  const data: Scored[] = scoreSamples(seed);
  const nAnom = data.filter((d) => d.y === 1).length;
  const nNormal = data.length - nAnom;

  const width = 600;
  const height = 240;
  const pad = 44;
  const x = scaleLinear().domain([0, 1]).range([pad, width - pad]);

  const tau = new Tween(0.5, { duration: 260, easing: cubicOut });

  // Stable vertical jitter per point (seeded by index) so points don't twitch.
  const rows = data.map((d, i) => {
    const band = d.y === 1 ? 0.30 : 0.70; // anomalies on the upper band
    const jitter = (((i * 2654435761) % 1000) / 1000 - 0.5) * 0.14;
    return { ...d, yPos: band + jitter };
  });
  const yPix = (t: number) => pad + t * (height - 2 * pad);

  let cm = $derived(confusion(data, tau.current));
  let P = $derived(precision(cm));
  let R = $derived(recall(cm));
  let F = $derived(f1(P, R));

  function kind(d: Scored): { color: string; label: string } {
    const pred = d.score >= tau.current ? 1 : 0;
    if (pred === 1 && d.y === 1) return { color: SUCCESS, label: 'TP' };
    if (pred === 1 && d.y === 0) return { color: WARN, label: 'FP' };
    if (pred === 0 && d.y === 1) return { color: POS, label: 'FN' };
    return { color: NEG, label: 'TN' };
  }

  function setTau(v: number, instant = false) {
    tau.set(Math.max(0, Math.min(1, v)), instant ? { duration: 0 } : undefined);
  }

  // Drag τ directly (x-only). Capture and all handlers live on the <svg>, so the
  // pointer stream stays intact after capture; clientToData applies the same
  // viewBox + preserveAspectRatio letterbox math as the shared drag action.
  let svgEl: SVGSVGElement;
  let dragging = $state(false);
  function dataXFromClient(clientX: number, clientY: number): number {
    return clientToData(svgEl, clientX, clientY, width, height, x, x).x;
  }
  function onDown(e: PointerEvent) {
    dragging = true;
    svgEl.setPointerCapture(e.pointerId);
    setTau(dataXFromClient(e.clientX, e.clientY), true);
  }
  function onMove(e: PointerEvent) {
    if (dragging) setTau(dataXFromClient(e.clientX, e.clientY), true);
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
    style="cursor: ew-resize;"
    onpointerdown={onDown}
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
  >
    <!-- score axis -->
    <line x1={pad} y1={height - pad + 14} x2={width - pad} y2={height - pad + 14} stroke={AXIS} stroke-width="1.5" />
    {#each [0, 0.25, 0.5, 0.75, 1] as t}
      <text x={x(t)} y={height - pad + 30} text-anchor="middle" font-size="11" fill={MUTED}>{t}</text>
    {/each}
    <text x={width / 2} y={height - 6} text-anchor="middle" font-size="11" fill={MUTED}>puntuación de anomalía</text>

    <!-- band labels -->
    <text x={pad - 8} y={yPix(0.30) + 4} text-anchor="end" font-size="10" fill={MUTED}>anómalo</text>
    <text x={pad - 8} y={yPix(0.70) + 4} text-anchor="end" font-size="10" fill={MUTED}>normal</text>

    <!-- shaded "predicho anomalía" region (score ≥ τ) -->
    <rect x={x(tau.current)} y={pad - 10} width={width - pad - x(tau.current)} height={height - 2 * pad + 20} fill={ACCENT} opacity="0.06" />

    <!-- points -->
    {#each rows as d}
      {@const k = kind(d)}
      <circle cx={x(d.score)} cy={yPix(d.yPos)} r={d.y === 1 ? 6 : 5} fill={k.color} stroke={PAPER} stroke-width="1.2" />
    {/each}

    <!-- wide invisible hit area so τ is easy to grab (esp. on touch) -->
    <line x1={x(tau.current)} y1={pad - 10} x2={x(tau.current)} y2={height - pad + 6} stroke="transparent" stroke-width="22" style="cursor: ew-resize;" />
    <!-- visible τ line -->
    <line x1={x(tau.current)} y1={pad - 10} x2={x(tau.current)} y2={height - pad + 6} stroke={ACCENT} stroke-width="3" pointer-events="none" />
    <text x={x(tau.current)} y={pad - 16} text-anchor="middle" font-size="12" font-weight="600" fill={ACCENT}>
      τ = {tau.current.toFixed(2)}
    </text>
  </svg>

  <p class="text-xs text-muted">
    {nNormal} normales · {nAnom} anomalías (clases desbalanceadas). Arrastra τ o usa el deslizador: a la derecha de τ se predice
    <span style="color: {SUCCESS}">anomalía</span>.
  </p>

  <label class="block text-sm font-medium text-ink">
    Umbral τ: {tau.current.toFixed(2)}
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={tau.current}
      oninput={(e) => setTau(e.currentTarget.valueAsNumber, true)}
      class="mt-1 w-full accent-interactive"
    />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <button
      class="rounded-md px-3 py-1.5 text-sm font-medium text-paper"
      style="background-color: {ACCENT}"
      onclick={() => setTau(argmaxThreshold(data, f1))}
    >
      Ir a τ* (máx F1)
    </button>
    <span class="text-xs text-muted">El umbral 0.5 por defecto rara vez es óptimo con clases desbalanceadas.</span>
  </div>

  <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink sm:grid-cols-4">
    <span>TP: <strong style="color: {SUCCESS}">{cm.tp}</strong> · FP: <strong style="color: {WARN}">{cm.fp}</strong></span>
    <span>FN: <strong style="color: {POS}">{cm.fn}</strong> · TN: <strong>{cm.tn}</strong></span>
    <span>Precisión: <strong>{P.toFixed(2)}</strong> · Recall: <strong>{R.toFixed(2)}</strong></span>
    <span>F1: <strong style="color: {ACCENT}">{F.toFixed(2)}</strong></span>
  </div>
</div>
