<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { draggablePoints } from '../../lib/svm/drag';
  import { type Domain } from '../../lib/svm/geometry';
  import { gridCells } from '../../lib/viz/grid';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ravineField } from '../../lib/dl/surface';
  import { sgd, rmsprop, adam } from '../../lib/optim/optimizers';
  import { ACCENT, POS, SUCCESS, AXIS, PAPER, WARN, MUTED } from '../../lib/svm/colors';

  // Three optimizers race down the same ravine from one draggable start. The
  // valley is steep across y and gentle along x, so a single η makes plain SGD
  // bounce across the walls while RMSprop and Adam normalize per-coordinate and
  // slide straight to the minimum at the origin.

  const STEPS = 70;
  const MIN = { x: 0, y: 0 };

  let start = $state([{ x: -2.0, y: 1.6 }]);
  let logEta = $state(-0.8); // η = 10^logEta
  let shown = $state(0);
  let running = $state(false);
  let dragIndex = $state(-1);

  const dom: Domain = { xMin: -2.6, xMax: 2.6, yMin: -2.6, yMax: 2.6 };
  const width = 440;
  const height = 440;
  const pad = 34;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  let eta = $derived(Math.pow(10, logEta));
  let trajs = $derived({
    sgd: sgd(ravineField, start[0], eta, STEPS),
    rms: rmsprop(ravineField, start[0], eta, STEPS),
    adam: adam(ravineField, start[0], eta, STEPS),
  });
  let diverged = $derived(
    [trajs.sgd, trajs.rms, trajs.adam].some((t) => t.some((p) => !isFinite(p.x) || Math.abs(p.x) > dom.xMax * 1.6 || Math.abs(p.y) > dom.yMax * 1.6)),
  );

  const cells = gridCells(dom, 44, xScale, yScale);
  let lossCells = $derived.by(() => {
    const vals = cells.map((c) => ravineField.f(c.cx, c.cy));
    const hi = Math.max(...vals) || 1;
    return cells.map((c, i) => ({ ...c, t: vals[i] / hi }));
  });

  let dragCfg = $derived({
    points: start,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => {
      dragIndex = i;
      if (i >= 0) {
        running = false;
        shown = 0;
      }
    },
  });

  const SERIES = [
    { key: 'sgd' as const, label: 'SGD', color: ACCENT },
    { key: 'rms' as const, label: 'RMSprop', color: POS },
    { key: 'adam' as const, label: 'Adam', color: SUCCESS },
  ];

  function poly(t: { x: number; y: number }[]): string {
    return t
      .slice(0, Math.max(1, shown))
      .filter((p) => isFinite(p.x) && isFinite(p.y))
      .map((p) => `${xScale(p.x)},${yScale(p.y)}`)
      .join(' ');
  }
  function finalLoss(t: { loss: number }[]): number {
    return t[Math.min(shown, t.length - 1)]?.loss ?? 0;
  }

  // Client-only stepper (SSR-safe): reveal all three trajectories together.
  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 45,
      total: STEPS,
      step: () => (shown += 1),
      onDone: () => (running = false),
    });
  });

  function run() {
    shown = 0;
    running = true;
  }
  function reset() {
    running = false;
    shown = 0;
  }
  const presets: { label: string; logEta: number }[] = [
    { label: 'muy bajo', logEta: -1.6 },
    { label: 'bueno', logEta: -0.8 },
    { label: 'muy alto', logEta: 0.1 },
  ];
</script>

<div class="space-y-4">
  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none aspect-square"
  >
    {#each lossCells as c}
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={ACCENT} fill-opacity={0.04 + c.t * 0.26} />
    {/each}

    <circle cx={xScale(MIN.x)} cy={yScale(MIN.y)} r="7" fill="none" stroke={SUCCESS} stroke-width="2" />
    <circle cx={xScale(MIN.x)} cy={yScale(MIN.y)} r="2" fill={SUCCESS} />

    {#each SERIES as s}
      <polyline points={poly(trajs[s.key])} fill="none" stroke={s.color} stroke-width="2.5" opacity="0.9" />
    {/each}

    <circle
      cx={xScale(start[0].x)}
      cy={yScale(start[0].y)}
      r={dragIndex === 0 ? 9 : 7}
      fill={MUTED}
      stroke={PAPER}
      stroke-width="2"
      style="cursor: {dragIndex === 0 ? 'grabbing' : 'grab'}; touch-action: none;"
      data-drag-index={0}
    />
  </svg>

  <div class="flex flex-wrap gap-4 text-sm">
    {#each SERIES as s}
      <span class="inline-flex items-center gap-1.5">
        <span style="display:inline-block;width:14px;height:3px;background-color:{s.color}"></span>
        <span class="text-ink">{s.label}: <strong>{finalLoss(trajs[s.key]).toFixed(3)}</strong></span>
      </span>
    {/each}
  </div>

  <p class="text-xs text-muted">Arrastra el punto inicial. Misma η para los tres; el valle es estrecho, así que SGD rebota mientras RMSprop y Adam adaptan el paso por eje.</p>

  <label class="block text-sm font-medium text-ink">
    Tasa de aprendizaje η: {eta.toFixed(3)}
    <input type="range" bind:value={logEta} oninput={reset} min="-1.8" max="0.3" step="0.05" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={run}>Ejecutar ▸</button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={reset}>Reiniciar</button>
    <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
      {#each presets as p}
        <button class="px-3 py-1.5" style={Math.abs(logEta - p.logEta) < 1e-6 ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => { logEta = p.logEta; reset(); }}>
          {p.label}
        </button>
      {/each}
    </span>
    {#if diverged}
      <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {WARN}">η demasiado alto: diverge</span>
    {/if}
  </div>
</div>
