<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { stepLoop } from '../../lib/viz/stepper';
  import { trainingCurves, earlyStopEpoch, overfitGap, type Capacity } from '../../lib/dlbi/curves';
  import { POS, ACCENT, AXIS, PAPER, SUCCESS, WARN, MUTED } from '../../lib/svm/colors';

  // Cómo se LEE un entrenamiento: la curva de entrenamiento siempre baja, pero
  // la de validación es la que decide. Con alta capacidad y sin regularización
  // se despega (sobreajuste); el punto donde tocó su mínimo es el early stopping.

  let { epochs = 120, seed = 7 }: { epochs?: number; seed?: number } = $props();

  let capacity = $state<Capacity>('alta');
  let reg = $state(0);
  let shown = $state(0);
  let running = $state(false);

  let curves = $derived(trainingCurves({ capacity, reg, epochs, seed }));
  let esEpoch = $derived(earlyStopEpoch(curves));
  // Solo hay early stopping que señalar si la validación de verdad se despega
  // de su mínimo; sin divergencia, el "mínimo" es un artefacto del ruido.
  let diverges = $derived(overfitGap(curves) > 0.05);

  const width = 560;
  const height = 300;
  const pad = 44;
  const x = scaleLinear().domain([0, epochs - 1]).range([pad, width - pad]);
  const y = scaleLinear().domain([0, 1.05]).range([height - pad, pad]);

  const poly = (key: 'train' | 'val') =>
    curves.slice(0, Math.max(1, shown)).map((p) => `${x(p.epoch)},${y(p[key])}`).join(' ');

  // Sobreajuste visible: la validación revelada ya superó su mínimo por un margen.
  // esEpoch es el mínimo global, así que una vez revelado coincide con el del prefijo.
  let overfitting = $derived(shown > esEpoch && curves[shown - 1].val > curves[esEpoch].val + 0.05);

  // Animación client-only: revela las épocas una a una (guardada por `running`).
  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 22,
      total: curves.length,
      step: () => (shown += 1),
      onDone: () => (running = false),
    });
  });

  function train() {
    shown = 0;
    running = true;
  }
  function reset() {
    running = false;
    shown = 0;
  }
  const capacities: Capacity[] = ['baja', 'media', 'alta'];
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none">
    <!-- ejes -->
    <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={AXIS} stroke-width="1.5" />
    <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke={AXIS} stroke-width="1.5" />
    <text x={width / 2} y={height - 8} text-anchor="middle" font-size="11" fill={MUTED}>épocas de entrenamiento</text>
    <text x="14" y={height / 2} text-anchor="middle" font-size="11" fill={MUTED} transform="rotate(-90 14 {height / 2})">pérdida</text>
    {#each [0, 0.5, 1] as t}
      <text x={pad - 8} y={y(t) + 4} text-anchor="end" font-size="10" fill={MUTED}>{t}</text>
    {/each}

    <!-- early stopping: solo si la validación diverge y la revelación ya pasó el mínimo -->
    {#if diverges && shown > esEpoch}
      <line x1={x(esEpoch)} y1={pad} x2={x(esEpoch)} y2={height - pad} stroke={SUCCESS} stroke-width="1.5" stroke-dasharray="5 4" />
      <circle cx={x(esEpoch)} cy={y(curves[esEpoch].val)} r="5" fill={SUCCESS} stroke={PAPER} stroke-width="1.5" />
      <text x={x(esEpoch)} y={pad - 6} text-anchor="middle" font-size="11" font-weight="600" fill={SUCCESS}>early stopping</text>
    {/if}

    <!-- curvas -->
    <polyline points={poly('train')} fill="none" stroke={ACCENT} stroke-width="2.5" />
    <polyline points={poly('val')} fill="none" stroke={POS} stroke-width="2.5" />
  </svg>

  <div class="flex flex-wrap items-center gap-4 text-xs text-ink">
    <span class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-5" style="background-color: {ACCENT}"></span> entrenamiento</span>
    <span class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-5" style="background-color: {POS}"></span> validación</span>
    {#if overfitting}
      <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {WARN}">sobreajuste: la validación empeora mientras el entrenamiento sigue bajando</span>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
      {#each capacities as c}
        <button class="px-3 py-1.5" style={capacity === c ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => { capacity = c; reset(); }}>
          {c}
        </button>
      {/each}
    </span>
    <label class="flex items-center gap-2 text-sm font-medium text-ink">
      Regularización: {reg.toFixed(2)}
      <input type="range" min="0" max="1" step="0.05" bind:value={reg} oninput={reset} class="w-32 accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={train}>Entrenar ▸</button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={reset}>Reiniciar</button>
    <span class="text-sm text-ink">Época {Math.min(shown, epochs - 1)} / {epochs - 1}</span>
  </div>
</div>
